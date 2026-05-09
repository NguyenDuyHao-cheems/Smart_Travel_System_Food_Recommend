import logging
import httpx
from typing import List, Optional

from sqlalchemy.orm import Session

from app.services.user_services import get_user_allergies, get_user_preferences_vector
from app.services.allergy_filter import filter_allergy, handle_fallback, fetch_allergen_map
from app.domains.ranking.retrieval_service import RetrievalService
from app.domains.ranking.feature_service import FeatureService
from app.core.config import settings

logger = logging.getLogger(__name__)


async def recommend(
    query: str,
    user_id: str,
    db: Session,
    query_vector: Optional[List[float]] = None,
    budget: int = 0,
    user_location: Optional[List[float]] = None,
    radius: float = 5.0,
    tag_name: Optional[str] = None,
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
        query_text=query,
        tag_name=tag_name,
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

    # --- BƯỚC MỚI: Gọi AI Engine để rerank ---
    COSINE_THRESHOLD = 0.80  # distance <= 0.80 tương đương sim >= 20%
    
    if final_vector:
        qualified_candidates = [c for c in safe_candidates if hasattr(c, 'distance') and c.distance is not None and c.distance <= COSINE_THRESHOLD]
        if len(qualified_candidates) < 3:
            logger.info("Chỉ có %d ứng viên đạt chuẩn (distance <= %.2f) — Bỏ qua LambdaMART rerank để giữ cosine order", len(qualified_candidates), COSINE_THRESHOLD)
            return {
                "results": safe_candidates,
                "filtered_out_count": len(removed),
                "fallback_applied": False,
            }
        top_candidates = qualified_candidates[:50]
    else:
        top_candidates = safe_candidates[:50]

    logger.info(
        "Retrieval quality: total=%d, selected_for_rerank=%d, best_dist=%.3f, worst_dist=%.3f",
        len(safe_candidates),
        len(top_candidates),
        min([c.distance for c in top_candidates if hasattr(c, 'distance') and c.distance is not None], default=-1.0),
        max([c.distance for c in top_candidates if hasattr(c, 'distance') and c.distance is not None], default=-1.0)
    )
    
    feature_svc = FeatureService()
    featured = feature_svc.build_integer_features(
        top_candidates,
        user_lat=user_location[0] if user_location else 0.0,
        user_lng=user_location[1] if user_location else 0.0,
        budget=budget,
        query_text=query
    )
    
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            payload = {
                "user_id": user_id or "anonymous",
                "candidates": featured,
                "top_k": len(featured),
            }
            resp = await client.post(
                f"{settings.AI_ENGINE_BASE_URL}/api/v1/ml/rank",
                json=payload,
            )
            if resp.status_code == 200:
                data = resp.json()
                ranked_ids = data.get("ranked_ids", [])
                scores = data.get("scores", [])
                
                id_to_candidate = {str(c.id): c for c in top_candidates}
                reranked = []
                for i, rid in enumerate(ranked_ids):
                    if rid in id_to_candidate:
                        c = id_to_candidate[rid]
                        c.ranking_score = scores[i] if i < len(scores) else None
                        reranked.append(c)
                
                # Xử lý các ứng viên bị miss (nếu có)
                for c in top_candidates:
                    if str(c.id) not in {str(r.id) for r in reranked}:
                        c.ranking_score = None
                        reranked.append(c)
                        
                # Merge an toàn vào danh sách ban đầu
                reranked_ids = {str(c.id) for c in reranked}
                remaining_candidates = [c for c in safe_candidates if str(c.id) not in reranked_ids]
                safe_candidates = reranked + remaining_candidates
            else:
                logger.warning("Ranking API returned %s: %s", resp.status_code, resp.text)
    except Exception as exc:
        logger.warning("Ranking rerank failed, keeping cosine order: %s", exc)

    return {
        "results": safe_candidates,
        "filtered_out_count": len(removed),
        "fallback_applied": False,
    }
