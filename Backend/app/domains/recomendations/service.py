import re
from typing import Optional

import torch
from transformers import AutoTokenizer, AutoModel


MODEL_NAME = "vinai/phobert-base"

# Load tokenizer + model một lần khi server khởi động
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModel.from_pretrained(MODEL_NAME)
model.eval()


def extract_budget(text: str) -> Optional[int]:
    text = text.lower().strip()

    # Ví dụ: 200k, 150k
    match_k = re.search(r"(\d+)\s*k", text)
    if match_k:
        return int(match_k.group(1)) * 1000

    # Ví dụ: 200000đ, 200000 vnd
    match_vnd = re.search(r"(\d+)\s*(vnd|đ|dong)?", text)
    if match_vnd:
        value = int(match_vnd.group(1))
        if value >= 1000:
            return value

    return None


def extract_tags(text: str):
    text = text.lower().strip()

    # Bỏ phần budget để không lẫn vào tags
    text = re.sub(r"\d+\s*k", " ", text)
    text = re.sub(r"\d+\s*(vnd|đ|dong)?", " ", text)

    stop_words = {
        "duoi", "dưới", "tren", "trên", "tam", "tầm", "khoang", "khoảng",
        "gia", "giá", "quan", "quán", "mon", "món", "toi", "tôi",
        "muon", "muốn", "an", "ăn", "toi_muon", "món_ăn"
    }

    words = re.findall(r"\w+", text, flags=re.UNICODE)

    tags = []
    for w in words:
        if w in stop_words:
            continue
        if w.isdigit():
            continue
        if w not in tags:
            tags.append(w)

    return tags


def generate_query_vector(text: str):
    """
    Tạo vector 768 chiều bằng PhoBERT base.
    Dùng mean pooling trên last_hidden_state.
    """
    inputs = tokenizer(
        text,
        return_tensors="pt",
        truncation=True,
        padding=True,
        max_length=128
    )

    with torch.no_grad():
        outputs = model(**inputs)
        last_hidden_state = outputs.last_hidden_state  # shape: [1, seq_len, 768]
        attention_mask = inputs["attention_mask"].unsqueeze(-1)  # [1, seq_len, 1]

        # Mean pooling có mask
        masked_embeddings = last_hidden_state * attention_mask
        sum_embeddings = masked_embeddings.sum(dim=1)            # [1, 768]
        valid_tokens = attention_mask.sum(dim=1).clamp(min=1)   # [1, 1]
        vector = sum_embeddings / valid_tokens                   # [1, 768]

    return vector.squeeze(0).tolist()


def parse_query(text: str, lat: Optional[float] = None, lng: Optional[float] = None):
    query_vector = generate_query_vector(text)

    return {
        "raw_text": text,
        "tags": extract_tags(text),
        "budget": extract_budget(text),
        "query_vector": query_vector,
        "lat": lat,
        "lng": lng,
    }