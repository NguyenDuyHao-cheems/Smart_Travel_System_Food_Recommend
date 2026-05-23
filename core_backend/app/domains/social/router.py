from fastapi import APIRouter, Depends, Query, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.core.dependencies import get_db
from app.core.dependencies import get_current_user, get_optional_current_user
from app.domains.users.models import UserAccount
from .schemas import SocialPostCreate, SocialPostResponse, StoryCreate, StoryResponse, StoryViewCreate, StoryViewerItem
from .service import SocialService

router = APIRouter()

@router.post("/posts", response_model=SocialPostResponse)
def create_post(
    post_data: SocialPostCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.create_post(current_user.id, post_data)

@router.post("/stories", response_model=StoryResponse)
def create_story(
    story_data: StoryCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.create_story(current_user.id, story_data)

@router.get("/stories", response_model=List[StoryResponse])
def get_active_stories(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.get_active_stories(current_user.id)

@router.delete("/stories/{story_id}")
def delete_story(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.delete_story(story_id, str(current_user.id))

@router.post("/stories/{story_id}/view")
def view_story(
    story_id: str,
    payload: StoryViewCreate,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.increment_story_views(story_id, str(current_user.id), payload.reaction)

@router.get("/stories/{story_id}/viewers", response_model=List[StoryViewerItem])
def get_story_viewers(
    story_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.get_story_viewers(story_id, str(current_user.id))

@router.get("/feed", response_model=List[SocialPostResponse])
def get_feed(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    mode: str = Query("for_you", pattern="^(for_you|following)$"),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_optional_current_user)
):
    service = SocialService(db)
    user_id = current_user.id if current_user else None
    return service.get_feed(user_id, limit, offset, mode)

@router.get("/posts/{post_id}/thread", response_model=List[SocialPostResponse])
def get_post_thread(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_optional_current_user)
):
    service = SocialService(db)
    user_id = current_user.id if current_user else None
    return service.get_post_thread(post_id, user_id)

@router.post("/users/{user_id}/follow")
def toggle_follow(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.toggle_follow(current_user.id, user_id)

@router.post("/posts/{post_id}/like")
def toggle_like(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.toggle_like(current_user.id, post_id)

# ── User Search ─────────────────────────────────────────────────────────────
@router.get("/users/search")
def search_users(
    q: str = Query(..., min_length=1),
    limit: int = Query(10, ge=1, le=30),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_optional_current_user)
):
    service = SocialService(db)
    user_id = str(current_user.id) if current_user else None
    return service.search_users(q, user_id, limit)

# ── Notifications ────────────────────────────────────────────────────────────
@router.get("/notifications")
def get_notifications(
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.get_notifications(str(current_user.id), limit)

@router.get("/notifications/unread-count")
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return {"count": service.count_unread(str(current_user.id))}

@router.post("/notifications/mark-read")
def mark_notifications_read(
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    service.mark_notifications_read(str(current_user.id))
    return {"status": "ok"}

# ── Public Profile ───────────────────────────────────────────────────────────
from .schemas import PublicUserProfileResponse

@router.get("/users/{user_id}/profile", response_model=PublicUserProfileResponse)
def get_user_profile(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_optional_current_user)
):
    service = SocialService(db)
    viewer_id = str(current_user.id) if current_user else None
    return service.get_public_profile(user_id, viewer_id)

@router.get("/users/{user_id}/posts", response_model=List[SocialPostResponse])
def get_user_posts(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_optional_current_user)
):
    service = SocialService(db)
    viewer_id = str(current_user.id) if current_user else None
    return service.get_user_posts(user_id, viewer_id, limit, offset)

@router.delete("/posts/{post_id}")
def delete_post(
    post_id: str,
    db: Session = Depends(get_db),
    current_user: UserAccount = Depends(get_current_user)
):
    service = SocialService(db)
    return service.delete_post(post_id, str(current_user.id))

from .schemas import LinkPreviewResponse

@router.get("/posts/link-preview", response_model=LinkPreviewResponse)
def get_link_preview(
    url: str = Query(..., description="URL to fetch preview for"),
    db: Session = Depends(get_db)
):
    service = SocialService(db)
    return service.get_link_preview(url)
