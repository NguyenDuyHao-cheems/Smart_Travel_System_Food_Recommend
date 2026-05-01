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



def extract_tags(text: str) -> list[str]:
    """Trích xuất danh sách tags (từ khoá) từ query bằng regex và stop-word filtering."""
    text = text.lower().strip()

    # Loại bỏ phần budget ra khỏi text trước khi tách tags
    text = re.sub(
        r"\b(?:dưới|duoi|trên|tren|tầm|tam|khoảng|khoang|tối đa|toi da|giá dưới|gia duoi|giá trên|gia tren)?\s*\d+(?:[.,]\d+)?\s*(k|nghìn|nghin|ngàn|ngan|triệu|trieu|m|vnd|vnđ|dong|đ|d)\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\b(rẻ|re|giá rẻ|gia re|bình dân|binh dan|sinh viên|sinh vien)\b",
        " ",
        text,
        flags=re.IGNORECASE,
    )


    stop_words = {
        # Đại từ / chủ ngữ
        "toi", "tôi", "minh", "mình", "ban", "bạn", "ta", "chung", "chúng",
        # Động từ phổ biến
        "muon", "muốn", "can", "cần", "tim", "tìm", "di", "đi", "cho",
        "an", "ăn", "uong", "uống", "co", "có", "la", "là", "duoc", "được",
        "biet", "biết", "thich", "thích", "xem", "kiem", "kiếm", "lam", "làm",
        # Giới từ / liên từ
        "o", "ở", "tai", "tại", "va", "và", "voi", "với", "hay", "hoac", "hoặc",
        "thi", "thì", "ma", "mà", "nhung", "nhưng", "vi", "vì", "de", "để",
        "nhu", "như", "khi", "nao", "nào", "gi", "gì", "nay", "này", "do", "đó",
        # Trạng từ / tính từ chung
        "rat", "rất", "qua", "quá", "lam", "lắm", "cung", "cũng",
        "dang", "đang", "da", "đã", "se", "sẽ", "roi", "rồi",
        "khong", "không", "chua", "chưa", "het", "hết",
        # Từ liên quan giá / vị trí
        "duoi", "dưới", "tren", "trên", "tam", "tầm", "khoang", "khoảng",
        "gia", "giá", "gan", "gần", "day", "đây", "cho", "noi", "nơi",
        # Từ đệm
        "mot", "một", "cai", "cái", "nhat", "nhất", "the", "thế",
        "hom", "hôm", "nay", "luon", "luôn", "nha", "nhé",
    }

    words = re.findall(r"\w+", text, flags=re.UNICODE)

    tags = []
    for word in words:
        if word in stop_words:
            continue
        if word.isdigit():
            continue
        if len(word) < 2:
            continue
        if word not in tags:
            tags.append(word)

    return tags
