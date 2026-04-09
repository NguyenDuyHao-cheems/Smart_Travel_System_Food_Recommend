from sqlalchemy.orm import Session
from .models import UserOnboarding
from typing import Optional, List


class UserOnboardingRepository:
    """
    Data-access layer for the UserOnboarding table.
    All database operations are isolated here so the service layer
    remains free of any ORM / SQL details.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    # ── Reads ─────────────────────────────────────────────────────────────────

    def get_by_user_id(self, user_id: str) -> Optional[UserOnboarding]:
        """Return the existing onboarding record for *user_id*, or None."""
        return (
            self._db.query(UserOnboarding)
            .filter(UserOnboarding.user_id == user_id)
            .first()
        )

    # ── Writes ────────────────────────────────────────────────────────────────

    def upsert(
        self,
        user_id: str,
        favorite_dishes: List[str],
        spicy_level: str,
        dietary_restrictions: List[str],
        allergies: List[str],
        budget: str,
        location: str,
        age: int,
        preferences_vector: Optional[List[float]],
    ) -> UserOnboarding:
        """
        Insert a new onboarding record or overwrite the existing one.
        Returns the persisted record.
        """
        existing = self.get_by_user_id(user_id)

        if existing:
            existing.favorite_dishes = favorite_dishes
            existing.spicy_level = spicy_level
            existing.dietary_restrictions = dietary_restrictions
            existing.allergies = allergies
            existing.budget = budget
            existing.location = location
            existing.age = age
            existing.preferences_vector = preferences_vector
            record = existing
        else:
            record = UserOnboarding(
                user_id=user_id,
                favorite_dishes=favorite_dishes,
                spicy_level=spicy_level,
                dietary_restrictions=dietary_restrictions,
                allergies=allergies,
                budget=budget,
                location=location,
                age=age,
                preferences_vector=preferences_vector,
            )
            self._db.add(record)

        self._db.commit()
        self._db.refresh(record)
        return record
