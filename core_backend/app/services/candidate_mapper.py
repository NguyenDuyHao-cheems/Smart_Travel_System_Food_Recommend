import logging
from typing import List, Dict, Any
from app.domains.ranking.schemas import Candidate

logger = logging.getLogger(__name__)


def to_candidates(items: List[Dict[str, Any]]) -> List[Candidate]:
    """Chuyển đổi list of dict thành List[Candidate]."""
    candidates = []

    for item in items:
        try:
            raw_id = item.get("id")
            if raw_id is None:
                logger.warning("Skipping candidate with missing ID: %s", item)
                continue

            res_id = str(raw_id)
            vector = item.get("vector", [])

            # validate vector
            if not vector or not isinstance(vector, list):
                logger.warning("Skipping candidate %s with invalid vector: %s", res_id, vector)
                continue

            candidates.append(
                Candidate(
                    res_id=res_id,
                    vector=[float(x) for x in vector]
                )
            )
        except Exception as e:
            logger.warning("Skip invalid candidate: %s", e)
            continue

    return candidates
