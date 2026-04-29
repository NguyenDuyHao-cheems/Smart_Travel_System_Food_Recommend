"""
User Vector Builder
===================
Builds standardised text representations of user preferences for embedding
via the same PhoBERT model (768-dim) used by restaurant / dish vectors.

Two vector types are supported:

1. **Onboarding vector** (`user_onboardings.preferences_vector`)
   Built from onboarding form fields only — used for cold-start matching
   against restaurant / dish vectors.

2. **Profile vector** (`users.preferences_vector`)
   A comprehensive long-term vector that aggregates onboarding preferences,
   bookmarks, liked restaurants / dishes, recent interactions, dietary &
   budget & location profiles.

Both vectors go through the same PhoBERT mean-pooling pipeline on the
AI Engine, producing exactly 768 dimensions.

Rules
-----
- Keep Vietnamese with diacritics.
- Normalise whitespace (collapse multiple spaces, strip leading/trailing).
- Skip empty / None fields — never embed ``null`` or ``None`` literals.
- Join lists with ``", "``.
- Never embed raw JSON.
- Use strict ``field_name: value`` format.
- Field order is fixed.
"""

import re
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)


# ── Shared helpers ────────────────────────────────────────────────────────────

def _normalise_whitespace(text: str) -> str:
    """Collapse runs of whitespace (including newlines) into single spaces."""
    return re.sub(r"\s+", " ", text).strip()


def _join_list(items: Optional[List[str]]) -> Optional[str]:
    """
    Join a list of strings with ``", "``.
    Returns None if the list is empty or None.
    """
    if not items:
        return None
    cleaned = [s.strip() for s in items if s and s.strip()]
    return ", ".join(cleaned) if cleaned else None


def _add_field(parts: list, field_name: str, value) -> None:
    """
    Append ``"field_name: value"`` to *parts* only when *value* is truthy.
    Lists are joined first via ``_join_list``.
    """
    if value is None:
        return

    if isinstance(value, list):
        value = _join_list(value)
        if value is None:
            return

    text = str(value).strip()
    if not text:
        return

    parts.append(f"{field_name}: {text}")


# ── Onboarding vector text (user_onboardings.preferences_vector) ──────────────

def build_onboarding_text(
    *,
    favorite_dishes: Optional[List[str]] = None,
    spicy_level: Optional[str] = None,
    dietary_restrictions: Optional[List[str]] = None,
    allergies: Optional[List[str]] = None,
    budget: Optional[str] = None,
    location: Optional[str] = None,
) -> str:
    """
    Build the onboarding text for embedding.

    Field order (fixed):
        favorite_dishes → spicy_level → dietary_restrictions →
        allergies → budget → location

    Returns
    -------
    str
        A single normalised string ready to be sent to the AI Engine.
    """
    parts: list[str] = []

    _add_field(parts, "favorite_dishes", favorite_dishes)
    _add_field(parts, "spicy_level", spicy_level)
    _add_field(parts, "dietary_restrictions", dietary_restrictions)
    _add_field(parts, "allergies", allergies)
    _add_field(parts, "budget", budget)
    _add_field(parts, "location", location)

    text = "\n".join(parts)
    return _normalise_whitespace(text)


# ── Profile vector text (users.preferences_vector) ───────────────────────────

def build_profile_text(
    *,
    onboarding_preferences: Optional[str] = None,
    bookmarks: Optional[List[str]] = None,
    liked_restaurants: Optional[List[str]] = None,
    liked_dishes: Optional[List[str]] = None,
    recent_interactions: Optional[List[str]] = None,
    dietary_profile: Optional[str] = None,
    budget_profile: Optional[str] = None,
    location_profile: Optional[str] = None,
) -> str:
    """
    Build the comprehensive user profile text for embedding.

    Field order (fixed):
        onboarding_preferences → bookmarks → liked_restaurants →
        liked_dishes → recent_interactions → dietary_profile →
        budget_profile → location_profile

    Returns
    -------
    str
        A single normalised string ready to be sent to the AI Engine.
    """
    parts: list[str] = []

    _add_field(parts, "onboarding_preferences", onboarding_preferences)
    _add_field(parts, "bookmarks", bookmarks)
    _add_field(parts, "liked_restaurants", liked_restaurants)
    _add_field(parts, "liked_dishes", liked_dishes)
    _add_field(parts, "recent_interactions", recent_interactions)
    _add_field(parts, "dietary_profile", dietary_profile)
    _add_field(parts, "budget_profile", budget_profile)
    _add_field(parts, "location_profile", location_profile)

    text = "\n".join(parts)
    return _normalise_whitespace(text)
