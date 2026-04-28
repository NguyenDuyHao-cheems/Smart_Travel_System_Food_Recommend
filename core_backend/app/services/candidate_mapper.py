import logging
from typing import List, Dict, Any
from app.domains.ranking.schemas import Candidate

logger = logging.getLogger(__name__)


def to_candidates(items: List[Dict[str, Any]]) -> List[Candidate]:
    candidates = []

    for item in items:
        try:
            raw_id = item.get("id")
            if raw_id is None:
                logger.warning(f"Skipping candidate with missing ID: {item}")
                continue

            res_id = int(raw_id)
            vector = item.get("vector", [])

            # validate vector
            if not vector or not isinstance(vector, list):
                logger.warning(f"Skipping candidate {res_id} with invalid vector: {vector}")
                continue

            candidates.append(
                Candidate(
                    res_id=res_id,
                    vector=[float(x) for x in vector]
                )
            )
        except Exception as e:
            logger.warning(f"Skip invalid candidate: {e}")
            continue

    return candidates