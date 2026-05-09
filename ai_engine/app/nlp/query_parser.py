import re
import unicodedata
from typing import Optional


def _normalize_vietnamese(text: str) -> str:
    text = text.lower().strip()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d")


def _to_int_amount(raw_value: str, unit: str | None) -> Optional[int]:
    value = float(raw_value.replace(",", "."))
    normalized_unit = unit or ""

    if normalized_unit in {"k", "nghin", "ngan"}:
        return int(value * 1000)

    if normalized_unit in {"trieu", "m"}:
        return int(value * 1_000_000)

    amount = int(value)
    return amount if amount >= 1000 else None


def extract_budget(text: str) -> Optional[int]:
    normalized = _normalize_vietnamese(text)
    if not normalized:
        return None

    amount = r"(\d+(?:[.,]\d+)?)"
    patterns = [
        rf"\b(?:duoi|tren|tam|khoang|toi da|duoi muc|gia duoi|gia tren)\s+{amount}\s*(k|nghin|ngan|trieu|m)\b",
        rf"\b{amount}\s*(k|nghin|ngan|trieu|m)\b",
        rf"\b(?:duoi|tren|tam|khoang|toi da|gia duoi|gia tren)\s+{amount}\s*(vnd|vnd|dong|d)\b",
        rf"\b{amount}\s*(vnd|vnd|dong|d)\b",
    ]

    for pattern in patterns:
        match = re.search(pattern, normalized)
        if match:
            groups = match.groups()
            raw_value = groups[0]
            unit = groups[1] if len(groups) > 1 else None
            return _to_int_amount(raw_value, unit)

    if re.search(r"\b(re|gia re|binh dan|sinh vien)\b", normalized):
        return 30000

    return None


