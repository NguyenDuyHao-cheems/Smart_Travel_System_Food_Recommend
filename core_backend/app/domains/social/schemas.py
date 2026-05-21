from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class SocialPostCreate(BaseModel):
    content: Optional[str] = None
    media_urls: Optional[List[str]] = None
    res_id: Optional[str] = None
    parent_id: Optional[str] = None

class SocialPostResponse(BaseModel):
    id: str
    user_id: str
    content: Optional[str]
    media_urls: Optional[List[str]]
    res_id: Optional[str]
    parent_id: Optional[str]
    likes_count: int
    replies_count: int
    created_at: datetime
    
    # Extracted from relations for easier UI usage
    username: Optional[str] = None
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    is_liked: Optional[bool] = False

    class Config:
        from_attributes = True

class SocialNotificationResponse(BaseModel):
    id: str
    user_id: str
    actor_id: str
    actor_username: Optional[str] = None
    actor_avatar: Optional[str] = None
    type: str
    post_id: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class PublicUserProfileResponse(BaseModel):
    id: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    cover_url: Optional[str] = None
    followers_count: int
    following_count: int
    is_following: bool

class LinkPreviewResponse(BaseModel):
    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    image_url: Optional[str] = None
    site_name: Optional[str] = None
