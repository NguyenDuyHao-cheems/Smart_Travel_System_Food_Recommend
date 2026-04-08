from fastapi import HTTPException
from .schemas import AIResponseData
from app.services.ai_client import AIServiceClient

class SearchService:
    def __init__(self, ai_client: AIServiceClient):
        self.ai_client = ai_client
        
    async def process_search_query(self, query: str) -> AIResponseData:
        ai_response = await self.ai_client.extract_intent_and_vectorize(query)
        
        if not ai_response:
            raise HTTPException(status_code=503, detail="AI engine is currently unavailable.")
            
        # FUTURE IMPLEMENTATION: Database operations will be orchestrated here.
        # e.g., self.repository.search_restaurants(ai_response.vector)
        
        return ai_response
