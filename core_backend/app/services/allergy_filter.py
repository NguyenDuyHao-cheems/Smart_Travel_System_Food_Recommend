from typing import List, Dict, Any, Tuple, Union, Optional
from sqlalchemy import cast, String, or_, not_, and_
from sqlalchemy.orm import Session
from app.domains.ranking.models import DishModel


ALLERGY_MAP = {
    "peanut": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "lạc": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    "đậu phộng": ["peanut", "groundnut", "satay", "lạc", "đậu phộng", "sa tế"],
    
    "milk": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "sữa": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    "phô mai": ["milk", "dairy", "cheese", "butter", "sữa", "phô mai", "bơ"],
    
    "shrimp": ["shrimp", "prawn", "tôm", "ruốc"],
    "tôm": ["shrimp", "prawn", "tôm", "ruốc"],
    "ruốc": ["shrimp", "prawn", "tôm", "ruốc"],
    
    "seafood": ["seafood", "fish", "crab", "squid", "hải sản", "cá", "cua", "mực"],
    "hải sản": ["seafood", "fish", "crab", "squid", "hải sản", "cá", "cua", "mực"],
    
    "egg": ["egg", "trứng", "hột"],
    "trứng": ["egg", "trứng", "hột"],
    
    "soy": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"],
    "đậu nành": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"],
    "đậu hũ": ["soy", "đậu nành", "tương", "tofu", "đậu hũ"]
}

def get_allergy_keywords(user_allergies: List[str]) -> List[str]:
    """Translate user allergies to mapped keywords using ALLERGY_MAP."""
    if not user_allergies:
        return []
    keywords = []
    for allergy in user_allergies:
        if allergy:
            allergy_norm = allergy.lower().strip()
            keywords.extend(ALLERGY_MAP.get(allergy_norm, [allergy_norm]))
    return list(set(keywords))

def get_unsafe_dish_filter(db: Session, keywords: List[str]) -> Optional[Any]:
    """
    Returns a SQLAlchemy filter clause for DishModel that matches any of the allergy keywords.
    Optimized for PostgreSQL JSONB GIN index, with fallback for SQLite.
    """
    if not keywords:
        return None

    dialect = db.bind.dialect.name
    if dialect == "postgresql":
        from sqlalchemy.dialects.postgresql import JSONB
        return cast(DishModel.allergens, JSONB).has_any(keywords)
    else:
        # SQLite fallback: cast to String and check with ILIKE/LIKE
        return or_(*[cast(DishModel.allergens, String).ilike(f"%{kw}%") for kw in keywords])

def apply_inline_allergy_filter(db: Session, query, user_allergies: List[str]):
    """
    Applies inline allergy filtering to a RestaurantModel query.
    Excludes restaurants that have dishes, but all of them are unsafe.
    """
    if not user_allergies:
        return query

    keywords = get_allergy_keywords(user_allergies)
    if not keywords:
        return query

    unsafe_clause = get_unsafe_dish_filter(db, keywords)
    if unsafe_clause is None:
        return query

    from app.domains.ranking.models import RestaurantModel
    # Query for restaurant IDs that have at least one safe dish
    safe_res_ids = db.query(DishModel.res_id).filter(not_(unsafe_clause)).distinct()
    # Query for restaurant IDs that have any dishes
    any_res_ids = db.query(DishModel.res_id).distinct()

    # Exclude restaurants that have dishes but no safe dishes
    return query.filter(
        not_(
            and_(
                RestaurantModel.id.in_(any_res_ids),
                RestaurantModel.id.not_in(safe_res_ids)
            )
        )
    )

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

def fetch_dish_detail_map(db: Session, restaurant_ids: List[str]) -> Dict[str, List[Dict]]:
    """
    Returns: { res_id: [{"name": "Gỏi Cuốn Tôm", "allergens": ["tôm", "thịt"]}, ...] }
    """
    if not restaurant_ids:
        return {}

    dishes = db.query(DishModel.res_id, DishModel.name, DishModel.allergens).filter(
        DishModel.res_id.in_(restaurant_ids)
    ).all()

    detail_map: Dict[str, List[Dict]] = {}
    for res_id, name, allergens in dishes:
        if res_id not in detail_map:
            detail_map[res_id] = []
        
        detail_map[res_id].append({
            "name": name,
            "allergens": allergens if isinstance(allergens, list) else ([a.strip() for a in allergens.split(',')] if allergens else [])
        })

    return detail_map

def annotate_allergy(
    candidates: List[Any], 
    user_allergies: List[str],
    allergen_map: Dict[str, List[str]],
    dish_detail_map: Dict[str, List[Dict]]
) -> Tuple[List[Any], int]:
    """
    Gắn allergen_warning vào mỗi candidate thay vì loại bỏ.
    Returns: (annotated_candidates, flagged_count)
    """
    if not user_allergies:
        for item in candidates:
            setattr(item, "allergen_warning", None)
        return candidates, 0

    flagged_count = 0
    for item in candidates:
        item_id = item.id if hasattr(item, "id") else item.get("id")
        dishes = dish_detail_map.get(item_id, [])
        
        warnings = []
        for dish in dishes:
            dish_name = dish["name"]
            dish_allergens = dish["allergens"]
            
            matched = []
            for allergen in dish_allergens:
                if contains_allergen(allergen, user_allergies):
                    # Tìm xem keyword nào match (để hiển thị cho thân thiện)
                    allergy_norm = normalize(allergen)
                    # Thực tế ta chỉ cần biết nó bị dính allergen nào của user
                    for user_allergy in user_allergies:
                        user_allergy_norm = normalize(user_allergy)
                        keywords = ALLERGY_MAP.get(user_allergy_norm, [user_allergy_norm])
                        if any(kw in allergy_norm for kw in keywords):
                            matched.append(user_allergy)
            
            if matched:
                warnings.append({
                    "dish_name": dish_name,
                    "matched_allergens": list(set(matched))
                })
        
        if warnings:
            setattr(item, "allergen_warning", warnings)
            flagged_count += 1
        else:
            setattr(item, "allergen_warning", None)

    return candidates, flagged_count

def handle_fallback(candidates: List[Any]) -> Dict[str, Any]:
    """Fallback strategy when all items are removed."""
    return {
        "results": candidates[:5],
        "warning": "Một số món có thể không phù hợp với dị ứng của bạn",
        "fallback_applied": True
    }
