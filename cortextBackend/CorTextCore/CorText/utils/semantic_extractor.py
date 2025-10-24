import logging
import string
import json
import numpy as np
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from annoy import AnnoyIndex
from transformers import AutoTokenizer, AutoModel
import torch
import os
from datetime import datetime

logger = logging.getLogger(__name__)

class SemanticConceptExtractor:
    def __init__(self, model_name="dmis-lab/biobert-base-cased-v1.1"):
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.model = AutoModel.from_pretrained(model_name)
        self.vector_dim = self.model.config.hidden_size

    