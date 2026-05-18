from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from .models import UserAccount, UserFavorite, UserCollection, UserCollectionItem
from .schemas import (
    OnboardingRequest, OnboardingResponse, SignUpRequest, SignInRequest, 
    GoogleAuthRequest, AuthResponse, UserUpdateRequest,
    UserInteractionRequest, UserInteractionResponse, UserProfileResponse,
    BadgeProgress, CulinaryVibe, RecentActivityResponse,
    FavoriteCreateRequest, FavoriteResponse, CollectionCreateRequest,
    CollectionUpdateRequest, CollectionItemCreateRequest, CollectionItemResponse,
    CollectionResponse
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


def initialize_profile_stats(db: Session, user: UserAccount) -> dict:
    from app.domains.users.models import UserInteraction, UserFavorite
    from sqlalchemy import func
    from datetime import timezone as _timezone, timedelta as _timedelta, datetime
    from sqlalchemy.orm.attributes import flag_modified
    
    vn_tz = _timezone(_timedelta(hours=7))
    
    # 1. Calculate active dates from UserInteraction table
    active_dates_query = db.query(UserInteraction.created_at).filter(
        UserInteraction.user_id == str(user.id)
    ).all()
    active_dates_set = set()
    for row in active_dates_query:
        if row[0]:
            dt = row[0]
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=_timezone.utc)
            local_dt = dt.astimezone(vn_tz)
            active_dates_set.add(local_dt.strftime("%Y-%m-%d"))
    active_dates = sorted(list(active_dates_set))

    # 2. Calculate unique discoveries (res_ids visited)
    discoveries_query = db.query(UserInteraction.res_id).filter(
        UserInteraction.user_id == str(user.id),
        UserInteraction.res_id.isnot(None)
    ).distinct().all()
    discovered_res_ids = [str(r[0]) for r in discoveries_query if r[0]]
    discoveries_count = len(discovered_res_ids)

    # 3. Calculate reviews count
    reviews_count = db.query(UserInteraction).filter(
        UserInteraction.user_id == str(user.id),
        UserInteraction.action_type.like("%REVIEW%")
    ).count()

    # 4. Calculate favorites count
    favorites_count = db.query(UserFavorite).filter(UserFavorite.user_id == str(user.id)).count()

    # 5. Calculate current streak from active_dates
    active_dates_parsed = []
    for date_str in active_dates:
        try:
            active_dates_parsed.append(datetime.strptime(date_str, "%Y-%m-%d").date())
        except ValueError:
            pass

    streak_count = 0
    if active_dates_parsed:
        today_date = datetime.now(vn_tz).date()
        yesterday_date = today_date - _timedelta(days=1)
        active_set = set(active_dates_parsed)
        
        start_date = None
        if today_date in active_set:
            start_date = today_date
        elif yesterday_date in active_set:
            start_date = yesterday_date
            
        if start_date:
            streak_count = 1
            current_check = start_date - _timedelta(days=1)
            while current_check in active_set:
                streak_count += 1
                current_check -= _timedelta(days=1)

    last_active = active_dates[-1] if active_dates else None

    stats = {
        "discoveries_count": discoveries_count,
        "favorites_count": favorites_count,
        "reviews_count": reviews_count,
        "streak_count": streak_count,
        "last_active_date": last_active,
        "discovered_res_ids": discovered_res_ids,
        "active_dates": active_dates,
        "unlocked_badges": []
    }
    user.profile_stats = stats
    flag_modified(user, "profile_stats")
    db.commit()
    return stats


