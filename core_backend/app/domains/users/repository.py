from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from .models import UserOnboarding, UserAccount, UserInteraction, UserFavorite, UserCollection, UserCollectionItem, UserFriend, FriendRequest
from typing import Optional, List


class UserOnboardingRepository:
    """
    Data-access layer for the UserOnboarding table.
    All database operations are isolated here so the service layer
    remains free of any ORM / SQL details.
    """

    def __init__(self, db: Session) -> None:
        self._db = db

    # ── Reads ─────────────────────────────────────────────────────────────────

    def get_by_user_id(self, user_id: str) -> Optional[UserOnboarding]:
        """Return the existing onboarding record for *user_id*, or None."""
        return (
            self._db.query(UserOnboarding)
            .filter(UserOnboarding.user_id == user_id)
            .first()
        )

    # ── Writes ────────────────────────────────────────────────────────────────

    def upsert(
        self,
        user_id: str,
        favorite_dishes: List[str],
        spicy_level: str,
        dietary_restrictions: List[str],
        allergies: List[str],
        budget: str,
        location: str,
        age: int,
        is_vegetarian: bool = False,
        preferences_vector: Optional[List[float]] = None,
    ) -> UserOnboarding:
        """
        Insert a new onboarding record or overwrite the existing one.
        Returns the persisted record.
        """
        existing = self.get_by_user_id(user_id)

        if existing:
            existing.favorite_dishes = favorite_dishes
            existing.spicy_level = spicy_level
            existing.dietary_restrictions = dietary_restrictions
            existing.allergies = allergies
            existing.budget = budget
            existing.location = location
            existing.age = age
            existing.is_vegetarian = is_vegetarian
            existing.preferences_vector = preferences_vector
            record = existing
        else:
            record = UserOnboarding(
                user_id=user_id,
                favorite_dishes=favorite_dishes,
                spicy_level=spicy_level,
                dietary_restrictions=dietary_restrictions,
                allergies=allergies,
                budget=budget,
                location=location,
                age=age,
                is_vegetarian=is_vegetarian,
                preferences_vector=preferences_vector,
            )
            self._db.add(record)

        self._db.commit()
        self._db.refresh(record)
        return record


class UserAccountRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def get_by_id(self, user_id: str) -> Optional[UserAccount]:
        """Return the user account by primary key *user_id*, or None."""
        return (
            self._db.query(UserAccount)
            .filter(UserAccount.id == user_id)
            .first()
        )

    def get_by_username(self, username: str) -> Optional[UserAccount]:
        return (
            self._db.query(UserAccount)
            .filter(UserAccount.username == username)
            .first()
        )

    def create_user(self, username: str, password_hash: str) -> UserAccount:
        user = UserAccount(username=username, password_hash=password_hash)
        self._db.add(user)
        try:
            self._db.commit()
        except IntegrityError:
            self._db.rollback()
            raise ValueError("Username already exists.")
        self._db.refresh(user)
        return user

    def update_preferences_vector(
        self, user_id: str, preferences_vector: List[float]
    ) -> Optional[UserAccount]:
        """
        Update the long-term preferences_vector on the users table.
        Returns the updated record or None if user not found.
        """
        user = self.get_by_id(user_id)
        if not user:
            return None
        user.preferences_vector = preferences_vector
        self._db.commit()
        self._db.refresh(user)
        return user

    def update_allergies(
        self, user_id: str, allergies: List[str]
    ) -> Optional[UserAccount]:
        """Update the allergies JSON list on the users table."""
        user = self.get_by_id(user_id)
        if not user:
            return None
        user.allergies = allergies
        self._db.commit()
        self._db.refresh(user)
        return user

    def update_user(
        self, 
        user_id: str, 
        full_name: Optional[str] = None, 
        avatar_url: Optional[str] = None,
        cover_url: Optional[str] = None,
        password_hash: Optional[str] = None
    ) -> Optional[UserAccount]:
        user = self.get_by_id(user_id)
        if not user:
            return None
        
        if full_name is not None:
            user.full_name = full_name
        if avatar_url is not None:
            user.avatar_url = avatar_url
        if cover_url is not None:
            user.cover_url = cover_url
        if password_hash is not None:
            user.password_hash = password_hash
            
        self._db.commit()
        self._db.refresh(user)
        return user

    def delete_user(self, user_id: str) -> bool:
        user = self.get_by_id(user_id)
        if not user:
            return False
        
        try:
            # Import social models inside the method to avoid circular imports if any, 
            # or just import them here since they depend on users.id
            from app.domains.social.models import SocialPost, SocialFollow, SocialLike, SocialNotification, SocialStory, SocialStoryView
            from app.domains.ranking.models import ReviewModel
            
            # Delete social dependent records first
            self._db.query(SocialStoryView).filter(SocialStoryView.user_id == user_id).delete()
            self._db.query(SocialStory).filter(SocialStory.user_id == user_id).delete()
            self._db.query(SocialNotification).filter((SocialNotification.user_id == user_id) | (SocialNotification.actor_id == user_id)).delete()
            self._db.query(SocialLike).filter(SocialLike.user_id == user_id).delete()
            self._db.query(SocialFollow).filter((SocialFollow.follower_id == user_id) | (SocialFollow.following_id == user_id)).delete()
            
            # Handle SocialPost: other users might have replied to this user's posts.
            # We need to set their parent_id to NULL before deleting the user's posts to avoid ForeignKeyViolation.
            user_posts = self._db.query(SocialPost.id).filter(SocialPost.user_id == user_id).all()
            user_post_ids = [p.id for p in user_posts]
            if user_post_ids:
                self._db.query(SocialPost).filter(SocialPost.parent_id.in_(user_post_ids)).update({SocialPost.parent_id: None}, synchronize_session=False)
            self._db.query(SocialPost).filter(SocialPost.user_id == user_id).delete()
            
            # Delete ranking dependent records
            self._db.query(ReviewModel).filter(ReviewModel.user_id == user_id).delete()
            
            # Delete other dependent records
            self._db.query(UserOnboarding).filter(UserOnboarding.user_id == user_id).delete()
            self._db.query(UserInteraction).filter(UserInteraction.user_id == user_id).delete()
            self._db.query(UserFavorite).filter(UserFavorite.user_id == user_id).delete()
            self._db.query(UserCollectionItem).filter(UserCollectionItem.user_id == user_id).delete()
            self._db.query(UserCollection).filter(UserCollection.user_id == user_id).delete()
            
            # FriendRequest and UserFriend might cascade, but manual deletion is safer
            self._db.query(UserFriend).filter((UserFriend.user_id == user_id) | (UserFriend.friend_id == user_id)).delete()
            self._db.query(FriendRequest).filter((FriendRequest.sender_id == user_id) | (FriendRequest.receiver_id == user_id)).delete()
            
            self._db.delete(user)
            self._db.commit()
            return True
        except IntegrityError as e:
            print("IntegrityError:", e)
            self._db.rollback()
            return False
        except Exception as e:
            print("Exception in delete_user:", e)
            self._db.rollback()
            return False

class UserInteractionRepository:
    def __init__(self, db: Session) -> None:
        self._db = db

    def create_interaction(
        self,
        action_type: str,
        anonymous_id: Optional[str] = None,
        user_id: Optional[str] = None,
        res_id: Optional[str] = None,
        duration_sec: Optional[int] = None,
        metadata: Optional[dict] = None,
        search_session_id: Optional[str] = None,
    ) -> UserInteraction:
        interaction = UserInteraction(
            anonymous_id=anonymous_id,
            user_id=user_id,
            res_id=res_id,
            action_type=action_type,
            duration_sec=duration_sec,
            metadata_=metadata,
            search_session_id=search_session_id,
        )
        self._db.add(interaction)
        self._db.commit()
        self._db.refresh(interaction)
        return interaction


