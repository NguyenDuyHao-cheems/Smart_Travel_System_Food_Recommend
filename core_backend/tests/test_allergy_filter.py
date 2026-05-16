import time
import pytest
from app.services.allergy_filter import (
    normalize, 
    contains_allergen, 
    filter_allergy, 
    handle_fallback,
    annotate_allergy
)

# ── Normalization Tests ───────────────────────────────────────────────────────
def test_normalize():
    assert normalize("  Peanut  ") == "peanut"
    assert normalize("Milk") == "milk"
    assert normalize("") == ""
    assert normalize(None) == ""

# ── Matching Logic Tests (Bidirectional) ──────────────────────────────────────
def test_contains_allergen_exact_match():
    assert contains_allergen("peanut butter", ["peanut"]) is True
    assert contains_allergen("chocolate milk", ["milk"]) is True

def test_contains_allergen_synonym_match_english_to_vietnamese():
    # User allergy: peanut. Dish allergen: đậu phộng, sa tế
    assert contains_allergen("đậu phộng", ["peanut"]) is True
    assert contains_allergen("sa tế", ["peanut"]) is True

def test_contains_allergen_synonym_match_vietnamese_to_english():
    # User allergy: tôm. Dish allergen: shrimp, prawn
    assert contains_allergen("shrimp", ["tôm"]) is True
    assert contains_allergen("prawn", ["tôm"]) is True

def test_contains_allergen_synonym_match_vietnamese_to_vietnamese():
    # User allergy: lạc. Dish allergen: đậu phộng
    assert contains_allergen("đậu phộng", ["lạc"]) is True

def test_contains_allergen_no_match():
    assert contains_allergen("apple", ["peanut"]) is False
    assert contains_allergen("chicken soup", ["milk", "shrimp"]) is False

# ── Core Annotate Tests ───────────────────────────────────────────────────────
class MockRestaurant:
    def __init__(self, id, name):
        self.id = id
        self.name = name

def test_annotate_allergy_no_allergies():
    candidates = [
        MockRestaurant(id="1", name="Quán A"),
        MockRestaurant(id="2", name="Quán B")
    ]
    dish_detail_map = {
        "1": [{"name": "Phở Bò", "allergens": ["bò", "phở"]}],
        "2": [{"name": "Gà rán", "allergens": ["gà", "bột"]}]
    }
    
    annotated, flagged_count = annotate_allergy(
        candidates=candidates, 
        user_allergies=[], 
        allergen_map={}, 
        dish_detail_map=dish_detail_map
    )
    
    assert flagged_count == 0
    assert getattr(annotated[0], "allergen_warning", None) is None
    assert getattr(annotated[1], "allergen_warning", None) is None

def test_annotate_allergy_with_warnings():
    candidates = [
        MockRestaurant(id="1", name="Hải sản biển"),
        MockRestaurant(id="2", name="Tiệm Bò"),
        MockRestaurant(id="3", name="Chè Thái")
    ]
    dish_detail_map = {
        "1": [
            {"name": "Gỏi Cuốn Tôm", "allergens": ["tôm", "bánh tráng"]},
            {"name": "Mực hấp", "allergens": ["mực"]}
        ],
        "2": [
            {"name": "Phở Bò", "allergens": ["bò", "phở"]}
        ],
        "3": [
            {"name": "Chè Sữa", "allergens": ["sữa", "đường"]},
            {"name": "Chè Đậu", "allergens": ["đậu phộng"]}
        ]
    }
    
    annotated, flagged_count = annotate_allergy(
        candidates=candidates, 
        user_allergies=["shrimp", "peanut"], 
        allergen_map={}, 
        dish_detail_map=dish_detail_map
    )
    
    assert flagged_count == 2
    
    # Quán 1 bị cảnh báo tôm (shrimp)
    warning_1 = getattr(annotated[0], "allergen_warning")
    assert warning_1 is not None
    assert len(warning_1) == 1
    assert warning_1[0]["dish_name"] == "Gỏi Cuốn Tôm"
    assert "shrimp" in warning_1[0]["matched_allergens"]
    
    # Quán 2 không bị cảnh báo
    assert getattr(annotated[1], "allergen_warning", None) is None
    
    # Quán 3 bị cảnh báo đậu phộng (peanut)
    warning_3 = getattr(annotated[2], "allergen_warning")
    assert warning_3 is not None
    assert len(warning_3) == 1
    assert warning_3[0]["dish_name"] == "Chè Đậu"
    assert "peanut" in warning_3[0]["matched_allergens"]

def test_annotate_allergy_vietnamese_input():
    candidates = [MockRestaurant(id="1", name="Tiệm Hải Sản")]
    dish_detail_map = {
        "1": [{"name": "Tôm hùm", "allergens": ["shrimp", "bơ"]}]
    }
    
    annotated, flagged_count = annotate_allergy(
        candidates=candidates, 
        user_allergies=["tôm"], 
        allergen_map={}, 
        dish_detail_map=dish_detail_map
    )
    
    assert flagged_count == 1
    warning = getattr(annotated[0], "allergen_warning")
    assert "tôm" in warning[0]["matched_allergens"]

# ── Fallback Tests ────────────────────────────────────────────────────────────
def test_handle_fallback():
    candidates = [{"id": i} for i in range(10)]
    result = handle_fallback(candidates)
    
    assert "results" in result
    assert len(result["results"]) == 5
    assert result["warning"] == "Một số món có thể không phù hợp với dị ứng của bạn"
    assert result["fallback_applied"] is True

# ── Performance Tests ─────────────────────────────────────────────────────────
def test_performance_annotate():
    num_candidates = 10000
    candidates = [MockRestaurant(id=str(i), name=f"Res {i}") for i in range(num_candidates)]
    dish_detail_map = {}
    
    for i in range(num_candidates):
        dish_detail_map[str(i)] = [
            {"name": "Dish A", "allergens": ["ingredient A", "ingredient B"]},
            {"name": "Dish B", "allergens": ["peanut" if i % 10 == 0 else "chicken"]}
        ]
        
    start_time = time.perf_counter()
    annotated, flagged_count = annotate_allergy(
        candidates=candidates, 
        user_allergies=["peanut"], 
        allergen_map={}, 
        dish_detail_map=dish_detail_map
    )
    end_time = time.perf_counter()
    
    duration_ms = (end_time - start_time) * 1000
    
    assert flagged_count == 1000  # 1/10th of candidates
    
    # Ensure annotation < 200ms
    assert duration_ms < 200, f"Performance test failed, took {duration_ms:.2f}ms"
