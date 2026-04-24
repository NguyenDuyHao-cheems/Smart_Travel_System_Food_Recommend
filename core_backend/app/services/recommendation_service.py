from services.user_services import get_user_allergies
from services.allergy_filter import filter_allergy, handle_fallback
from services.candidate_mapper import to_candidates
from app.domains.ranking.service import RankingService
from app.domains.search.service import generate_candidates


def recommend(query: str, user_id: str):

    ranking_service = RankingService()

    user_allergies = get_user_allergies(user_id)

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
            "results": fallback["re sults"],
            "filtered_out_count": len(removed),
            "fallback_applied": True
        }

    # 🔥 convert
    candidates = to_candidates(safe_raw)

    # 🔥 vector user (mock)
    user_vector = [0.1] * 128

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
