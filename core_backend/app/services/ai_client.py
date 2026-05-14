import logging
import httpx
from typing import List, Optional
from app.core.config import settings
from app.domains.search.schemas import AIResponseData

logger = logging.getLogger(__name__)

_TIMEOUT = 60.0


async def embed_text(text: str) -> Optional[List[float]]:
    """
    Gửi text đến AI Engine để lấy 768-dim PhoBERT embedding.
    Dùng cho user profile embedding (recommendation_service).

    Returns None nếu AI Engine không phản hồi hoặc trả về sai dimension.
    """
    return await get_ai_client().embed_text(text)


class AIServiceClient:
    """
    Client cho AI Engine.
    Dùng Singleton pattern qua get_ai_client() — không tạo instance mới mỗi request.
    """

    def __init__(self, base_url: str):
        self.base_url = base_url
        self._client = httpx.AsyncClient(base_url=base_url, timeout=_TIMEOUT)

    async def check_health(self) -> bool:
        """Trả về True nếu AI Engine đang hoạt động."""
        response = await self._client.get("/api/health")
        return response.status_code == 200

    async def extract_intent_and_vectorize(self, query: str) -> Optional[AIResponseData]:
        """
        Gọi AI Engine để trích xuất intent, budget và embedding vector từ query.
        """
        if not query.strip():
            return None

        response = await self._client.post(
            "/api/v1/nlp/extract-intent",
            json={"text": query},
        )
        response.raise_for_status()
        return AIResponseData(**response.json())

    async def embed_text(self, text: str) -> Optional[List[float]]:
        if not text.strip():
            return None

        response = await self._client.post(
            "/api/v1/nlp/embed",
            json={"text": text},
        )
        response.raise_for_status()
        data = response.json()
        vector = data.get("vector")

        if vector and len(vector) == settings.VECTOR_DIM:
            return vector

        logger.warning(
            "AI vector dim mismatch: expected %d, got %d",
            settings.VECTOR_DIM,
            len(vector) if vector else 0,
        )
        return None


# ---------------------------------------------------------------------------
# Singleton factory — Fix PR Issue #5: không tạo client mới mỗi request
# ---------------------------------------------------------------------------

_client_instance: Optional[AIServiceClient] = None


def get_ai_client() -> AIServiceClient:
    """Singleton factory cho AIServiceClient."""
    global _client_instance
    if _client_instance is None:
        _client_instance = AIServiceClient(base_url=settings.AI_ENGINE_BASE_URL)
    return _client_instance
