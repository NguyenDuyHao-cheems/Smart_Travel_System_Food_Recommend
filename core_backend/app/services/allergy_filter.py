from typing import List, Dict, Any, Tuple, Union, Optional
from sqlalchemy.orm import Session
from app.domains.ranking.models import DishModel

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
            if keyword in ingredient_norm:
                return True

    return False

def fetch_allergen_map(db: Session, restaurant_ids: List[str]) -> Dict[str, List[str]]:
    """
    Lấy tập hợp allergens từ tất cả dishes của mỗi restaurant.
    Returns: { res_id: ["shrimp", "peanut", ...] }
    """
    if not restaurant_ids:
        return {}

    dishes = db.query(DishModel.res_id, DishModel.allergens).filter(
        DishModel.res_id.in_(restaurant_ids)
    ).all()

    allergen_map: Dict[str, List[str]] = {}
    for res_id, allergens in dishes:
        if not allergens:
            continue
        if res_id not in allergen_map:
            allergen_map[res_id] = []
        allergen_map[res_id].extend(allergens)

    return allergen_map

def filter_allergy(
    candidates: List[Any], 
    user_allergies: List[str],
    allergen_map: Optional[Dict[str, List[str]]] = None
) -> Tuple[List[Any], List[Any]]:
    """
    Filter candidates dựa trên allergens.
    Nếu allergen_map được cung cấp, sử dụng allergens từ đó.
    Ngược lại fallback về việc đọc .allergens trên các candidate.
    """
    if not user_allergies:
        return candidates, []

    safe = []
    removed = []

    for item in candidates:
        item_allergens = []
        
        if allergen_map is not None:
            item_id = item.id if hasattr(item, "id") else item.get("id")
            item_allergens = allergen_map.get(item_id, [])
        else:
            if isinstance(item, dict):
                item_allergens = item.get("allergens", [])
            elif hasattr(item, "allergens"):
                item_allergens = getattr(item, "allergens", [])

        if isinstance(item_allergens, str):
            item_allergens = [a.strip() for a in item_allergens.split(',')]

        if any(contains_allergen(allergen, user_allergies) for allergen in item_allergens):
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
