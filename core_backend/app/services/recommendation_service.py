from typing import List, Optional

from sqlalchemy.orm import Session

from app.services.user_services import get_user_allergies, get_user_preferences_vector
from app.services.allergy_filter import filter_allergy, handle_fallback, fetch_allergen_map
from app.domains.ranking.retrieval_service import RetrievalService


def recommend(
    query: str,
    user_id: str,
    db: Session,
    query_vector: Optional[List[float]] = None,
    budget: int = 0,
    user_location: Optional[List[float]] = None,
    radius: float = 5.0,
):
    """
    Recommendation pipeline:
      1. RetrievalService lấy candidates từ DB (semantic ordering bằng pgvector cosine).
      2. Allergy filter loại bỏ món không an toàn.
      3. Trả về danh sách res_id đã sắp xếp.
    """
    user_allergies = get_user_allergies(db, user_id) if user_id else []
    user_vector = get_user_preferences_vector(db, user_id) if user_id else None

    # Kết hợp vector: ưu tiên query hiện tại (85%) để tránh bị lệch quá nhiều do sở thích user (15%)
    final_vector = query_vector
    if query_vector and user_vector and len(query_vector) == len(user_vector):
        final_vector = [(0.85 * q) + (0.15 * u) for q, u in zip(query_vector, user_vector)]
    elif user_vector and not query_vector:
        final_vector = user_vector

    # Lấy candidates từ DB với semantic ordering
    retrieval = RetrievalService(db)
    raw_candidates = retrieval.get_candidates(
        budget=budget,
        user_location=user_location or [0.0, 0.0],
        radius=radius,
        query_vector=final_vector,
    )

    if not raw_candidates:
        return {
            "results": [],
            "filtered_out_count": 0,
            "fallback_applied": False,
        }

    # Pre-fetch allergens từ dishes cho tất cả restaurant candidates
    restaurant_ids = [c.id for c in raw_candidates]
    allergen_map = fetch_allergen_map(db, restaurant_ids) if user_allergies else {}
    safe_candidates, removed = filter_allergy(raw_candidates, user_allergies, allergen_map)

    if not safe_candidates:
        fallback = handle_fallback(raw_candidates)
        return {
            "results": fallback["results"][:5],
            "filtered_out_count": len(removed),
            "fallback_applied": True,
            "warning": fallback.get("warning"),
        }

    # Return full objects instead of IDs

    return {
        "results": safe_candidates,
        "filtered_out_count": len(removed),
        "fallback_applied": False,
    }
