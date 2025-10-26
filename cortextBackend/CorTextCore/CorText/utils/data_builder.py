# data_builder.py

import json
from CorText.models import Medicine  # Django model
from CorText.utils.semantic_extractor import Medicine_Extractor  # Adjust import path if needed

INDEX_PATH = "CorTextCore/CorText/assets/medicines.ann"
METADATA_PATH = "CorTextCore/CorText/assets/medicines_metadata.json"

def build_medicine_faiss_index():
    extractor = Medicine_Extractor()
    extractor.warmup()

    medicines = Medicine.objects.filter(stock_count__gt=0)
    texts = []
    ids = []
    metadata = []

    for med in medicines:
        full_text = " ".join(filter(None, [
            med.name,
            med.notes,
            med.uses,
            med.precautions,
            med.side_effects,
            med.interactions
        ]))
        texts.append(full_text)
        ids.append(str(med.id))

    # Step 1: Generate embeddings
    vectors = extractor.embed_texts(texts)  # Should return a list of NumPy arrays or lists

    # Step 2: Build FAISS index
    extractor.build_faiss_index(texts, ids, INDEX_PATH)

    # Step 3: Attach vectors to metadata
    for i, med in enumerate(medicines):
        metadata.append({
            "id": med.id,
            "name": med.name,
            "stock": med.stock_count,
            "embedding": vectors[i].tolist() if hasattr(vectors[i], "tolist") else vectors[i]
        })

    # Step 4: Save metadata
    with open(METADATA_PATH, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"✅ FAISS index built with {len(medicines)} medicines.")
    print(f"📁 Index saved to: {INDEX_PATH}")
    print(f"📁 Metadata saved to: {METADATA_PATH}")

if __name__ == "__main__":
    build_medicine_faiss_index()

    print("🏁 Full medicine embedding pipeline completed.")
