import numpy as np
from typing import List
from .schemas import Candidate


class RankingService:
    @staticmethod
    def cosine_similarity(a: List[float], b: List[float]) -> float:
        a_arr = np.asarray(a, dtype=float)
        b_arr = np.asarray(b, dtype=float)

        if a_arr.shape != b_arr.shape:
            raise ValueError(f"Vector size mismatch: {a_arr.shape} != {b_arr.shape}")

        norm_a = np.linalg.norm(a_arr)
        norm_b = np.linalg.norm(b_arr)

        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0

        return float(np.dot(a_arr, b_arr) / (norm_a * norm_b))

    def rank(
        self,
        pref_vector: List[float],
        candidates: List[Candidate],
    ) -> List[int]:
        scored = []

        for candidate in candidates:
            score = self.cosine_similarity(pref_vector, candidate.vector)
            scored.append((candidate.res_id, score))

        scored.sort(key=lambda item: item[1], reverse=True)
        return [res_id for res_id, _ in scored[:5]]