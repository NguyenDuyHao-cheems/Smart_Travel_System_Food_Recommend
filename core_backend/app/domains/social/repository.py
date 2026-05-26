from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload
from .models import SocialPost, SocialFollow, SocialLike, SocialNotification, SocialStory
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
        return self.db.query(SocialPost).options(joinedload(SocialPost.restaurant)).filter(SocialPost.id == post_id).first()

    def get_post_with_user_by_id(self, post_id: str) -> Optional[tuple]:
        return self.db.query(SocialPost, UserAccount).join(
            UserAccount, SocialPost.user_id == UserAccount.id
        ).options(
            joinedload(SocialPost.restaurant)
        ).filter(
            SocialPost.id == post_id
        ).first()

    def update_post_content(self, post: SocialPost, content: str) -> SocialPost:
        post.content = content
        self.db.commit()
        self.db.refresh(post)
        return post

    def get_feed(self, user_id: str, limit: int = 20, offset: int = 0, mode: str = "for_you") -> List[tuple]:
        query = self.db.query(SocialPost, UserAccount).join(
            UserAccount, SocialPost.user_id == UserAccount.id
        ).options(
            joinedload(SocialPost.restaurant)
        ).filter(
            SocialPost.parent_id.is_(None)  # Only main posts, not replies
        )

        if mode == "following" and user_id:
            user_id_str = str(user_id)
            # Only show posts from people user follows (exclude own posts)
            following_ids = self.db.query(SocialFollow.following_id).filter(
                SocialFollow.follower_id == user_id_str
            )
            
            query = query.filter(
                SocialPost.user_id.in_(following_ids)
            )
        # else: "for_you" mode → show ALL posts (no filter)

        return query.order_by(SocialPost.created_at.desc()).offset(offset).limit(limit).all()

    def get_replies(self, post_id: str, limit: int = 50) -> List[tuple]:
        return self.db.query(SocialPost, UserAccount).join(
            UserAccount, SocialPost.user_id == UserAccount.id
        ).options(
            joinedload(SocialPost.restaurant)
        ).filter(
            SocialPost.parent_id == post_id
        ).order_by(SocialPost.created_at.asc()).limit(limit).all()

    def get_descendant_replies(self, post_id: str) -> List[tuple]:
        children_by_parent: dict[str, List[tuple]] = {}
        pending_parent_ids = [post_id]
        while pending_parent_ids:
            replies = self.db.query(SocialPost, UserAccount).join(
                UserAccount, SocialPost.user_id == UserAccount.id
            ).options(
                joinedload(SocialPost.restaurant)
            ).filter(
                SocialPost.parent_id.in_(pending_parent_ids)
            ).order_by(SocialPost.created_at.asc()).all()
            if not replies:
                break

            pending_parent_ids = []
            for reply in replies:
                post = reply[0]
                children_by_parent.setdefault(str(post.parent_id), []).append(reply)
                pending_parent_ids.append(str(post.id))

        flattened: List[tuple] = []
        def append_children(parent_id: str):
            for reply in children_by_parent.get(parent_id, []):
                flattened.append(reply)
                append_children(str(reply[0].id))

        append_children(post_id)
        return flattened

    def count_replies_batch(self, post_ids: List[str]) -> dict:
        if not post_ids:
            return {}
        rows = self.db.query(
            SocialPost.parent_id,
            func.count(SocialPost.id)
        ).filter(
            SocialPost.parent_id.in_(post_ids)
        ).group_by(SocialPost.parent_id).all()
        return {str(parent_id): count for parent_id, count in rows}

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

    def check_likes_batch(self, user_id: str, post_ids: List[str]) -> set:
        if not post_ids:
            return set()
        likes = self.db.query(SocialLike.post_id).filter(
            SocialLike.user_id == user_id,
            SocialLike.post_id.in_(post_ids)
        ).all()
        return {str(like[0]) for like in likes}

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
        from app.domains.social.notifier import notifier
        notifier.notify(user_id)


    def get_following_ids(self, user_id: str) -> List[str]:
        rows = self.db.query(SocialFollow.following_id).filter(
            SocialFollow.follower_id == user_id
        ).all()
        return [str(r[0]) for r in rows]

    def get_user_posts(self, user_id: str, limit: int = 20, offset: int = 0) -> List[tuple]:
        return (
            self.db.query(SocialPost, UserAccount)
            .join(UserAccount, SocialPost.user_id == UserAccount.id)
            .options(joinedload(SocialPost.restaurant))
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
        return self.db.query(SocialPost).options(joinedload(SocialPost.restaurant)).filter(SocialPost.id == post_id).first()

    def delete_post(self, post_id: str):
        deleted_post = self.get_post_by_id(post_id)
        parent_post = (
            self.get_post_by_id(str(deleted_post.parent_id))
            if deleted_post and deleted_post.parent_id
            else None
        )
        descendant_levels: List[List[str]] = []
        parent_ids = [post_id]
        while parent_ids:
            child_ids = [
                child_id
                for child_id, in self.db.query(SocialPost.id).filter(
                    SocialPost.parent_id.in_(parent_ids)
                ).all()
            ]
            if not child_ids:
                break
            descendant_levels.append(child_ids)
            parent_ids = child_ids

        post_ids = [post_id] + [
            descendant_id
            for level in descendant_levels
            for descendant_id in level
        ]
        self.db.query(SocialNotification).filter(
            SocialNotification.post_id.in_(post_ids)
        ).delete(synchronize_session=False)
        self.db.query(SocialLike).filter(
            SocialLike.post_id.in_(post_ids)
        ).delete(synchronize_session=False)

        for level in reversed(descendant_levels):
            self.db.query(SocialPost).filter(
                SocialPost.id.in_(level)
            ).delete(synchronize_session=False)
        self.db.query(SocialPost).filter(SocialPost.id == post_id).delete(synchronize_session=False)
        if parent_post:
            parent_post.replies_count = max(0, (parent_post.replies_count or 0) - 1)
        self.db.commit()

    def create_story(self, story: SocialStory) -> SocialStory:
        self.db.add(story)
        self.db.commit()
        self.db.refresh(story)
        return story

    def get_active_stories(self, user_id: str) -> List[tuple]:
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        
        # Get stories from users I follow, plus my own stories, which haven't expired
        following_ids = self.db.query(SocialFollow.following_id).filter(
            SocialFollow.follower_id == user_id
        )

        return (
            self.db.query(SocialStory, UserAccount)
            .join(UserAccount, SocialStory.user_id == UserAccount.id)
            .filter(
                (SocialStory.user_id.in_(following_ids)) | (SocialStory.user_id == user_id),
                SocialStory.expires_at > now
            )
            .order_by(SocialStory.created_at.desc())
            .all()
        )
