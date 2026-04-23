from typing import List, Dict, Any
from app.domains.ranking.schemas import Candidate


def to_candidates(items: List[Dict[str, Any]]) -> List[Candidate]:
    candidates = []

    for item in items:
        try:
            res_id = int(item.get("id"))
            vector = item.get("vector", [])

            # validate vector
            if not vector or not isinstance(vector, list):
                continue

            candidates.append(
                Candidate(
                    res_id=res_id,
                    vector=[float(x) for x in vector]
                )
            )
        except Exception as e:
            print(f"[WARN] skip invalid candidate: {e}")
            continue

    return candidates