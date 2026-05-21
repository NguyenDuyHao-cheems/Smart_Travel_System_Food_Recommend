from sqlalchemy.orm import Session
from .models import SocialPost, SocialFollow, SocialLike, SocialNotification
from app.domains.users.models import UserAccount
from typing import List, Optional

class SocialRepository:
    def __init__(self, db: Session):
        self.db = db

    def create_post(self, post: SocialPost) -> SocialPost:
        self.db.add(post)
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_post_by_id(self, post_id: str) -> Optional[SocialPost]:
        return self.db.query(SocialPost).filter(SocialPost.id == post_id).first()

    def get_feed(self, user_id: str, limit: int = 20, offset: int = 0, mode: str = "for_you") -> List[tuple]:
        query = self.db.query(SocialPost, UserAccount).join(
            UserAccount, SocialPost.user_id == UserAccount.id
        ).filter(
            SocialPost.parent_id.is_(None)  # Only main posts, not replies
        )

        if mode == "following" and user_id:
            # Only show posts from people user follows + own posts
            following_ids = self.db.query(SocialFollow.following_id).filter(
                SocialFollow.follower_id == user_id
            ).subquery()
            query = query.filter(
                (SocialPost.user_id.in_(following_ids)) | (SocialPost.user_id == user_id)
            )
        # else: "for_you" mode → show ALL posts (no filter)

        return query.order_by(SocialPost.created_at.desc()).offset(offset).limit(limit).all()

    def get_replies(self, post_id: str, limit: int = 50) -> List[tuple]:
        return self.db.query(SocialPost, UserAccount).join(
            UserAccount, SocialPost.user_id == UserAccount.id
        ).filter(
            SocialPost.parent_id == post_id
        ).order_by(SocialPost.created_at.asc()).limit(limit).all()

    def check_follow(self, follower_id: str, following_id: str) -> bool:
        return self.db.query(SocialFollow).filter(
            SocialFollow.follower_id == follower_id,
            SocialFollow.following_id == following_id
        ).first() is not None

    def create_follow(self, follow: SocialFollow):
        self.db.add(follow)
        self.db.commit()

    def delete_follow(self, follower_id: str, following_id: str):
        self.db.query(SocialFollow).filter(
            SocialFollow.follower_id == follower_id,
            SocialFollow.following_id == following_id
        ).delete()
        self.db.commit()

    def check_like(self, user_id: str, post_id: str) -> bool:
        return self.db.query(SocialLike).filter(
            SocialLike.user_id == user_id,
            SocialLike.post_id == post_id
        ).first() is not None

    def create_like(self, like: SocialLike):
        self.db.add(like)
        self.db.commit()

    def delete_like(self, user_id: str, post_id: str):
        self.db.query(SocialLike).filter(
            SocialLike.user_id == user_id,
            SocialLike.post_id == post_id
        ).delete()
        self.db.commit()
        
    def increment_post_likes(self, post_id: str, amount: int = 1):
        post = self.get_post_by_id(post_id)
        if post:
            post.likes_count += amount
            self.db.commit()
            
    def increment_post_replies(self, post_id: str, amount: int = 1):
        post = self.get_post_by_id(post_id)
        if post:
            post.replies_count += amount
            self.db.commit()

    def create_notification(self, notification: SocialNotification):
        self.db.add(notification)
        self.db.commit()

    def search_users(self, query: str, limit: int = 10) -> List[UserAccount]:
        return self.db.query(UserAccount).filter(
            (UserAccount.username.ilike(f"%{query}%")) |
            (UserAccount.full_name.ilike(f"%{query}%"))
        ).limit(limit).all()

    def get_notifications(self, user_id: str, limit: int = 20) -> List[tuple]:
        return (
            self.db.query(SocialNotification, UserAccount)
            .join(UserAccount, SocialNotification.actor_id == UserAccount.id)
            .filter(SocialNotification.user_id == user_id)
            .order_by(SocialNotification.created_at.desc())
            .limit(limit)
            .all()
        )

    def count_unread_notifications(self, user_id: str) -> int:
        return self.db.query(SocialNotification).filter(
            SocialNotification.user_id == user_id,
            SocialNotification.is_read == False  # noqa: E712
        ).count()

    def mark_notifications_read(self, user_id: str):
        self.db.query(SocialNotification).filter(
            SocialNotification.user_id == user_id,
            SocialNotification.is_read == False  # noqa: E712
        ).update({"is_read": True})
        self.db.commit()

    def get_following_ids(self, user_id: str) -> List[str]:
        rows = self.db.query(SocialFollow.following_id).filter(
            SocialFollow.follower_id == user_id
        ).all()
        return [str(r[0]) for r in rows]

    def get_user_posts(self, user_id: str, limit: int = 20, offset: int = 0) -> List[tuple]:
        return (
            self.db.query(SocialPost, UserAccount)
            .join(UserAccount, SocialPost.user_id == UserAccount.id)
            .filter(SocialPost.user_id == user_id, SocialPost.parent_id.is_(None))
            .order_by(SocialPost.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )

    def get_user_profile_stats(self, target_user_id: str) -> tuple[int, int]:
        """Returns (followers_count, following_count)"""
        followers = self.db.query(SocialFollow).filter(SocialFollow.following_id == target_user_id).count()
        following = self.db.query(SocialFollow).filter(SocialFollow.follower_id == target_user_id).count()
        return followers, following

    def get_post_by_id(self, post_id: str) -> Optional[SocialPost]:
        return self.db.query(SocialPost).filter(SocialPost.id == post_id).first()

    def delete_post(self, post_id: str):
        # Delete all notifications linked to this post
        self.db.query(SocialNotification).filter(SocialNotification.post_id == post_id).delete(synchronize_session=False)
        # Delete all likes for this post
        self.db.query(SocialLike).filter(SocialLike.post_id == post_id).delete(synchronize_session=False)
        # Delete all child comments recursively (just 1 level for now)
        self.db.query(SocialPost).filter(SocialPost.parent_id == post_id).delete(synchronize_session=False)
        # Delete the post itself
        self.db.query(SocialPost).filter(SocialPost.id == post_id).delete(synchronize_session=False)
        self.db.commit()