@router.get("/me", response_model=UserProfileResponse)
def get_current_user_profile(
    current_user: UserAccount = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserProfileResponse:
    """Trả về thông tin hồ sơ của tài khoản đang đăng nhập kèm trạng thái huy hiệu và gu ẩm thực động."""
    import uuid
    from app.domains.users.models import UserOnboarding, UserInteraction
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

    badges_data = {
        "🍜": BadgeProgress(unlocked=pho_count >= 20, progress=min(pho_count, 20), target=20),
        "🌶️": BadgeProgress(unlocked=cay_count >= 20, progress=min(cay_count, 20), target=20),
        "🥬": BadgeProgress(unlocked=rau_count >= 20, progress=min(rau_count, 20), target=20),
        "🍦": BadgeProgress(unlocked=kem_count >= 20, progress=min(kem_count, 20), target=20),
        "🥓": BadgeProgress(unlocked=thit_count >= 20, progress=min(thit_count, 20), target=20),
        "☕": BadgeProgress(unlocked=night_count >= 20, progress=min(night_count, 20), target=20),
        "🧘": BadgeProgress(unlocked=is_vegetarian, progress=1 if is_vegetarian else 0, target=1)
    }

    if current_user.profile_stats:
        unlocked_list = current_user.profile_stats.get("unlocked_badges", [])
        for badgeIcon, info in badges_data.items():
            if badgeIcon in unlocked_list:
                info.unlocked = True
                info.progress = info.target


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

        elif "REVIEW" in action:
            rating = metadata.get("rating") or "5 sao"
            title = f'Đánh giá "{rating}" cho nhà hàng "{res_name}"'
            icon_type = "star"
        elif ("VIEW" in action or "VISIT" in action) and "_DURATION" not in action:
            title = f'Ghé thăm nhà hàng "{res_name}"'
            icon_type = "visit"
        elif "SAVE" in action or "COLLECT" in action or "BOOKMARK" in action:
            coll_name = metadata.get("collection_name") or "Bộ sưu tập của tôi"
            title = f'Lưu nhà hàng "{res_name}" vào bộ sưu tập "{coll_name}"'
            icon_type = "bookmark"
        elif "REMOVE" in action or "DELETE" in action:
            source_type = metadata.get("source_type") or "yêu thích"
            if source_type == "favorite" or source_type == "yêu thích":
                title = f'Xóa nhà hàng "{res_name}" ra khỏi Yêu thích'
            else:
                coll_name = metadata.get("collection_name") or "Bộ sưu tập"
                title = f'Xóa nhà hàng "{res_name}" ra khỏi bộ sưu tập "{coll_name}"'
            icon_type = "trash"
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

    # 6. Fetch active dates and convert from UTC to local Vietnam timezone (+07:00)
    from datetime import timezone as _timezone, timedelta as _timedelta
    vn_tz = _timezone(_timedelta(hours=7))
    today_str = datetime.now(vn_tz).strftime("%Y-%m-%d")
    yesterday_str = (datetime.now(vn_tz) - _timedelta(days=1)).strftime("%Y-%m-%d")

    # Dynamic Stats Calculation and Persistent Caching (Lazy-Initialization strategy)
    from app.domains.users.models import UserFavorite
    favorites_count = db.query(UserFavorite).filter(UserFavorite.user_id == str(current_user.id)).count()

    stats = current_user.profile_stats
    if stats is None:
        stats = initialize_profile_stats(db, current_user)
        # Sync unlocked badges right after initialization
        stats["unlocked_badges"] = [badgeIcon for badgeIcon, info in badges_data.items() if info.unlocked]
        current_user.profile_stats = dict(stats)
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(current_user, "profile_stats")
        db.commit()
        
        discoveries_count = stats["discoveries_count"]
        reviews_count = stats["reviews_count"]
        streak_count = stats["streak_count"]
        active_dates = stats["active_dates"]
    else:
        # --- CACHED READ WITH AUTOMATIC STREAK DECAY ON VIEW ---
        discoveries_count = stats.get("discoveries_count", 0)
        reviews_count = stats.get("reviews_count", 0)
        streak_count = stats.get("streak_count", 0)
        last_active_date = stats.get("last_active_date")
        discovered_res_ids = stats.get("discovered_res_ids", [])
        active_dates = stats.get("active_dates", [])
        unlocked_badges = stats.get("unlocked_badges", [])

        # Streak Decay & Day Transition Logic:
        # If last active date is not today, check if they active today (viewing profile counts as active today!)
        if last_active_date != today_str:
            if last_active_date == yesterday_str:
                streak_count += 1
            else:
                streak_count = 1  # Streak broken, starts today
            
            last_active_date = today_str
            if today_str not in active_dates:
                active_dates.append(today_str)
                active_dates.sort()

            # Update database
            stats["streak_count"] = streak_count
            stats["last_active_date"] = last_active_date
            stats["active_dates"] = active_dates
            
            # Sync unlocked badges
            current_unlocked = [badgeIcon for badgeIcon, info in badges_data.items() if info.unlocked]
            for b in current_unlocked:
                if b not in unlocked_badges:
                    unlocked_badges.append(b)
            stats["unlocked_badges"] = unlocked_badges

            current_user.profile_stats = dict(stats)
            from sqlalchemy.orm.attributes import flag_modified
            flag_modified(current_user, "profile_stats")
            db.commit()

    return UserProfileResponse(
        id=str(current_user.id),
        username=current_user.username,
        full_name=current_user.full_name,
        avatar_url=current_user.avatar_url,
        created_at=current_user.created_at,
        badges=badges_data,
        culinary_vibes=vibes_list,
        recent_activities=recent_activities,
        active_dates=active_dates,
        discoveries_count=discoveries_count,
        favorites_count=favorites_count,
        reviews_count=reviews_count,
        streak_count=streak_count,
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


@router.get(
    "/{user_id}/onboarding",
    response_model=OnboardingRequest,
    summary="Get user onboarding preferences",
    description="Retrieves the current onboarding preferences for the specified user.",
)
def get_user_onboarding(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
) -> OnboardingRequest:
    try:
        if user_id != str(current_user.id):
            raise HTTPException(status_code=403, detail="Not authorized to access this data")

        onboarding_repo = UserOnboardingRepository(db=db)
        record = onboarding_repo.get_by_user_id(user_id)
        if not record:
            raise HTTPException(status_code=404, detail="Onboarding data not found")

        return OnboardingRequest(
            favorite_dishes=record.favorite_dishes,
            spicy_level=record.spicy_level,
            dietary_restrictions=record.dietary_restrictions or [],
            allergies=record.allergies or [],
            budget=record.budget,
            location=record.location,
            age=record.age,
            is_vegetarian=record.is_vegetarian,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve onboarding: {exc}")



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
    db: Session = Depends(get_db),
    service: UserInteractionService = Depends(get_interaction_service),
    current_user: UserAccount | None = Depends(get_optional_current_user),
):
    try:
        user_id = str(current_user.id) if current_user else None
        res = service.log_interaction(payload=payload, user_id=user_id)
        
        # Incremental Updates for profile_stats (Active dates, Streaks, and Discoveries)
        if current_user:
            db_user = db.query(UserAccount).filter(UserAccount.id == current_user.id).first()
            if db_user:
                stats = db_user.profile_stats
                if stats is None:
                    stats = initialize_profile_stats(db, db_user)
                
                stats = dict(stats)
                updated = False
                
                # 1. Update Active date & Streak
                from datetime import timezone as _timezone, timedelta as _timedelta
                vn_tz = _timezone(_timedelta(hours=7))
                today_str = datetime.now(vn_tz).strftime("%Y-%m-%d")
                yesterday_str = (datetime.now(vn_tz) - _timedelta(days=1)).strftime("%Y-%m-%d")
                
                last_active_date = stats.get("last_active_date")
                if last_active_date != today_str:
                    streak_count = stats.get("streak_count", 0)
                    active_dates = stats.get("active_dates", [])
                    
                    if last_active_date == yesterday_str:
                        streak_count += 1
                    else:
                        streak_count = 1
                        
                    stats["streak_count"] = streak_count
                    stats["last_active_date"] = today_str
                    if today_str not in active_dates:
                        active_dates.append(today_str)
                        active_dates.sort()
                    stats["active_dates"] = active_dates
                    updated = True
                
                # 2. Update Discoveries (if they viewed a restaurant details)
                if payload.res_id and "VIEW" in payload.action_type.upper():
                    discovered_res_ids = stats.get("discovered_res_ids", [])
                    if payload.res_id not in discovered_res_ids:
                        discovered_res_ids.append(payload.res_id)
                        stats["discovered_res_ids"] = discovered_res_ids
                        stats["discoveries_count"] = len(discovered_res_ids)
                        updated = True
                
                if updated:
                    db_user.profile_stats = dict(stats)
                    from sqlalchemy.orm.attributes import flag_modified
                    flag_modified(db_user, "profile_stats")
                    db.commit()
                    
        return res
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to log interaction: {exc}")


# ── Favorites & Collections Endpoints ─────────────────────────────────────────
from app.domains.ranking.models import RestaurantModel
import shortuuid

def _decode_id(obfuscated_id: str) -> str:
    if not obfuscated_id:
        return obfuscated_id
    try:
        if len(obfuscated_id) < 36:
            return str(shortuuid.decode(obfuscated_id))
    except Exception:
        pass
    return obfuscated_id

@router.post("/favorites", response_model=FavoriteResponse)
def add_favorite(
    payload: FavoriteCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        decoded_res_id = _decode_id(payload.res_id)
        # Check if already exists
        existing = db.query(UserFavorite).filter(
            UserFavorite.user_id == str(current_user.id),
            UserFavorite.res_id == decoded_res_id
        ).first()
        
        if existing:
            return existing
            
        fav = UserFavorite(
            user_id=str(current_user.id),
            res_id=decoded_res_id
        )
        db.add(fav)
        db.commit()
        db.refresh(fav)
        return fav
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add favorite: {exc}")


@router.get("/favorites")
def get_favorites(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        favs = db.query(UserFavorite).filter(UserFavorite.user_id == str(current_user.id)).all()
        results = []
        for fav in favs:
            res = db.query(RestaurantModel).filter(RestaurantModel.id == fav.res_id).first()
            if res:
                results.append({
                    "id": shortuuid.encode(res.id),
                    "name": res.name,
                    "match": "100%",
                    "dist": "",
                    "distance_km": 0.0,
                    "price": res.price_range or "0",
                    "rating": str(res.rating_avg or 0.0),
                    "reason": "Món ăn đã được thêm vào mục yêu thích của bạn.",
                    "img": res.image_url or "",
                    "total_reviews": res.total_reviews or 0,
                    "google_maps_url": res.google_maps_url or "",
                    "tags": [tag.name for tag in res.tags] if res.tags else [],
                })
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to get favorites: {exc}")


@router.delete("/favorites/{res_id}")
def remove_favorite(
    res_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        decoded_res_id = _decode_id(res_id)
        fav = db.query(UserFavorite).filter(
            UserFavorite.user_id == str(current_user.id),
            UserFavorite.res_id == decoded_res_id
        ).first()
        
        if not fav:
            raise HTTPException(status_code=404, detail="Favorite not found")
            
        db.delete(fav)
        db.commit()
        return {"status": "success", "message": "Removed from favorites"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove favorite: {exc}")


@router.post("/collections", response_model=CollectionResponse)
def create_collection(
    payload: CollectionCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        coll = UserCollection(
            user_id=str(current_user.id),
            name=payload.name,
            description=payload.description
        )
        db.add(coll)
        db.commit()
        db.refresh(coll)
        return {
            "id": coll.id,
            "user_id": coll.user_id,
            "name": coll.name,
            "description": coll.description,
            "created_at": coll.created_at,
            "updated_at": coll.updated_at,
            "items": []
        }
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create collection: {exc}")


@router.get("/collections")
def list_collections(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        colls = db.query(UserCollection).filter(UserCollection.user_id == str(current_user.id)).all()
        results = []
        for coll in colls:
            items = db.query(UserCollectionItem).filter(UserCollectionItem.collection_id == coll.id).all()
            formatted_items = []
            for item in items:
                res = db.query(RestaurantModel).filter(RestaurantModel.id == item.res_id).first()
                if res:
                    formatted_items.append({
                        "id": shortuuid.encode(res.id),
                        "name": res.name,
                        "match": "100%",
                        "dist": "",
                        "distance_km": 0.0,
                        "price": res.price_range or "0",
                        "rating": str(res.rating_avg or 0.0),
                        "reason": item.note or "Được lưu trong bộ sưu tập.",
                        "img": res.image_url or "",
                        "total_reviews": res.total_reviews or 0,
                        "google_maps_url": res.google_maps_url or "",
                        "tags": [tag.name for tag in res.tags] if res.tags else [],
                    })
            results.append({
                "id": coll.id,
                "user_id": coll.user_id,
                "name": coll.name,
                "description": coll.description,
                "created_at": coll.created_at,
                "updated_at": coll.updated_at,
                "items": formatted_items
            })
        return results
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to list collections: {exc}")


@router.put("/collections/{collection_id}", response_model=CollectionResponse)
def update_collection(
    collection_id: str,
    payload: CollectionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        coll = db.query(UserCollection).filter(
            UserCollection.id == collection_id,
            UserCollection.user_id == str(current_user.id)
        ).first()
        
        if not coll:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        coll.name = payload.name
        coll.description = payload.description
        db.commit()
        db.refresh(coll)
        
        # Get items for returning full response
        items = db.query(UserCollectionItem).filter(UserCollectionItem.collection_id == coll.id).all()
        formatted_items = []
        for item in items:
            res = db.query(RestaurantModel).filter(RestaurantModel.id == item.res_id).first()
            if res:
                formatted_items.append({
                    "id": shortuuid.encode(res.id),
                    "name": res.name,
                    "match": "100%",
                    "dist": "",
                    "distance_km": 0.0,
                    "price": res.price_range or "0",
                    "rating": str(res.rating_avg or 0.0),
                    "reason": item.note or "Được lưu trong bộ sưu tập.",
                    "img": res.image_url or "",
                    "total_reviews": res.total_reviews or 0,
                    "google_maps_url": res.google_maps_url or "",
                    "tags": [tag.name for tag in res.tags] if res.tags else [],
                })
                
        return {
            "id": coll.id,
            "user_id": coll.user_id,
            "name": coll.name,
            "description": coll.description,
            "created_at": coll.created_at,
            "updated_at": coll.updated_at,
            "items": formatted_items
        }
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update collection: {exc}")


@router.delete("/collections/{collection_id}")
def delete_collection(
    collection_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        coll = db.query(UserCollection).filter(
            UserCollection.id == collection_id,
            UserCollection.user_id == str(current_user.id)
        ).first()
        
        if not coll:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        # Cascades to user_collection_items due to ForeignKey constraint
        db.delete(coll)
        db.commit()
        return {"status": "success", "message": "Collection deleted"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete collection: {exc}")


@router.post("/collections/{collection_id}/items")
def add_item_to_collection(
    collection_id: str,
    payload: CollectionItemCreateRequest,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        coll = db.query(UserCollection).filter(
            UserCollection.id == collection_id,
            UserCollection.user_id == str(current_user.id)
        ).first()
        
        if not coll:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        decoded_res_id = _decode_id(payload.res_id)
        # Check if item already exists in collection
        existing = db.query(UserCollectionItem).filter(
            UserCollectionItem.collection_id == collection_id,
            UserCollectionItem.user_id == str(current_user.id),
            UserCollectionItem.res_id == decoded_res_id
        ).first()
        
        if existing:
            return {"status": "success", "message": "Item already in collection"}
            
        item = UserCollectionItem(
            collection_id=collection_id,
            user_id=str(current_user.id),
            res_id=decoded_res_id,
            dish_id=payload.dish_id,
            item_type=payload.item_type or "restaurant",
            note=payload.note
        )
        db.add(item)
        db.commit()
        return {"status": "success", "message": "Item added to collection"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to add item to collection: {exc}")


@router.delete("/collections/{collection_id}/items/{res_id}")
def remove_item_from_collection(
    collection_id: str,
    res_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user),
):
    try:
        coll = db.query(UserCollection).filter(
            UserCollection.id == collection_id,
            UserCollection.user_id == str(current_user.id)
        ).first()
        
        if not coll:
            raise HTTPException(status_code=404, detail="Collection not found")
            
        decoded_res_id = _decode_id(res_id)
        item = db.query(UserCollectionItem).filter(
            UserCollectionItem.collection_id == collection_id,
            UserCollectionItem.user_id == str(current_user.id),
            UserCollectionItem.res_id == decoded_res_id
        ).first()
        
        if not item:
            raise HTTPException(status_code=404, detail="Item not found in collection")
            
        db.delete(item)
        db.commit()
        return {"status": "success", "message": "Item removed from collection"}
    except HTTPException:
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to remove item from collection: {exc}")
