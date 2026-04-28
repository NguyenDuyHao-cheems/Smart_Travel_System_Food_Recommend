import json
from typing import Any, List

import numpy as np
from sqlalchemy.orm import Session

from .models import RestaurantModel, RestaurantTagModel, TagModel
from .schemas import Candidate, RankRequest


class RankingService:
    def __init__(self):
        from cachetools import TTLCache

        self.cache = TTLCache(maxsize=1000, ttl=300)

    def get_key(self, pref_vector: List[float]) -> Any:
        return tuple(round(x, 3) for x in pref_vector)

    def build_cache(
        self,
        key: Any,
        pref_vector: List[float],
        candidates: List[Candidate],
    ) -> None:
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)

        if norm_pref == 0 or not candidates:
            self.cache[key] = []
            return

        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)

        valid_mask = matrix_norms > 1e-8
        if not np.any(valid_mask):
            self.cache[key] = []
            return

        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, valid in zip(candidates, valid_mask) if valid]

        similarities = (matrix @ pref) / (matrix_norms * norm_pref)

        k = min(50, len(similarities))
        top_idx = np.argpartition(similarities, -k)[-k:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]

        self.cache[key] = [valid_candidates[i].res_id for i in top_idx]

    def rank(
        self,
        pref_vector: List[float],
        candidates: List[Candidate],
        k: int = 5,
        offset: int = 0,
    ) -> List[str]:
        key = self.get_key(pref_vector)
        if key not in self.cache:
            self.build_cache(key, pref_vector, candidates)
        return self.cache[key][offset : offset + k]

    def get_recommendations(self, db: Session, request: RankRequest) -> List[str]:
        retrieval_service = RetrievalService(db)
        candidates = retrieval_service.get_candidates(
            tags=request.tags,
            budget=request.budget,
            user_location=request.user_location,
            radius=request.radius,
        )

        return self.rank(
            pref_vector=request.pref_vector,
            candidates=candidates,
            k=request.k,
            offset=request.offset,
        )

    def clear_cache(self, pref_vector: List[float]) -> None:
        key = self.get_key(pref_vector)
        self.cache.pop(key, None)


class RetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(
        self,
        tags: List[str],
        budget: float,
        user_location: List[float],
        radius: float,
    ) -> List[Candidate]:
        """Retrieve rankable restaurants using the target DB schema.

        TODO: Add a price_range parser before reintroducing SQL-level budget
        filtering. Target schema stores price_range as text.
        """
        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_active == True,
            RestaurantModel.is_open_now == True,
        )

        lat, lng = user_location
        deg_radius = radius / 111.0
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius),
        )

        if tags:
            query = (
                query.join(
                    RestaurantTagModel,
                    RestaurantTagModel.res_id == RestaurantModel.id,
                )
                .join(TagModel, TagModel.id == RestaurantTagModel.tag_id)
                .filter(TagModel.name.in_(tags))
            )

        results = query.distinct().limit(500).all()

        candidates = []
        for restaurant in results:
            raw_id = getattr(restaurant, "id", "")
            raw_vec = getattr(restaurant, "embedding_vector", None)

            vector = self._parse_vector(raw_vec)
            if vector:
                candidates.append(Candidate(res_id=str(raw_id), vector=vector))

        return candidates

    def _parse_vector(self, vector_data: Any) -> List[float]:
        """Convert DB vector data into a Python list of floats."""
        try:
            if vector_data is None:
                return []
            if isinstance(vector_data, str):
                return [float(x) for x in json.loads(vector_data)]
            if isinstance(vector_data, list):
                return [float(x) for x in vector_data]
            if isinstance(vector_data, tuple):
                return [float(x) for x in vector_data]
            return [float(x) for x in vector_data]
        except Exception:
            return []
