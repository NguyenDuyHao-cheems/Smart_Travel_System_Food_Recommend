"""
test_ranking_service.py – unit tests for RankingService and the /ml/rank-candidates endpoint.

All tests are purely in-memory with no external dependencies.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.domains.ranking.service import RankingService
from app.domains.ranking.schemas import Candidate
from app.main import app


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_candidate(res_id: int, vector: list[float]) -> Candidate:
    return Candidate(res_id=res_id, vector=vector)


client = TestClient(app)


# ── RankingService.rank ───────────────────────────────────────────────────────

class TestRankingServiceRank:
    def setup_method(self):
        self.service = RankingService()

    def test_returns_top_5_by_default(self):
        candidates = [_make_candidate(i, [float(i), 0.0, 0.0]) for i in range(1, 11)]
        pref = [10.0, 0.0, 0.0]
        result = self.service.rank(pref, candidates)
        assert len(result) == 5

    def test_most_similar_candidate_is_first(self):
        candidates = [
            _make_candidate(1, [1.0, 0.0]),   # angle 0° → similarity 1.0
            _make_candidate(2, [0.0, 1.0]),   # angle 90° → similarity 0.0
        ]
        pref = [1.0, 0.0]
        result = self.service.rank(pref, candidates)
        assert result[0] == 1

    def test_returns_fewer_than_top_k_when_candidates_less(self):
        candidates = [_make_candidate(1, [1.0, 0.0])]
        pref = [1.0, 0.0]
        result = self.service.rank(pref, candidates, top_k=5)
        assert result == [1]

    def test_empty_candidates_returns_empty_list(self):
        result = self.service.rank([1.0, 0.0], [])
        assert result == []

    def test_zero_pref_vector_returns_first_k_candidates(self):
        """When pref is a zero vector, fallback to first top_k in order."""
        candidates = [_make_candidate(i, [float(i), 0.0]) for i in range(1, 6)]
        result = self.service.rank([0.0, 0.0], candidates, top_k=3)
        assert len(result) == 3

    def test_top_k_configurable(self):
        candidates = [_make_candidate(i, [float(i), 0.0]) for i in range(1, 11)]
        pref = [1.0, 0.0]
        result = self.service.rank(pref, candidates, top_k=3)
        assert len(result) == 3

    def test_identical_vectors_returns_all_top_k(self):
        """All candidates with same vector should all have similarity 1.0."""
        candidates = [_make_candidate(i, [1.0, 0.0]) for i in range(1, 6)]
        pref = [1.0, 0.0]
        result = self.service.rank(pref, candidates)
        assert set(result) == {1, 2, 3, 4, 5}

    def test_candidate_with_zero_vector_scores_zero(self):
        """A zero candidate vector should not beat a valid candidate."""
        candidates = [
            _make_candidate(1, [0.0, 0.0]),  # zero vector
            _make_candidate(2, [1.0, 0.0]),  # aligned with pref
        ]
        pref = [1.0, 0.0]
        result = self.service.rank(pref, candidates, top_k=2)
        assert result[0] == 2  # aligned candidate must rank first


# ── /ml/rank-candidates endpoint ─────────────────────────────────────────────

class TestRankCandidatesEndpoint:
    def _payload(self, candidates=None):
        if candidates is None:
            candidates = [
                {"res_id": 1, "vector": [1.0, 0.0]},
                {"res_id": 2, "vector": [0.0, 1.0]},
            ]
        return {"pref_vector": [1.0, 0.0], "candidates": candidates}

    def test_returns_200_with_top_ids(self):
        resp = client.post("/api/v1/ml/rank-candidates", json=self._payload())
        assert resp.status_code == 200
        data = resp.json()
        assert "top_ids" in data
        assert data["top_ids"][0] == 1  # res_id=1 is most similar

    def test_empty_candidates_returns_empty_list(self):
        resp = client.post("/api/v1/ml/rank-candidates", json=self._payload(candidates=[]))
        assert resp.status_code == 200
        assert resp.json()["top_ids"] == []

    def test_missing_pref_vector_returns_422(self):
        resp = client.post("/api/v1/ml/rank-candidates", json={"candidates": []})
        assert resp.status_code == 422

    def test_missing_candidates_returns_422(self):
        resp = client.post("/api/v1/ml/rank-candidates", json={"pref_vector": [1.0, 0.0]})
        assert resp.status_code == 422

    def test_service_value_error_returns_400(self):
        """ValueError from service (e.g., vector mismatch) should map to 400 not 500."""
        with patch(
            "app.domains.ranking.router.RankingService.rank",
            side_effect=ValueError("vector mismatch"),
        ):
            resp = client.post("/api/v1/ml/rank-candidates", json=self._payload())
        assert resp.status_code == 400
        assert "mismatch" in resp.json()["detail"]
