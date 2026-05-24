import logging
import httpx
from typing import List, Optional
from app.core.config import settings
from app.domains.search.schemas import AIResponseData
from .grpc_client import GRPCServiceClient

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
    Client cho AI Engine, hỗ trợ chuyển đổi gRPC và HTTP REST song song.
    """

    def __init__(self, base_url: str, grpc_target: str):
        self.base_url = base_url
        self.grpc_target = grpc_target
        self._http_client = httpx.AsyncClient(base_url=base_url, timeout=_TIMEOUT)
        if settings.ENABLE_GRPC:
            self._grpc_client = GRPCServiceClient(target=grpc_target)
        else:
            self._grpc_client = None

    async def check_health(self) -> bool:
        """Trả về True nếu AI Engine đang hoạt động (Thử gRPC trước nếu bật, sau đó HTTP)."""
        if settings.ENABLE_GRPC:
            if await self._grpc_client.check_health():
                return True
            logger.warning("gRPC Health Check failed, falling back to HTTP Health Check")
        try:
            response = await self._http_client.get("/api/health")
            return response.status_code == 200
        except Exception as e:
            logger.error("HTTP Health Check failed: %s", e)
            return False

    async def extract_intent_and_vectorize(self, query: str) -> Optional[AIResponseData]:
        """
        Gọi AI Engine để trích xuất intent, budget và embedding vector từ query.
        """
        if not query.strip():
            return None

        # gRPC call with HTTP Fallback
        if settings.ENABLE_GRPC:
            try:
                data = await self._grpc_client.extract_intent_and_vectorize(query)
                if data:
                    return AIResponseData(
                        raw_text=data["raw_text"],
                        cleaned_query=data["cleaned_query"],
                        vector=data["vector"],
                        lat=None,
                        lng=None
                    )
            except Exception as e:
                logger.warning("gRPC extract_intent_and_vectorize failed (%s). Falling back to HTTP REST...", e)

        # Fallback to HTTP REST
        response = await self._http_client.post(
            "/api/v1/nlp/extract-intent",
            json={"text": query},
        )
        response.raise_for_status()
        return AIResponseData(**response.json())

    async def embed_text(self, text: str) -> Optional[List[float]]:
        if not text.strip():
            return None

        # gRPC call with HTTP Fallback
        if settings.ENABLE_GRPC:
            try:
                vector = await self._grpc_client.embed_text(text)
                if vector and len(vector) == settings.VECTOR_DIM:
                    return vector
            except Exception as e:
                logger.warning("gRPC embed_text failed (%s). Falling back to HTTP REST...", e)

        # Fallback to HTTP REST
        try:
            response = await self._http_client.post(
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
        except Exception as e:
            logger.error("Error communicating with AI Engine for embed_text: %s", e)
            return None

    async def reload_recommendation_model(self) -> dict:
        """
        Gửi yêu cầu reload mô hình LightFM sang AI Engine.
        """
        # gRPC call with HTTP Fallback
        if settings.ENABLE_GRPC:
            try:
                return await self._grpc_client.reload_recommendation_model()
            except Exception as e:
                logger.warning("gRPC reload_recommendation_model failed (%s). Falling back to HTTP REST...", e)

        # Fallback to HTTP REST
        response = await self._http_client.post("/api/v1/admin/recommendations/reload")
        response.raise_for_status()
        return response.json()

    async def get_lightfm_recommendations(self, user_id: str, limit: int = 10) -> List[str]:
        """
        Lấy danh sách Restaurant IDs từ AI Engine dựa trên mô hình LightFM.
        """
        # gRPC call with HTTP Fallback
        if settings.ENABLE_GRPC:
            try:
                return await self._grpc_client.get_lightfm_recommendations(user_id, limit)
            except Exception as e:
                logger.warning("gRPC get_lightfm_recommendations failed (%s). Falling back to HTTP REST...", e)

        # Fallback to HTTP REST
        try:
            response = await self._http_client.get(
                "/api/v1/restaurants/recommendations",
                params={"user_id": str(user_id), "limit": limit}
            )
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error("Error communicating with AI Engine recommendations: %s", e)
            return []

    async def rank_candidates(self, user_id: str, candidates: List[dict], top_k: int) -> dict:
        """
        Gửi yêu cầu rerank ứng viên sang AI Engine.
        """
        # gRPC call with HTTP Fallback
        if settings.ENABLE_GRPC:
            try:
                return await self._grpc_client.rank_candidates(user_id, candidates, top_k)
            except Exception as e:
                logger.warning("gRPC rank_candidates failed (%s). Falling back to HTTP REST...", e)

        # Fallback to HTTP REST
        response = await self._http_client.post(
            "/api/v1/ml/rank",
            json={
                "user_id": str(user_id),
                "candidates": candidates,
                "top_k": top_k,
            }
        )
        response.raise_for_status()
        return response.json()

    async def close(self):
        await self._http_client.aclose()
        if self._grpc_client is not None:
            await self._grpc_client.close()


# ---------------------------------------------------------------------------
# Singleton factory
# ---------------------------------------------------------------------------

_client_instance: Optional[AIServiceClient] = None


def get_ai_client() -> AIServiceClient:
    """Singleton factory cho AIServiceClient."""
    global _client_instance
    if _client_instance is None:
        _client_instance = AIServiceClient(
            base_url=settings.AI_ENGINE_BASE_URL,
            grpc_target=settings.AI_ENGINE_GRPC_TARGET
        )
    return _client_instance
