import requests
import torch
import faiss
import numpy as np
from functools import lru_cache
from transformers import AutoTokenizer, AutoModel
import logging
import json
from typing import List, Dict, Tuple

logger = logging.getLogger(__name__)

import requests
import torch
import faiss
import numpy as np
from functools import lru_cache
from transformers import AutoTokenizer, AutoModel
import logging
import json
from typing import List, Dict, Tuple
import time

logger = logging.getLogger(__name__)

class Medicine_Extractor:
    def __init__(self, modelName="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(modelName)
        self.model = AutoModel.from_pretrained(modelName)
        self.vector_dim = self.model.config.hidden_size

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
    
    def fetch_all_medicines_from_api(self, limit: int = 900) -> List[Dict]:
        """
        Fetch all medicines from openFDA API.
        Returns a list of medicine dictionaries with structured data.
        """
        url = f"https://api.fda.gov/drug/label.json?limit={limit}"
        
        try:
            logger.info(f"🔍 Fetching {limit} medicines from openFDA API...")
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            data = response.json()
            
            if "results" not in data:
                logger.error("No results found in API response")
                return []
            
            medicines = []
            for idx, result in enumerate(data["results"]):
                brand_names = result.get("openfda", {}).get("brand_name", [])
                generic_names = result.get("openfda", {}).get("generic_name", [])
                name = brand_names[0] if brand_names else (generic_names[0] if generic_names else f"Medicine_{idx}")
                
                medicine = {
                    "id": f"med_{idx}",
                    "name": name,
                    "brand_name": brand_names,
                    "generic_name": generic_names,
                    "active_ingredient": result.get("active_ingredient", []),
                    "indications": result.get("indications_and_usage", []),
                    "warnings": result.get("warnings", []),
                    "dosage": result.get("dosage_and_administration", []),
                }
                medicines.append(medicine)
            
            logger.info(f"✅ Successfully fetched {len(medicines)} medicines")
            return medicines
            
        except requests.RequestException as e:
            logger.error(f"❌ Failed to fetch medicines from API: {e}")
            return []
    
    def normalize_with_rxnorm(self, medicines: List[Dict]) -> List[Dict]:
        """
        Normalize medicine names using RxNorm API.
        Adds rxcui and normalized_name to each medicine.
        """
        logger.info(f"🔍 Starting RxNorm normalization for {len(medicines)} medicines...")
        normalized_medicines = []
        
        for i, medicine in enumerate(medicines):
            if i % 50 == 0:
                logger.info(f"Normalized {i}/{len(medicines)} medicines...")
            
            try:
                # Try to get RxCUI from RxNorm
                response = requests.get(
                    f"https://rxnav.nlm.nih.gov/REST/rxcui.json?name={requests.utils.quote(medicine['name'])}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("idGroup", {}).get("rxnormId"):
                        rxcui = data["idGroup"]["rxnormId"][0]
                        
                        # Get normalized name from RxCUI
                        detail_response = requests.get(
                            f"https://rxnav.nlm.nih.gov/REST/rxcui/{rxcui}/properties.json",
                            timeout=10
                        )
                        
                        if detail_response.status_code == 200:
                            detail_data = detail_response.json()
                            normalized_name = detail_data.get("properties", {}).get("name", medicine["name"])
                            
                            medicine["rxcui"] = rxcui
                            medicine["normalized_name"] = normalized_name
                            medicine["normalized"] = True
                            logger.debug(f"✅ Normalized: {medicine['name']} → {normalized_name} (RxCUI: {rxcui})")
                        else:
                            medicine["normalized"] = False
                    else:
                        medicine["normalized"] = False
                else:
                    medicine["normalized"] = False
                    
            except Exception as e:
                logger.warning(f"⚠️ RxNorm lookup failed for {medicine['name']}: {e}")
                medicine["normalized"] = False
            
            normalized_medicines.append(medicine)
            
            # Rate limiting - wait 100ms between requests
            time.sleep(0.1)
        
        normalized_count = sum(1 for m in normalized_medicines if m.get("normalized"))
        logger.info(f"✅ RxNorm normalization complete: {normalized_count}/{len(medicines)} medicines normalized")
        return normalized_medicines
    
    def enrich_with_dailymed(self, medicines: List[Dict], enable_enrichment: bool = True) -> List[Dict]:
        """
        Enrich medicines with DailyMed data (manufacturer, packaging).
        """
        if not enable_enrichment:
            logger.info("⏭️ Skipping DailyMed enrichment (disabled)")
            return medicines
        
        logger.info(f"📚 Starting DailyMed enrichment for {len(medicines)} medicines...")
        enriched_medicines = []
        
        for i, medicine in enumerate(medicines):
            if i % 50 == 0:
                logger.info(f"Enriched {i}/{len(medicines)} medicines...")
            
            try:
                # Search DailyMed
                search_name = medicine.get("normalized_name", medicine["name"])
                response = requests.get(
                    f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls.json?drug_name={requests.utils.quote(search_name)}",
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data.get("data") and len(data["data"]) > 0:
                        setid = data["data"][0].get("setid")
                        
                        if setid:
                            # Get detailed info
                            detail_response = requests.get(
                                f"https://dailymed.nlm.nih.gov/dailymed/services/v2/spls/{setid}.json",
                                timeout=10
                            )
                            
                            if detail_response.status_code == 200:
                                detail_data = detail_response.json()
                                
                                medicine["dailymed_id"] = setid
                                medicine["manufacturer"] = detail_data.get("data", [{}])[0].get("labeler", "")
                                medicine["package_info"] = detail_data.get("data", [{}])[0].get("packaging", "")
                                medicine["enriched"] = True
                                logger.debug(f"✅ Enriched: {medicine['name']} with DailyMed data")
                            else:
                                medicine["enriched"] = False
                        else:
                            medicine["enriched"] = False
                    else:
                        medicine["enriched"] = False
                else:
                    medicine["enriched"] = False
                    
            except Exception as e:
                logger.warning(f"⚠️ DailyMed lookup failed for {medicine['name']}: {e}")
                medicine["enriched"] = False
            
            enriched_medicines.append(medicine)
            
            # Rate limiting - wait 100ms between requests
            time.sleep(0.1)
        
        enriched_count = sum(1 for m in enriched_medicines if m.get("enriched"))
        logger.info(f"✅ DailyMed enrichment complete: {enriched_count}/{len(medicines)} medicines enriched")
        return enriched_medicines
    
    def medicine_to_text(self, medicine: Dict) -> str:
        """
        Convert a medicine dictionary to a single text string for embedding.
        Uses normalized name if available.
        """
        name = medicine.get("normalized_name", medicine.get("name", ""))
        parts = [
            f"Name: {name}",
            f"Brand Names: {' '.join(medicine.get('brand_name', []))}",
            f"Generic Names: {' '.join(medicine.get('generic_name', []))}",
            f"Active Ingredients: {' '.join(medicine.get('active_ingredient', []))}",
            f"Indications: {' '.join(medicine.get('indications', []))}",
            f"Warnings: {' '.join(medicine.get('warnings', []))}",
            f"Dosage: {' '.join(medicine.get('dosage', []))}",
        ]
        
        # Add enriched data if available
        if medicine.get("manufacturer"):
            parts.append(f"Manufacturer: {medicine['manufacturer']}")
        
        return " ".join(parts)
    
    def embed_and_index_medicines(
        self,
        medicines: List[Dict],
        index_path: str = "medicines.ann",
        metadata_path: str = "medicines_metadata.json"
    ) -> Tuple[faiss.IndexFlatL2, List[Dict]]:
        """
        Embed medicines with BioBERT and build FAISS index.
        This is the final step after normalization and enrichment.
        """
        if not medicines:
            logger.error("No medicines to embed")
            return None, []
        
        logger.info(f"🧠 Embedding {len(medicines)} medicines with BioBERT...")
        vectors = []
        
        for i, medicine in enumerate(medicines):
            if i % 50 == 0:
                logger.info(f"Embedded {i}/{len(medicines)} medicines...")
            
            text = self.medicine_to_text(medicine)
            chunks = self.embed_chunks(text)
            
            if chunks:
                avg_embedding = np.mean(chunks, axis=0).astype("float32")
            else:
                avg_embedding = np.zeros(self.vector_dim, dtype="float32")
            
            vectors.append(avg_embedding)
        
        # Create FAISS index
        logger.info("🔧 Building FAISS index...")
        vectors_array = np.array(vectors)
        index = faiss.IndexFlatL2(self.vector_dim)
        index.add(vectors_array)
        
        # Save index
        faiss.write_index(index, index_path)
        logger.info(f"✅ FAISS index saved to {index_path}")
        
        # Save metadata
        with open(metadata_path, "w") as f:
            json.dump(medicines, f, indent=2)
        logger.info(f"✅ Medicine metadata saved to {metadata_path}")
        
        return index, medicines
    
    def embed_all_medicines_from_api(
        self, 
        limit: int = 999,
        index_path: str = "medicines.ann",
        metadata_path: str = "medicines_metadata.json"
    ) -> Tuple[faiss.IndexFlatL2, List[Dict]]:
        """
        Legacy method: Fetch all medicines from openFDA API, embed them, and build a FAISS index.
        Use the new pipeline methods for more control.
        """
        medicines = self.fetch_all_medicines_from_api(limit=limit)
        
        if not medicines:
            logger.error("No medicines to embed")
            return None, []
        
        # Convert medicines to text and embed
        logger.info("🔄 Embedding medicines...")
        vectors = []
        
        for i, medicine in enumerate(medicines):
            if i % 50 == 0:
                logger.info(f"Embedded {i}/{len(medicines)} medicines...")
            
            text = self.medicine_to_text(medicine)
            chunks = self.embed_chunks(text)
            
            if chunks:
                avg_embedding = np.mean(chunks, axis=0).astype("float32")
            else:
                avg_embedding = np.zeros(self.vector_dim, dtype="float32")
            
            vectors.append(avg_embedding)
        
        # Create FAISS index
        logger.info("🔧 Building FAISS index...")
        vectors_array = np.array(vectors)
        index = faiss.IndexFlatL2(self.vector_dim)
        index.add(vectors_array)
        
        # Save index
        faiss.write_index(index, index_path)
        logger.info(f"✅ FAISS index saved to {index_path}")
        
        # Save metadata
        with open(metadata_path, "w") as f:
            json.dump(medicines, f, indent=2)
        logger.info(f"✅ Medicine metadata saved to {metadata_path}")
        
        return index, medicines
        
    def build_faiss_index(self, texts: list[str], ids: list[str], index_path: str = "medicines.ann") -> None:
        """
        Build and save a FAISS index from a list of texts and their IDs.
        """
        vectors = []
        for text in texts:
            chunks = self.embed_chunks(text)
            avg_embedding = np.mean(chunks, axis=0)
            vectors.append(avg_embedding.astype("float32"))

        dim = self.vector_dim
        index = faiss.IndexFlatL2(dim)
        index.add(np.array(vectors))

        faiss.write_index(index, index_path)
        logger.info(f"✅ FAISS index saved to {index_path}")

        with open(index_path.replace(".ann", ".ids.txt"), "w") as f:
            for id_ in ids:
                f.write(id_ + "\n")

    def load_faiss_index(self, index_path: str = "medicines.ann") -> faiss.IndexFlatL2:
        """Load a FAISS index from disk."""
        index = faiss.read_index(index_path)
        logger.info(f"📂 FAISS index loaded from {index_path}")
        return index
    
    def search_similar_medicines(
        self, 
        query: str, 
        index: faiss.IndexFlatL2, 
        medicines: List[Dict], 
        top_k: int = 5
    ) -> List[Tuple[Dict, float]]:
        """
        Search for similar medicines using a text query.
        """
        query_chunks = self.embed_chunks(query)
        query_embedding = np.mean(query_chunks, axis=0).astype("float32").reshape(1, -1)
        
        distances, indices = index.search(query_embedding, top_k)
        
        results = []
        for idx, distance in zip(indices[0], distances[0]):
            if idx < len(medicines):
                results.append((medicines[idx], float(distance)))
        
        return results