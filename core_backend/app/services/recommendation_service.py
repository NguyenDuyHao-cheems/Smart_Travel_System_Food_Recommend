import logging
import math
import httpx
from typing import Optional, List

from sqlalchemy.orm import Session

from app.services.user_services import get_user_allergies, get_user_preferences_vector
from app.services.allergy_filter import (
    filter_allergy, handle_fallback, 
    fetch_allergen_map, fetch_dish_detail_map, annotate_allergy
)
from app.domains.ranking.retrieval_service import RetrievalService
from app.domains.ranking.feature_service import FeatureService
from app.core.config import settings
from app.services.review_sentiment import (
    normalize_restaurant_sentiment,
    sentiment_confidence_from_review_count,
)

logger = logging.getLogger(__name__)


async def recommend(
    query: str,
    user_id: str,
    db: Session,
    query_vector: Optional[List[float]] = None,
    budget: int = 0,
    user_location: Optional[List[float]] = None,
    tag_name: Optional[str] = None,
    cleaned_query: str = "",
    search_mode: str = "basic",
):
    """
    Recommendation pipeline:
      1. RetrievalService lấy candidates từ DB (semantic ordering bằng pgvector cosine).
      2. Allergy filter loại bỏ món không an toàn.
      3. Trả về danh sách res_id đã sắp xếp.
    """
    user_allergies = get_user_allergies(db, user_id) if user_id else []
    is_emotion_search = (search_mode or "").lower() == "emotion"
    user_vector = (
        None
        if is_emotion_search
        else get_user_preferences_vector(db, user_id) if user_id else None
    )

    # Kết hợp vector: ưu tiên query hiện tại (85%) để tránh bị lệch quá nhiều do sở thích user (15%)
    # Emotion search keeps the current query vector untouched so the user's
    # saved preferences do not outweigh the immediate emotional intent.
    final_vector = query_vector
    if query_vector and user_vector and len(query_vector) == len(user_vector):
        final_vector = [(0.85 * q) + (0.15 * u) for q, u in zip(query_vector, user_vector)]
    elif user_vector and not query_vector:
        final_vector = user_vector

    # Lấy candidates từ DB với semantic ordering
    retrieval = RetrievalService(db)
    raw_candidates = retrieval.get_candidates(
        budget=budget,
        query_vector=final_vector,
        query_text=query,
        tag_name=tag_name,
        cleaned_query=cleaned_query,
    )

    if not raw_candidates:
        return {
            "results": [],
            "filtered_out_count": 0,
            "allergen_flagged_count": 0,
            "fallback_applied": False,
        }

    # Pre-fetch allergens từ dishes cho tất cả restaurant candidates
    restaurant_ids = [c.id for c in raw_candidates]
    allergen_map = fetch_allergen_map(db, restaurant_ids) if user_allergies else {}
    dish_detail_map = fetch_dish_detail_map(db, restaurant_ids) if user_allergies else {}
    
    # Thay vì filter (loại bỏ), ta annotate (gắn nhãn)
    safe_candidates, flagged_count = annotate_allergy(
        raw_candidates, user_allergies, allergen_map, dish_detail_map
    )
    removed = [] # Legacy compatibility

    # Không còn block 'if not safe_candidates' vì ta không còn loại bỏ quán nào
    if is_emotion_search:
        safe_candidates = _apply_sentiment_search_boost(safe_candidates)

    # --- BƯỚC MỚI: Gọi AI Engine để rerank ---
    COSINE_THRESHOLD = 0.80  # distance <= 0.80 tương đương sim >= 20%
    
    if final_vector:
        qualified_candidates = [c for c in safe_candidates if hasattr(c, 'distance') and c.distance is not None and c.distance <= COSINE_THRESHOLD]
        if len(qualified_candidates) < 3:
            logger.info("Chỉ có %d ứng viên đạt chuẩn (distance <= %.2f) — Bỏ qua LambdaMART rerank để giữ cosine order", len(qualified_candidates), COSINE_THRESHOLD)
            return {
                "results": safe_candidates,
                "filtered_out_count": len(removed),
                "allergen_flagged_count": flagged_count,
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
        from app.services.ai_client import get_ai_client
        data = await get_ai_client().rank_candidates(
            user_id=user_id or "anonymous",
            candidates=featured,
            top_k=len(featured),
        )
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
    except Exception as exc:
        logger.warning("Ranking rerank failed, keeping cosine order: %s", exc)

    # ── Giải pháp F: Adaptive Distance Decay (Density-Aware) ────────────────
    safe_candidates = _apply_distance_decay(safe_candidates)

    return {
        "results": safe_candidates,
        "filtered_out_count": len(removed),
        "allergen_flagged_count": flagged_count,
        "fallback_applied": False,
    }


def _apply_distance_decay(candidates):
    """
    Giải pháp F: Adaptive Distance Decay với Density-Aware Scaling.

    Điều chỉnh ranking_score của mỗi quán bằng exponential decay theo khoảng cách:
        final_score = ranking_score × exp(-dist_km / decay_scale)

    decay_scale được chọn tự động dựa trên mật độ quán trong bán kính 2km:
        - Vùng đông (≥ 10 quán gần):  decay_scale = 2.0  → phạt mạnh quán xa
        - Vùng trung bình (≥ 5 quán): decay_scale = 4.0  → phạt vừa phải
        - Vùng thưa (< 5 quán):       decay_scale = 8.0  → tha cho quán xa

    Không bao giờ loại bỏ kết quả (không có hard filter),
    chỉ điều chỉnh thứ tự sắp xếp.
    """
    if not candidates:
        return candidates

    NEARBY_RADIUS_M = 2_000  # 2km

    # Đếm số quán trong bán kính 2km để xác định mật độ vùng
    nearby_count = sum(
        1 for c in candidates
        if getattr(c, "distance_m", None) is not None
        and c.distance_m <= NEARBY_RADIUS_M
    )

    # Chọn decay_scale theo mật độ
    if nearby_count >= 10:
        decay_scale = 2.0   # Khu vực đông: phạt mạnh quán xa
    elif nearby_count >= 5:
        decay_scale = 4.0   # Khu vực trung bình
    else:
        decay_scale = 8.0   # Khu vực thưa: tha cho quán xa để tránh 0 kết quả

    logger.info(
        "Distance decay: nearby_count=%d, decay_scale=%.1f",
        nearby_count, decay_scale,
    )

    # Áp dụng decay lên ranking_score (chỉ khi có ranking_score)
    for c in candidates:
        dist_km = (getattr(c, "distance_m", 0) or 0) / 1000.0
        score = getattr(c, "ranking_score", None)
        if score is not None:
            c.ranking_score = score * math.exp(-dist_km / decay_scale)

    # Sắp xếp lại: quán có ranking_score cao nhất lên đầu
    # Quán không có ranking_score (fallback cosine) xuống cuối
    candidates.sort(
        key=lambda c: getattr(c, "ranking_score", None) or 0.0,
        reverse=True,
    )

    return candidates


def _apply_sentiment_search_boost(candidates):
    """
    Review-based sentiment pre-ranking for emotion search mode.

    This runs before LambdaMART so sentiment can shape candidate ordering and
    selection without overriding the final learned rerank step.
    """
    for c in candidates:
        if hasattr(c, "distance") and c.distance is not None:
            semantic_score = max(0.0, min(1.0, 1.0 - float(c.distance)))
        else:
            semantic_score = 0.5

        sentiment_unit = normalize_restaurant_sentiment(getattr(c, "sentiment_score", None))
        sentiment_score = (sentiment_unit + 1.0) / 2.0
        review_confidence = sentiment_confidence_from_review_count(
            getattr(c, "total_reviews", 0)
        )
        rating_score = max(0.0, min(1.0, float(getattr(c, "rating_avg", 0.0) or 0.0) / 5.0))

        c.sentiment_search_score = (
            0.60 * semantic_score
            + 0.25 * sentiment_score
            + 0.10 * review_confidence
            + 0.05 * rating_score
        )

    return sorted(
        candidates,
        key=lambda c: (
            getattr(c, "sentiment_search_score", 0.0),
            math.log1p(int(getattr(c, "total_reviews", 0) or 0)),
        ),
        reverse=True,
    )
