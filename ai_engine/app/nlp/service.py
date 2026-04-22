import torch
from .model_provider import get_tokenizer_and_model

def generate_mean_pooled_embedding(text: str) -> list[float]:
    tokenizer, model = get_tokenizer_and_model()
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True, max_length=128)
    
    with torch.no_grad():
        outputs = model(**inputs)
        attention_mask = inputs["attention_mask"].unsqueeze(-1)
        masked_embeddings = outputs.last_hidden_state * attention_mask
        sum_embeddings = masked_embeddings.sum(dim=1)
        valid_tokens = attention_mask.sum(dim=1).clamp(min=1)
        return (sum_embeddings / valid_tokens).squeeze(0).tolist()
