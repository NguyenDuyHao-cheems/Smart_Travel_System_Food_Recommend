"""
llm_parser.py — Gemini-based NLP query parser.

Fix #6: Dùng httpx.AsyncClient thay urllib.request (không block event loop).
Fix #7: Dùng system_instruction field để tách prompt khỏi user input (tránh prompt injection).
"""

import json
import logging
import httpx
from typing import Tuple, List, Optional
from fastapi import Request
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini API URL template — model name is configurable via settings
# ---------------------------------------------------------------------------
_GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)

# System prompt for LLM to extract specific food names from vague queries
_SYSTEM_INSTRUCTION = """Bạn là hệ thống tiền xử lý truy vấn tìm kiếm ẩm thực. Nhiệm vụ của bạn là dịch các ngữ cảnh mơ hồ thành các món ăn cụ thể.

Các quy tắc BẮT BUỘC:
1. TUYỆT ĐỐI KHÔNG giữ lại các từ chỉ cảm xúc, thời tiết, hay mô tả trừu tượng (như "buồn", "vui", "nóng", "lạnh", "thanh mát", "comfort food", "món nóng hổi", "đồ ăn").
2. CHỈ TRẢ VỀ một danh sách các danh từ chỉ món ăn/thức uống cụ thể, phổ biến tại Việt Nam, phân cách bằng dấu phẩy.
3. Sửa lỗi chính tả tiếng Việt.
4. Loại bỏ thông tin nhiễu (ngân sách, địa điểm, sự kiện).
5. Nếu người dùng đã nhập tên một món ăn cụ thể (ví dụ: phở, bún bò), hãy giữ nguyên và bổ sung thêm 1-2 biến thể phổ biến của món đó.

Ví dụ:
User: "buồn quá ăn gì"
JSON: {"cleaned_query": "trà sữa, bánh ngọt, lẩu thái, kem, gà rán"}

User: "bún bò huê ngon"
JSON: {"cleaned_query": "bún bò Huế"}

User: "sếp thưởng nóng kiếm chỗ nhậu tới bến"
JSON: {"cleaned_query": "hải sản, lẩu bò, bia tươi, heo quay, đồ nướng"}

User: "phở"
JSON: {"cleaned_query": "phở bò, phở gà"}

User: "đi bão xong đói bụng muốn ăn gà rán"
JSON: {"cleaned_query": "gà rán"}

User: "cafe sữa"  
JSON: {"cleaned_query": "cà phê sữa đá, bạc xỉu"}

User: "Hôm nay trời nóng, thèm ăn món lạnh"
JSON: {"cleaned_query": "bingsu, kem, chè thái, sinh tố, bún thịt nướng, gỏi cuốn"}

User: "Hôm nay trời mưa, thèm ăn món nóng"
JSON: {"cleaned_query": "lẩu thái, đồ nướng, phở bò, bún bò huế, cháo sườn, bánh canh"}

User: "Muốn ăn món nước dùng thanh mát"
JSON: {"cleaned_query": "bún cá, bún riêu cua, phở gà, hủ tiếu nam vang, miến gà"}

User: "thèm món bùi"
JSON: {"cleaned_query": "xôi xéo, chè xôi nước, bánh chưng, chè đậu đen, đậu hũ lướt ván"}

User: "thèm món giòn"
JSON: {"cleaned_query": "bánh xèo, nem rán, gà rán, khoai tây chiên, da heo quay"}

Chỉ trả về JSON {"cleaned_query": "..."}, không giải thích thêm!"""


from cachetools import TTLCache

# Cache up to 1000 items, with TTL of 1 hour (3600 seconds)
_query_cache = TTLCache(maxsize=1000, ttl=3600)


async def clean_query_with_gemini(text: str, request: Optional[Request] = None) -> str:
    """
    Gửi câu query thô của user tới Gemini để làm sạch và reformulate.
    
    Gemini sẽ:
    - Sửa chính tả
    - Mở rộng query ngắn  
    - Trích xuất ý định ẩm thực thực sự
    - Loại bỏ noise (ngân sách, cảm xúc, vị trí)
    
    Returns:
        str: Câu truy vấn đã được làm sạch. Nếu Gemini fail → trả về text gốc.
    """
    normalized_text = text.strip().lower()
    print(f"[QUERY CACHE CHECK] query: '{text}' (normalized: '{normalized_text}')")
    if normalized_text in _query_cache:
        cached_val = _query_cache[normalized_text]
        print(f"[QUERY CACHE HIT] returning cached value: '{cached_val}'")
        logger.info("Query cache hit: '%s' → '%s'", text, cached_val)
        return cached_val

    print(f"[QUERY CACHE MISS] cache keys: {list(_query_cache.keys())} - calling Gemini API...")
    # --- Thử gọi Gemini trước ---
    if settings.GEMINI_API_KEY:
        try:
            if request and await request.is_disconnected():
                logger.info("User disconnected. Aborting Gemini API call.")
                return text

            result = await _call_gemini(text, request)
            if result is not None:
                _query_cache[normalized_text] = result
                print(f"[QUERY CACHE SAVE] cached: '{normalized_text}' → '{result}'")
                return result
        except Exception as e:
            logger.warning("Gemini API failed, falling back to original text: %s", e)
    else:
        logger.warning("GEMINI_API_KEY chưa được cấu hình, sử dụng original text fallback")

    # --- Fallback: dùng original text ---
    return text


async def _call_gemini(text: str, request: Optional[Request] = None) -> Optional[str]:
    """
    Gọi Gemini API để reformulate query.
    Trả về cleaned_query string hoặc None nếu thất bại.

    Fix #7: User text được gửi trong contents[].parts[].text thuần túy,
    system instructions được tách ra riêng trong system_instruction field.
    """
    if request and await request.is_disconnected():
        logger.info("User disconnected. Aborting Gemini API call.")
        return None

    url = _GEMINI_URL_TEMPLATE.format(
        model=settings.GEMINI_MODEL_NAME,
        key=settings.GEMINI_API_KEY
    )

    payload = {
        # Fix #7: system_instruction tách riêng, không nhúng user text vào đây
        "system_instruction": {
            "parts": [{"text": _SYSTEM_INSTRUCTION}]
        },
        "contents": [
            # Chỉ gửi user text thuần túy, không có format injection
            {"parts": [{"text": text}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    # Fix #6: dùng httpx async thay vì urllib blocking
    async with httpx.AsyncClient(timeout=10.0) as client:
        response = await client.post(
            url,
            json=payload,
            headers={"Content-Type": "application/json"}
        )
        response.raise_for_status()
        data_json = response.json()

    candidates = data_json.get("candidates", [])
    if not candidates:
        return None

    response_text = (
        candidates[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "{}")
    )

    parsed = json.loads(response_text)

    cleaned = parsed.get("cleaned_query", "").strip()
    if not cleaned:
        return None
    
    logger.info("Query cleaned: '%s' → '%s'", text, cleaned)
    return cleaned
