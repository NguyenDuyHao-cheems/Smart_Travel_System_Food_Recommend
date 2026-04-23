"""
service.py — Ranking pipeline cho Core Backend.

Pipeline:
  1. RetrievalService  → lọc thô từ DB (tags, budget, location, is_open)
  2. Feature building  → tính distance_km, similarity, price_normalized
  3. AI Engine         → LambdaMART rerank qua httpx
  4. Fallback          → cosine similarity nếu AI Engine không phản hồi
"""

import asyncio
import json
import logging
import math
from typing import Any, List, Optional

import numpy as np
from cachetools import TTLCache
from sqlalchemy.orm import Session

from .models import RestaurantModel, RestaurantTagModel, TagModel
from .schemas import Candidate, CandidateWithFeatures, RankRequest
from app.core.database import SessionLocal

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

_MAX_RETRIEVAL = 500        # max rows pulled from DB in retrieval step
_CACHE_MAX_SIZE = 1000      # TTL cache max entries
_CACHE_TTL_SECONDS = 300    # 5 minutes


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Haversine distance (km) between two GPS coordinates."""
    R = 6371.0
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Cosine similarity between two vectors. Returns 0.0 on zero vectors."""
    a = np.array(v1, dtype=np.float32)
    b = np.array(v2, dtype=np.float32)
    norm_a, norm_b = np.linalg.norm(a), np.linalg.norm(b)
    if norm_a < 1e-8 or norm_b < 1e-8:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


# ---------------------------------------------------------------------------
# RankingService
# ---------------------------------------------------------------------------


class RankingService:
    """
    Orchestrates the two-stage ranking pipeline:
      Stage 1 — RetrievalService (DB filter)
      Stage 2 — LambdaMART via AI Engine (with cosine-similarity fallback)
    """

    def __init__(self) -> None:
        self._cache: TTLCache = TTLCache(maxsize=_CACHE_MAX_SIZE, ttl=_CACHE_TTL_SECONDS)

    # ------------------------------------------------------------------
    # Public: entry point called by the router
    # ------------------------------------------------------------------

    def get_recommendations(self, db: Session, request: RankRequest) -> List[int]:
        """
        Synchronous wrapper used by the FastAPI router (sync endpoint).
        Runs the async pipeline in a new event loop.
        """
        return asyncio.run(self._async_get_recommendations(db, request))

    # ------------------------------------------------------------------
    # Async pipeline
    # ------------------------------------------------------------------

    async def _async_get_recommendations(
        self, db: Session, request: RankRequest
    ) -> List[int]:
        # 1. Retrieval — lọc thô từ DB
        retrieval = RetrievalService(db)
        candidates = retrieval.get_candidates(
            tags=request.tags,
            budget=request.budget,
            user_location=request.user_location,
            radius=request.radius,
        )

        if not candidates:
            return []

        # 2. Feature building
        user_lat, user_lng = request.user_location
        budget = request.budget or 1.0
        featured = self._build_features(
            candidates=candidates,
            pref_vector=request.pref_vector,
            user_lat=user_lat,
            user_lng=user_lng,
            budget=budget,
        )

        # 3. LambdaMART via AI Engine
        ranked_ids = await self._rank_via_ai_engine(featured, k=request.k)
        if ranked_ids:
            return ranked_ids

        # 4. Cosine-similarity fallback
        logger.warning("AI Engine unavailable — falling back to cosine similarity.")
        return self._cosine_rank(request.pref_vector, candidates, k=request.k, offset=request.offset)

    # ------------------------------------------------------------------
    # Feature building
    # ------------------------------------------------------------------

    def _build_features(
        self,
        candidates: List[Candidate],
        pref_vector: List[float],
        user_lat: float,
        user_lng: float,
        budget: float,
    ) -> List[CandidateWithFeatures]:
        """Enrich each Candidate with LambdaMART feature fields."""
        result: List[CandidateWithFeatures] = []
        for c in candidates:
            r: RestaurantModel = c._db_row  # type: ignore[attr-defined]

            # distance
            r_lat = float(getattr(r, "lat", 0) or 0)
            r_lng = float(getattr(r, "lng", 0) or 0)
            distance_km = _haversine_km(user_lat, user_lng, r_lat, r_lng)

            # similarity
            sim = _cosine_similarity(pref_vector, c.vector) if c.vector else 0.0

            # price normalised (clamp to avoid division by zero)
            price_level = float(getattr(r, "price_level", 0) or 0)
            price_norm = price_level / max(budget, 1.0)

            result.append(
                CandidateWithFeatures(
                    res_id=c.res_id,
                    similarity_score=round(max(0.0, min(1.0, sim)), 6),
                    rating=float(getattr(r, "rating", 0.0) or 0.0),
                    sentiment_score=float(getattr(r, "sentiment_score", 0.0) or 0.0),
                    distance_km=round(distance_km, 4),
                    price_normalized=round(price_norm, 4),
                    review_count=int(getattr(r, "review_count", 0) or 0),
                )
            )
        return result

    # ------------------------------------------------------------------
    # LambdaMART via AI Engine (async)
    # ------------------------------------------------------------------

    async def _rank_via_ai_engine(
        self, featured: List[CandidateWithFeatures], k: int
    ) -> List[int]:
        """Call AI Engine ranking endpoint. Returns [] on any failure."""
        from app.services.ai_client import get_ai_client

        client = get_ai_client()
        candidates_payload = [c.model_dump() for c in featured]
        result = await client.rank_candidates(candidates_payload, top_k=k)

        if result and "ranked_ids" in result:
            return result["ranked_ids"]
        return []

    # ------------------------------------------------------------------
    # Cosine-similarity fallback (cache-backed)
    # ------------------------------------------------------------------

    def _get_cache_key(self, pref_vector: List[float]) -> tuple:
        return tuple(round(x, 3) for x in pref_vector)

    def _cosine_rank(
        self,
        pref_vector: List[float],
        candidates: List[Candidate],
        k: int,
        offset: int,
    ) -> List[int]:
        key = self._get_cache_key(pref_vector)
        if key not in self._cache:
            self._build_cosine_cache(key, pref_vector, candidates)
        return self._cache.get(key, [])[offset: offset + k]

    def _build_cosine_cache(
        self, key: tuple, pref_vector: List[float], candidates: List[Candidate]
    ) -> None:
        pref = np.array(pref_vector, dtype=np.float32)
        norm_pref = np.linalg.norm(pref)

        if norm_pref == 0 or not candidates:
            self._cache[key] = []
            return

        matrix = np.array([c.vector for c in candidates], dtype=np.float32)
        matrix_norms = np.linalg.norm(matrix, axis=1)

        valid_mask = matrix_norms > 1e-8
        if not np.any(valid_mask):
            self._cache[key] = []
            return

        matrix = matrix[valid_mask]
        matrix_norms = matrix_norms[valid_mask]
        valid_candidates = [c for c, v in zip(candidates, valid_mask) if v]

        similarities = (matrix @ pref) / (matrix_norms * norm_pref)

        k_part = min(50, len(similarities))
        top_idx = np.argpartition(similarities, -k_part)[-k_part:]
        top_idx = top_idx[np.argsort(similarities[top_idx])[::-1]]

        self._cache[key] = [valid_candidates[i].res_id for i in top_idx]

    def clear_cache(self, pref_vector: List[float]) -> None:
        """Evict a specific entry (e.g. after restaurant data update)."""
        self._cache.pop(self._get_cache_key(pref_vector), None)


