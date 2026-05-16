from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .models import UserAccount
from .schemas import (
    OnboardingRequest, OnboardingResponse, SignUpRequest, SignInRequest, 
    GoogleAuthRequest, AuthResponse, UserUpdateRequest,
    UserInteractionRequest, UserInteractionResponse
)
from .service import OnboardingService, AuthService, UserInteractionService
from .repository import UserOnboardingRepository, UserAccountRepository, UserInteractionRepository
from app.core.dependencies import get_db, get_current_user, get_optional_current_user

router = APIRouter()


# ── Dependency providers ──────────────────────────────────────────────────────

def get_onboarding_service(db: Session = Depends(get_db)) -> OnboardingService:
    """Compose the service with its repository dependency."""
    repository = UserOnboardingRepository(db=db)
    return OnboardingService(repository=repository)


def get_auth_service(db: Session = Depends(get_db)) -> AuthService:
    """Compose the auth service with its repository dependency."""
    repository = UserAccountRepository(db=db)
    return AuthService(repository=repository)


def get_interaction_service(db: Session = Depends(get_db)) -> UserInteractionService:
    repository = UserInteractionRepository(db=db)
    return UserInteractionService(repository=repository)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/sign_up", response_model=AuthResponse)
def sign_up(
    payload: SignUpRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        return service.sign_up(payload)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/sign_in", response_model=AuthResponse)
def sign_in(
    payload: SignInRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        return service.sign_in(payload)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.post("/google_auth", response_model=AuthResponse)
async def google_auth(
    payload: GoogleAuthRequest,
    service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        return await service.google_auth(payload)
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@router.patch("/me", response_model=AuthResponse)
def update_user(
    payload: UserUpdateRequest,
    service: AuthService = Depends(get_auth_service),
    current_user: UserAccount = Depends(get_current_user),
) -> AuthResponse:
    try:
        return service.update_user(user_id=str(current_user.id), payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))


@router.delete("/me")
def delete_user(
    service: AuthService = Depends(get_auth_service),
    current_user: UserAccount = Depends(get_current_user),
):
    success = service.delete_account(user_id=str(current_user.id))
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Account deleted successfully"}


@router.post(
    "/{user_id}/onboarding",
    response_model=OnboardingResponse,
    summary="Submit user onboarding preferences",
    description=(
        "Accepts a user's food preferences, calls the AI engine to generate a "
        "preference vector, persists the result, and returns the combined vector. "
        "When no prior data exists the response includes a list of popular "
        "restaurants as a soft fallback."
    ),
)
async def user_onboarding(
    user_id: str,
    payload: OnboardingRequest,
    service: OnboardingService = Depends(get_onboarding_service),
    db: Session = Depends(get_db),
) -> OnboardingResponse:
    try:
        return await service.process_onboarding(user_id=user_id, payload=payload, db=db)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {exc}")


@router.post("/interaction", response_model=UserInteractionResponse)
def log_user_interaction(
    request: Request,
    payload: UserInteractionRequest,
    service: UserInteractionService = Depends(get_interaction_service),
    current_user: UserAccount | None = Depends(get_optional_current_user),
):
    try:
        user_id = str(current_user.id) if current_user else None
        return service.log_interaction(payload=payload, user_id=user_id)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to log interaction: {exc}")
