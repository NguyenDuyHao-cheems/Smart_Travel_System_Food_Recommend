from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from .schemas import OnboardingRequest, OnboardingResponse
from .service import OnboardingService
from .repository import UserOnboardingRepository

router = APIRouter()


# ── Dependency providers ──────────────────────────────────────────────────────

def get_db():
    """Yield a SQLAlchemy session and guarantee cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_onboarding_service(db: Session = Depends(get_db)) -> OnboardingService:
    """Compose the service with its repository dependency."""
    repository = UserOnboardingRepository(db=db)
    return OnboardingService(repository=repository)


# ── Endpoints ─────────────────────────────────────────────────────────────────

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
) -> OnboardingResponse:
    try:
        return await service.process_onboarding(user_id=user_id, payload=payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Onboarding failed: {exc}")
