import re
from typing import List, Dict, Any, Tuple, Union, Optional

ALLERGY_MAP = {
    "peanut": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "milk": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "shrimp": ["shrimp", "prawn", "tôm", "ruốc"],
    "seafood": ["seafood", "fish", "crab", "squid", "hải sản", "cá", "cua", "mực"],
    "egg": ["egg", "trứng", "hột"],
    "soy": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"]
}

def normalize(text: Optional[str]) -> str:
    """Normalize text by converting to lowercase and stripping whitespace."""
    if not text:
        return ""
    return text.lower().strip()

def contains_allergen(ingredient: str, user_allergies: List[str]) -> bool:
    """Check if an ingredient contains any of the user's allergies."""
    if not ingredient or not user_allergies:
        return False
        
    ingredient_norm = normalize(ingredient)

    for allergy in user_allergies:
        allergy_norm = normalize(allergy)
        keywords = ALLERGY_MAP.get(allergy_norm, [allergy_norm])

        for keyword in keywords:
            # We check if the keyword is a substring of the ingredient
            # For a more robust check, we could use regex to match whole words
            if keyword in ingredient_norm:
                return True

    return False

def filter_allergy(candidates: List[Any], user_allergies: List[str]) -> Tuple[List[Any], List[Any]]:
    """
    Filter out candidates that contain allergens.
    Returns a tuple of (safe_candidates, removed_candidates).
    """
    if not user_allergies:
        return candidates, []

    safe = []
    removed = []

    for item in candidates:
        ingredients = []
        if isinstance(item, dict):
            ingredients = item.get("ingredients", [])
        elif hasattr(item, "ingredients"):
            ingredients = getattr(item, "ingredients", [])

        # If ingredients is a string (e.g. comma separated), convert to list
        if isinstance(ingredients, str):
            ingredients = [i.strip() for i in ingredients.split(',')]

        if any(contains_allergen(ing, user_allergies) for ing in ingredients):
            removed.append(item)
        else:
            safe.append(item)

    return safe, removed

def handle_fallback(candidates: List[Any]) -> Dict[str, Any]:
    """Fallback strategy when all items are removed."""
    return {
        "results": candidates[:5],
        "warning": "Một số món có thể không phù hợp với dị ứng của bạn",
        "fallback_applied": True
    }
