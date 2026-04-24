import httpx
import json
import math
from typing import List, Optional

from app.core.config import settings
from app.core.security import hash_password, verify_password, create_access_token
from .schemas import (
    OnboardingRequest,
    OnboardingResponse,
    MockRestaurant,
    SignInRequest,
    SignUpRequest,
    AuthResponse
)
from .repository import UserOnboardingRepository, UserAccountRepository

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
      1. Call the AI engine to get a preference vector from the user's dishes.
      2. Enrich / combine the vector with structured user data.
      3. Persist via the repository.
      4. Return the response (or a popular-restaurant fallback when no prior data exists).
    """

    def __init__(self, repository: UserOnboardingRepository) -> None:
        self._repo = repository

    # ── Public entry-point ────────────────────────────────────────────────────

    async def process_onboarding(
        self, user_id: str, payload: OnboardingRequest
    ) -> OnboardingResponse:
        has_prior_data = self._repo.get_by_user_id(user_id) is not None

        # 1. Call AI engine
        ai_vector = await self._call_ai_engine(payload)

        # 2. Build preferences vector (AI output + structured encoding)
        if ai_vector:
            preferences_vector = self._combine_vectors(ai_vector, payload)
            fallback = False
        else:
            # AI unavailable – use a simple deterministic vector as fallback
            preferences_vector = self._fallback_vector(payload)
            fallback = not has_prior_data

        # 3. Persist
        self._repo.upsert(
            user_id=user_id,
            favorite_dishes=payload.favorite_dishes,
            spicy_level=payload.spicy_level,
            dietary_restrictions=payload.dietary_restrictions,
            allergies=payload.allergies,
            budget=payload.budget,
            location=payload.location,
            age=payload.age,
            preferences_vector=preferences_vector,
        )

        # 4. Build response
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
        POST to the AI engine with a natural-language representation of the
        user's preferences. Returns the 768-dim vector, or None on any error.
        """
        text = self._build_nlp_text(payload)
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{settings.AI_ENGINE_BASE_URL}/api/v1/nlp/process",
                    json={"text": text},
                )
                response.raise_for_status()
                data = response.json()
                return data.get("vector")
        except Exception as exc:
            print(f"[OnboardingService] AI engine unreachable: {exc}")
            return None

    @staticmethod
    def _build_nlp_text(payload: OnboardingRequest) -> str:
        """Serialise the onboarding payload into a single descriptive sentence."""
        dishes = ", ".join(payload.favorite_dishes)
        restrictions = ", ".join(payload.dietary_restrictions) or "none"
        allergies = ", ".join(payload.allergies) or "none"
        return (
            f"User aged {payload.age} living in {payload.location} enjoys {dishes}. "
            f"Spicy level: {payload.spicy_level}. Budget: {payload.budget}. "
            f"Dietary restrictions: {restrictions}. Allergies: {allergies}."
        )

    @staticmethod
    def _combine_vectors(
        ai_vector: List[float], payload: OnboardingRequest
    ) -> List[float]:
        """
        Append a small structured encoding (5 dimensions) to the 768-dim AI
        vector, producing a 773-dim combined preference vector.

        Structured dims:
          [0] spicy_level  (0–4 normalised to 0–1)
          [1] budget       (0–2 normalised to 0–1)
          [2] age          (normalised 13–80)
          [3] # dietary restrictions (normalised 0–5)
          [4] # allergies  (normalised 0–10)
        """
        spicy_map = {"none": 0, "mild": 1, "medium": 2, "hot": 3, "extra_hot": 4}
        budget_map = {"low": 0, "medium": 1, "high": 2}

        structured = [
            spicy_map.get(payload.spicy_level, 2) / 4.0,
            budget_map.get(payload.budget, 1) / 2.0,
            min(max((payload.age - 13) / (80 - 13), 0.0), 1.0),
            min(len(payload.dietary_restrictions) / 5.0, 1.0),
            min(len(payload.allergies) / 10.0, 1.0),
        ]

        return ai_vector + structured

    @staticmethod
    def _fallback_vector(payload: OnboardingRequest) -> List[float]:
        """
        Generate a deterministic 773-dim vector when the AI engine is down.
        The first 768 dims are a simple hash-based approximation; the last 5
        are the same structured encoding used in _combine_vectors.
        """
        spicy_map = {"none": 0, "mild": 1, "medium": 2, "hot": 3, "extra_hot": 4}
        budget_map = {"low": 0, "medium": 1, "high": 2}

        # Hash each dish name into a deterministic float in [-1, 1]
        base = [0.0] * 768
        for dish in payload.favorite_dishes:
            for i, char in enumerate(dish):
                base[i % 768] += (ord(char) / 128.0 - 1.0)

        # Normalise to [-1, 1]
        magnitude = math.sqrt(sum(v * v for v in base)) or 1.0
        base = [v / magnitude for v in base]

        structured = [
            spicy_map.get(payload.spicy_level, 2) / 4.0,
            budget_map.get(payload.budget, 1) / 2.0,
            min(max((payload.age - 13) / (80 - 13), 0.0), 1.0),
            min(len(payload.dietary_restrictions) / 5.0, 1.0),
            min(len(payload.allergies) / 10.0, 1.0),
        ]

        return base + structured
class AuthService:
    def __init__(self, repository: UserAccountRepository) -> None:
        self._repo = repository

    def sign_up(self, payload: SignUpRequest) -> AuthResponse:
        existing = self._repo.get_by_username(payload.username)
        if existing:
            raise ValueError("Username already exists.")

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
            user_id=user.id,
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
            user_id=user.id,
            username=user.username,
            access_token=access_token,
            token_type="bearer",
        )
