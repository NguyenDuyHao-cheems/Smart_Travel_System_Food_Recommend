import re
from typing import Optional


def extract_budget(text: str) -> Optional[int]:
    """Trích xuất ngân sách từ query bằng regex. Ví dụ: '500k' -> 500000, '200000đ' -> 200000."""
    text = text.lower().strip()

    # Ưu tiên tìm dạng "500k"
    match_k = re.search(r"(\d+)\s*k\b", text)
    if match_k:
        return int(match_k.group(1)) * 1000

    # Tìm dạng "200000 vnd" hoặc "200000đ" — BẮT BUỘC có đơn vị tiền tệ
    match_vnd = re.search(r"(\d+)\s*(vnd|vnđ|đồng|đ)\b", text)
    if match_vnd:
        value = int(match_vnd.group(1))
        if value >= 1000:
            return value

    return None


def extract_tags(text: str) -> list[str]:
    """Trích xuất danh sách tags (từ khoá) từ query bằng regex và stop-word filtering."""
    text = text.lower().strip()

    # Loại bỏ phần budget ra khỏi text trước khi tách tags
    text = re.sub(r"\d+\s*k\b", " ", text)
    text = re.sub(r"\d+\s*(vnd|vnđ|đồng|đ)\b", " ", text)

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
