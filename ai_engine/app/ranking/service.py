"""
service.py — AIRankingService: điều phối pipeline LightFM → LambdaMART.

Pipeline 2 tầng:
  Tầng 1: LightFM điền similarity_score cho từng (user_id, res_id)
  Tầng 2: LambdaMART rerank dựa trên tất cả features
"""

import logging
from app.ranking.lightfm_inference import LightFMInference
from app.ranking.lambdamart import LambdaMARTRanker
from app.core.config import settings

logger = logging.getLogger(__name__)


class AIRankingService:
    """
    Singleton-like: khởi tạo cả LightFM và LambdaMART một lần.
    Dùng qua get_ranking_service() trong router.
    """

    def __init__(self):
        # Tầng 1: LightFM — collaborative filtering similarity
        self.lightfm = LightFMInference()

        # Tầng 2: LambdaMART — learn-to-rank reranking
        self.lambdamart = LambdaMARTRanker(model_path=settings.LAMBDAMART_MODEL_PATH)

    def rank(self, payload: dict) -> dict:
        """
        Xếp hạng candidates theo pipeline 2 tầng:
          1. Điền similarity_score qua LightFM (nếu chưa có hoặc = 0)
          2. LambdaMART rerank

        Args:
            payload: dict với keys user_id, candidates (list of dicts), top_k

        Returns:
            {"ranked_ids": List[str], "scores": List[float]}
        """
        user_id = payload["user_id"]
        candidates = payload["candidates"]   # list of dicts (integer features)
        top_k = payload.get("top_k", 10)

        # Tầng 1: Điền similarity_score từ LightFM nếu chưa có
        for c in candidates:
            if c.get("similarity_score", 0) == 0:
                c["similarity_score"] = self.lightfm.get_similarity(
                    user_id, c["res_id"]
                )

        # Tầng 2: LambdaMART predict và rerank
        ranked_ids, scores = self.lambdamart.rank(candidates, top_k=top_k)

        return {"ranked_ids": ranked_ids, "scores": scores}
