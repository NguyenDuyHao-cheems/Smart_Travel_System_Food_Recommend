from datetime import datetime, timezone
import uuid
from sqlalchemy import Column, String, Integer, JSON, DateTime, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from app.core.database import Base
from app.domains.users.models import UserAccount
from app.domains.ranking.models import RestaurantModel as Restaurant

class SocialPost(Base):
    __tablename__ = "social_posts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    content = Column(String, nullable=True)
    mood = Column(String, nullable=True)
    media_urls = Column(JSON, nullable=True) # JSON list of URLs for images/videos
    res_id = Column(PG_UUID(as_uuid=False), ForeignKey("restaurants.id"), nullable=True, index=True)
    parent_id = Column(String, ForeignKey("social_posts.id"), nullable=True, index=True)
    likes_count = Column(Integer, default=0)
    replies_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    from sqlalchemy.orm import relationship
    restaurant = relationship("RestaurantModel", foreign_keys=[res_id])

class SocialFollow(Base):
    __tablename__ = "social_follows"

    follower_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), primary_key=True)
    following_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SocialLike(Base):
    __tablename__ = "social_likes"

    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), primary_key=True)
    post_id = Column(String, ForeignKey("social_posts.id", ondelete="CASCADE"), primary_key=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SocialNotification(Base):
    __tablename__ = "social_notifications"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    actor_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False)
    type = Column(String, nullable=False) # 'like', 'reply', 'follow'
    post_id = Column(String, ForeignKey("social_posts.id", ondelete="CASCADE"), nullable=True)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

class SocialStory(Base):
    __tablename__ = "social_stories"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    media_url = Column(String, nullable=False)
    overlays = Column(JSON, default=list)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    expires_at = Column(DateTime, nullable=False)
    views_count = Column(Integer, default=0)

class SocialStoryView(Base):
    __tablename__ = "social_story_views"

    id = Column(Integer, primary_key=True, autoincrement=True)
    story_id = Column(String, ForeignKey("social_stories.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = Column(PG_UUID(as_uuid=False), ForeignKey("users.id"), nullable=False, index=True)
    reaction = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
