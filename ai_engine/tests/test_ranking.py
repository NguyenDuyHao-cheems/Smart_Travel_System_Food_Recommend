"""
test_ranking.py — Integration tests for POST /api/v1/ranking/rank.

Uses `ranking_client` fixture (FastAPI TestClient with tmp_ranker injected).
"""

import time

import numpy as np
import pytest

RANK_URL = "/api/v1/ranking/rank"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def make_candidate(
    res_id: int,
    similarity: float = 0.5,
    rating: float = 4.0,
    distance_km: float = 1.0,
) -> dict:
    return {
        "res_id": res_id,
        "similarity_score": round(similarity, 4),
        "rating": rating,
        "sentiment_score": 0.2,
        "distance_km": distance_km,
        "price_normalized": 0.8,
        "review_count": 50,
    }


def post_rank(client, candidates: list, top_k: int = 5) -> dict:
    return client.post(RANK_URL, json={"candidates": candidates, "top_k": top_k})


# ---------------------------------------------------------------------------
# Happy path
# ---------------------------------------------------------------------------


class TestRankHappyPath:
    """Valid requests should return 200 with correctly shaped response."""

    def test_returns_200(self, ranking_client):
        candidates = [make_candidate(i) for i in range(5)]
        response = post_rank(ranking_client, candidates, top_k=3)
        assert response.status_code == 200

    def test_ranked_ids_length_matches_top_k(self, ranking_client):
        candidates = [make_candidate(i) for i in range(10)]
        data = post_rank(ranking_client, candidates, top_k=5).json()
        assert len(data["ranked_ids"]) == 5

    def test_scores_length_matches_ranked_ids(self, ranking_client):
        candidates = [make_candidate(i) for i in range(8)]
        data = post_rank(ranking_client, candidates, top_k=4).json()
        assert len(data["scores"]) == len(data["ranked_ids"])

    def test_scores_are_descending(self, ranking_client):
        candidates = [make_candidate(i, similarity=i * 0.05) for i in range(10)]
        data = post_rank(ranking_client, candidates, top_k=10).json()
        scores = data["scores"]
        assert all(
            scores[i] >= scores[i + 1] for i in range(len(scores) - 1)
        ), "Scores must be descending"

    def test_ranked_ids_are_subset_of_input(self, ranking_client):
        candidates = [make_candidate(i) for i in range(1, 11)]
        input_ids = {c["res_id"] for c in candidates}
        data = post_rank(ranking_client, candidates, top_k=5).json()
        assert all(rid in input_ids for rid in data["ranked_ids"])

    def test_top_k_equal_to_candidate_count(self, ranking_client):
        candidates = [make_candidate(i) for i in range(3)]
        data = post_rank(ranking_client, candidates, top_k=3).json()
        assert len(data["ranked_ids"]) == 3

    def test_single_candidate_returns_one_result(self, ranking_client):
        data = post_rank(ranking_client, [make_candidate(99)], top_k=5).json()
        assert len(data["ranked_ids"]) == 1
        assert data["ranked_ids"][0] == 99

    def test_lat_lng_optional_fields_in_candidate(self, ranking_client):
        """Candidates with only required fields (no optional) should still work."""
        candidates = [{"res_id": i, "similarity_score": 0.5} for i in range(3)]
        response = post_rank(ranking_client, candidates, top_k=3)
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# Input validation (Pydantic / FastAPI)
# ---------------------------------------------------------------------------


class TestRankValidation:
    def test_missing_candidates_returns_422(self, ranking_client):
        response = ranking_client.post(RANK_URL, json={"top_k": 5})
        assert response.status_code == 422

    def test_empty_candidates_list_returns_422(self, ranking_client):
        """min_length=1 on candidates field."""
        response = post_rank(ranking_client, [], top_k=5)
        assert response.status_code == 422

    def test_top_k_exceeds_max_50_returns_422(self, ranking_client):
        response = post_rank(ranking_client, [make_candidate(1)], top_k=100)
        assert response.status_code == 422

    def test_top_k_zero_returns_422(self, ranking_client):
        response = post_rank(ranking_client, [make_candidate(1)], top_k=0)
        assert response.status_code == 422

    def test_similarity_out_of_range_returns_422(self, ranking_client):
        candidate = make_candidate(1)
        candidate["similarity_score"] = 1.5  # > 1.0
        response = post_rank(ranking_client, [candidate], top_k=1)
        assert response.status_code == 422

    def test_negative_distance_returns_422(self, ranking_client):
        candidate = make_candidate(1)
        candidate["distance_km"] = -1.0
        response = post_rank(ranking_client, [candidate], top_k=1)
        assert response.status_code == 422


# ---------------------------------------------------------------------------
# Performance benchmark
# ---------------------------------------------------------------------------


class TestRankPerformance:
    """LambdaMART ranking of 500 candidates must complete in < 100 ms."""

    def test_500_candidates_under_100ms(self, ranking_client):
        rng = np.random.default_rng(seed=0)
        candidates = [
            make_candidate(
                res_id=i,
                similarity=float(rng.random()),
                rating=float(rng.uniform(1.0, 5.0)),
                distance_km=float(rng.uniform(0.1, 20.0)),
            )
            for i in range(500)
        ]

        start = time.perf_counter()
        response = post_rank(ranking_client, candidates, top_k=10)
        elapsed_ms = (time.perf_counter() - start) * 1000

        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        assert elapsed_ms < 100, (
            f"Ranking 500 candidates took {elapsed_ms:.1f} ms — expected < 100 ms"
        )