# ---------------------------------------------------------------------------
# RetrievalService — DB filter (unchanged logic, added _db_row on Candidate)
# ---------------------------------------------------------------------------


class RetrievalService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def get_candidates(
        self,
        tags: List[str],
        budget: float,
        user_location: List[float],
        radius: float,
    ) -> List[Candidate]:
        """
        Stage-1 retrieval: lọc thô từ Postgres.
        Trả về danh sách Candidate có gắn thêm `_db_row` để dùng ở feature building.
        """
        query = self.db.query(RestaurantModel).filter(
            RestaurantModel.is_open == True,
            RestaurantModel.price_level <= budget,
        )

        # Bounding box filter (1° ≈ 111 km)
        lat, lng = user_location
        deg_radius = radius / 111.0
        query = query.filter(
            RestaurantModel.lat.between(lat - deg_radius, lat + deg_radius),
            RestaurantModel.lng.between(lng - deg_radius, lng + deg_radius),
        )

        if tags:
            query = (
                query.join(RestaurantTagModel)
                .join(TagModel)
                .filter(TagModel.tag_name.in_(tags))
            )

        rows = query.distinct().limit(_MAX_RETRIEVAL).all()

        candidates: List[Candidate] = []
        for r in rows:
            raw_id = getattr(r, "id", 0)
            raw_vec = getattr(r, "vector", None)
            vec = self._parse_vector(raw_vec)
            if vec:
                c = Candidate(res_id=int(raw_id), vector=vec)
                c._db_row = r  # type: ignore[attr-defined]  — runtime-only attr
                candidates.append(c)

        return candidates

    def _parse_vector(self, vector_data: Any) -> List[float]:
        """Chuyển đổi dữ liệu vector từ DB sang List[float]."""
        try:
            if not vector_data:
                return []
            if isinstance(vector_data, str):
                return json.loads(vector_data)
            if isinstance(vector_data, list):
                return [float(x) for x in vector_data]
            return []
        except Exception:
            return []
