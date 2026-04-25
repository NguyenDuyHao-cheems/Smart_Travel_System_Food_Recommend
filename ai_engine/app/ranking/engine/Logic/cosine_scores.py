import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

class ContentScorer:
    def compute(self, user_vector: list, candidates: list):
        """
        Tính Cosine Similarity giữa user_vector và embedding_vector của từng candidate
        """
        if not user_vector or not candidates:
            return [0.0] * len(candidates)

        # Lấy embedding_vector từ các candidate (đã được alias trong schemas)
        # Lưu ý: Pydantic convert 'vector' từ backend thành 'embedding_vector' trong code
        item_vectors = [c.get('embedding_vector') for c in candidates]

        # Xử lý trường hợp có món ăn thiếu vector
        valid_vectors = []
        for v in item_vectors:
            if v and isinstance(v, list) and len(v) > 0:
                valid_vectors.append(v)
            else:
                # Nếu thiếu vector, dùng vector 0 để điểm similarity thấp
                valid_vectors.append([0.0] * len(user_vector))

        user_arr = np.array(user_vector).reshape(1, -1)
        item_arr = np.array(valid_vectors)

        try:
            scores = cosine_similarity(user_arr, item_arr)[0]
            return scores.tolist()
        except Exception as e:
            print(f"❌ Error in ContentScorer: {e}")
            return [0.5] * len(candidates)