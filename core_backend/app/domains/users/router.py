from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .models import UserAccount
from .schemas import (
    OnboardingRequest, OnboardingResponse, SignUpRequest, SignInRequest, 
    GoogleAuthRequest, AuthResponse, UserUpdateRequest,
    UserInteractionRequest, UserInteractionResponse, UserProfileResponse,
    BadgeProgress
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


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    """Trả về thông tin hồ sơ của tài khoản đang đăng nhập kèm trạng thái huy hiệu."""
    import uuid
    from app.domains.users.models import UserOnboarding
    from app.domains.search.models import SearchSession
    
    # 1. Truy vấn thông tin Onboarding để check Ăn chay
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == str(current_user.id)).first()
    is_vegetarian = onboarding.is_vegetarian if onboarding else False

    # 2. Truy vấn lịch sử tìm kiếm để tính toán tiến độ
    user_uuid = uuid.UUID(str(current_user.id))
    sessions = db.query(SearchSession).filter(SearchSession.user_id == user_uuid).all()

    # 3. Tính toán đếm số lần theo từ khóa
    pho_count = 0
    cay_count = 0
    rau_count = 0
    kem_count = 0
    thit_count = 0
    night_count = 0

    for s in sessions:
        q = (s.query or "").lower()
        
        # 🍜 Phở Master
        if "phở" in q:
            pho_count += 1
            
        # 🌶️ Cay Vô Đối
        if any(k in q for k in ["cay", "lẩu thái", "mì cay", "ớt", "lẩu xuyên tiêu"]):
            cay_count += 1
            
        # 🥬 Thánh Rau
        if any(k in q for k in ["rau", "chay", "salad", "nấm", "diet"]):
            rau_count += 1
            
        # 🍦 Kem Lạnh
        if any(k in q for k in ["kem", "chè", "bánh ngọt", "tráng miệng", "ice cream", "sữa chua"]):
            kem_count += 1
            
        # 🥓 Team Thịt
        if any(k in q for k in ["thịt", "nướng", "bbq", "steak", "lợn", "bò", "gà"]):
            thit_count += 1
            
        # ☕ Cú Đêm (22h đêm - 4h sáng VN, tức s.created_at + 7 tiếng)
        if s.created_at:
            local_hour = (s.created_at.hour + 7) % 24
            if local_hour >= 22 or local_hour < 4:
                night_count += 1

    # Giới hạn tiến trình không vượt quá target
    badges_data = {
        "🍜": BadgeProgress(unlocked=pho_count >= 20, progress=min(pho_count, 20), target=20),
        "🌶️": BadgeProgress(unlocked=cay_count >= 20, progress=min(cay_count, 20), target=20),
        "🥬": BadgeProgress(unlocked=rau_count >= 20, progress=min(rau_count, 20), target=20),
        "🍦": BadgeProgress(unlocked=kem_count >= 20, progress=min(kem_count, 20), target=20),
        "🥓": BadgeProgress(unlocked=thit_count >= 20, progress=min(thit_count, 20), target=20),
        "☕": BadgeProgress(unlocked=night_count >= 20, progress=min(night_count, 20), target=20),
        "🧘": BadgeProgress(unlocked=is_vegetarian, progress=1 if is_vegetarian else 0, target=1)
    }

    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        badges=badges_data,
    )


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


@router.get("/{user_id}/allergies")
def get_user_allergies(
    user_id: str,
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách dị ứng của user.
    Tra cứu theo thứ tự: user_onboardings → users.
    """
    try:
        # Source 1: user_onboardings table
        onboarding_repo = UserOnboardingRepository(db=db)
        record = onboarding_repo.get_by_user_id(user_id)
        if record and record.allergies:
            return {"user_id": user_id, "allergies": record.allergies}

        # Source 2: users table (allergies column)
        account_repo = UserAccountRepository(db=db)
        account = account_repo.get_by_id(user_id)
        if account:
            return {"user_id": user_id, "allergies": account.allergies or []}

        return {"user_id": user_id, "allergies": []}

    except Exception as exc:
        # Do not crash — just return empty list
        return {"user_id": user_id, "allergies": [], "error": str(exc)[:100]}


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
