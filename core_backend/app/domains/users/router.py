from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .models import UserAccount
from .schemas import (
    OnboardingRequest, OnboardingResponse, SignUpRequest, SignInRequest, 
    GoogleAuthRequest, AuthResponse, UserUpdateRequest,
    UserInteractionRequest, UserInteractionResponse, UserProfileResponse,
    BadgeProgress, CulinaryVibe, RecentActivityResponse
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
    """Trả về thông tin hồ sơ của tài khoản đang đăng nhập kèm trạng thái huy hiệu và gu ẩm thực động."""
    import uuid
    from app.domains.users.models import UserOnboarding
    from app.domains.search.models import SearchSession
    
    # 1. Truy vấn thông tin Onboarding để check Ăn chay
    onboarding = db.query(UserOnboarding).filter(UserOnboarding.user_id == str(current_user.id)).first()
    is_vegetarian = onboarding.is_vegetarian if onboarding else False

    # 2. Truy vấn lịch sử tìm kiếm để tính toán tiến độ và gu ẩm thực
    user_uuid = uuid.UUID(str(current_user.id))
    sessions = db.query(SearchSession).filter(SearchSession.user_id == user_uuid).all()

    # 3. Tính toán đếm số lần theo từ khóa cho Huy hiệu
    pho_count = 0
    cay_count = 0
    rau_count = 0
    kem_count = 0
    thit_count = 0
    night_count = 0

    # 4. Tính toán đếm số lần theo từ khóa cho Gu ẩm thực
    water_count = 0
    bbq_count = 0
    hotpot_count = 0
    fried_count = 0
    healthy_count = 0
    sweet_count = 0

    for s in sessions:
        q = (s.query or "").lower()
        
        # --- Đếm cho Huy hiệu ---
        if "phở" in q:
            pho_count += 1
        if any(k in q for k in ["cay", "lẩu thái", "mì cay", "ớt", "lẩu xuyên tiêu"]):
            cay_count += 1
        if any(k in q for k in ["rau", "chay", "salad", "nấm", "diet"]):
            rau_count += 1
        if any(k in q for k in ["kem", "chè", "bánh ngọt", "tráng miệng", "ice cream", "sữa chua"]):
            kem_count += 1
        if any(k in q for k in ["thịt", "nướng", "bbq", "steak", "lợn", "bò", "gà"]):
            thit_count += 1
        if s.created_at:
            local_hour = (s.created_at.hour + 7) % 24
            if local_hour >= 22 or local_hour < 4:
                night_count += 1

        # --- Đếm cho Gu ẩm thực ---
        # 1. Món Nước
        if any(k in q for k in ["phở", "bún", "hủ tiếu", "mì quảng", "bánh canh", "súp", "nước lèo", "nước dùng", "ramen", "udon"]):
            water_count += 1
        # 2. Món Nướng
        if any(k in q for k in ["nướng", "bbq", "quay", "sườn", "khói", "steak", "áp chảo", "yakitori"]):
            bbq_count += 1
        # 3. Món Lẩu
        if any(k in q for k in ["lẩu", "hotpot", "nhúng", "shabu", "tứ xuyên"]):
            hotpot_count += 1
        # 4. Món Chiên / Xào
        if any(k in q for k in ["chiên", "xào", "rán", "khoai tây chiên", "cơm chiên", "ốc xào", "mì xào", "fastfood", "kfc", "lotteria"]):
            fried_count += 1
        # 5. Món Hấp / Trộn (Thanh đạm)
        if any(k in q for k in ["hấp", "trộn", "dimsum", "há cảo", "xíu mại", "gỏi cuốn", "nộm", "gỏi", "salad", "thanh đạm", "healthy", "luộc", "cuốn"]):
            healthy_count += 1
        # 6. Món Ngọt / Tráng miệng
        if any(k in q for k in ["kem", "chè", "bánh ngọt", "trà sữa", "sinh tố", "tráng miệng", "ice cream", "sữa chua", "bánh kem", "pudding", "nước ép"]):
            sweet_count += 1

    # Tính phần trăm cho Gu ẩm thực
    total_classified = water_count + bbq_count + hotpot_count + fried_count + healthy_count + sweet_count
    vibe_map = [
        {"label": "Món Nước (Ninh / Hầm) 🍜", "count": water_count},
        {"label": "Món Nướng (BBQ) 🥩", "count": bbq_count},
        {"label": "Món Lẩu 🍲", "count": hotpot_count},
        {"label": "Món Chiên / Xào 🍤", "count": fried_count},
        {"label": "Món Hấp / Trộn (Thanh đạm) 🥗", "count": healthy_count},
        {"label": "Món Ngọt / Tráng miệng 🍰", "count": sweet_count},
    ]

    vibes_list = []
    for item in vibe_map:
        pct = 0
        if total_classified > 0:
            pct = round((item["count"] / total_classified) * 100)
        vibes_list.append(CulinaryVibe(label=item["label"], percent=pct, count=item["count"]))

    # Sắp xếp gu nổi bật nhất lên đầu
    vibes_list.sort(key=lambda x: x.percent, reverse=True)

    # Giới hạn tiến trình không vượt quá target cho Huy hiệu
    badges_data = {
        "🍜": BadgeProgress(unlocked=pho_count >= 20, progress=min(pho_count, 20), target=20),
        "🌶️": BadgeProgress(unlocked=cay_count >= 20, progress=min(cay_count, 20), target=20),
        "🥬": BadgeProgress(unlocked=rau_count >= 20, progress=min(rau_count, 20), target=20),
        "🍦": BadgeProgress(unlocked=kem_count >= 20, progress=min(kem_count, 20), target=20),
        "🥓": BadgeProgress(unlocked=thit_count >= 20, progress=min(thit_count, 20), target=20),
        "☕": BadgeProgress(unlocked=night_count >= 20, progress=min(night_count, 20), target=20),
        "🧘": BadgeProgress(unlocked=is_vegetarian, progress=1 if is_vegetarian else 0, target=1)
    }

    # 5. Truy vấn Hoạt động gần đây (trong vòng 3 ngày qua, tối đa 15 hoạt động)
    from app.domains.users.models import UserInteraction
    from app.domains.ranking.models import RestaurantModel
    from datetime import datetime, timezone, timedelta
    
    cutoff = datetime.now(timezone.utc) - timedelta(days=3)
    
    interactions = (
        db.query(UserInteraction)
        .filter(UserInteraction.user_id == str(current_user.id))
        .filter(UserInteraction.created_at >= cutoff)
        .order_by(UserInteraction.created_at.desc())
        .all()
    )
    
    recent_activities = []
    for inter in interactions:
        if len(recent_activities) >= 15:
            break
            
        action = inter.action_type.upper()
        
        # Bỏ qua hoạt động đo thời gian xem
        if "DURATION" in action:
            continue
            
        metadata = inter.metadata_ or {}
        
        # Tìm tên nhà hàng
        res_name = metadata.get("restaurant_name") or metadata.get("res_name")
        if not res_name and inter.res_id:
            res_obj = db.query(RestaurantModel).filter(RestaurantModel.id == inter.res_id).first()
            if res_obj:
                res_name = res_obj.name
        if not res_name:
            res_name = "Nhà hàng"
            
        # Tính khoảng thời gian trôi qua bằng tiếng Việt
        diff = datetime.now(timezone.utc) - inter.created_at.replace(tzinfo=timezone.utc)
        diff_sec = diff.total_seconds()
        
        if diff_sec < 60:
            time_ago = "Vài giây trước"
        elif diff_sec < 3600:
            time_ago = f"{int(diff_sec // 60)} phút trước"
        elif diff_sec < 86400:
            time_ago = f"{int(diff_sec // 3600)} giờ trước"
        else:
            time_ago = f"{int(diff_sec // 86400)} ngày trước"
            
        title = ""
        icon_type = ""
        
        if "LIKE" in action:
            title = f'Đã yêu thích nhà hàng: "{res_name}"'
            icon_type = "heart"
        elif "VIEW" in action or "VISIT" in action:
            title = f'Ghé thăm nhà hàng "{res_name}"'
            icon_type = "visit"
        elif "REVIEW" in action:
            rating = metadata.get("rating") or "5 sao"
            title = f'Đánh giá "{rating}" cho nhà hàng "{res_name}"'
            icon_type = "star"
        elif "SAVE" in action or "COLLECT" in action or "BOOKMARK" in action:
            coll_name = metadata.get("collection_name") or "Bộ sưu tập của tôi"
            title = f'Lưu nhà hàng "{res_name}" vào bộ sưu tập "{coll_name}"'
            icon_type = "bookmark"
        else:
            continue
            
        recent_activities.append(
            RecentActivityResponse(
                title=title,
                time_ago=time_ago,
                icon_type=icon_type,
                created_at=inter.created_at,
                res_id=str(inter.res_id) if inter.res_id else None,
                res_name=res_name,
                collection_name=metadata.get("collection_name") or (coll_name if "SAVE" in action or "COLLECT" in action or "BOOKMARK" in action else None)
            )
        )

    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        badges=badges_data,
        culinary_vibes=vibes_list,
        recent_activities=recent_activities,
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
