import httpx
from .Retrieval_service import RetrievalService
from app.core.config import Settings

class RankingService:
    def __init__(self, db):
        self.db = db

    async def get_recommendations(self, request):
        retrieval = RetrievalService(self.db)
        candidates = retrieval.get_candidates(
            tags=request.tags,
            budget=request.budget,
            user_location=request.user_location,
            radius=request.radius
        )

        if not candidates: return []

        # model_dump(by_alias=True) sẽ biến 'id' thành 'res_id' và 'embedding_vector' thành 'vector'
        # để đúng với JSON chuẩn mà AI Engine mong đợi
        formatted_candidates = [c.model_dump(by_alias=True) for c in candidates]

        return await self._call_ai_engine(
            user_id=str(request.user_id),
            user_vector=request.user_vector,
            candidates=formatted_candidates,
            user_allergies=request.user_allergies
        )

    async def _call_ai_engine(self, user_id, user_vector, candidates, user_allergies):
        payload = {
            "user_id": user_id,
            "user_vector": user_vector,
            "candidates": candidates,
            "user_allergies": user_allergies
        }

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.post(
                    f"{Settings.AI_ENGINE_BASE_URL}/ml/rank", 
                    json=payload
                )
                if response.status_code == 200:
                    # Trả về danh sách đã được AI xếp hạng
                    return response.json().get("ranked_candidates", [])
                return candidates # Nếu AI lỗi, trả về list lọc thô cho user đỡ trống
        except:
            return candidates