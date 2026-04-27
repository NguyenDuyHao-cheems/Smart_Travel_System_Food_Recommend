from .lightfm_inference import LightFMInference

class AIRankingService:
    def __init__(self):
        self.lightfm = LightFMInference()
        #TODO: self.lambdamart = LambdaMARTInference()

    def rank(self, payload):
        user_id = payload.get("user_id")
        candidates = payload.get("candidates")
        top_k = payload.get("top_k", 10)

        # 1. Điền similarity_score từ LightFM
        for c in candidates:
            c['similarity_score'] = self.lightfm.get_similarity(user_id, c['res_id'])

        # 2. TODO: LAMBDAMART RERANKING
        # Sau khi có đủ features (rating, dist, similarity...), LambdaMART sẽ predict tại đây
        
        # Hiện tại: Sắp xếp tạm theo similarity_score của LightFM
        candidates.sort(key=lambda x: x['similarity_score'], reverse=True)
        
        return {
            "ranked_ids": [c['res_id'] for c in candidates[:top_k]],
            "scores": [float(c['similarity_score']) for c in candidates[:top_k]]
        }