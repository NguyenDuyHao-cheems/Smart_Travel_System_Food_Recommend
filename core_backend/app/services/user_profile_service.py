"""
User Profile Vector Service
============================
Builds and persists the long-term ``users.preferences_vector`` by aggregating:

- onboarding_preferences  (from user_onboardings)
- bookmarks               (TODO: future bookmarks table)
- liked_restaurants        (TODO: future likes table)
- liked_dishes             (TODO: future likes table)
- recent_interactions      (from user_interactions)
- dietary_profile          (from user_onboardings.dietary_restrictions)
- budget_profile           (from user_onboardings.budget)
- location_profile         (from user_onboardings.location)

The combined text is sent to the AI Engine (PhoBERT) which returns a
768-dim vector — same model and dimension as restaurant/dish vectors.

Usage
-----
Call ``rebuild_user_profile_vector(db, user_id)`` after any event that
changes the user's preference signals (e.g. new bookmark, new interaction,
onboarding update).
"""

import logging
from typing import List, Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings
from app.domains.users.repository import UserOnboardingRepository, UserAccountRepository
from app.services.user_vector_builder import build_onboarding_text, build_profile_text

logger = logging.getLogger(__name__)


def _collect_onboarding_summary(db: Session, user_id: str) -> Optional[str]:
    """
    Build the onboarding portion of the profile text from the
    ``user_onboardings`` record.
    """
    repo = UserOnboardingRepository(db)
    record = repo.get_by_user_id(user_id)
    if not record:
        return None

    return build_onboarding_text(
        favorite_dishes=record.favorite_dishes,
        spicy_level=record.spicy_level,
        dietary_restrictions=record.dietary_restrictions,
        allergies=record.allergies,
        budget=record.budget,
        location=record.location,
    )


def _collect_recent_interactions(db: Session, user_id: str, limit: int = 20) -> List[str]:
    """
    Fetch the most recent interaction summaries for the user.

    TODO: Replace with real query from ``user_interactions`` table once
    the interaction model is standardised in core_backend.
    """
    # Placeholder — will be populated when interaction tracking is implemented.
    return []


def _collect_bookmarks(db: Session, user_id: str) -> List[str]:
    """
    Fetch bookmark names for the user.

    TODO: Replace with real query from bookmarks table.
    """
    return []


def _collect_liked_restaurants(db: Session, user_id: str) -> List[str]:
    """
    Fetch liked restaurant names for the user.

    TODO: Replace with real query from likes table.
    """
    return []


def _collect_liked_dishes(db: Session, user_id: str) -> List[str]:
    """
    Fetch liked dish names for the user.

    TODO: Replace with real query from likes table.
    """
    return []


async def _embed_text(text: str) -> Optional[List[float]]:
    """
    Send text to the AI Engine to produce a 768-dim PhoBERT embedding.
    Returns None if the engine is unreachable or returns an unexpected dim.
    """
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                f"{settings.AI_ENGINE_BASE_URL}/api/v1/nlp/extract-intent",
                json={"text": text},
            )
            response.raise_for_status()
            data = response.json()
            vector = data.get("vector")
            if vector and len(vector) == settings.VECTOR_DIM:
                return vector
            logger.warning(
                "AI vector dim mismatch: expected %d, got %d",
                settings.VECTOR_DIM,
                len(vector) if vector else 0,
            )
            return None
    except Exception as exc:
        logger.error("AI engine unreachable for profile embedding: %s", exc)
        return None


async def rebuild_user_profile_vector(
    db: Session, user_id: str
) -> Optional[List[float]]:
    """
    Rebuild and persist the long-term ``users.preferences_vector``.

    Steps
    -----
    1. Collect all signal sources (onboarding, bookmarks, likes, etc.)
    2. Build profile text in the standardised format.
    3. Send to AI Engine for 768-dim embedding.
    4. Persist to ``users.preferences_vector``.

    Returns the new vector, or None if embedding failed.
    """
    # ── 1. Collect signals ────────────────────────────────────────────────────
    onboarding_summary = _collect_onboarding_summary(db, user_id)
    bookmarks = _collect_bookmarks(db, user_id)
    liked_restaurants = _collect_liked_restaurants(db, user_id)
    liked_dishes = _collect_liked_dishes(db, user_id)
    recent_interactions = _collect_recent_interactions(db, user_id)

    # Dietary / budget / location come from onboarding
    onboarding_repo = UserOnboardingRepository(db)
    onboarding_record = onboarding_repo.get_by_user_id(user_id)

    dietary_profile = None
    budget_profile = None
    location_profile = None

    if onboarding_record:
        dietary_restrictions = onboarding_record.dietary_restrictions
        if dietary_restrictions:
            dietary_profile = ", ".join(dietary_restrictions) if isinstance(dietary_restrictions, list) else str(dietary_restrictions)

        budget_profile = onboarding_record.budget
        location_profile = onboarding_record.location

    # ── 2. Build profile text ─────────────────────────────────────────────────
    text = build_profile_text(
        onboarding_preferences=onboarding_summary,
        bookmarks=bookmarks,
        liked_restaurants=liked_restaurants,
        liked_dishes=liked_dishes,
        recent_interactions=recent_interactions,
        dietary_profile=dietary_profile,
        budget_profile=budget_profile,
        location_profile=location_profile,
    )

    if not text:
        logger.info("No profile data available for user %s, skipping vector rebuild.", user_id)
        return None

    # ── 3. Embed via AI Engine ────────────────────────────────────────────────
    vector = await _embed_text(text)
    if not vector:
        logger.warning("Failed to embed profile text for user %s.", user_id)
        return None

    # ── 4. Persist to users.preferences_vector ────────────────────────────────
    user_repo = UserAccountRepository(db)
    updated = user_repo.update_preferences_vector(user_id, vector)
    if not updated:
        logger.error("User %s not found when persisting profile vector.", user_id)
        return None

    logger.info("Successfully rebuilt profile vector for user %s (%d dims).", user_id, len(vector))
    return vector
