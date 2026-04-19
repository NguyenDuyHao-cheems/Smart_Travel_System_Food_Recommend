"""
allergy_filter.py — Stateless allergy filtering module for the AI pipeline.

Position in pipeline:
    Candidate Generation → [Allergy Filter] → Ranking

Design principles (from spec):
    - Simple and stateless
    - Strict removal: any candidate containing ≥1 allergen is excluded
    - Missing ``ingredients`` field → treated as safe (pass-through)
    - Case-insensitive matching
    - Synonym normalisation (peanut↔groundnut, shrimp↔prawn, etc.)
"""

from __future__ import annotations

from typing import Any

# ---------------------------------------------------------------------------
# Synonym map: each key maps to its canonical allergen name.
# All comparisons are done in lowercase.
# ---------------------------------------------------------------------------
_SYNONYM_MAP: dict[str, str] = {
    # Peanut family
    "groundnut": "peanut",
    "arachis": "peanut",
    # Shrimp / prawn family
    "prawn": "shrimp",
    "ebi": "shrimp",
    # Milk / dairy family
    "dairy": "milk",
    "lactose": "milk",
    "cream": "milk",
    "butter": "milk",
    "cheese": "milk",
    # Wheat / gluten family
    "gluten": "wheat",
    "flour": "wheat",
    # Soy family
    "soya": "soy",
    "tofu": "soy",
    "edamame": "soy",
    # Tree-nut family
    "almond": "tree_nut",
    "cashew": "tree_nut",
    "walnut": "tree_nut",
    "pistachio": "tree_nut",
    "hazelnut": "tree_nut",
    "macadamia": "tree_nut",
    "pecan": "tree_nut",
    # Egg family
    "eggs": "egg",
    # Fish family
    "salmon": "fish",
    "tuna": "fish",
    "cod": "fish",
    "tilapia": "fish",
    # Shellfish / seafood
    "crab": "shellfish",
    "lobster": "shellfish",
    "clam": "shellfish",
    "mussel": "shellfish",
    "oyster": "shellfish",
    "squid": "shellfish",
    "octopus": "shellfish",
}


def _normalise(token: str) -> str:
    """Lowercase and resolve synonym to canonical allergen name."""
    token = token.strip().lower()
    return _SYNONYM_MAP.get(token, token)


def _normalise_set(items: list[str]) -> set[str]:
    """Return a set of normalised allergen names."""
    return {_normalise(item) for item in items}


def filter_allergy(
    candidates: list[dict[str, Any]],
    user_allergies: list[str],
) -> list[dict[str, Any]]:
    """Remove candidates that contain at least one of the user's allergens.

    Parameters
    ----------
    candidates:
        List of food/restaurant candidate dicts.  Each dict may optionally
        contain an ``"ingredients"`` key whose value is a list of strings.
    user_allergies:
        List of allergen strings provided by the user (e.g. ``["peanut", "milk"]``).
        Strings are normalised (lowercase + synonym resolution) before comparison.

    Returns
    -------
    list[dict]
        Filtered candidates — items without any matching allergen.

    Notes
    -----
    * If ``user_allergies`` is empty the original list is returned unchanged.
    * If a candidate is missing the ``"ingredients"`` key it is treated as **safe**
      and kept in the result.
    * All comparisons are case-insensitive and synonym-aware.

    Examples
    --------
    >>> candidates = [
    ...     {"name": "Pho Bo", "ingredients": ["beef", "noodle"]},
    ...     {"name": "Pad Thai", "ingredients": ["peanut", "shrimp", "egg"]},
    ...     {"name": "Banh Mi", "ingredients": ["wheat", "pork"]},
    ... ]
    >>> filter_allergy(candidates, ["groundnut", "wheat"])
    [{'name': 'Pho Bo', 'ingredients': ['beef', 'noodle']}]
    """
    if not user_allergies:
        return candidates

    # Normalise the user's allergen list once
    allergen_set = _normalise_set(user_allergies)

    safe: list[dict[str, Any]] = []
    for item in candidates:
        ingredients: list[str] = item.get("ingredients", [])

        # If ingredient list is absent or empty → treat as safe
        if not ingredients:
            safe.append(item)
            continue

        item_allergens = _normalise_set(ingredients)

        # Keep only items with NO overlap
        if item_allergens.isdisjoint(allergen_set):
            safe.append(item)

    return safe
