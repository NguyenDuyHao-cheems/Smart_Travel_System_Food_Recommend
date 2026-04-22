from transformers import AutoTokenizer, RobertaModel
 
from app.core.config import settings
 
_tokenizer = None
_model = None
 
 
def get_tokenizer_and_model():
    global _tokenizer, _model
 
    if _tokenizer is None or _model is None:
        _tokenizer = AutoTokenizer.from_pretrained(
            settings.PHOBERT_MODEL_NAME, 
            token=settings.HF_TOKEN if settings.HF_TOKEN else None
        )
        # Sử dụng RobertaModel trực tiếp và tắt pooling layer vì ta dùng Mean Pooling thủ công
        _model = RobertaModel.from_pretrained(
            settings.PHOBERT_MODEL_NAME, 
            add_pooling_layer=False,
            token=settings.HF_TOKEN if settings.HF_TOKEN else None
        )
        _model.eval()

    return _tokenizer, _model
