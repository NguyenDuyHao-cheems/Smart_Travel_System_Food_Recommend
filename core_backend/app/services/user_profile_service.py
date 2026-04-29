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
import asyncio
from typing import List, Optional

from sqlalchemy.orm import Session

from app.domains.users.repository import UserOnboardingRepository, UserAccountRepository
from app.domains.users.models import UserOnboarding
from app.services.user_vector_builder import build_onboarding_text, build_profile_text
from app.services.ai_client import embed_text

logger = logging.getLogger(__name__)


def _build_onboarding_summary(record: UserOnboarding) -> str:
    """Build the onboarding portion of the profile text."""
    return build_onboarding_text(
        favorite_dishes=record.favorite_dishes,
        spicy_level=record.spicy_level,
        dietary_restrictions=record.dietary_restrictions,
        allergies=record.allergies,
        budget=record.budget,
        location=record.location,
    )


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
    # ── 1. Collect signals ───────────────────────────────────────────────────
    # Run sync DB queries in a thread pool to avoid blocking the event loop
    onboarding_record = await asyncio.to_thread(
        lambda: UserOnboardingRepository(db).get_by_user_id(user_id)
    )

    if not onboarding_record:
        logger.info("No onboarding data for user %s, skipping profile rebuild.", user_id)
        return None

    # Future signal collectors (placeholders)
    bookmarks = []  # TODO: Fetch from bookmarks table
    liked_restaurants = []  # TODO: Fetch from likes table
    liked_dishes = []  # TODO: Fetch from likes table
    recent_interactions = []  # TODO: Fetch from interactions table

    # Extract onboarding signals
    onboarding_summary = _build_onboarding_summary(onboarding_record)
    
    dietary_profile = None
    if onboarding_record.dietary_restrictions:
        dr = onboarding_record.dietary_restrictions
        dietary_profile = ", ".join(dr) if isinstance(dr, list) else str(dr)

    # ── 2. Build profile text ────────────────────────────────────────────────
    text = build_profile_text(
        onboarding_preferences=onboarding_summary,
        bookmarks=bookmarks,
        liked_restaurants=liked_restaurants,
        liked_dishes=liked_dishes,
        recent_interactions=recent_interactions,
        dietary_profile=dietary_profile,
        budget_profile=onboarding_record.budget,
        location_profile=onboarding_record.location,
    )

    if not text:
        return None

    # ── 3. Embed via AI Engine ───────────────────────────────────────────────
    vector = await embed_text(text)
    if not vector:
        return None

    # ── 4. Persist to users.preferences_vector ───────────────────────────────
    user_repo = UserAccountRepository(db)
    updated = await asyncio.to_thread(
        lambda: user_repo.update_preferences_vector(user_id, vector)
    )
    
    if not updated:
        logger.error("User %s not found when persisting profile vector.", user_id)
        return None

    logger.info("Successfully rebuilt profile vector for user %s.", user_id)
    return vector

