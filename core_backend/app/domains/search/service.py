from fastapi import HTTPException
from .schemas import AIResponseData, SearchRecommendRequest, SearchRecommendResponse, RecommendResult
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

    async def process_recommend_query(self, request: SearchRecommendRequest) -> SearchRecommendResponse:
        """
        Đây là Hàm xử lý chính cho logic tìm kiếm quán ăn kết hợp GPS.
        """
        # Mocking processing time as if calling AI engine and PostGIS DB
        import asyncio
        await asyncio.sleep(2)
        
        fake_results = [
            RecommendResult(
                id=1, name="Mì Cay Sasin - Làng Đại Học", match="98%", dist="1.1 km", price="49k - 89k", rating="4.9",
                reason="Khớp hoàn hảo: Nằm ngay trục đường sầm uất của Làng Đại Học. Nước dùng chuẩn vị, không gian có máy lạnh.",
                img="/images/food1.jpg"
            ),
            RecommendResult(
                id=2, name="Mì Cay Seoul - Dĩ An", match="94%", dist="2.8 km", price="45k - 75k", rating="4.7",
                reason="Nằm hướng về trung tâm Dĩ An. Nước súp đậm đà cay nồng, sợi mì dai và trân châu đường đen đi kèm cực cuốn.",
                img="/images/food2.jpg"
            ),
            RecommendResult(
                id=3, name="Mì Cay Naga - Làng Đại Học", match="89%", dist="1.2 km", price="40k - 65k", rating="4.5",
                reason="Giải pháp tối ưu ngân sách cho sinh viên cuối tháng. Giá cả cực kỳ hạt dẻ nhưng topping hải sản vẫn rất đầy đặn.",
                img="/images/food3.jpg"
            ),
            RecommendResult(
                id=4, name="Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn", match="85%", dist="4.5 km", price="45k - 79k", rating="4.8",
                reason="Không gian check-in cực đẹp mang hơi hướng sang trọng, khuyên thử món mì cay bạch tuộc tươi giòn.",
                img="/images/food4.jpg"
            ),
            RecommendResult(
                id=5, name="Mì Cay Sasin Hoàng Diệu 2", match="82%", dist="5.2 km", price="40k - 65k", rating="4.6",
                reason="Tọa lạc trên con phố ẩm thực nhộn nhịp. Thích hợp cho những buổi tối cuối tuần muốn đi xa trường một chút.",
                img="/images/food5.jpg"
            ),
        ]
        return SearchRecommendResponse(results=fake_results)
def generate_candidates(query: str):
    """
    Temporary mock function để dùng cho recommendation pipeline
    Sau này sẽ thay bằng SearchService + AI + DB
    """

    return [
        {
            "id": 1,
            "name": "Mì cay",
            "ingredients": ["tôm", "ớt", "mì"],
            "vector": [0.1] * 128
        },
        {
            "id": 2,
            "name": "Phở bò",
            "ingredients": ["thịt bò", "hành"],
            "vector": [0.2] * 128
        }
    ]