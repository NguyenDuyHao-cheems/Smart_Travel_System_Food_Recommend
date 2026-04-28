import time
import pytest
from app.services.allergy_filter import (
    normalize, 
    contains_allergen, 
    filter_allergy, 
    handle_fallback
)

# ── Normalization Tests ───────────────────────────────────────────────────────
def test_normalize():
    assert normalize("  Peanut  ") == "peanut"
    assert normalize("Milk") == "milk"
    assert normalize("") == ""
    assert normalize(None) == ""

# ── Matching Logic Tests ──────────────────────────────────────────────────────
def test_contains_allergen_exact_match():
    assert contains_allergen("peanut butter", ["peanut"]) is True
    assert contains_allergen("chocolate milk", ["milk"]) is True

def test_contains_allergen_synonym_match():
    assert contains_allergen("groundnut sauce", ["peanut"]) is True
    assert contains_allergen("cheese cake", ["milk"]) is True
    assert contains_allergen("prawn cracker", ["shrimp"]) is True
    assert contains_allergen("sa tế", ["peanut"]) is True

def test_contains_allergen_no_match():
    assert contains_allergen("apple", ["peanut"]) is False
    assert contains_allergen("chicken soup", ["milk", "shrimp"]) is False

# ── Core Filter Tests ─────────────────────────────────────────────────────────
def test_filter_allergy_no_allergies():
    candidates = [
        {"id": 1, "name": "Bún Bò", "ingredients": ["bò", "bún"]},
        {"id": 2, "name": "Phở Gà", "ingredients": ["gà", "phở"]}
    ]
    safe, removed = filter_allergy(candidates, [])
    assert len(safe) == 2
    assert len(removed) == 0

def test_filter_allergy_match_allergen():
    candidates = [
        {"id": 1, "name": "Gỏi Cuốn Tôm", "ingredients": ["tôm", "thịt", "bánh tráng"]},
        {"id": 2, "name": "Phở Bò", "ingredients": ["bò", "phở"]},
        {"id": 3, "name": "Bún Đậu", "ingredients": ["đậu hũ", "bún", "thịt heo"]}
    ]
    safe, removed = filter_allergy(candidates, ["shrimp", "soy"])
    
    assert len(safe) == 1
    assert safe[0]["id"] == 2
    
    assert len(removed) == 2
    removed_ids = [item["id"] for item in removed]
    assert 1 in removed_ids
    assert 3 in removed_ids

def test_filter_allergy_missing_ingredients():
    candidates = [
        {"id": 1, "name": "Unknown Dish"},  # No ingredients key
        {"id": 2, "name": "Salad", "ingredients": []} # Empty ingredients
    ]
    safe, removed = filter_allergy(candidates, ["peanut"])
    assert len(safe) == 2
    assert len(removed) == 0

def test_filter_allergy_empty_candidates():
    safe, removed = filter_allergy([], ["peanut"])
    assert len(safe) == 0
    assert len(removed) == 0

def test_filter_allergy_string_ingredients():
    candidates = [
        {"id": 1, "name": "Bánh Mì", "ingredients": "bột mì, trứng, pate"}
    ]
    safe, removed = filter_allergy(candidates, ["egg"])
    assert len(safe) == 0
    assert len(removed) == 1

# ── Fallback Tests ────────────────────────────────────────────────────────────
def test_handle_fallback():
    candidates = [{"id": i} for i in range(10)]
    result = handle_fallback(candidates)
    
    assert "results" in result
    assert len(result["results"]) == 5
    assert result["warning"] == "Một số món có thể không phù hợp với dị ứng của bạn"
    assert result["fallback_applied"] is True

# ── Performance Tests ─────────────────────────────────────────────────────────
def test_performance():
    # ≥ 10,000 candidates
    num_candidates = 10000
    candidates = []
    for i in range(num_candidates):
        candidates.append({
            "id": i,
            "name": f"Dish {i}",
            "ingredients": ["ingredient A", "ingredient B", "peanut" if i % 10 == 0 else "chicken"]
        })
        
    start_time = time.perf_counter()
    safe, removed = filter_allergy(candidates, ["peanut"])
    end_time = time.perf_counter()
    
    duration_ms = (end_time - start_time) * 1000
    
    assert len(removed) == 1000  # 1/10th of candidates should have "peanut"
    assert len(safe) == 9000
    
    # Ensure filtering < 100ms
    assert duration_ms < 100, f"Performance test failed, took {duration_ms:.2f}ms"
