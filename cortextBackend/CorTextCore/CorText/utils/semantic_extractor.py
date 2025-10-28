import json
import logging
import time
from typing import List, Dict, Tuple, Optional

import json
import logging
import time
import os

from datetime import datetime

import numpy as np
import faiss
import requests
import torch
from transformers import AutoTokenizer, AutoModel

logger = logging.getLogger(__name__)


class Medicine_Extractor:
    def __init__(self, modelName="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(modelName)
        self.model = AutoModel.from_pretrained(modelName)
        self.vector_dim = self.model.config.hidden_size
        logger.info(f"✅ BioBERT model loaded (dimension: {self.vector_dim})")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Embed a single text using BioBERT.
        For long texts, splits into chunks and averages embeddings.
        """
        if not text or len(text.strip()) < 3:
            logger.warning("Empty or short text passed to embed_text()")
            return np.zeros(self.vector_dim, dtype="float32")

        # Tokenize and split into chunks if necessary
        tokens = self.tokenizer.tokenize(text)
        max_length = 512
        chunk_size = 450  # Leave room for special tokens
        
        if len(tokens) <= chunk_size:
            # Single chunk
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=max_length
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                embedding = outputs.last_hidden_state.mean(dim=1)
            return embedding.squeeze().numpy().astype("float32")
        
        # Multiple chunks - split and average
        embeddings = []
        for i in range(0, len(tokens), chunk_size):
            chunk_tokens = tokens[i:i + chunk_size]
            chunk_text = self.tokenizer.convert_tokens_to_string(chunk_tokens)
            
            inputs = self.tokenizer(
                chunk_text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=max_length
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                chunk_embedding = outputs.last_hidden_state.mean(dim=1)
            embeddings.append(chunk_embedding.squeeze().numpy())
        
        # Average all chunk embeddings
        avg_embedding = np.mean(embeddings, axis=0).astype("float32")
        return avg_embedding

    def fetch_medicines_from_openfda(self, limit: int = 100) -> List[Dict]:
        """
        Fetch medicines from openFDA API.
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
            if i % 10 == 0 and i > 0:
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
                        else:
                            medicine["normalized_name"] = medicine["name"]
                            medicine["normalized"] = False
                    else:
                        medicine["normalized_name"] = medicine["name"]
                        medicine["normalized"] = False
                else:
                    medicine["normalized_name"] = medicine["name"]
                    medicine["normalized"] = False
                    
            except Exception as e:
                logger.warning(f"⚠️ RxNorm lookup failed for {medicine['name']}: {e}")
                medicine["normalized_name"] = medicine["name"]
                medicine["normalized"] = False
            
            normalized_medicines.append(medicine)
            
            # Rate limiting - wait 100ms between requests
            time.sleep(0.1)
        
        normalized_count = sum(1 for m in normalized_medicines if m.get("normalized"))
        logger.info(f"✅ RxNorm normalization complete: {normalized_count}/{len(medicines)} normalized")
        return normalized_medicines

    def enrich_with_dailymed(self, medicines: List[Dict]) -> List[Dict]:
        """
        Enrich medicines with DailyMed data (manufacturer, packaging).
        """
        logger.info(f"📚 Starting DailyMed enrichment for {len(medicines)} medicines...")
        enriched_medicines = []
        
        for i, medicine in enumerate(medicines):
            if i % 10 == 0 and i > 0:
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
        logger.info(f"✅ DailyMed enrichment complete: {enriched_count}/{len(medicines)} enriched")
        return enriched_medicines

    def medicine_to_text(self, medicine: Dict) -> str:
        """
        Convert a medicine dictionary to a single text string for embedding.
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

    def embed_medicines(self, medicines: List[Dict], include_vectors_in_json: bool = True) -> List[Dict]:
        """
        Embed all medicines and add the vector to each medicine dictionary.
        
        Args:
            medicines: List of medicine dictionaries
            include_vectors_in_json: If True, add 'vector' field to each medicine (for JSON storage)
        
        Returns:
            List of medicines with vectors added (if include_vectors_in_json=True)
        """
        logger.info(f"🧠 Embedding {len(medicines)} medicines with BioBERT...")
        
        vectors = []
        
        for i, medicine in enumerate(medicines):
            if i % 10 == 0 and i > 0:
                logger.info(f"Embedded {i}/{len(medicines)} medicines...")
            
            # Convert medicine to text
            text = self.medicine_to_text(medicine)
            
            # Generate embedding
            vector = self.embed_text(text)
            vectors.append(vector)
            
            # Optionally add vector to medicine dictionary for JSON storage
            if include_vectors_in_json:
                medicine["vector"] = vector.tolist()
                medicine["vector_dim"] = len(vector)
        
        logger.info(f"✅ Successfully embedded {len(medicines)} medicines")
        
        # Store vectors as instance variable for FAISS indexing
        self._vectors = np.array(vectors, dtype="float32")
        
        return medicines

    def build_faiss_index(self, vectors: Optional[np.ndarray] = None) -> faiss.IndexFlatL2:
        """
        Build a FAISS index from vectors.
        
        Args:
            vectors: Optional numpy array of vectors. If None, uses self._vectors from embed_medicines()
        
        Returns:
            FAISS index
        """
        if vectors is None:
            if not hasattr(self, '_vectors'):
                raise ValueError("No vectors found. Run embed_medicines() first or provide vectors.")
            vectors = self._vectors
        
        logger.info(f"🔧 Building FAISS index with {len(vectors)} vectors...")
        
        # Create FAISS index (L2 distance)
        index = faiss.IndexFlatL2(self.vector_dim)
        index.add(vectors)
        
        logger.info(f"✅ FAISS index built with {index.ntotal} vectors")
        return index

    def save_dual_format(
        self,
        medicines: List[Dict],
        ann_path: str = "medicines.ann",
        json_path: str = "medicines_metadata.json",
        include_vectors_in_json: bool = True
    ) -> None:
        """
        Save vector database in dual format:
        1. .ann file (FAISS index) for fast similarity search
        2. .json file (metadata) for rich profile access
        
        Args:
            medicines: List of medicine dictionaries (must have 'vector' field if using cached vectors)
            ann_path: Path to save FAISS index
            json_path: Path to save metadata JSON
            include_vectors_in_json: Whether to include vectors in JSON (for redundancy/debugging)
        """
        logger.info("💾 Saving vector database in dual format (.ann + .json)...")
        
        # Build FAISS index
        if hasattr(self, '_vectors'):
            # Use cached vectors from embed_medicines()
            index = self.build_faiss_index(self._vectors)
        else:
            # Extract vectors from medicines
            vectors = np.array([m['vector'] for m in medicines], dtype="float32")
            index = self.build_faiss_index(vectors)
        
        # Save FAISS index to .ann file
        faiss.write_index(index, ann_path)
        logger.info(f"✅ FAISS index saved to {ann_path}")
        
        # Prepare JSON metadata
        medicines_for_json = []
        for medicine in medicines:
            med_copy = medicine.copy()
            
            # Optionally remove vectors from JSON to save space
            if not include_vectors_in_json and 'vector' in med_copy:
                del med_copy['vector']
                # Keep vector_dim for reference
                if 'vector_dim' not in med_copy:
                    med_copy['vector_dim'] = self.vector_dim
            
            medicines_for_json.append(med_copy)
        
        # Add metadata header
        json_data = {
            "metadata": {
                "total_medicines": len(medicines),
                "vector_dimension": self.vector_dim,
                "model": "dmis-lab/biobert-base-cased-v1.1",
                "normalized_count": sum(1 for m in medicines if m.get("normalized")),
                "enriched_count": sum(1 for m in medicines if m.get("enriched")),
                "ann_file": ann_path,
                "vectors_in_json": include_vectors_in_json,
                "synchronization": "Medicine IDs align with FAISS index positions"
            },
            "medicines": medicines_for_json
        }
        
        # Save JSON metadata
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=2)
        
        logger.info(f"✅ Metadata saved to {json_path}")
        logger.info(f"✅ Dual-format vector database complete:")
        logger.info(f"   - FAISS index: {ann_path} (for fast search)")
        logger.info(f"   - JSON metadata: {json_path} (for rich profiles)")

    def load_dual_format(
        self,
        ann_path: str = "medicines.ann",
        json_path: str = "medicines_metadata.json"
    ) -> Tuple[faiss.IndexFlatL2, List[Dict]]:
        """
        Load vector database from dual format.
        
        Returns:
            Tuple of (FAISS index, medicines list)
        """
        logger.info("📂 Loading vector database from dual format...")
        
        # Load FAISS index
        index = faiss.read_index(ann_path)
        logger.info(f"✅ FAISS index loaded from {ann_path} ({index.ntotal} vectors)")
        
        # Load JSON metadata
        with open(json_path, "r") as f:
            json_data = json.load(f)
        
        medicines = json_data.get("medicines", [])
        metadata = json_data.get("metadata", {})
        
        logger.info(f"✅ Metadata loaded from {json_path} ({len(medicines)} medicines)")
        logger.info(f"   Vector dimension: {metadata.get('vector_dimension')}")
        logger.info(f"   Normalized: {metadata.get('normalized_count')}/{metadata.get('total_medicines')}")
        logger.info(f"   Enriched: {metadata.get('enriched_count')}/{metadata.get('total_medicines')}")
        
        return index, medicines

    def search_with_faiss(
        self,
        query: str,
        index: faiss.IndexFlatL2,
        medicines: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        """
        Search for similar medicines using FAISS index for fast retrieval.
        
        Args:
            query: Search query text
            index: FAISS index
            medicines: List of medicine metadata (aligned with index positions)
            top_k: Number of results to return
        
        Returns:
            List of dictionaries with medicine data and similarity scores
        """
        logger.info(f"🔍 Searching FAISS index for: '{query}'")
        
        # Embed the query
        query_vector = self.embed_text(query).reshape(1, -1)
        
        # Search FAISS index (returns distances and indices)
        distances, indices = index.search(query_vector, top_k)
        
        # Convert L2 distances to similarity scores (lower distance = higher similarity)
        # Using negative distance so higher values = better matches
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx < len(medicines):
                # Convert L2 distance to similarity score (0-1 range, higher is better)
                # Using exponential decay: e^(-distance/scale)
                similarity = float(np.exp(-dist / 10.0))
                
                results.append({
                    "medicine": medicines[idx],
                    "similarity": similarity,
                    "distance": float(dist),
                    "index": int(idx)
                })
        
        logger.info(f"✅ Found {len(results)} similar medicines")
        return results

    def search_with_json(
        self,
        query: str,
        medicines: List[Dict],
        top_k: int = 5
    ) -> List[Dict]:
        """
        Search for similar medicines using direct vector comparison (requires vectors in JSON).
        Fallback method when FAISS is not available.
        
        Args:
            query: Search query text
            medicines: List of medicine metadata with 'vector' field
            top_k: Number of results to return
        
        Returns:
            List of dictionaries with medicine data and similarity scores
        """
        logger.info(f"🔍 Searching JSON vectors for: '{query}'")
        
        # Embed the query
        query_vector = self.embed_text(query)
        
        # Calculate cosine similarity with all medicines
        similarities = []
        for i, medicine in enumerate(medicines):
            if "vector" not in medicine:
                logger.warning(f"Medicine {medicine.get('name')} missing vector field")
                continue
            
            med_vector = np.array(medicine["vector"], dtype="float32")
            
            # Cosine similarity
            similarity = np.dot(query_vector, med_vector) / (
                np.linalg.norm(query_vector) * np.linalg.norm(med_vector)
            )
            
            similarities.append({
                "medicine": medicine,
                "similarity": float(similarity),
                "index": i
            })
        
        # Sort by similarity (descending)
        similarities.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Return top_k results
        top_results = similarities[:top_k]
        
        logger.info(f"✅ Found {len(top_results)} similar medicines")
        return top_results

    def add_single_medicine(
        self,
        medicine_data: Dict,
        ann_path: str = "medicines.ann",
        json_path: str = "medicines_metadata.json",
        auto_generate_id: bool = True
    ) -> Dict:
        """
        Add a single medicine to existing vector database (both .ann and .json files).
        This is an incremental operation that doesn't require rebuilding the entire database.
        
        Args:
            medicine_data: Dictionary with medicine information
                Required fields: name
                Optional fields: brand_name, generic_name, active_ingredient, 
                                indications, warnings, dosage, etc.
            ann_path: Path to FAISS index file
            json_path: Path to JSON metadata file
            auto_generate_id: If True, automatically generates medicine ID
        
        Returns:
            Dictionary with added medicine data including vector
        
        Raises:
            FileNotFoundError: If database files don't exist
            ValueError: If medicine_data is invalid
        """
        logger.info(f"➕ Adding new medicine: {medicine_data.get('name', 'Unknown')}")
        
        # Validate input
        if not medicine_data.get("name"):
            raise ValueError("Medicine 'name' is required")
        
        # Load existing database
        try:
            index = faiss.read_index(ann_path)
            with open(json_path, "r") as f:
                json_data = json.load(f)
            medicines = json_data.get("medicines", [])
            metadata = json_data.get("metadata", {})
        except FileNotFoundError:
            raise FileNotFoundError(
                f"Database files not found. Please run 'python manage.py embed_medicines' first."
            )
        
        # Auto-generate ID if needed
        if auto_generate_id or not medicine_data.get("id"):
            next_idx = len(medicines)
            medicine_data["id"] = f"med_{next_idx}"
        
        # Ensure all required fields have default values
        medicine_data.setdefault("brand_name", [])
        medicine_data.setdefault("generic_name", [])
        medicine_data.setdefault("active_ingredient", [])
        medicine_data.setdefault("indications", [])
        medicine_data.setdefault("warnings", [])
        medicine_data.setdefault("dosage", [])
        medicine_data.setdefault("normalized_name", medicine_data["name"])
        medicine_data.setdefault("normalized", False)
        medicine_data.setdefault("enriched", False)
        
        # Convert medicine to text and embed
        text = self.medicine_to_text(medicine_data)
        vector = self.embed_text(text)
        
        # Add vector to medicine data
        medicine_data["vector"] = vector.tolist()
        medicine_data["vector_dim"] = len(vector)
        
        # Add vector to FAISS index
        vector_array = vector.reshape(1, -1).astype("float32")
        index.add(vector_array)
        
        # Add medicine to JSON data
        medicines.append(medicine_data)
        
        # Update metadata
        metadata["total_medicines"] = len(medicines)
        if medicine_data.get("normalized"):
            metadata["normalized_count"] = metadata.get("normalized_count", 0) + 1
        if medicine_data.get("enriched"):
            metadata["enriched_count"] = metadata.get("enriched_count", 0) + 1
        
        # Save updated FAISS index
        faiss.write_index(index, ann_path)
        logger.info(f"✅ Updated FAISS index: {ann_path}")
        
        # Save updated JSON
        json_data["medicines"] = medicines
        json_data["metadata"] = metadata
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=2)
        logger.info(f"✅ Updated JSON metadata: {json_path}")
        
        logger.info(f"✅ Successfully added medicine: {medicine_data['name']} (ID: {medicine_data['id']})")
        logger.info(f"   Total medicines in database: {len(medicines)}")
        
        return medicine_data

    def batch_add_medicines(
        self,
        medicines_list: List[Dict],
        ann_path: str = "medicines.ann",
        json_path: str = "medicines_metadata.json"
    ) -> List[Dict]:
        """
        Add multiple medicines to existing vector database in a batch operation.
        More efficient than calling add_single_medicine() multiple times.
        
        Args:
            medicines_list: List of medicine dictionaries
            ann_path: Path to FAISS index file
            json_path: Path to JSON metadata file
        
        Returns:
            List of added medicines with vectors
        """
        logger.info(f"➕ Batch adding {len(medicines_list)} medicines...")
        
        # Load existing database
        index = faiss.read_index(ann_path)
        with open(json_path, "r") as f:
            json_data = json.load(f)
        medicines = json_data.get("medicines", [])
        metadata = json_data.get("metadata", {})
        
        # Process all new medicines
        new_vectors = []
        next_idx = len(medicines)
        
        for i, medicine_data in enumerate(medicines_list):
            # Validate
            if not medicine_data.get("name"):
                logger.warning(f"Skipping medicine at index {i}: missing 'name' field")
                continue
            
            # Auto-generate ID
            if not medicine_data.get("id"):
                medicine_data["id"] = f"med_{next_idx}"
                next_idx += 1
            
            # Set defaults
            medicine_data.setdefault("brand_name", [])
            medicine_data.setdefault("generic_name", [])
            medicine_data.setdefault("active_ingredient", [])
            medicine_data.setdefault("indications", [])
            medicine_data.setdefault("warnings", [])
            medicine_data.setdefault("dosage", [])
            medicine_data.setdefault("normalized_name", medicine_data["name"])
            medicine_data.setdefault("normalized", False)
            medicine_data.setdefault("enriched", False)
            
            # Embed
            text = self.medicine_to_text(medicine_data)
            vector = self.embed_text(text)
            
            medicine_data["vector"] = vector.tolist()
            medicine_data["vector_dim"] = len(vector)
            
            new_vectors.append(vector)
            medicines.append(medicine_data)
        
        # Batch add vectors to FAISS
        if new_vectors:
            vectors_array = np.array(new_vectors, dtype="float32")
            index.add(vectors_array)
        
        # Update metadata
        metadata["total_medicines"] = len(medicines)
        
        # Save
        faiss.write_index(index, ann_path)
        json_data["medicines"] = medicines
        json_data["metadata"] = metadata
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=2)
        
        logger.info(f"✅ Batch added {len(new_vectors)} medicines to database")
        return medicines_list


class PatientInfo_Extractor:
    def __init__(self, modelName="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(modelName)
        self.model = AutoModel.from_pretrained(modelName)
        self.vector_dim = self.model.config.hidden_size
        logger.info(f"✅ BioBERT model loaded (dimension: {self.vector_dim})")

    def embed_text(self, text: str) -> np.ndarray:
        """
        Embed a single text using BioBERT.
        For long texts, splits into chunks and averages embeddings.
        """
        if not text or len(text.strip()) < 3:
            logger.warning("Empty or short text passed to embed_text()")
            return np.zeros(self.vector_dim, dtype="float32")

        # Tokenize and split into chunks if necessary
        tokens = self.tokenizer.tokenize(text)
        max_length = 512
        chunk_size = 450  # Leave room for special tokens
        
        if len(tokens) <= chunk_size:
            # Single chunk
            inputs = self.tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=max_length
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                embedding = outputs.last_hidden_state.mean(dim=1)
            return embedding.squeeze().numpy().astype("float32")
        
        # Multiple chunks - split and average
        embeddings = []
        for i in range(0, len(tokens), chunk_size):
            chunk_tokens = tokens[i:i + chunk_size]
            chunk_text = self.tokenizer.convert_tokens_to_string(chunk_tokens)
            
            inputs = self.tokenizer(
                chunk_text,
                return_tensors="pt",
                truncation=True,
                padding=True,
                max_length=max_length
            )
            with torch.no_grad():
                outputs = self.model(**inputs)
                chunk_embedding = outputs.last_hidden_state.mean(dim=1)
            embeddings.append(chunk_embedding.squeeze().numpy())
        
        # Average all chunk embeddings
        avg_embedding = np.mean(embeddings, axis=0).astype("float32")
        return avg_embedding

    def patient_to_text(self, patient: Dict) -> str:
        """
        Convert patient dictionary to text for embedding.
        Focuses on clinically relevant information.
        """
        parts = []
        
        # Demographics
        if patient.get("age"):
            parts.append(f"Age: {patient['age']} years old")
        if patient.get("gender"):
            parts.append(f"Gender: {patient['gender']}")
        if patient.get("weight_kg"):
            parts.append(f"Weight: {patient['weight_kg']} kg")
        
        # Chief complaint and diagnosis
        if patient.get("chief_complaint"):
            parts.append(f"Chief Complaint: {patient['chief_complaint']}")
        if patient.get("diagnosis"):
            parts.append(f"Diagnosis: {patient['diagnosis']}")
        
        # Symptoms
        if patient.get("symptoms"):
            symptoms_text = ", ".join(patient["symptoms"])
            parts.append(f"Symptoms: {symptoms_text}")
        
        # Medical history
        if patient.get("medical_history"):
            history_text = ", ".join(patient["medical_history"])
            parts.append(f"Medical History: {history_text}")
        
        # Current medications
        if patient.get("current_medications"):
            meds_text = "; ".join(patient["current_medications"])
            parts.append(f"Current Medications: {meds_text}")
        
        # Allergies (CRITICAL)
        if patient.get("drug_allergies"):
            allergies_text = ", ".join(patient["drug_allergies"])
            parts.append(f"Drug Allergies: {allergies_text}")
        
        # Adverse reactions
        if patient.get("adverse_reactions"):
            reactions_text = ", ".join(patient["adverse_reactions"])
            parts.append(f"Adverse Reactions: {reactions_text}")
        
        # Renal function
        if patient.get("renal_function"):
            renal = patient["renal_function"]
            if renal.get("GFR_ml_min"):
                parts.append(f"GFR: {renal['GFR_ml_min']} ml/min")
        
        # Liver function
        if patient.get("liver_function"):
            liver = patient["liver_function"]
            if liver.get("ALT_U_L"):
                parts.append(f"ALT: {liver['ALT_U_L']} U/L")
        
        # Lifestyle factors
        if patient.get("smoking_status"):
            parts.append(f"Smoking Status: {patient['smoking_status']}")
        
        # Pregnancy
        if patient.get("pregnancy_status") and patient["pregnancy_status"] != "Not applicable":
            parts.append(f"Pregnancy Status: {patient['pregnancy_status']}")
        
        # Route preference
        if patient.get("preferred_route"):
            parts.append(f"Preferred Route: {patient['preferred_route']}")
        
        return " ".join(parts)

    def embed_patient(self, patient_data: Dict) -> Dict:
        """
        Embed patient information and add vector to the dictionary.
        """
        logger.info(f"🧠 Embedding patient: {patient_data.get('name', 'Unknown')}")
        
        # Convert patient to text
        text = self.patient_to_text(patient_data)
        
        # Generate embedding
        vector = self.embed_text(text)
        
        # Add metadata
        patient_data["embedding"] = vector.tolist()
        patient_data["vector_dim"] = len(vector)
        patient_data["timestamp"] = datetime.now().isoformat()
        
        logger.info(f"✅ Patient embedded successfully")
        return patient_data

    def save_patient(
        self,
        patient_data: Dict,
        ann_path: str = "patients.ann",
        json_path: str = "patients_metadata.json"
    ) -> Dict:
        """
        Save patient to vector database (dual format: FAISS + JSON).
        Handles missing or corrupted FAISS index gracefully.
        """
        try:
            # Check if FAISS index exists and is non-empty
            if os.path.exists(ann_path) and os.path.getsize(ann_path) > 0:
                try:
                    index = faiss.read_index(ann_path)
                except Exception as e:
                    logger.warning(f"⚠️ FAISS index read failed: {e}. Rebuilding index.")
                    index = faiss.IndexFlatL2(self.vector_dim)
            else:
                raise FileNotFoundError("Index file missing or empty")

            # Load JSON metadata
            if os.path.exists(json_path):
                with open(json_path, "r") as f:
                    json_data = json.load(f)
                patients = json_data.get("patients", [])
            else:
                raise FileNotFoundError("Metadata file missing")
        except FileNotFoundError:
            logger.info("📁 Creating new patient database...")
            index = faiss.IndexFlatL2(self.vector_dim)
            patients = []
            json_data = {"metadata": {}, "patients": []}

        # Auto-generate ID if needed
        if not patient_data.get("id"):
            next_idx = len(patients)
            patient_data["id"] = f"patient_{next_idx:03d}"

        # Embed if not already embedded
        if "embedding" not in patient_data:
            patient_data = self.embed_patient(patient_data)

        # Add to FAISS index
        vector = np.array(patient_data["embedding"], dtype="float32").reshape(1, -1)
        index.add(vector)

        # Add to patients list
        patients.append(patient_data)

        # Update metadata
        json_data["metadata"] = {
            "total_patients": len(patients),
            "vector_dimension": self.vector_dim,
            "model": "dmis-lab/biobert-base-cased-v1.1",
            "last_updated": datetime.now().isoformat()
        }
        json_data["patients"] = patients

        # Save both files
        faiss.write_index(index, ann_path)
        with open(json_path, "w") as f:
            json.dump(json_data, f, indent=2)

        logger.info(f"✅ Patient saved: {patient_data['id']}")
        return patient_data


    def check_contraindications(
        self,
        patient: Dict,
        medicine: Dict
    ) -> Tuple[bool, List[str]]:
        """
        Check if medicine has contraindications for patient.
        Returns (is_safe, list_of_warnings)
        """
        warnings = []
        
        # Check allergies
        patient_allergies = [a.lower() for a in patient.get("drug_allergies", [])]
        medicine_ingredients = " ".join(medicine.get("active_ingredient", [])).lower()
        medicine_name = medicine.get("name", "").lower()
        
        for allergy in patient_allergies:
            if allergy in medicine_ingredients or allergy in medicine_name:
                warnings.append(f"CRITICAL: Patient allergic to {allergy}")
                return False, warnings
        
        # Check adverse reactions
        patient_reactions = [r.lower() for r in patient.get("adverse_reactions", [])]
        for reaction in patient_reactions:
            if reaction in medicine_name:
                warnings.append(f"WARNING: Patient had adverse reaction to similar medication")
        
        # Check current medications for interactions
        current_meds = [m.lower() for m in patient.get("current_medications", [])]
        medicine_warnings = " ".join(medicine.get("warnings", [])).lower()
        
        for current_med in current_meds:
            # Simple keyword matching (in production, use drug interaction database)
            if any(keyword in medicine_warnings for keyword in current_med.split()[:2]):
                warnings.append(f"CAUTION: Possible interaction with {current_med}")
        
        # Check renal function
        if patient.get("renal_function", {}).get("GFR_ml_min", 100) < 60:
            if any(keyword in medicine_warnings for keyword in ["renal", "kidney"]):
                warnings.append("CAUTION: Renal impairment - dosage adjustment may be needed")
        
        # Check pregnancy
        if patient.get("pregnancy_status") not in [None, "Not applicable", "Not pregnant"]:
            if any(keyword in medicine_warnings for keyword in ["pregnancy", "pregnant", "fetal"]):
                warnings.append("WARNING: Pregnancy contraindication - consult physician")
        
        # Check age
        patient_age = patient.get("age", 0)
        if patient_age < 18 and "pediatric" not in medicine_warnings and "children" not in medicine_warnings:
            warnings.append("CAUTION: Pediatric dosing may differ")
        elif patient_age > 65:
            warnings.append("CAUTION: Geriatric patient - monitor for adverse effects")
        
        is_safe = len([w for w in warnings if "CRITICAL" in w]) == 0
        
        return is_safe, warnings

    def recommend_medicines(
        self,
        patient_data: Dict,
        medicine_ann_path: str = "medicines.ann",
        medicine_json_path: str = "medicines_metadata.json",
        top_k: int = 10,
        similarity_threshold: float = 0.75
    ) -> List[Dict]:
        """
        Recommend medicines for a patient using semantic similarity and safety checks.
        
        Multi-pass filtering:
        1. Cosine similarity (top-k)
        2. Allergy check (critical)
        3. Contraindication check
        4. Route preference
        5. Final ranking
        """
        logger.info(f"🔍 Generating medicine recommendations for patient: {patient_data.get('name')}")
        
        # Load medicine database
        try:
            med_index = faiss.read_index(medicine_ann_path)
            with open(medicine_json_path, "r") as f:
                med_json = json.load(f)
            medicines = med_json.get("medicines", [])
        except FileNotFoundError:
            logger.error("Medicine database not found")
            return []
        
        # Embed patient if not already embedded
        if "embedding" not in patient_data:
            patient_data = self.embed_patient(patient_data)
        
        # Get patient vector
        patient_vector = np.array(patient_data["embedding"], dtype="float32").reshape(1, -1)
        
        # Search with FAISS (initial top-k * 2 for filtering)
        search_k = min(top_k * 3, len(medicines))
        distances, indices = med_index.search(patient_vector, search_k)
        
        # Convert L2 distances to cosine similarity
        # Normalize vectors first
        patient_norm = patient_vector / np.linalg.norm(patient_vector)
        
        recommendations = []
        
        for dist, idx in zip(distances[0], indices[0]):
            if idx >= len(medicines):
                continue
            
            medicine = medicines[idx]
            
            # Calculate cosine similarity
            med_vector = np.array(medicine.get("vector", []), dtype="float32")
            if len(med_vector) == 0:
                continue
            
            med_norm = med_vector / np.linalg.norm(med_vector)
            cosine_sim = float(np.dot(patient_norm, med_norm).item())
            
            # Threshold filter
            if cosine_sim < similarity_threshold:
                continue
            
            # Safety checks
            is_safe, warnings = self.check_contraindications(patient_data, medicine)
            
            # Create recommendation
            recommendation = {
                "medicine_id": medicine.get("id"),
                "medicine_name": medicine.get("name"),
                "similarity_score": cosine_sim,
                "is_safe": is_safe,
                "warnings": warnings,
                "medicine_details": {
                    "brand_name": medicine.get("brand_name", []),
                    "generic_name": medicine.get("generic_name", []),
                    "active_ingredient": medicine.get("active_ingredient", []),
                    "indications": medicine.get("indications", []),
                    "dosage": medicine.get("dosage", []),
                    "warnings": medicine.get("warnings", [])
                },
                "confidence_level": self._calculate_confidence(cosine_sim, is_safe, warnings)
            }
            
            recommendations.append(recommendation)
        
        # Sort by safety first, then similarity
        recommendations.sort(key=lambda x: (x["is_safe"], x["similarity_score"]), reverse=True)
        
        # Apply route preference filtering
        preferred_route = patient_data.get("preferred_route", "").lower()
        if preferred_route:
            route_filtered = []
            for rec in recommendations:
                dosage_text = " ".join(rec["medicine_details"].get("dosage", [])).lower()
                if preferred_route in dosage_text or not dosage_text:
                    route_filtered.append(rec)
            
            # If we have route matches, use them; otherwise keep all
            if route_filtered:
                recommendations = route_filtered
        
        # Return top_k
        final_recommendations = recommendations[:top_k]
        
        logger.info(f"✅ Generated {len(final_recommendations)} recommendations")
        logger.info(f"   Safe: {sum(1 for r in final_recommendations if r['is_safe'])}")
        logger.info(f"   Avg similarity: {np.mean([r['similarity_score'] for r in final_recommendations]):.3f}")
        
        return final_recommendations

    def _calculate_confidence(self, similarity: float, is_safe: bool, warnings: List[str]) -> str:
        """Calculate confidence level for recommendation."""
        if not is_safe:
            return "NOT RECOMMENDED"
        
        critical_warnings = len([w for w in warnings if "CRITICAL" in w])
        regular_warnings = len([w for w in warnings if "WARNING" in w])
        
        if critical_warnings > 0:
            return "LOW"
        elif similarity >= 0.90 and regular_warnings == 0:
            return "HIGH"
        elif similarity >= 0.80 and regular_warnings <= 1:
            return "MEDIUM"
        else:
            return "LOW"