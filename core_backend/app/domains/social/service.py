from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import requests
from html.parser import HTMLParser
from urllib.parse import urlparse
from cachetools import TTLCache

from .models import SocialPost, SocialFollow, SocialLike, SocialNotification
from .schemas import SocialPostCreate, SocialPostResponse
from .repository import SocialRepository

preview_cache = TTLCache(maxsize=1000, ttl=86400)

class OGParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta_tags = {}
        self.title_tag_content = None
        self.in_title = False

    def handle_starttag(self, tag, attrs):
        if tag == "meta":
            attr_dict = dict(attrs)
            prop = attr_dict.get("property") or attr_dict.get("name")
            content = attr_dict.get("content")
            if prop and content:
                self.meta_tags[prop.lower()] = content
        elif tag == "title":
            self.in_title = True

    def handle_data(self, data):
        if self.in_title and not self.title_tag_content:
            self.title_tag_content = data.strip()

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

class SocialService:
    def __init__(self, db: Session):
        self.repo = SocialRepository(db)

    def create_post(self, user_id: str, post_data: SocialPostCreate) -> SocialPostResponse:
        post = SocialPost(
            user_id=user_id,
            content=post_data.content,
            media_urls=post_data.media_urls,
            res_id=post_data.res_id,
            parent_id=post_data.parent_id
        )
        created_post = self.repo.create_post(post)

        if post_data.parent_id:
            # Increment replies count on parent
            self.repo.increment_post_replies(post_data.parent_id, 1)
            # Create notification for parent post owner
            parent_post = self.repo.get_post_by_id(post_data.parent_id)
            if parent_post and parent_post.user_id != user_id:
                notif = SocialNotification(
                    user_id=parent_post.user_id,
                    actor_id=user_id,
                    type="reply",
                    post_id=created_post.id
                )
                self.repo.create_notification(notif)

        # Fetch user info to return a complete response
        from app.domains.users.repository import UserAccountRepository
        user_repo = UserAccountRepository(self.repo.db)
        user = user_repo.get_by_id(str(user_id))
        return SocialPostResponse(
            id=created_post.id,
            user_id=created_post.user_id,
            content=created_post.content,
            media_urls=created_post.media_urls,
            res_id=created_post.res_id,
            parent_id=created_post.parent_id,
            likes_count=created_post.likes_count or 0,
            replies_count=created_post.replies_count or 0,
            created_at=created_post.created_at,
            username=user.username if user else None,
            full_name=user.full_name if user else None,
            avatar_url=user.avatar_url if user else None,
            is_liked=False
        )

    def get_feed(self, user_id: str, limit: int = 20, offset: int = 0, mode: str = "for_you") -> list[SocialPostResponse]:
        results = self.repo.get_feed(user_id, limit, offset, mode)
        return self._format_post_results(results, current_user_id=user_id)
        
    def get_post_thread(self, post_id: str, current_user_id: str = None) -> list[SocialPostResponse]:
        post = self.repo.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
            
        replies = self.repo.get_replies(post_id)
        return self._format_post_results(replies, current_user_id)

    def toggle_follow(self, follower_id: str, following_id: str) -> dict:
        if follower_id == following_id:
            raise HTTPException(status_code=400, detail="Cannot follow yourself")
            
        is_following = self.repo.check_follow(follower_id, following_id)
        if is_following:
            self.repo.delete_follow(follower_id, following_id)
            return {"status": "unfollowed"}
        else:
            follow = SocialFollow(follower_id=follower_id, following_id=following_id)
            self.repo.create_follow(follow)
            # Notification
            notif = SocialNotification(
                user_id=following_id,
                actor_id=follower_id,
                type="follow"
            )
            self.repo.create_notification(notif)
            return {"status": "followed"}

    def toggle_like(self, user_id: str, post_id: str) -> dict:
        is_liked = self.repo.check_like(user_id, post_id)
        if is_liked:
            self.repo.delete_like(user_id, post_id)
            self.repo.increment_post_likes(post_id, -1)
            return {"status": "unliked"}
        else:
            like = SocialLike(user_id=user_id, post_id=post_id)
            self.repo.create_like(like)
            self.repo.increment_post_likes(post_id, 1)
            
            # Notification
            post = self.repo.get_post_by_id(post_id)
            if post and post.user_id != user_id:
                notif = SocialNotification(
                    user_id=post.user_id,
                    actor_id=user_id,
                    type="like",
                    post_id=post_id
                )
                self.repo.create_notification(notif)
            return {"status": "liked"}

    def search_users(self, query: str, current_user_id: str = None, limit: int = 10) -> list[dict]:
        users = self.repo.search_users(query, limit)
        following_ids = self.repo.get_following_ids(current_user_id) if current_user_id else []
        return [
            {
                "id": str(u.id),
                "username": u.username,
                "full_name": u.full_name,
                "avatar_url": u.avatar_url,
                "is_following": str(u.id) in following_ids,
            }
            for u in users
            if str(u.id) != current_user_id  # exclude self
        ]

    def get_notifications(self, user_id: str, limit: int = 20) -> list[dict]:
        rows = self.repo.get_notifications(user_id, limit)
        result = []
        for notif, actor in rows:
            msg = {
                "follow": f"{actor.full_name or actor.username} đã bắt đầu theo dõi bạn",
                "like": f"{actor.full_name or actor.username} đã thích bài viết của bạn",
                "reply": f"{actor.full_name or actor.username} đã trả lời bài viết của bạn",
            }.get(notif.type, "Có thông báo mới")
            result.append({
                "id": notif.id,
                "type": notif.type,
                "message": msg,
                "actor_username": actor.username,
                "actor_avatar": actor.avatar_url,
                "is_read": notif.is_read,
                "created_at": notif.created_at.isoformat(),
            })
        return result

    def count_unread(self, user_id: str) -> int:
        return self.repo.count_unread_notifications(user_id)

    def mark_notifications_read(self, user_id: str):
        self.repo.mark_notifications_read(user_id)

    def _format_post_results(self, results, current_user_id: str = None) -> list[SocialPostResponse]:
        formatted = []
        for post, user in results:
            # Check if current user liked it
            is_liked = False
            if current_user_id:
                is_liked = self.repo.check_like(current_user_id, post.id)
                
            formatted.append(SocialPostResponse(
                id=post.id,
                user_id=post.user_id,
                content=post.content,
                media_urls=post.media_urls,
                res_id=post.res_id,
                parent_id=post.parent_id,
                likes_count=post.likes_count,
                replies_count=post.replies_count,
                created_at=post.created_at,
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                is_liked=is_liked
            ))
        return formatted

    def get_public_profile(self, target_user_id: str, current_user_id: str = None) -> dict:
        from app.domains.users.repository import UserAccountRepository
        user_repo = UserAccountRepository(self.repo.db)
        target_user = user_repo.get_by_id(target_user_id)
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
            
        followers_count, following_count = self.repo.get_user_profile_stats(target_user_id)
        is_following = False
        if current_user_id:
            is_following = self.repo.check_follow(current_user_id, target_user_id)
            
        return {
            "id": str(target_user.id),
            "username": target_user.username,
            "full_name": target_user.full_name,
            "avatar_url": target_user.avatar_url,
            "cover_url": target_user.cover_url,
            "followers_count": followers_count,
            "following_count": following_count,
            "is_following": is_following
        }

    def get_user_posts(self, target_user_id: str, current_user_id: str = None, limit: int = 20, offset: int = 0) -> list[SocialPostResponse]:
        results = self.repo.get_user_posts(target_user_id, limit, offset)
        return self._format_post_results(results, current_user_id=current_user_id)

    def delete_post(self, post_id: str, current_user_id: str):
        post = self.repo.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        if str(post.user_id) != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this post")
        self.repo.delete_post(post_id)
        return {"status": "ok", "message": "Post deleted successfully"}

    def get_link_preview(self, url: str) -> dict:
        if url in preview_cache:
            return preview_cache[url]
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            # Add timeout to avoid hanging the endpoint
            response = requests.get(url, headers=headers, timeout=5)
            response.raise_for_status()
            
            parser = OGParser()
            parser.feed(response.text)
            
            meta = parser.meta_tags
            
            import html
            title = html.unescape(meta.get("og:title") or parser.title_tag_content or "")
            description = html.unescape(meta.get("og:description") or meta.get("description") or "")
            image_url = html.unescape(meta.get("og:image") or "")
            
            parsed_uri = urlparse(url)
            site_name = html.unescape(meta.get("og:site_name") or parsed_uri.netloc)
            
            result = {
                "url": url,
                "title": title,
                "description": description,
                "image_url": image_url,
                "site_name": site_name
            }
            preview_cache[url] = result
            return result
            
        except Exception as e:
            print(f"Error fetching link preview for {url}: {e}")
            parsed_uri = urlparse(url)
            fallback = {
                "url": url,
                "title": parsed_uri.netloc,
                "description": "",
                "image_url": "",
                "site_name": parsed_uri.netloc
            }
            preview_cache[url] = fallback
            return fallback
