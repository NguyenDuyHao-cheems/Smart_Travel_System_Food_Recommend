from transformers import AutoTokenizer, AutoModel

from app.core.config import settings

_tokenizer = None
_model = None


def get_tokenizer_and_model():
    global _tokenizer, _model

    if _tokenizer is None or _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(settings.PHOBERT_MODEL_NAME)
        _model = AutoModel.from_pretrained(settings.PHOBERT_MODEL_NAME)
        _model.eval()

    return _tokenizer, _model
