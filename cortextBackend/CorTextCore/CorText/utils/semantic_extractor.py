from transformers import AutoTokenizer, AutoModel

class SemanticConceptExtractor:
    def __init__(self, model_name="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.vector_dim = self.model.config.hidden_size

    