import hashlib
import logging
import random

import torch

from app.core.config import settings
from .model_provider import get_tokenizer_and_model

logger = logging.getLogger(__name__)


def _fallback_embedding(text: str) -> list[float]:
    """Deterministic pseudo-random embedding used when PhoBERT is unavailable.

    # TODO: Values are in [-0.05, 0.05] (near-zero), so cosine/dot-product
    # similarity with real embeddings will be ~0. Downstream ranking must
    # rely on other signals (tags, budget) when fallback is active.
    # Consider adding an `embedding_fallback: true` flag in the API response
    # so core_backend can adjust its ranking strategy accordingly.
    """
    seed = int(hashlib.sha256(text.encode("utf-8")).hexdigest()[:16], 16)
    rng = random.Random(seed)
    return [rng.uniform(-0.05, 0.05) for _ in range(settings.VECTOR_DIM)]


def generate_mean_pooled_embedding(text: str) -> list[float]:
    try:
        tokenizer, model = get_tokenizer_and_model()
        inputs = tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=128,
        )

        with torch.no_grad():
            outputs = model(**inputs)
            attention_mask = inputs["attention_mask"].unsqueeze(-1)
            masked_embeddings = outputs.last_hidden_state * attention_mask
            sum_embeddings = masked_embeddings.sum(dim=1)
            valid_tokens = attention_mask.sum(dim=1).clamp(min=1)
            vector = (sum_embeddings / valid_tokens).squeeze(0).tolist()

        if len(vector) != settings.VECTOR_DIM:
            logger.warning("Embedding dimension mismatch: got %s", len(vector))
            return _fallback_embedding(text)

        return [float(value) for value in vector]

    except Exception as exc:
        logger.warning("Embedding model unavailable, using fallback vector: %s", exc)
        return _fallback_embedding(text)
