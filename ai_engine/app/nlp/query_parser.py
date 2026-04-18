import re
from typing import Optional


def extract_budget(text: str) -> Optional[int]:
    text = text.lower().strip()

    match_k = re.search(r"(\d+)\s*k", text)
    if match_k:
        return int(match_k.group(1)) * 1000

    match_vnd = re.search(r"(\d+)\s*(vnd|đ|dong)?", text)
    if match_vnd:
        value = int(match_vnd.group(1))
        if value >= 1000:
            return value

    return None


def extract_tags(text: str) -> list[str]:
    text = text.lower().strip()

    text = re.sub(r"\d+\s*k", " ", text)
    text = re.sub(r"\d+\s*(vnd|đ|dong)?", " ", text)

    stop_words = {
        "duoi", "dưới", "tren", "trên", "tam", "tầm", "khoang", "khoảng",
        "gia", "giá", "quan", "quán", "mon", "món", "toi", "tôi",
        "muon", "muốn", "an", "ăn", "gan", "gần", "day", "đây",
    }

    words = re.findall(r"\w+", text, flags=re.UNICODE)

    tags = []
    for word in words:
        if word in stop_words:
            continue
        if word.isdigit():
            continue
        if word not in tags:
            tags.append(word)

    return tags
