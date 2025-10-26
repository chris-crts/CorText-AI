from django.core.management.base import BaseCommand
from CorText.utils.semantic_extractor import Medicine_Extractor
import logging
import json

logging.basicConfig(level=logging.INFO)


class Command(BaseCommand):
    help = 'Search for similar medicines using FAISS index or JSON vectors'

    def add_arguments(self, parser):
        parser.add_argument(
            'query',
            type=str,
            help='Search query (e.g., "pain relief", "antibiotic for infection")'
        )
        parser.add_argument(
            '--use-faiss',
            action='store_true',
            help='Use FAISS index for fast search (default: uses JSON vectors)'
        )
        parser.add_argument(
            '--ann-file',
            type=str,
            default='medicines.ann',
            help='Path to FAISS index file (only with --use-faiss)'
        )
        parser.add_argument(
            '--json-file',
            type=str,
            default='medicines_metadata.json',
            help='Path to JSON metadata file'
        )
        parser.add_argument(
            '--top-k',
            type=int,
            default=5,
            help='Number of results to return (default: 5)'
        )

    def handle(self, *args, **options):
        query = options['query']
        use_faiss = options['use_faiss']
        ann_path = options['ann_file']
        json_path = options['json_file']
        top_k = options['top_k']

        self.stdout.write('='*60)
        self.stdout.write(self.style.SUCCESS('🔍 MEDICINE SEMANTIC SEARCH'))
        self.stdout.write('='*60)
        self.stdout.write(f'Query: "{query}"')
        self.stdout.write(f'Mode: {"FAISS (high-performance)" if use_faiss else "JSON (fallback)"}')
        self.stdout.write(f'Top results: {top_k}')
        self.stdout.write('')

        # Initialize extractor
        extractor = Medicine_Extractor()

        try:
            if use_faiss:
                # Load dual format (FAISS + JSON)
                self.stdout.write('📂 Loading FAISS index and metadata...')
                index, medicines = extractor.load_dual_format(ann_path, json_path)
                
                # Search using FAISS
                results = extractor.search_with_faiss(query, index, medicines, top_k=top_k)
                
            else:
                # Load JSON only
                self.stdout.write('📂 Loading JSON metadata...')
                with open(json_path, "r") as f:
                    json_data = json.load(f)
                medicines = json_data.get("medicines", [])
                
                # Check if vectors are available in JSON
                if not medicines or "vector" not in medicines[0]:
                    self.stdout.write(self.style.ERROR(
                        '❌ No vectors found in JSON file. Use --use-faiss or rebuild with vectors in JSON.'
                    ))
                    return
                
                # Search using JSON vectors
                results = extractor.search_with_json(query, medicines, top_k=top_k)
                
        except FileNotFoundError as e:
            self.stdout.write(self.style.ERROR(f'❌ File not found: {e}'))
            self.stdout.write('Run "python manage.py embed_medicines" first to create the database.')
            return
        except json.JSONDecodeError:
            self.stdout.write(self.style.ERROR(f'❌ Invalid JSON in file: {json_path}'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'❌ Error: {e}'))
            return

        if not results:
            self.stdout.write(self.style.WARNING('⚠️  No results found'))
            return

        # Display results
        self.stdout.write('')
        self.stdout.write('='*60)
        self.stdout.write(self.style.SUCCESS(f'✅ FOUND {len(results)} SIMILAR MEDICINES'))
        self.stdout.write('='*60)
        self.stdout.write('')
        
        for i, result in enumerate(results, 1):
            medicine = result['medicine']
            similarity = result['similarity']
            
            self.stdout.write('━'*60)
            self.stdout.write(self.style.SUCCESS(f'🏆 RANK #{i}'))
            self.stdout.write('━'*60)
            
            # Similarity score with visual indicator
            bars = '█' * int(similarity * 20)
            self.stdout.write(f'Similarity: {similarity:.4f} {bars}')
            
            # Show distance if available (FAISS search)
            if 'distance' in result:
                self.stdout.write(f'L2 Distance: {result["distance"]:.4f}')
            
            self.stdout.write('')
            
            # Basic info
            self.stdout.write(f'📦 Name: {medicine.get("name", "N/A")}')
            
            if medicine.get('normalized_name') and medicine.get('normalized_name') != medicine.get('name'):
                self.stdout.write(f'🔍 Normalized: {medicine["normalized_name"]}')
                if medicine.get('rxcui'):
                    self.stdout.write(f'   RxCUI: {medicine["rxcui"]}')
            
            # Brand and generic names
            if medicine.get('brand_name'):
                brands = ', '.join(medicine['brand_name'][:3])
                if len(medicine['brand_name']) > 3:
                    brands += f' (+{len(medicine["brand_name"]) - 3} more)'
                self.stdout.write(f'🏷️  Brand Names: {brands}')
            
            if medicine.get('generic_name'):
                generics = ', '.join(medicine['generic_name'][:3])
                if len(medicine['generic_name']) > 3:
                    generics += f' (+{len(medicine["generic_name"]) - 3} more)'
                self.stdout.write(f'💊 Generic Names: {generics}')
            
            # Active ingredients
            if medicine.get('active_ingredient'):
                ingredients = medicine['active_ingredient'][:2]
                ingredients_text = ' | '.join([str(ing)[:50] for ing in ingredients])
                if len(medicine['active_ingredient']) > 2:
                    ingredients_text += f' (+{len(medicine["active_ingredient"]) - 2} more)'
                self.stdout.write(f'🧪 Active Ingredients: {ingredients_text}')
            
            # Manufacturer (if enriched)
            if medicine.get('manufacturer'):
                self.stdout.write(f'🏭 Manufacturer: {medicine["manufacturer"]}')
            
            # Indications (first 200 chars)
            if medicine.get('indications') and medicine['indications']:
                indications_text = ' '.join(medicine['indications'])
                if len(indications_text) > 200:
                    indications_text = indications_text[:200] + '...'
                self.stdout.write(f'📋 Indications: {indications_text}')
            
            # Warnings (first 150 chars)
            if medicine.get('warnings') and medicine['warnings']:
                warnings_text = ' '.join(medicine['warnings'])
                if len(warnings_text) > 150:
                    warnings_text = warnings_text[:150] + '...'
                self.stdout.write(f'⚠️  Warnings: {warnings_text}')
            
            self.stdout.write('')

        # Footer with stats
        self.stdout.write('='*60)
        self.stdout.write('📊 Search Statistics:')
        self.stdout.write(f'  ├─ Total medicines searched: {len(medicines) if "medicines" in locals() else "N/A"}')
        self.stdout.write(f'  ├─ Results returned: {len(results)}')
        self.stdout.write(f'  ├─ Search method: {"FAISS IndexFlatL2" if use_faiss else "NumPy Cosine Similarity"}')
        self.stdout.write(f'  └─ Vector dimension: {extractor.vector_dim}')
        self.stdout.write('='*60)