"""
test_allergy_filter.py — Unit tests for ai_engine/app/core/allergy_filter.py

Test matrix:
    TC-01  No allergies provided         → all candidates returned unchanged
    TC-02  Single allergen match         → matched candidate removed
    TC-03  No allergen match             → all candidates kept
    TC-04  Empty candidate list          → empty list returned
    TC-05  Synonym resolution            → "groundnut" catches "peanut" candidate
    TC-06  Case insensitivity            → "Milk" == "milk"
    TC-07  Missing ingredients field     → candidate treated as safe (kept)
    TC-08  Empty ingredients list        → candidate treated as safe (kept)
    TC-09  Multiple allergens            → all matching candidates removed
    TC-10  All candidates removed        → empty list returned
    TC-11  Allergen appears only once    → only that candidate removed
"""

import pytest
from app.core.allergy_filter import filter_allergy


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def basic_candidates() -> list[dict]:
    return [
        {"name": "Phở Bò",     "ingredients": ["beef", "noodle", "herb"]},
        {"name": "Pad Thai",   "ingredients": ["peanut", "shrimp", "egg", "noodle"]},
        {"name": "Bánh Mì",    "ingredients": ["wheat", "pork", "mayo"]},
        {"name": "Gỏi Cuốn",  "ingredients": ["shrimp", "rice_paper", "lettuce"]},
        {"name": "Cơm Gà",    "ingredients": ["chicken", "rice", "herb"]},
    ]


# ---------------------------------------------------------------------------
# TC-01  No allergies → return all
# ---------------------------------------------------------------------------

def test_no_allergies_returns_all(basic_candidates):
    result = filter_allergy(basic_candidates, [])
    assert result == basic_candidates


def test_none_equivalent_empty_list(basic_candidates):
    """Passing an explicit empty list is the documented API surface."""
    result = filter_allergy(basic_candidates, [])
    assert len(result) == len(basic_candidates)


# ---------------------------------------------------------------------------
# TC-02  Single allergen match → matched candidate removed
# ---------------------------------------------------------------------------

def test_single_allergen_removes_candidate(basic_candidates):
    result = filter_allergy(basic_candidates, ["peanut"])
    names = [r["name"] for r in result]
    assert "Pad Thai" not in names
    assert len(result) == len(basic_candidates) - 1


# ---------------------------------------------------------------------------
# TC-03  No match → all kept
# ---------------------------------------------------------------------------

def test_no_allergen_match_keeps_all(basic_candidates):
    result = filter_allergy(basic_candidates, ["sesame"])
    assert len(result) == len(basic_candidates)


# ---------------------------------------------------------------------------
# TC-04  Empty candidate list → empty list returned
# ---------------------------------------------------------------------------

def test_empty_candidates_returns_empty():
    result = filter_allergy([], ["peanut", "milk"])
    assert result == []


# ---------------------------------------------------------------------------
# TC-05  Synonym resolution — "groundnut" should catch candidates with "peanut"
# ---------------------------------------------------------------------------

def test_synonym_groundnut_catches_peanut():
    candidates = [
        {"name": "Satay",   "ingredients": ["peanut", "chicken"]},
        {"name": "Salad",   "ingredients": ["lettuce", "tomato"]},
    ]
    result = filter_allergy(candidates, ["groundnut"])   # groundnut → peanut
    names = [r["name"] for r in result]
    assert "Satay" not in names
    assert "Salad" in names


def test_synonym_prawn_catches_shrimp(basic_candidates):
    result = filter_allergy(basic_candidates, ["prawn"])  # prawn → shrimp
    names = [r["name"] for r in result]
    assert "Pad Thai" not in names
    assert "Gỏi Cuốn" not in names


def test_synonym_dairy_catches_milk():
    candidates = [
        {"name": "Latte",   "ingredients": ["milk", "coffee"]},
        {"name": "Espresso","ingredients": ["coffee"]},
    ]
    result = filter_allergy(candidates, ["dairy"])  # dairy → milk
    names = [r["name"] for r in result]
    assert "Latte" not in names
    assert "Espresso" in names


# ---------------------------------------------------------------------------
# TC-06  Case insensitivity
# ---------------------------------------------------------------------------

def test_case_insensitive_allergen():
    candidates = [{"name": "Cheesecake", "ingredients": ["Milk", "Egg", "Wheat"]}]
    result = filter_allergy(candidates, ["milk"])
    assert result == []


def test_case_insensitive_user_input():
    candidates = [{"name": "Cheesecake", "ingredients": ["milk", "egg", "wheat"]}]
    result = filter_allergy(candidates, ["MILK"])
    assert result == []


def test_mixed_case_both_sides():
    candidates = [{"name": "Ice Cream", "ingredients": ["Dairy", "Sugar"]}]
    # "Dairy" → normalise → "milk";  user says "milk" → normalise → "milk"
    result = filter_allergy(candidates, ["Milk"])
    assert result == []


# ---------------------------------------------------------------------------
# TC-07  Missing ingredients field → treated as safe (kept)
# ---------------------------------------------------------------------------

def test_missing_ingredients_treated_as_safe():
    candidates = [
        {"name": "Mystery Dish"},                         # no "ingredients" key
        {"name": "Safe Dish", "ingredients": ["rice"]},
    ]
    result = filter_allergy(candidates, ["peanut"])
    names = [r["name"] for r in result]
    assert "Mystery Dish" in names
    assert "Safe Dish" in names


# ---------------------------------------------------------------------------
# TC-08  Empty ingredients list → treated as safe (kept)
# ---------------------------------------------------------------------------

def test_empty_ingredients_treated_as_safe():
    candidates = [{"name": "Empty Dish", "ingredients": []}]
    result = filter_allergy(candidates, ["peanut"])
    assert len(result) == 1


# ---------------------------------------------------------------------------
# TC-09  Multiple allergens → all matching candidates removed
# ---------------------------------------------------------------------------

def test_multiple_allergens_remove_all_matches(basic_candidates):
    # "peanut" hits Pad Thai; "wheat" hits Bánh Mì
    result = filter_allergy(basic_candidates, ["peanut", "wheat"])
    names = [r["name"] for r in result]
    assert "Pad Thai" not in names
    assert "Bánh Mì" not in names
    # These should survive
    assert "Phở Bò" in names
    assert "Cơm Gà" in names


# ---------------------------------------------------------------------------
# TC-10  All candidates removed → empty list
# ---------------------------------------------------------------------------

def test_all_candidates_removed():
    candidates = [
        {"name": "A", "ingredients": ["peanut"]},
        {"name": "B", "ingredients": ["milk"]},
        {"name": "C", "ingredients": ["wheat", "egg"]},
    ]
    result = filter_allergy(candidates, ["peanut", "milk", "wheat"])
    assert result == []


# ---------------------------------------------------------------------------
# TC-11  Allergen appears in only one item → only that one removed
# ---------------------------------------------------------------------------

def test_allergen_in_single_item(basic_candidates):
    # Only "Bánh Mì" contains "wheat"
    result = filter_allergy(basic_candidates, ["wheat"])
    names = [r["name"] for r in result]
    assert "Bánh Mì" not in names
    assert len(result) == len(basic_candidates) - 1


# ---------------------------------------------------------------------------
# Additional edge-case: candidate with multiple allergens still removed once
# ---------------------------------------------------------------------------

def test_candidate_with_multiple_allergens_removed_once():
    candidates = [
        {"name": "Danger Dish", "ingredients": ["peanut", "milk", "egg"]},
    ]
    result = filter_allergy(candidates, ["peanut"])
    assert result == []
