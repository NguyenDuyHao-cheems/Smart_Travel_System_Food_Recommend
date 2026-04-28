from fastapi import HTTPException
from sqlalchemy.orm import Session
from .schemas import AIResponseData, SearchRecommendRequest, SearchRecommendResponse, RecommendResult
from app.services.ai_client import AIServiceClient
from app.services.recommendation_service import recommend

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

    async def process_recommend_query(self, request: SearchRecommendRequest, db: Session) -> SearchRecommendResponse:
        """
        Hàm xử lý chính cho logic gợi ý món ăn, tích hợp allergy filter và ranking.
        """
        # Gọi recommendation service pipeline
        recommend_results = recommend(
            query=request.query,
            user_id=request.user_id,
            db=db
        )

        # Map results back to RecommendResult objects
        # TODO: Cần fetch data từ DB để trả về RecommendResult đầy đủ thay vì chỉ mock
        fake_results = [
            RecommendResult(
                id=res_id, 
                name=f"Quán ăn {res_id}", 
                match="95%", 
                dist="1.0 km", 
                price="50k", 
                rating="4.5",
                reason="Gợi ý dựa trên sở thích và dị ứng của bạn.",
                img="/images/food1.jpg"
            )
            for res_id in recommend_results["results"]
        ]

        return SearchRecommendResponse(
            results=fake_results,
            filtered_out_count=recommend_results["filtered_out_count"],
            warning=recommend_results.get("warning")
        )