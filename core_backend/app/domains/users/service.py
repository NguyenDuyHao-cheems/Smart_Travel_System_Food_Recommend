import logging
import math
from typing import List, Optional

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from app.services.user_vector_builder import build_onboarding_text
from app.services.ai_client import embed_text
from app.services.user_profile_service import rebuild_user_profile_vector
from .schemas import (
    OnboardingRequest,
    OnboardingResponse,
    MockRestaurant,
    SignInRequest,
    SignUpRequest,
    AuthResponse
)
from .repository import UserOnboardingRepository, UserAccountRepository

logger = logging.getLogger(__name__)
# TODO: mock code 
# ── Mock fallback data ────────────────────────────────────────────────────────
POPULAR_RESTAURANTS: List[MockRestaurant] = [
    MockRestaurant(name="Phở Thìn", cuisine="Vietnamese", rating=4.8, location="Ho Chi Minh City"),
    MockRestaurant(name="Pizza 4P's", cuisine="Italian-Japanese Fusion", rating=4.7, location="Ho Chi Minh City"),
    MockRestaurant(name="Bún Bò Huế Nguyệt", cuisine="Vietnamese", rating=4.6, location="Ho Chi Minh City"),
    MockRestaurant(name="Grill House Seoul", cuisine="Korean BBQ", rating=4.5, location="Ho Chi Minh City"),
    MockRestaurant(name="The Raclette", cuisine="European", rating=4.4, location="Ho Chi Minh City"),
]


class OnboardingService:
    """
    Orchestrates the full onboarding flow:
      1. Build standardised text from onboarding payload.
      2. Call the AI engine to get a 768-dim preference vector.
      3. Persist via the repository.
      4. Return the response (or a popular-restaurant fallback when no prior data exists).

    The text follows the fixed format:
        favorite_dishes: ...
        spicy_level: ...
        dietary_restrictions: ...
        allergies: ...
        budget: ...
        location: ...
    """

    def __init__(self, repository: UserOnboardingRepository) -> None:
        self._repo = repository

    # ── Public entry-point ────────────────────────────────────────────────────

    async def process_onboarding(
        self, user_id: str, payload: OnboardingRequest, db=None
    ) -> OnboardingResponse:
        has_prior_data = self._repo.get_by_user_id(user_id) is not None

        # 1. Build standardised text and call AI engine for 768-dim vector
        ai_vector = await self._call_ai_engine(payload)

        # 2. Use AI vector directly (768-dim, no extra structured dims)
        if ai_vector:
            preferences_vector = ai_vector
            fallback = False
        else:
            # AI unavailable – use a simple deterministic 768-dim vector
            preferences_vector = self._fallback_vector(payload)
            fallback = not has_prior_data

        # 3. Persist to onboarding table
        self._repo.upsert(
            user_id=user_id,
            favorite_dishes=payload.favorite_dishes,
            spicy_level=payload.spicy_level,
            dietary_restrictions=payload.dietary_restrictions,
            allergies=payload.allergies,
            budget=payload.budget,
            location=payload.location,
            age=payload.age or 0,
            preferences_vector=preferences_vector,
        )

        # 4. Trigger profile rebuild (now that we have onboarding data)
        # We only do this if a DB session is provided (for repository access)
        if db:
            try:
                await rebuild_user_profile_vector(db, user_id)
            except Exception as exc:
                logger.error("Failed to trigger profile rebuild for user %s: %s", user_id, exc)

        # 5. Build response
        return OnboardingResponse(
            status="success",
            message="Onboarding completed",
            preferences_vector=preferences_vector,
            fallback=fallback,
            popular_restaurants=POPULAR_RESTAURANTS if fallback else None,
        )

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _call_ai_engine(
        self, payload: OnboardingRequest
    ) -> Optional[List[float]]:
        """
        POST to the AI engine with a standardised text representation of the
        user's preferences. Returns the 768-dim vector, or None on any error.
        """
        text = build_onboarding_text(
            favorite_dishes=payload.favorite_dishes,
            spicy_level=payload.spicy_level,
            dietary_restrictions=payload.dietary_restrictions,
            allergies=payload.allergies,
            budget=payload.budget,
            location=payload.location,
        )
        return await embed_text(text)

    @staticmethod
    def _fallback_vector(payload: OnboardingRequest) -> List[float]:
        """
        Generate a deterministic 768-dim vector when the AI engine is down.

        Uses the same standardised text format to hash into a vector so that
        the fallback approximation lives in the same space.
        """
        text = build_onboarding_text(
            favorite_dishes=payload.favorite_dishes,
            spicy_level=payload.spicy_level,
            dietary_restrictions=payload.dietary_restrictions,
            allergies=payload.allergies,
            budget=payload.budget,
            location=payload.location,
        )

        dim = settings.VECTOR_DIM  # 768
        base = [0.0] * dim

        for i, char in enumerate(text):
            base[i % dim] += (ord(char) / 128.0 - 1.0)

        # Normalise to unit length
        magnitude = math.sqrt(sum(v * v for v in base)) or 1.0
        base = [v / magnitude for v in base]

        return base


class AuthService:
    def __init__(self, repository: UserAccountRepository) -> None:
        self._repo = repository

    def sign_up(self, payload: SignUpRequest) -> AuthResponse:
        user = self._repo.create_user(
            username=payload.username,
            password_hash=hash_password(payload.password),
        )
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "username": user.username,
            }
        )

        return AuthResponse(
            message="Sign up successful",
            user_id=str(user.id),
            username=user.username,
            access_token=access_token,
            token_type="bearer",
        )

    def sign_in(self, payload: SignInRequest) -> AuthResponse:
        user = self._repo.get_by_username(payload.username)
        if not user or not verify_password(payload.password, user.password_hash):
            raise PermissionError("Invalid username or password.")
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "username": user.username,
            }
        )

        return AuthResponse(
            message="Sign in successful",
            user_id=str(user.id),
            username=user.username,
            access_token=access_token,
            token_type="bearer",
        )
