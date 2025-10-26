from django.core.management.base import BaseCommand
from CorText.utils.semantic_extractor import Medicine_Extractor
import logging

logging.basicConfig(level=logging.INFO)

class Command(BaseCommand):
    help = 'Fetch medicines from openFDA, normalize with RxNorm, enrich with DailyMed, and embed with BioBERT'

    def handle(self, *args, **options):
        self.stdout.write('🚀 Starting full medicine embedding pipeline...')

        extractor = Medicine_Extractor()

        # Step 1: Fetch raw data from openFDA
        self.stdout.write('📦 Fetching medicines from openFDA...')
        raw_medicines = extractor.fetch_all_medicines_from_api(limit=10)
        if not raw_medicines:
            self.stdout.write(self.style.ERROR('❌ Failed to fetch medicines from openFDA'))
            return

        # Step 2: Normalize names using RxNorm
        self.stdout.write('🔍 Normalizing medicine names with RxNorm...')
        normalized_medicines = extractor.normalize_with_rxnorm(raw_medicines)
        if not normalized_medicines:
            self.stdout.write(self.style.ERROR('❌ RxNorm normalization failed'))
            return

        # Step 3: Optionally enrich with DailyMed
        self.stdout.write('📚 Enriching medicine profiles with DailyMed...')
        enriched_medicines = extractor.enrich_with_dailymed(normalized_medicines)

        # Step 4: Embed with BioBERT and build FAISS index
        self.stdout.write('🧠 Embedding medicines with BioBERT and building FAISS index...')
        index, final_medicines = extractor.embed_and_index_medicines(
            enriched_medicines,
            index_path="medicines.ann",
            metadata_path="medicines_metadata.json"
        )

        # Final status
        if index and final_medicines:
            self.stdout.write(self.style.SUCCESS(
                f'✅ Successfully embedded {len(final_medicines)} medicines!'
            ))
        else:
            self.stdout.write(self.style.ERROR('❌ Embedding or indexing failed'))
