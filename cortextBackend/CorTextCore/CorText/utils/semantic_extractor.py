import requests
import torch
import faiss
import numpy as np
from functools import lru_cache
from transformers import AutoTokenizer, AutoModel
import logging

logger = logging.getLogger(__name__)

class Medicine_Extractor:
    def __init__(self, modelName="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(modelName)
        self.model = AutoModel.from_pretrained(modelName)
        self.vector_dim = self.model.config.hidden_size  # safer than hardcoding

    @lru_cache(maxsize=1024)
    def embed(self, text: str) -> np.ndarray:
        """Embed a single text (truncated at 512 tokens)."""
        if not text or len(text.strip()) < 3:
            logger.warning("Empty or short text passed to embed()")
            return np.zeros(self.vector_dim)

        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=512
        )
        with torch.no_grad():
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1)
        return embeddings.squeeze().numpy()

    def embed_chunks(self, text: str, chunk_size: int = 512, overlap: int = 50) -> list:
        """
        Split long text into chunks of up to `chunk_size` tokens,
        with optional overlap, and return embeddings for each chunk.
        """
        tokens = self.tokenizer.tokenize(text)
        embeddings = []

        for i in range(0, len(tokens), chunk_size - overlap):
            chunk_tokens = tokens[i:i + chunk_size]
            if not chunk_tokens:
                continue
            chunk_text = self.tokenizer.convert_tokens_to_string(chunk_tokens)

            inputs = self.tokenizer(
                chunk_text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=chunk_size
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                chunk_embedding = outputs.last_hidden_state.mean(dim=1)
            embeddings.append(chunk_embedding.squeeze().numpy())

        return embeddings

    def warmup(self) -> None:
        """Trigger model loading during startup."""
        _ = self.embed("warmup")
        logger.info("✅ Embedding model warmed up.")

    def get_medicine_profile(self, drug_name: str) -> dict:
        """Fetch medicine profile from openFDA API."""
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
    
    def build_faiss_index(self, texts: list[str], ids: list[str], index_path: str = "medicines.ann") -> None:
        """
        Build and save a FAISS index from a list of texts and their IDs.
        Each text is chunked and embedded; embeddings are averaged per medicine.
        """
        vectors = []
        for text in texts:
            chunks = self.embed_chunks(text)
            avg_embedding = np.mean(chunks, axis=0)
            vectors.append(avg_embedding.astype("float32"))

        # Create FAISS index
        dim = self.vector_dim
        index = faiss.IndexFlatL2(dim)
        index.add(np.array(vectors))

        # Save index
        faiss.write_index(index, index_path)
        logger.info(f"✅ FAISS index saved to {index_path}")

        # Optionally save ID mapping
        with open(index_path.replace(".ann", ".ids.txt"), "w") as f:
            for id_ in ids:
                f.write(id_ + "\n")

    def load_faiss_index(self, index_path: str = "medicines.ann") -> faiss.IndexFlatL2:
        """Load a FAISS index from disk."""
        index = faiss.read_index(index_path)
        logger.info(f"📂 FAISS index loaded from {index_path}")
        return index