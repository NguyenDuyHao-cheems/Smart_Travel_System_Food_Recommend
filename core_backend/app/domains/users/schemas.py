from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal
import json


# ── Request ──────────────────────────────────────────────────────────────────
class OnboardingRequest(BaseModel):
    """Input schema for the user onboarding endpoint."""

    favorite_dishes: List[str] = Field(
        ...,
        min_length=3,
        max_length=5,
        description="Between 3 and 5 favorite dishes.",
    )
    spicy_level: Literal["none", "mild", "medium", "hot", "extra_hot"] = Field(
        ..., description="User's preferred spice level."
    )
    dietary_restrictions: List[str] = Field(
        default_factory=list,
        description="E.g. vegan, vegetarian, halal.",
    )
    allergies: List[str] = Field(
        default_factory=list,
        description="List of food allergies.",
    )
    budget: Literal["low", "medium", "high"] = Field(
        ..., description="User's dining budget tier."
    )
    location: str = Field(..., description="User's current city or district.")
    age: int = Field(..., ge=13, le=120, description="User's age.")

    @field_validator("favorite_dishes")
    @classmethod
    def validate_dish_count(cls, v: List[str]) -> List[str]:
        if not (3 <= len(v) <= 5):
            raise ValueError("favorite_dishes must contain between 3 and 5 items.")
        return v


# ── Payload sent to AI Engine ─────────────────────────────────────────────────
class OnboardingAIPayload(BaseModel):
    """Payload forwarded to the AI engine's /nlp/extract-intent endpoint."""

    text: str = Field(..., description="Serialised onboarding context for NLP processing.")


# ── Response ──────────────────────────────────────────────────────────────────
class MockRestaurant(BaseModel):
    """A single popular-restaurant entry used in the fallback response."""

    name: str
    cuisine: str
    rating: float
    location: str


class OnboardingResponse(BaseModel):
    """Response schema returned after successful onboarding."""

    status: str = "success"
    message: str = "Onboarding completed"
    preferences_vector: Optional[List[float]] = Field(
        None, description="Combined preference vector from AI output + user data."
    )
    fallback: bool = Field(
        False,
        description="True when the response is based on popular restaurants because no prior data exists.",
    )
    popular_restaurants: Optional[List[MockRestaurant]] = Field(
        None,
        description="Populated only when fallback=True.",
    )
