import httpx
from app.domains.search.schemas import AISearchPayload, AIResponseData
from typing import Optional
from app.core.config import settings

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
                
                # Parse and return the validated response
                return AIResponseData(**response.json())
            except httpx.HTTPError as exc:
                # Add proper error logging in production
                print(f"Error communicating with AI engine: {exc}")
                return None

def get_ai_client() -> AIServiceClient:
    return AIServiceClient()
