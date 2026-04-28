from sqlalchemy.orm import Session
from app.services.user_services import get_user_allergies, get_user_preferences_vector
from app.services.allergy_filter import filter_allergy, handle_fallback
from app.services.candidate_mapper import to_candidates
from app.domains.ranking.ranking_service import RankingService
from app.core.config import settings


# TODO: Replace with real implementation that queries the database.
def generate_candidates(query: str):
    """
    Temporary mock function để dùng cho recommendation pipeline.
    Sau này sẽ thay bằng SearchService + AI + DB.
    """

    return [
        {
            "id": 1,
            "name": "Mì Cay Sasin - Làng Đại Học",
            "ingredients": ["tôm", "ớt", "mì", "hải sản"],
            "vector": [0.1] * settings.VECTOR_DIM
        },
        {
            "id": 2,
            "name": "Mì Cay Seoul - Dĩ An",
            "ingredients": ["thịt bò", "mì", "ớt", "trân châu"],
            "vector": [0.2] * settings.VECTOR_DIM
        },
        {
            "id": 3,
            "name": "Mì Cay Naga - Làng Đại Học",
            "ingredients": ["hải sản", "mì", "ớt"],
            "vector": [0.15] * settings.VECTOR_DIM
        },
        {
            "id": 4,
            "name": "Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn",
            "ingredients": ["bạch tuộc", "mì", "ớt"],
            "vector": [0.3] * settings.VECTOR_DIM
        },
        {
            "id": 5,
            "name": "Mì Cay Sasin Hoàng Diệu 2",
            "ingredients": ["tôm", "ớt", "mì", "thịt bò"],
            "vector": [0.12] * settings.VECTOR_DIM
        }
    ]


def recommend(query: str, user_id: str, db: Session):

    ranking_service = RankingService()

    user_allergies = get_user_allergies(db, user_id)
    user_vector = get_user_preferences_vector(db, user_id)

    raw_candidates = generate_candidates(query)

    if not raw_candidates:
        return {
            "results": [],
            "filtered_out_count": 0,
            "fallback_applied": False
        }

    # 🔥 filter trước
    safe_raw, removed = filter_allergy(raw_candidates, user_allergies)

    if not safe_raw:
        fallback = handle_fallback(raw_candidates)
        return {
            "results": fallback["results"],
            "filtered_out_count": len(removed),
            "fallback_applied": True
        }

    # 🔥 convert
    candidates = to_candidates(safe_raw)

    if user_vector is None:
        user_vector = [1.0] * settings.VECTOR_DIM

    ranked_ids = ranking_service.rank(
        pref_vector=user_vector,
        candidates=candidates,
        k=5
    )

    return {
        "results": ranked_ids,
        "filtered_out_count": len(removed),
        "fallback_applied": False
    }

