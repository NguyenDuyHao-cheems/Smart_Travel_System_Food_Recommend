import numpy as np
from typing import List
from .schemas import Candidate


class RankingService:
    def rank(
        self,
        pref_vector: List[float],
        candidates: List[Candidate],
        top_k: int = 5,  # Default value for top_k
    ) -> List[int]:
        if not candidates:
            return []

        pref = np.array(pref_vector, dtype=float)
        matrix = np.array([c.vector for c in candidates], dtype=float)  # Convert candidates to numpy array

        norm_pref = np.linalg.norm(pref)  # Calculate the norm of the preference vector
        if norm_pref == 0:
            return [c.res_id for c in candidates[:top_k]]

        norm_matrix = np.linalg.norm(matrix, axis=1)  # Calculate the norm of each candidate vector

        # Vectorized cosine similarity for all candidates in one shot
        with np.errstate(invalid="ignore"):  # silence zero-norm candidate warning
            similarities = np.dot(matrix, pref) / (norm_matrix * norm_pref)
        similarities = np.nan_to_num(similarities)  # guard NaN from zero-norm candidates

        actual_k = min(top_k, len(candidates))
        top_indices = np.argsort(similarities)[-actual_k:][::-1]  # Get the indices of the top k candidates

        return [candidates[int(i)].res_id for i in top_indices]
