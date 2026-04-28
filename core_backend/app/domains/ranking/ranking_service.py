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

    def rank(self, pref_vector: list[float], candidates: list, k: int = 5) -> list[int]:
        import numpy as np
        if not candidates:
            return []
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)
        if norm_pref == 0:
            return [c.res_id for c in candidates[:k]]
            
        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)
        valid_mask = matrix_norms > 1e-8
        
        if not np.any(valid_mask):
            return [c.res_id for c in candidates[:k]]
            
        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, v in zip(candidates, valid_mask) if v]
        
        similarities = (matrix @ pref) / (matrix_norms * norm_pref)
        k = min(k, len(similarities))
        top_idx = np.argpartition(similarities, -k)[-k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]
        
        return [valid_candidates[i].res_id for i in top_idx]

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