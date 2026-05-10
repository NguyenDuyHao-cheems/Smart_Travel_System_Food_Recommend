from sentence_transformers import SentenceTransformer
 
from app.core.config import settings
 
_model = None
 
 
def get_embedding_model():
    global _model
 
    if _model is None:
        _model = SentenceTransformer(
            settings.EMBEDDING_MODEL_NAME, 
            token=settings.HF_TOKEN if settings.HF_TOKEN else None
        )

    return _model
