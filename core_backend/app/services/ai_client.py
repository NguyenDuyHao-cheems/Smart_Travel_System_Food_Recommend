import logging

import httpx
from typing import List, Optional
from app.core.config import settings
from app.domains.search.schemas import AISearchPayload, AIResponseData

logger = logging.getLogger(__name__)

_RANKING_TIMEOUT_SECONDS = 10.0

class AIServiceClient:
    async def extract_intent_and_vectorize(self, text: str) -> Optional[AIResponseData]:
        """
        Makes an asynchronous HTTP request to the ai_engine to extract intent,
        budget, and generate the vector embeddings for the provided text.
        """
        payload = AISearchPayload(text=text)
        
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{settings.AI_ENGINE_BASE_URL}/api/v1/nlp/extract-intent",
                    json=payload.model_dump()
                )
                response.raise_for_status()
                return AIResponseData(**response.json())
            except httpx.HTTPError as exc:
                logger.error("Error communicating with AI engine (NLP): %s", exc)
                return None

    async def rank_candidates(
        self,
        candidates: List[dict],
        top_k: int = 10,
    ) -> Optional[dict]:
        """
        Gọi AI Engine để rerank candidates bằng LambdaMART.

        Returns:
            {"ranked_ids": [...], "scores": [...]} hoặc None nếu AI Engine lỗi.
        """
        payload = {"candidates": candidates, "top_k": top_k}

        async with httpx.AsyncClient(timeout=_RANKING_TIMEOUT_SECONDS) as client:
            try:
                response = await client.post(
                    f"{settings.AI_ENGINE_BASE_URL}/api/v1/ranking/rank",
                    json=payload,
                )
                response.raise_for_status()
                return response.json()
            except httpx.HTTPError as exc:
                logger.error("Error communicating with AI engine (Ranking): %s", exc)
                return None


def get_ai_client() -> AIServiceClient:
    return AIServiceClient()
