from transformers import AutoTokenizer, AutoModel

import logging
logger = logging.getLogger(__name__)

from annoy import AnnoyIndex
import numpy as np
from functools import lru_cache
from datetime import datetime
import torch
import json

import requests

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
      _ = self.embed("warmup")
      logger.info("✅ Embedding model warmed up.")
      
  def get_medicine_profile(self, drug_name: str) -> dict:
    
        url = f"https://api.fda.gov/drug/label.json?search=active_ingredient:{drug_name}&limit=1"
        
        response = requests.get(url)
        
        if response.status_code != 200:
            logger.error(f"API request failed: {response.status_code}")
            return {}

        data = response.json()
        if "results" not in data:
            logger.warning("No results found for this drug")
            return {}

        result = data["results"][0]
        profile = {
            "brand_name": result.get("openfda", {}).get("brand_name", []),
            "generic_name": result.get("openfda", {}).get("generic_name", []),
            "active_ingredient": result.get("active_ingredient", []),
            "indications": result.get("indications_and_usage", []),
            "warnings": result.get("warnings", []),
            "dosage": result.get("dosage_and_administration", []),
        }
        return profile
    
