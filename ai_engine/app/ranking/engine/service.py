from .Logic.lightfm_scores import BehaviorScorer
from .Logic.cosine_scores import ContentScorer
from .Logic.normalizer import ScoreNormalizer
from .Logic.re_ranker import ReRanker
from app.core.config import settings

class RankingService:
    def __init__(self):
        # Đảm bảo đường dẫn này khớp với vị trí lưu file pkl trong Docker
        self.behavior_scorer = BehaviorScorer(
            model_path=settings.LIGHTFM_MODEL_PATH,
            user_map_path=settings.USER_MAPPING_PATH,
            item_map_path=settings.ITEM_MAPPING_PATH
        )
        self.content_scorer = ContentScorer()

    async def execute_ranking_pipeline(self, user_id, user_vector, candidates, user_allergies):
        """
        Quy trình xử lý: Get IDs -> Scores -> Normalize -> Hybrid -> Re-rank
        """
        # 1. Trích xuất ID (Schema đã alias res_id thành id)
        item_ids = [c['id'] for c in candidates]

        # 2. Tính điểm Behavior (LightFM)
        lfm_raw = self.behavior_scorer.predict_scores(user_id, item_ids)
        lfm_scores = ScoreNormalizer.min_max_scale(lfm_raw)

        # 3. Tính điểm Content (Cosine)
        cos_raw = self.content_scorer.compute(user_vector, candidates)
        cos_scores = ScoreNormalizer.min_max_scale(cos_raw)

        # 4. Hybrid Scoring (50/50) và giữ lại toàn bộ data (name, price, image...)
        for i in range(len(candidates)):
            # Cộng điểm 2 bộ scorer
            candidates[i]['final_score'] = (lfm_scores[i] * 0.5) + (cos_scores[i] * 0.5)

        # 5. Re-ranking: Lọc dị ứng và Sort
        final_ranked = ReRanker.apply_rules(candidates, user_allergies)

        return final_ranked