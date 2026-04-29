import logging
import httpx
from typing import List, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

async def embed_text(text: str) -> Optional[List[float]]:
    """
    Send text to the AI Engine to produce a 768-dim PhoBERT embedding.
    Validates the dimension against settings.VECTOR_DIM.
    
    Returns None if the engine is unreachable or returns an unexpected dim.
    """
    if not text.strip():
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.AI_ENGINE_BASE_URL}/api/v1/nlp/extract-intent",
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
    except Exception as exc:
        logger.error("AI engine unreachable for embedding: %s", exc)
        return None

class AIServiceClient:
    """
    Client for interacting with the external AI Engine.
    Handles health checks and other non-embedding tasks.
    """
    def __init__(self, base_url: str):
        self.base_url = base_url

    async def check_health(self) -> bool:
        """Return True if the AI engine is reachable and healthy."""
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{self.base_url}/api/health")
                return response.status_code == 200
        except Exception as exc:
            logger.error("AI engine health check failed: %s", exc)
            return False

_client_instance: Optional[AIServiceClient] = None

def get_ai_client() -> AIServiceClient:
    """Singleton factory for the AIServiceClient."""
    global _client_instance
    if _client_instance is None:
        _client_instance = AIServiceClient(base_url=settings.AI_ENGINE_BASE_URL)
    return _client_instance
