from django.core.management.base import BaseCommand
from CorText.utils.semantic_extractor import Medicine_Extractor
import logging

logging.basicConfig(level=logging.INFO)


class Command(BaseCommand):
    help = 'Fetch medicines from openFDA, normalize with RxNorm, enrich with DailyMed, and embed with BioBERT'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=10,
            help='Number of medicines to fetch from openFDA (default: 10)'
        )
        parser.add_argument(
            '--skip-normalize',
            action='store_true',
            help='Skip RxNorm normalization step'
        )
        parser.add_argument(
            '--skip-enrich',
            action='store_true',
            help='Skip DailyMed enrichment step'
        )
        parser.add_argument(
            '--ann-file',
            type=str,
            default='medicines.ann',
            help='Output path for FAISS index (.ann file)'
        )
        parser.add_argument(
            '--json-file',
            type=str,
            default='medicines_metadata.json',
            help='Output path for metadata JSON file'
        )
        parser.add_argument(
            '--no-vectors-in-json',
            action='store_true',
            help='Exclude vectors from JSON file to save space (keeps only in .ann)'
        )

    def handle(self, *args, **options):
        limit = options['limit']
        skip_normalize = options['skip_normalize']
        skip_enrich = options['skip_enrich']
        ann_path = options['ann_file']
        json_path = options['json_file']
        include_vectors_in_json = not options['no_vectors_in_json']

        self.stdout.write(self.style.SUCCESS('🚀 Starting medicine embedding pipeline...'))
        self.stdout.write(f'Settings:')
        self.stdout.write(f'  - Limit: {limit} medicines')
        self.stdout.write(f'  - Normalize: {not skip_normalize}')
        self.stdout.write(f'  - Enrich: {not skip_enrich}')
        self.stdout.write(f'  - FAISS index: {ann_path}')
        self.stdout.write(f'  - JSON metadata: {json_path}')
        self.stdout.write(f'  - Vectors in JSON: {include_vectors_in_json}')

        # Initialize extractor
        extractor = Medicine_Extractor()

        # Step 1: Fetch medicines from openFDA
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('📦 STEP 1: Fetching from openFDA'))
        self.stdout.write('='*60)
        medicines = extractor.fetch_medicines_from_openfda(limit=limit)
        
        if not medicines or len(medicines) == 0:
            self.stdout.write(self.style.ERROR('❌ Failed to fetch medicines from openFDA'))
            return
        
        self.stdout.write(self.style.SUCCESS(f'✅ Fetched {len(medicines)} medicines'))

        # Step 2: Normalize with RxNorm (optional)
        self.stdout.write('\n' + '='*60)
        if not skip_normalize:
            self.stdout.write(self.style.SUCCESS('🔍 STEP 2: Normalizing with RxNorm'))
            self.stdout.write('='*60)
            medicines = extractor.normalize_with_rxnorm(medicines)
            normalized_count = sum(1 for m in medicines if m.get("normalized"))
            self.stdout.write(self.style.SUCCESS(f'✅ Normalized {normalized_count}/{len(medicines)} medicines'))
        else:
            self.stdout.write(self.style.WARNING('⏭️  STEP 2: Skipping RxNorm normalization'))
            self.stdout.write('='*60)
            # Add normalized_name field even when skipped
            for medicine in medicines:
                medicine["normalized_name"] = medicine["name"]
                medicine["normalized"] = False

        # Step 3: Enrich with DailyMed (optional)
        self.stdout.write('\n' + '='*60)
        if not skip_enrich:
            self.stdout.write(self.style.SUCCESS('📚 STEP 3: Enriching with DailyMed'))
            self.stdout.write('='*60)
            medicines = extractor.enrich_with_dailymed(medicines)
            enriched_count = sum(1 for m in medicines if m.get("enriched"))
            self.stdout.write(self.style.SUCCESS(f'✅ Enriched {enriched_count}/{len(medicines)} medicines'))
        else:
            self.stdout.write(self.style.WARNING('⏭️  STEP 3: Skipping DailyMed enrichment'))
            self.stdout.write('='*60)
            for medicine in medicines:
                medicine["enriched"] = False

        # Step 4: Embed with BioBERT
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('🧠 STEP 4: Embedding with BioBERT'))
        self.stdout.write('='*60)
        medicines = extractor.embed_medicines(medicines, include_vectors_in_json=include_vectors_in_json)
        self.stdout.write(self.style.SUCCESS(f'✅ Embedded {len(medicines)} medicines'))

        # Step 5: Save in dual format (.ann + .json)
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('💾 STEP 5: Saving Dual-Format Vector Database'))
        self.stdout.write('='*60)
        extractor.save_dual_format(
            medicines,
            ann_path=ann_path,
            json_path=json_path,
            include_vectors_in_json=include_vectors_in_json
        )

        # Summary
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS('✅ PIPELINE COMPLETE!'))
        self.stdout.write('='*60)
        self.stdout.write('📊 Summary:')
        self.stdout.write(f'  ├─ Total medicines: {len(medicines)}')
        self.stdout.write(f'  ├─ Vector dimension: {extractor.vector_dim}')
        self.stdout.write(f'  ├─ Normalized: {sum(1 for m in medicines if m.get("normalized"))}')
        self.stdout.write(f'  ├─ Enriched: {sum(1 for m in medicines if m.get("enriched"))}')
        self.stdout.write(f'  ├─ FAISS index: {ann_path}')
        self.stdout.write(f'  └─ JSON metadata: {json_path}')
        self.stdout.write('')
        self.stdout.write('🔍 Next steps:')
        self.stdout.write(f'  python manage.py search_medicines "pain relief" --use-faiss')
        self.stdout.write('='*60)