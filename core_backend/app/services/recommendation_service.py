from services.user_services import get_user_allergies
from services.allergy_filter import filter_allergy, handle_fallback
from domains.ranking.service import rank   
from domains.search.service import generate_candidates
def recommend(query: str, user_id: str):

    user_allergies = get_user_allergies(user_id)

    candidates = generate_candidates(query)

    if not candidates:
        return {
            "results": [],
            "filtered_out_count": 0
        }

    safe, removed = filter_allergy(candidates, user_allergies)

    # fallback nếu rỗng
    if not safe:
        fallback = handle_fallback(candidates)
        return {
            "results": fallback["results"],
            "filtered_out_count": len(removed),
            "warning": fallback.get("warning"),
            "fallback_applied": True
        }

    ranked = rank(safe)

    return {
        "results": ranked,
        "filtered_out_count": len(removed),
        "fallback_applied": False
    }