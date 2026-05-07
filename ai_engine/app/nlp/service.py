import hashlib
import logging
import random

from app.core.config import settings
from .model_provider import get_embedding_model

logger = logging.getLogger(__name__)

def _fallback_embedding(text: str) -> list[float]:
    """Deterministic pseudo-random embedding used when model is unavailable.

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
        model = get_embedding_model()
        vector = model.encode(text).tolist()

        if len(vector) != settings.VECTOR_DIM:
            logger.warning("Embedding dimension mismatch: got %s", len(vector))
            return _fallback_embedding(text)

        return [float(value) for value in vector]

    except Exception as exc:
        logger.warning("Embedding model unavailable, using fallback vector: %s", exc)
        return _fallback_embedding(text)
