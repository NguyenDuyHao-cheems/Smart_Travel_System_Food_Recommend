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
from app.nlp.query_parser import extract_tags, extract_budget

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini API URL template — model name is configurable via settings
# ---------------------------------------------------------------------------
_GEMINI_URL_TEMPLATE = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{model}:generateContent?key={key}"
)

# Fix Issue #7: System instructions ở đây, KHÔNG nhúng vào user message
_SYSTEM_INSTRUCTION = """Bạn là một chuyên gia ẩm thực và tâm lý. Nhiệm vụ của bạn là đọc câu nói của người dùng và trích xuất ra các từ khóa món ăn, không gian phù hợp để giúp hệ thống tìm kiếm quán ăn.

Dưới đây là một số ví dụ (Examples):
User: "Mình vừa chia tay người yêu, buồn quá không biết ăn gì"
JSON: {"tags": ["đồ ngọt", "kem", "yên tĩnh", "chill", "chữa lành"], "budget": null, "intent": "search_food"}

User: "Sếp mới thưởng nóng, kiếm chỗ nào nhậu tới bến luôn đem theo 500k"
JSON: {"tags": ["quán nhậu", "bia", "đông vui", "náo nhiệt", "lẩu nướng"], "budget": 500000, "intent": "search_food"}

Hãy suy luận tâm trạng và trả về DUY NHẤT một chuỗi JSON chứa "tags" (mảng chuỗi), "budget" (số nguyên hoặc null) và "intent" (chuỗi). Không giải thích gì thêm!"""


async def parse_query_with_gemini(text: str) -> Tuple[List[str], Optional[int], str]:
    """
    Gửi câu query của user tới Gemini API để trích xuất tags và budget.

    Nếu Gemini API thất bại (thiếu key, timeout, rate-limit, ...),
    tự động fallback sang phương pháp regex cơ bản.

    Returns:
        (tags, budget, intent)
    """
    # --- Thử gọi Gemini trước ---
    if settings.GEMINI_API_KEY:
        try:
            result = await _call_gemini(text)
            if result is not None:
                return result
        except Exception as e:
            logger.warning("Gemini API failed, falling back to regex: %s", e)
    else:
        logger.warning("GEMINI_API_KEY chưa được cấu hình, sử dụng regex fallback")

    # --- Fallback: dùng regex parser cũ ---
    return _regex_fallback(text)


async def _call_gemini(text: str) -> Optional[Tuple[List[str], Optional[int], str]]:
    """
    Gọi Gemini API (async httpx) và parse JSON response.
    Trả về None nếu thất bại.

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

    tags = parsed.get("tags", [])
    if not isinstance(tags, list):
        tags = [str(tags)]

    budget = parsed.get("budget")
    if not isinstance(budget, int):
        budget = None

    intent = parsed.get("intent", "search_food")

    return tags, budget, intent


def _regex_fallback(text: str) -> Tuple[List[str], Optional[int], str]:
    """Fallback dùng regex để trích xuất tags và budget khi Gemini không khả dụng."""
    tags = extract_tags(text)
    budget = extract_budget(text)
    return tags, budget, "search_food"
