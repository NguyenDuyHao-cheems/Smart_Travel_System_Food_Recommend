import pytest
from app.services.user_vector_builder import (
    _normalise_whitespace,
    _join_list,
    _add_field,
    build_onboarding_text,
    build_profile_text,
)

def test_normalise_whitespace():
    # Test collapse multiple spaces and strip
    assert _normalise_whitespace("   hello    world  \n  test  ") == "hello world test"
    assert _normalise_whitespace("") == ""

def test_join_list():
    # Test empty or None list
    assert _join_list(None) is None
    assert _join_list([]) is None
    assert _join_list(["", "   "]) is None
    
    # Test valid items
    assert _join_list(["mì cay", " trà sữa "]) == "mì cay, trà sữa"

def test_add_field():
    parts = []
    # Test None value
    _add_field(parts, "field", None)
    assert len(parts) == 0

    # Test empty string value
    _add_field(parts, "field", "   ")
    assert len(parts) == 0

    # Test empty list value
    _add_field(parts, "field", [])
    assert len(parts) == 0

    # Test valid string value
    _add_field(parts, "field", "value")
    assert parts == ["field: value"]

    # Test valid list value
    parts = []
    _add_field(parts, "field", ["a", "b"])
    assert parts == ["field: a, b"]

def test_build_onboarding_text():
    # Test empty inputs
    assert build_onboarding_text() == ""
    assert build_onboarding_text(favorite_dishes=[], spicy_level=None) == ""
    
    # Test favorite dishes only
    assert build_onboarding_text(favorite_dishes=["mì cay", "phở"]) == "Tôi thích các món mì cay, phở."
    
    # Test spicy level only
    assert build_onboarding_text(spicy_level="cay nhiều") == "với độ cay cay nhiều."
    
    # Test both
    assert build_onboarding_text(
        favorite_dishes=["mì cay", "phở"], 
        spicy_level="cay nhiều"
    ) == "Tôi thích các món mì cay, phở với độ cay cay nhiều."

def test_build_profile_text():
    # Test all empty/None inputs
    assert build_profile_text() == ""
    
    # Test single field
    assert build_profile_text(onboarding_preferences="Tôi thích phở.") == "onboarding_preferences: Tôi thích phở."
    
    # Test multiple fields (joins with space due to whitespace normalisation)
    text = build_profile_text(
        onboarding_preferences="Tôi thích phở.",
        dietary_profile="vegetarian",
        budget_profile="50k"
    )
    expected = "onboarding_preferences: Tôi thích phở. dietary_profile: vegetarian budget_profile: 50k"
    assert text == expected
