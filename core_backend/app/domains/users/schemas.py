from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Literal, Dict, Union
from datetime import datetime
from uuid import UUID



# ── Request ──────────────────────────────────────────────────────────────────
class OnboardingRequest(BaseModel):
    """Input schema for the user onboarding endpoint."""

    favorite_dishes: List[str] = Field(
        ...,
        min_length=1,
        description="List of favorite dishes (no strict upper limit).",
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

    age: Optional[int] = Field(None, ge=13, le=120, description="User's age.")
    is_vegetarian: bool = Field(
        default=False,
        description="True if the user follows a vegetarian diet.",
    )

    
    @field_validator("favorite_dishes", "dietary_restrictions", "allergies")
    @classmethod
    def normalize_list(cls, v: List[str]) -> List[str]:
        return [item.strip().lower() for item in v if item.strip()]


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
    user_id: Optional[str] = None
    allergies: Optional[List[str]] = None
    is_vegetarian: Optional[bool] = None

    preferences_vector: Optional[List[float]] = Field(
        None,
        description="Combined preference vector from AI output + user data.",
    )

    fallback: bool = Field(
        False,
        description="True when fallback is used.",
    )

    popular_restaurants: Optional[List[MockRestaurant]] = Field(
        None,
        description="Only present when fallback=True.",
    )
class SignUpRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class SignInRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8, max_length=128)


class GoogleAuthRequest(BaseModel):
    access_token: str = Field(..., description="Google OAuth2 access token")


class AuthResponse(BaseModel):
    status: str = "success"
    message: str
    user_id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    access_token: str
    token_type: str = "bearer"


class UserUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    password: Optional[str] = None


class UserInteractionRequest(BaseModel):
    anonymous_id: Optional[str] = None
    res_id: Optional[str] = None
    action_type: str = Field(..., description="Type of interaction (e.g., VIEW_RESTAURANT, CLICK_MENU)")
    duration_sec: Optional[int] = None
    metadata: Optional[dict] = Field(None, description="Additional context as JSON/dict")
    search_session_id: Optional[str] = None


class UserInteractionResponse(BaseModel):
    status: str = "success"
    message: str = "Interaction logged successfully"
    interaction_id: str


class BadgeProgress(BaseModel):
    unlocked: bool
    progress: int
    target: int


class CulinaryVibe(BaseModel):
    label: str
    percent: int
    count: int


class RecentActivityResponse(BaseModel):
    title: str
    time_ago: str
    icon_type: str
    created_at: datetime
    res_id: Optional[str] = None
    res_name: Optional[str] = None
    collection_name: Optional[str] = None
    review_id: Optional[str] = None


class UserProfileResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    created_at: datetime
    badges: Dict[str, BadgeProgress]
    culinary_vibes: List[CulinaryVibe]
    recent_activities: List[RecentActivityResponse]
    active_dates: List[str] = []
    
    # Dynamic Stats Fields
    discoveries_count: int = 0
    favorites_count: int = 0
    reviews_count: int = 0
    streak_count: int = 0


class FavoriteCreateRequest(BaseModel):
    res_id: str


class FavoriteResponse(BaseModel):
    id: Union[str, UUID]
    user_id: Union[str, UUID]
    res_id: Union[str, UUID]
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionUpdateRequest(BaseModel):
    name: str
    description: Optional[str] = None


class CollectionItemCreateRequest(BaseModel):
    res_id: str
    dish_id: Optional[str] = None
    item_type: Optional[str] = None
    note: Optional[str] = None


class CollectionItemResponse(BaseModel):
    id: Union[str, UUID]
    collection_id: Union[str, UUID]
    user_id: Union[str, UUID]
    res_id: Optional[Union[str, UUID]] = None
    dish_id: Optional[Union[str, UUID]] = None
    item_type: Optional[str] = None
    note: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class CollectionResponse(BaseModel):
    id: Union[str, UUID]
    user_id: Union[str, UUID]
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    items: List[CollectionItemResponse] = []

    class Config:
        from_attributes = True


class AddFriendRequest(BaseModel):
    username: str = Field(..., description="Username of the user to add as a friend")


class FriendResponse(BaseModel):
    friend_id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FriendRequestResponse(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    status: str
    created_at: datetime
    
    sender_username: Optional[str] = None
    sender_fullname: Optional[str] = None
    sender_avatar: Optional[str] = None
    
    receiver_username: Optional[str] = None
    receiver_fullname: Optional[str] = None
    receiver_avatar: Optional[str] = None

    class Config:
        from_attributes = True


class FriendRequestsListResponse(BaseModel):
    received: List[FriendRequestResponse]
    sent: List[FriendRequestResponse]






