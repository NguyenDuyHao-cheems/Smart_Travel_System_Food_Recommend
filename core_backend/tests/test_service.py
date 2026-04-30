"""
test_service.py – unit tests for OnboardingService and user_vector_builder.

All DB and HTTP calls are mocked.  Tests are purely in-memory.
"""

import math
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.domains.users.service import OnboardingService
from app.domains.users.schemas import OnboardingRequest
from app.services.user_vector_builder import (
    build_onboarding_text,
    build_profile_text,
    _normalise_whitespace,
    _join_list,
)
from app.core.config import settings
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


# ── user_vector_builder helpers ───────────────────────────────────────────────

class TestNormaliseWhitespace:
    def test_collapses_multiple_spaces(self):
        assert _normalise_whitespace("a   b    c") == "a b c"

    def test_strips_leading_trailing(self):
        assert _normalise_whitespace("  hello  ") == "hello"

    def test_newlines_become_spaces(self):
        assert _normalise_whitespace("a\nb\nc") == "a b c"


class TestJoinList:
    def test_normal_list(self):
        assert _join_list(["a", "b", "c"]) == "a, b, c"

    def test_empty_list_returns_none(self):
        assert _join_list([]) is None

    def test_none_returns_none(self):
        assert _join_list(None) is None

    def test_strips_items(self):
        assert _join_list(["  a  ", " b "]) == "a, b"

    def test_filters_empty_strings(self):
        assert _join_list(["a", "", "  ", "b"]) == "a, b"


# ── build_onboarding_text ────────────────────────────────────────────────────

class TestBuildOnboardingText:
    def test_contains_all_fields(self):
        text = build_onboarding_text(
            favorite_dishes=["Phở bò", "Bún chả", "Bánh mì"],
            spicy_level="medium",
            dietary_restrictions=[],
            allergies=[],
            budget="medium",
            location="Ho Chi Minh City",
        )
        assert "favorite_dishes:" in text
        assert "Phở bò" in text
        assert "Bún chả" in text
        assert "spicy_level: medium" in text
        assert "budget: medium" in text
        assert "location: Ho Chi Minh City" in text

    def test_empty_lists_are_skipped(self):
        text = build_onboarding_text(
            favorite_dishes=["Phở bò"],
            spicy_level="mild",
            dietary_restrictions=[],
            allergies=[],
            budget="low",
            location="Đà Nẵng",
        )
        assert "dietary_restrictions" not in text
        assert "allergies" not in text

    def test_none_fields_are_skipped(self):
        text = build_onboarding_text(
            favorite_dishes=["Bún"],
            spicy_level=None,
            dietary_restrictions=None,
            allergies=None,
            budget=None,
            location=None,
        )
        assert "spicy_level" not in text
        assert "budget" not in text

    def test_field_order_is_fixed(self):
        text = build_onboarding_text(
            favorite_dishes=["Phở"],
            spicy_level="hot",
            dietary_restrictions=["vegan"],
            allergies=["peanut"],
            budget="high",
            location="Hà Nội",
        )
        positions = [
            text.index("favorite_dishes:"),
            text.index("spicy_level:"),
            text.index("dietary_restrictions:"),
            text.index("allergies:"),
            text.index("budget:"),
            text.index("location:"),
        ]
        assert positions == sorted(positions)

    def test_no_raw_json(self):
        text = build_onboarding_text(
            favorite_dishes=["Bún bò"],
            spicy_level="medium",
            budget="medium",
            location="HCM",
        )
        assert "{" not in text
        assert "}" not in text
        assert "null" not in text.lower()
        assert "none" not in text.lower()

    def test_vietnamese_diacritics_preserved(self):
        text = build_onboarding_text(
            favorite_dishes=["Phở bò tái nạm"],
            spicy_level="medium",
            budget="medium",
            location="Thành phố Hồ Chí Minh",
        )
        assert "Phở bò tái nạm" in text
        assert "Thành phố Hồ Chí Minh" in text


# ── build_profile_text ────────────────────────────────────────────────────────

class TestBuildProfileText:
    def test_contains_all_present_fields(self):
        text = build_profile_text(
            onboarding_preferences="favorite_dishes: Phở spicy_level: medium",
            bookmarks=["Quán A", "Quán B"],
            liked_restaurants=["Pizza 4P's"],
            liked_dishes=["Phở bò"],
            recent_interactions=["viewed Quán C"],
            dietary_profile="vegetarian",
            budget_profile="medium",
            location_profile="HCM",
        )
        assert "onboarding_preferences:" in text
        assert "bookmarks:" in text
        assert "liked_restaurants:" in text
        assert "liked_dishes:" in text
        assert "recent_interactions:" in text
        assert "dietary_profile:" in text
        assert "budget_profile:" in text
        assert "location_profile:" in text

    def test_field_order_is_fixed(self):
        text = build_profile_text(
            onboarding_preferences="prefs",
            bookmarks=["a"],
            liked_restaurants=["b"],
            liked_dishes=["c"],
            recent_interactions=["d"],
            dietary_profile="e",
            budget_profile="f",
            location_profile="g",
        )
        fields = [
            "onboarding_preferences:",
            "bookmarks:",
            "liked_restaurants:",
            "liked_dishes:",
            "recent_interactions:",
            "dietary_profile:",
            "budget_profile:",
            "location_profile:",
        ]
        positions = [text.index(f) for f in fields]
        assert positions == sorted(positions)

    def test_empty_profile_returns_empty_string(self):
        text = build_profile_text()
        assert text == ""


# ── _fallback_vector ──────────────────────────────────────────────────────────

class TestFallbackVector:
    def test_output_length_is_768(self):
        req = _make_request()
        vec = OnboardingService._fallback_vector(req)
        assert len(vec) == 768

    def test_unit_norm(self):
        req = _make_request()
        vec = OnboardingService._fallback_vector(req)
        magnitude = math.sqrt(sum(v * v for v in vec))
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
        assert len(response.preferences_vector) == 768
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

    @pytest.mark.asyncio
    async def test_ai_vector_used_directly_without_extra_dims(self):
        """The AI vector (768-dim) should be used as-is, not combined with structured dims."""
        service = _make_service(has_prior=False)
        req = _make_request()

        with patch.object(service, "_call_ai_engine", new=AsyncMock(return_value=DUMMY_AI_VECTOR)):
            response = await service.process_onboarding("user_005", req)

        # The vector should be exactly the AI vector, no extra dims appended
        assert response.preferences_vector == DUMMY_AI_VECTOR
        assert len(response.preferences_vector) == settings.VECTOR_DIM
