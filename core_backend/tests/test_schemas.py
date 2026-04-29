"""
test_schemas.py – validation tests for OnboardingRequest / OnboardingResponse.

These tests run with no database or network access.
"""

import pytest
from pydantic import ValidationError

from app.domains.users.schemas import OnboardingRequest, OnboardingResponse, MockRestaurant
from tests.conftest import make_payload


# ── OnboardingRequest – happy path ────────────────────────────────────────────

class TestOnboardingRequestValid:
    def test_minimum_valid_payload(self):
        req = OnboardingRequest(**make_payload())
        assert len(req.favorite_dishes) == 3

    def test_maximum_dishes(self):
        req = OnboardingRequest(**make_payload(
            favorite_dishes=["Phở", "Bún", "Bánh", "Cơm", "Lẩu"]
        ))
        assert len(req.favorite_dishes) == 5

    def test_all_spicy_levels_accepted(self):
        for level in ["none", "mild", "medium", "hot", "extra_hot"]:
            req = OnboardingRequest(**make_payload(spicy_level=level))
            assert req.spicy_level == level

    def test_all_budget_tiers_accepted(self):
        for budget in ["low", "medium", "high"]:
            req = OnboardingRequest(**make_payload(budget=budget))
            assert req.budget == budget

    def test_age_boundary_minimum(self):
        req = OnboardingRequest(**make_payload(age=13))
        assert req.age == 13

    def test_age_boundary_maximum(self):
        req = OnboardingRequest(**make_payload(age=120))
        assert req.age == 120

    def test_empty_restrictions_and_allergies(self):
        req = OnboardingRequest(**make_payload(dietary_restrictions=[], allergies=[]))
        assert req.dietary_restrictions == []
        assert req.allergies == []


# ── OnboardingRequest – validation errors ─────────────────────────────────────

class TestOnboardingRequestInvalid:
    def test_too_few_dishes_raises(self):
        with pytest.raises(ValidationError) as exc_info:
            OnboardingRequest(**make_payload(favorite_dishes=[])) # 0 dishes is too few
        errors = exc_info.value.errors()
        assert any("favorite_dishes" in str(e) for e in errors)


    def test_invalid_spicy_level_raises(self):
        with pytest.raises(ValidationError):
            OnboardingRequest(**make_payload(spicy_level="nuclear"))

    def test_invalid_budget_raises(self):
        with pytest.raises(ValidationError):
            OnboardingRequest(**make_payload(budget="free"))

    def test_age_below_minimum_raises(self):
        with pytest.raises(ValidationError):
            OnboardingRequest(**make_payload(age=12))

    def test_age_above_maximum_raises(self):
        with pytest.raises(ValidationError):
            OnboardingRequest(**make_payload(age=121))

    def test_missing_required_field_raises(self):
        payload = make_payload()
        del payload["location"]
        with pytest.raises(ValidationError):
            OnboardingRequest(**payload)

    def test_string_age_raises(self):
        with pytest.raises(ValidationError):
            OnboardingRequest(**make_payload(age="twenty"))


# ── OnboardingResponse ────────────────────────────────────────────────────────

class TestOnboardingResponse:
    def test_defaults(self):
        resp = OnboardingResponse()
        assert resp.status == "success"
        assert resp.fallback is False
        assert resp.preferences_vector is None
        assert resp.popular_restaurants is None

    def test_with_vector(self):
        vec = [0.5] * 768
        resp = OnboardingResponse(preferences_vector=vec)
        assert len(resp.preferences_vector) == 768

    def test_fallback_with_restaurants(self):
        restaurants = [
            MockRestaurant(name="Phở Thìn", cuisine="Vietnamese", rating=4.8, location="HCM")
        ]
        resp = OnboardingResponse(fallback=True, popular_restaurants=restaurants)
        assert resp.fallback is True
        assert len(resp.popular_restaurants) == 1
