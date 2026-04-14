import numpy as np
from typing import List, Dict, Any
from .schemas import Candidate

class RankingService:

    def __init__(self):
        # cache: {user_id: [top 50 res_id]}
        self.cache: Dict[Any, List[int]] = {}

    def get_key(self, pref_vector: List[float]) -> Any:
        # hash với độ chính xác 3 chữ số thập phân
        return tuple(round(x,3) for x in pref_vector)
    
    # build cache (tính 1 lần)
    def build_cache(self, key: Any, pref_vector: List[float], candidates: List[Candidate]) -> None:
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)


        if norm_pref == 0 or not candidates:
            self.cache[key] = []
            return

        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)

        # lọc vector 0
        valid_mask = matrix_norms > 1e-8
        if not np.any(valid_mask):
            self.cache[key] = []
            return

        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, v in zip(candidates, valid_mask) if v]

        # cosine similarity
        similarities = (matrix @ pref) / (matrix_norms * norm_pref)

        #lấy top 50 nhanh (argpartition)
        k = min(50, len(similarities))
        top_idx = np.argpartition(similarities, -k)[-k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]

        # lưu cache
        self.cache[key] = [valid_candidates[i].res_id for i in top_idx]

    # trả về top k (theo offset)
    def rank(self, pref_vector: List[float], candidates: List[Candidate], k = 5, offset = 0) -> List[int]:
        # giả sử key là hash của pref_vector (hoặc có thể dùng một ID khác nếu có)
        key = self.get_key(pref_vector)
        if key not in self.cache:
            self.build_cache(key, pref_vector, candidates)
        return self.cache[key][offset:offset+k]

    # xóa cache khi cần (ví dụ khi có update về restaurant)
    def clear_cache(self, pref_vector: List[float]) -> None:
        key = self.get_key(pref_vector)
        if key in self.cache:
            del self.cache[key]