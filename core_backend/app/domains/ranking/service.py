import numpy as np
from typing import List
from .schemas import Candidate

class RankingService:

    @staticmethod
    def cosine_similarity(a, b):
        a = np.array(a)
        b = np.array(b)
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

    def rank(self, pref_vector: List[float], candidates: List[Candidate]) -> List[int]:
        scored = []

        for c in candidates:
            score = self.cosine_similarity(pref_vector, c.vector)
            scored.append((c.res_id, score))

        # sort giảm dần
        scored.sort(key=lambda x: x[1], reverse=True)

        # lấy top 5
        return [res_id for res_id, _ in scored[:5]]