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
        
        url = f"{settings.AI_ENGINE_BASE_URL}/api/v1/nlp/extract-intent"
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                response = await client.post(url, json=payload.model_dump())
                # If upstream returns non-2xx, log and return None so callers can
                # translate it to a 503 Service Unavailable
                if response.status_code >= 400:
                    print(f"AI engine returned {response.status_code} for {url}: {response.text}")
                    return None

                # Parse and return the validated response
                return AIResponseData(**response.json())
            except httpx.HTTPError as exc:
                # Add proper error logging in production
                print(f"Error communicating with AI engine at {url}: {exc}")
                return None

def get_ai_client() -> AIServiceClient:
    return AIServiceClient()
