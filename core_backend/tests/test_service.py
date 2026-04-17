"""
test_service.py – unit tests for OnboardingService.

All DB and HTTP calls are mocked.  Tests are purely in-memory.
"""

import math
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.domains.users.service import OnboardingService
from app.domains.users.schemas import OnboardingRequest
from tests.conftest import make_payload, DUMMY_AI_VECTOR


# ── Helpers ───────────────────────────────────────────────────────────────────

def _make_service(has_prior: bool = False) -> OnboardingService:
    """Return an OnboardingService whose repository is fully mocked."""
    repo = MagicMock()
    repo.get_by_user_id.return_value = object() if has_prior else None
    repo.upsert.return_value = MagicMock()
    return OnboardingService(repository=repo)


def _make_request(**overrides) -> OnboardingRequest:
    return OnboardingRequest(**make_payload(**overrides))


# ── _build_nlp_text ───────────────────────────────────────────────────────────

class TestBuildNlpText:
    def test_contains_all_fields(self):
        req = _make_request()
        text = OnboardingService._build_nlp_text(req)

        assert "Phở bò" in text
        assert "Bún chả" in text
        assert "25" in text
        assert "Ho Chi Minh City" in text
        assert "medium" in text

    def test_empty_restrictions_shows_none(self):
        req = _make_request(dietary_restrictions=[], allergies=[])
        text = OnboardingService._build_nlp_text(req)
        assert "none" in text.lower()

    def test_populated_restrictions_shown(self):
        req = _make_request(dietary_restrictions=["vegan"], allergies=["peanut"])
        text = OnboardingService._build_nlp_text(req)
        assert "vegan" in text
        assert "peanut" in text


# ── _combine_vectors ──────────────────────────────────────────────────────────

class TestCombineVectors:
    def test_output_length_is_773(self):
        req = _make_request()
        combined = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)
        assert len(combined) == 773

    def test_first_768_dims_unchanged(self):
        req = _make_request()
        combined = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)
        assert combined[:768] == DUMMY_AI_VECTOR

    def test_structured_dims_are_normalised(self):
        req = _make_request(
            spicy_level="hot",   # 3/4 = 0.75
            budget="high",       # 2/2 = 1.0
            age=13,              # (13-13)/(80-13) = 0.0
            dietary_restrictions=[],
            allergies=[],
        )
        structured = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)[-5:]
        assert structured[0] == pytest.approx(0.75)
        assert structured[1] == pytest.approx(1.0)
        assert structured[2] == pytest.approx(0.0)

    def test_spicy_level_none_maps_to_zero(self):
        req = _make_request(spicy_level="none")
        structured = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)[-5:]
        assert structured[0] == pytest.approx(0.0)

    def test_age_capped_at_1_for_old_user(self):
        req = _make_request(age=120)
        structured = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)[-5:]
        assert structured[2] == pytest.approx(1.0)

    def test_many_allergies_capped_at_1(self):
        req = _make_request(allergies=["a"] * 20)  # 20 > 10 → cap at 1.0
        structured = OnboardingService._combine_vectors(DUMMY_AI_VECTOR, req)[-5:]
        assert structured[4] == pytest.approx(1.0)


# ── _fallback_vector ──────────────────────────────────────────────────────────

class TestFallbackVector:
    def test_output_length_is_773(self):
        req = _make_request()
        vec = OnboardingService._fallback_vector(req)
        assert len(vec) == 773

    def test_unit_norm_first_768_dims(self):
        req = _make_request()
        vec = OnboardingService._fallback_vector(req)
        magnitude = math.sqrt(sum(v * v for v in vec[:768]))
        assert magnitude == pytest.approx(1.0, abs=1e-6)

    def test_deterministic(self):
        req = _make_request()
        assert OnboardingService._fallback_vector(req) == OnboardingService._fallback_vector(req)

    def test_different_dishes_produce_different_vectors(self):
        req1 = _make_request(favorite_dishes=["Phở", "Bún", "Bánh"])
        req2 = _make_request(favorite_dishes=["Pizza", "Sushi", "Tacos"])
        assert OnboardingService._fallback_vector(req1) != OnboardingService._fallback_vector(req2)


# ── process_onboarding ────────────────────────────────────────────────────────

class TestProcessOnboarding:
    @pytest.mark.asyncio
    async def test_success_with_ai_vector(self):
        service = _make_service(has_prior=False)
        req = _make_request()

        with patch.object(service, "_call_ai_engine", new=AsyncMock(return_value=DUMMY_AI_VECTOR)):
            response = await service.process_onboarding("user_001", req)

        assert response.status == "success"
        assert len(response.preferences_vector) == 773
        assert response.fallback is False
        assert response.popular_restaurants is None

    @pytest.mark.asyncio
    async def test_fallback_when_ai_down_and_no_prior_data(self):
        service = _make_service(has_prior=False)
        req = _make_request()

        with patch.object(service, "_call_ai_engine", new=AsyncMock(return_value=None)):
            response = await service.process_onboarding("user_002", req)

        assert response.fallback is True
        assert response.popular_restaurants is not None
        assert len(response.popular_restaurants) > 0

    @pytest.mark.asyncio
    async def test_no_fallback_when_ai_down_and_has_prior_data(self):
        """If AI is down but user already has a record, skip the fallback banner."""
        service = _make_service(has_prior=True)
        req = _make_request()

        with patch.object(service, "_call_ai_engine", new=AsyncMock(return_value=None)):
            response = await service.process_onboarding("user_003", req)

        assert response.fallback is False

    @pytest.mark.asyncio
    async def test_repository_upsert_is_called(self):
        service = _make_service()
        req = _make_request()

        with patch.object(service, "_call_ai_engine", new=AsyncMock(return_value=DUMMY_AI_VECTOR)):
            await service.process_onboarding("user_004", req)

        service._repo.upsert.assert_called_once()
        call_kwargs = service._repo.upsert.call_args.kwargs
        assert call_kwargs["user_id"] == "user_004"
        assert call_kwargs["favorite_dishes"] == req.favorite_dishes
