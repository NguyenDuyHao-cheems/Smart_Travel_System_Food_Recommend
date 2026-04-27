import logging
import httpx
from .retrieval_service import RetrievalService
from .feature_service import FeatureService
from app.core.config import settings

logger = logging.getLogger(__name__)

class RankingService:
    async def get_recommendations(self, db, request):
        # Bước 1: Lọc thô
        retrieval = RetrievalService(db)
        candidates = retrieval.get_candidates(
            request.tags, request.budget, request.user_location, request.radius
        )
        if not candidates:
            return []

        # Bước 2: Số hóa Features sang Integer
        feature_service = FeatureService()
        featured = feature_service.build_integer_features(
            candidates, request.user_location[0], request.user_location[1], request.budget
        )

        # Bước 3: Gọi AI Engine (Xử lý Ranking tinh)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                payload = {
                    "user_id": str(request.user_id), 
                    "candidates": featured, 
                    "top_k": request.k
                }
                # AI_ENGINE_BASE_URL: ví dụ http://ai-engine:8001
                response = await client.post(f"{settings.AI_ENGINE_BASE_URL}/ml/rank", json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("ranked_ids", [])
        except Exception as e:
            logger.error(f"AI Engine connection failed: {e}")

        # Bước 4: Fallback (Xếp theo khoảng cách mét nếu AI sập)
        featured.sort(key=lambda x: x['distance_km'])
        return [c['res_id'] for c in featured[:request.k]]