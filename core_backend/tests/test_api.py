"""
test_api.py – integration tests for POST /api/v1/users/{user_id}/onboarding.

Uses FastAPI TestClient with an in-memory SQLite DB and a mocked AI engine.
"""

import pytest
from tests.conftest import make_payload, DUMMY_AI_VECTOR, mock_ai_ok, mock_ai_down

ONBOARDING_URL = "/api/v1/users/{user_id}/onboarding"


# ── Happy path ────────────────────────────────────────────────────────────────

class TestOnboardingHappyPath:
    def test_returns_200_with_vector(self, client):
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_new"),
                json=make_payload(),
            )
        assert resp.status_code == 200
        body = resp.json()
        assert body["status"] == "success"
        assert len(body["preferences_vector"]) == 773
        assert body["fallback"] is False
        assert body["popular_restaurants"] is None

    def test_upsert_second_call_returns_200(self, client):
        """Calling onboarding twice for the same user_id should succeed both times."""
        payload = make_payload()
        with mock_ai_ok():
            r1 = client.post(ONBOARDING_URL.format(user_id="user_repeat"), json=payload)
            r2 = client.post(ONBOARDING_URL.format(user_id="user_repeat"), json=payload)
        assert r1.status_code == 200
        assert r2.status_code == 200

    def test_vector_length_exactly_773(self, client):
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_vec"),
                json=make_payload(),
            )
        assert len(resp.json()["preferences_vector"]) == 773

    def test_different_users_get_independent_records(self, client):
        payload_a = make_payload(spicy_level="none")
        payload_b = make_payload(spicy_level="extra_hot")
        with mock_ai_ok():
            ra = client.post(ONBOARDING_URL.format(user_id="user_a"), json=payload_a)
            rb = client.post(ONBOARDING_URL.format(user_id="user_b"), json=payload_b)
        # Last structured dim (spicy) differs
        vec_a = ra.json()["preferences_vector"][-5]
        vec_b = rb.json()["preferences_vector"][-5]
        assert vec_a != vec_b


# ── Fallback behaviour ────────────────────────────────────────────────────────

class TestOnboardingFallback:
    def test_ai_down_new_user_gets_popular_restaurants(self, client):
        with mock_ai_down():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_fallback"),
                json=make_payload(),
            )
        body = resp.json()
        assert resp.status_code == 200
        assert body["fallback"] is True
        assert isinstance(body["popular_restaurants"], list)
        assert len(body["popular_restaurants"]) > 0

    def test_fallback_vector_still_373_dims(self, client):
        with mock_ai_down():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_fallback_vec"),
                json=make_payload(),
            )
        assert len(resp.json()["preferences_vector"]) == 773


# ── Validation / 422 cases ────────────────────────────────────────────────────

class TestOnboardingValidation:
    def test_too_few_dishes_returns_422(self, client):
        payload = make_payload(favorite_dishes=["only_one", "only_two"])
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_too_many_dishes_returns_422(self, client):
        payload = make_payload(
            favorite_dishes=["a", "b", "c", "d", "e", "f"]  # 6 items – exceeds max 5
        )
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_invalid_spicy_level_returns_422(self, client):
        payload = make_payload(spicy_level="nuclear")
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_invalid_budget_returns_422(self, client):
        payload = make_payload(budget="free")
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_age_below_13_returns_422(self, client):
        payload = make_payload(age=12)
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_age_above_120_returns_422(self, client):
        payload = make_payload(age=121)
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_missing_location_returns_422(self, client):
        payload = make_payload()
        del payload["location"]
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json=payload)
        assert resp.status_code == 422

    def test_empty_body_returns_422(self, client):
        resp = client.post(ONBOARDING_URL.format(user_id="user_x"), json={})
        assert resp.status_code == 422


# ── Edge cases ────────────────────────────────────────────────────────────────

class TestOnboardingEdgeCases:
    def test_boundary_age_13(self, client):
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_min_age"),
                json=make_payload(age=13),
            )
        assert resp.status_code == 200

    def test_boundary_age_120(self, client):
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_max_age"),
                json=make_payload(age=120),
            )
        assert resp.status_code == 200

    def test_max_5_dishes(self, client):
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_max_dishes"),
                json=make_payload(favorite_dishes=["a", "b", "c", "d", "e"]),
            )
        assert resp.status_code == 200

    def test_unicode_dish_names(self, client):
        """Vietnamese dish names with diacritics must not crash the NLP serialiser."""
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user_unicode"),
                json=make_payload(favorite_dishes=["Phở bò chín", "Bún bò Huế", "Bánh cuốn"]),
            )
        assert resp.status_code == 200

    def test_user_id_with_special_chars(self, client):
        """URL-encoded user_id with dashes and underscores should work."""
        with mock_ai_ok():
            resp = client.post(
                ONBOARDING_URL.format(user_id="user-123_abc"),
                json=make_payload(),
            )
        assert resp.status_code == 200
