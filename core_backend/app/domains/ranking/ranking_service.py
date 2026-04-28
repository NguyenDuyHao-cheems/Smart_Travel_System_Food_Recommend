import logging
import httpx
from .retrieval_service import RetrievalService
from .feature_service import FeatureService
from app.core.config import settings

logger = logging.getLogger(__name__)

class RankingService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RankingService, cls).__new__(cls)
        return cls._instance

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
                response = await client.post(f"{settings.AI_ENGINE_BASE_URL}/api/v1/ml/rank", json=payload)
                
                if response.status_code == 200:
                    result = response.json()
                    return result.get("ranked_ids", [])
                else:
                    logger.error(f"AI Engine returned error {response.status_code}: {response.text}")
        except Exception as e:
            logger.error(f"AI Engine connection failed: {e}")


        # Bước 4: Fallback (Xếp theo khoảng cách mét nếu AI sập)
        featured.sort(key=lambda x: x['distance_m'])
        return [c['res_id'] for c in featured[:request.k]]