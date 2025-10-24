from transformers import AutoTokenizer, AutoModel

import logging
logger = logging.getLogger(__name__)

from annoy import AnnoyIndex
import numpy as np
from functools import lru_cache
from datetime import datetime
import torch
import json

class Medicine_Extractor:
  def __init__(self, modelName="dmis-lab/biobert-base-cased-v1.1"):
    self.tokenizer = AutoTokenizer.from_pretrained(modelName)
    self.model = AutoModel.from_pretrained(modelName)
    self.vectorDim = 768
    
  @lru_cache(maxsize=1024)
  def embed(self, text: str) -> np.ndarray:
      if not text or len(text.strip()) < 3:
          logger.warning("Empty or short text passed to embed()")
          return np.zeros(self.vector_dim)

      inputs = self.tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=512)
      with torch.no_grad():
          outputs = self.model(**inputs)
          embeddings = outputs.last_hidden_state.mean(dim=1)
      return embeddings.squeeze().numpy()

  def warmup(self) -> None:
      """Trigger model loading during startup."""
      _ = self.embed("warmup")
      logger.info("✅ Embedding model warmed up.")
      
  def build_annoy_med_index(self, items, index_path, metadata_path, num_trees=10):
      index = AnnoyIndex(self.vector_dim, metric='angular')
      metadata = []

      for item in items:
          text_parts = [
              f"Name: {item.get('name', '')}",
              f"Description: {item.get('notes', '')}",
              f"Uses: {item.get('uses', '')}",
              f"Precautions: {item.get('precautions', '')}",
              f"Side Effects: {item.get('side_effects', '')}",
              f"Interactions: {item.get('interactions', '')}",
          ]
          text = "\n".join([part for part in text_parts if part.strip()])

          if not text.strip():
              text = "No detailed notes available"

          embedding = self.embed(text)
          if embedding is not None and np.any(embedding):
              index.add_item(len(metadata), embedding)
              metadata.append({
                  "timestamp": datetime.utcnow().isoformat(),
                  "id": item.get("id", ""),
                  "name": item.get("name", ""),
                  "notes/descriptions": item.get("notes", ""),
                  "uses": item.get("uses", ""),
                  "precautions": item.get("precautions", ""),
                  "side_effects": item.get("side_effects", ""),
                  "interactions": item.get("interactions", ""),
                  "model": "biobert-v1.1",
                  "vector": embedding.tolist()
              })

          if index.get_n_items() != len(metadata):
              logger.warning(f"⚠️ Index/metadata size mismatch: index={index.get_n_items()}, metadata={len(metadata)}")

      if not metadata:
          raise ValueError("No valid embeddings found. Index not built.")

      index.build(num_trees)
      index.save(index_path)

      with open(metadata_path, "w", encoding="utf-8") as f:
          json.dump(metadata, f, ensure_ascii=False, indent=2)

      logger.info(f"✅ Built Annoy index with {len(metadata)} items")
      print(f"✅ Built Annoy index with {len(metadata)} items")
      print(f"Index saved to {index_path}, metadata to {metadata_path}")

    
