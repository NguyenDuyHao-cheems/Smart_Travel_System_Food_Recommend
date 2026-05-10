"""
llm_parser.py — Gemini-based NLP query parser.

Fix #6: Dùng httpx.AsyncClient thay urllib.request (không block event loop).
Fix #7: Dùng system_instruction field để tách prompt khỏi user input (tránh prompt injection).
"""

import json
import logging
import httpx
from typing import Tuple, List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini API URL template — model name is configurable via settings
# ---------------------------------------------------------------------------
_GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)

_SYSTEM_INSTRUCTION = """Bạn là hệ thống tiền xử lý truy vấn tìm kiếm quán ăn/món ăn. Nhiệm vụ:

1. Sửa lỗi chính tả tiếng Việt (ví dụ: "bún bò huê" → "bún bò Huế")
2. Mở rộng query quá ngắn/mơ hồ thành câu rõ ý định ẩm thực
3. Trích xuất ý định ẩm thực thực sự từ ngữ cảnh cảm xúc/hội thoại
4. Loại bỏ thông tin nhiễu (ngân sách, địa điểm, cảm xúc) — chỉ giữ phần mô tả món ăn/quán ăn
5. Giữ nguyên tên riêng món ăn, tên quán nếu có

Ví dụ:
User: "buồn quá ăn gì"
JSON: {"cleaned_query": "món ăn ngon phù hợp khi buồn, đồ ăn comfort food"}

User: "bún bò huê ngon"
JSON: {"cleaned_query": "bún bò Huế ngon"}

User: "sếp thưởng nóng kiếm chỗ nhậu tới bến"
JSON: {"cleaned_query": "quán nhậu, quán bia, đồ nhắm, hải sản tươi"}

User: "phở"
JSON: {"cleaned_query": "phở bò, phở gà, quán phở ngon"}

User: "đi bão xong đói bụng muốn ăn gà rán"
JSON: {"cleaned_query": "gà rán, quán gà rán giòn"}

User: "cafe sữa"  
JSON: {"cleaned_query": "quán cà phê, cà phê sữa đá"}

Chỉ trả về JSON {"cleaned_query": "..."}, không giải thích!"""


async def clean_query_with_gemini(text: str) -> str:
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
    # --- Thử gọi Gemini trước ---
    if settings.GEMINI_API_KEY:
        try:
            result = await _call_gemini(text)
            if result is not None:
                return result
        except Exception as e:
            logger.warning("Gemini API failed, falling back to original text: %s", e)
    else:
        logger.warning("GEMINI_API_KEY chưa được cấu hình, sử dụng original text fallback")

    # --- Fallback: dùng original text ---
    return text


async def _call_gemini(text: str) -> Optional[str]:
    """
    Gọi Gemini API để reformulate query.
    Trả về cleaned_query string hoặc None nếu thất bại.

    Fix #7: User text được gửi trong contents[].parts[].text thuần túy,
    system instructions được tách ra riêng trong system_instruction field.
    """
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
