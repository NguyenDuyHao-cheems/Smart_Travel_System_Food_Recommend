from types import SimpleNamespace
from typing import List, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


_MAX_RETRIEVAL = 500

# DB thật dùng cột embedding_vector kiểu pgvector.
# Đây là vector embedding của nhà hàng, dùng để so khớp với query_vector.
VECTOR_COLUMN = "embedding_vector"


class SemanticRetrievalService:
    def __init__(self, db: Session):
        self.db = db

    def get_candidates(
        self,
        query_vector: List[float],
        tags: Optional[List[str]],
        budget: int,
        user_location: List[float],
        radius: float,
        limit: int = _MAX_RETRIEVAL,
    ):
        """
        Semantic retrieval đúng:
        - Nhận query_vector từ câu search của user
        - So khớp với vector của restaurants trong DB
        - Sắp xếp bằng pgvector L2 distance: vector <-> query_vector
        """
        if not query_vector:
            return []

        lat, lng = user_location
        deg_radius = radius / 111.0

        vector_literal = self._to_pgvector_literal(query_vector)

        sql = f"""
            SELECT
                r.*,
                r.{VECTOR_COLUMN} <-> CAST(:query_vector AS vector) AS semantic_distance
            FROM restaurants r
            WHERE r.is_active = true
              AND r.{VECTOR_COLUMN} IS NOT NULL
              AND r.lat BETWEEN :min_lat AND :max_lat
              AND r.lng BETWEEN :min_lng AND :max_lng
              AND (
                    :use_tags = false
                    OR EXISTS (
                        SELECT 1
                        FROM res_tags rt
                        JOIN tags t ON t.id = rt.tag_id
                        WHERE rt.res_id = r.id
                          AND t.name = ANY(:tags)
                    )
              )
            ORDER BY r.{VECTOR_COLUMN} <-> CAST(:query_vector AS vector)
            LIMIT :limit
        """

        params = {
            "query_vector": vector_literal,
            "min_lat": lat - deg_radius,
            "max_lat": lat + deg_radius,
            "min_lng": lng - deg_radius,
            "max_lng": lng + deg_radius,
            "use_tags": bool(tags),
            "tags": tags or [],
            "limit": limit,
        }

        rows = self.db.execute(text(sql), params).mappings().all()

        return [SimpleNamespace(**dict(row)) for row in rows]

    def _to_pgvector_literal(self, vector: List[float]) -> str:
        """
        Convert Python list[float] thành format pgvector:
        [0.1,0.2,0.3]
        """
        return "[" + ",".join(str(float(x)) for x in vector) + "]"