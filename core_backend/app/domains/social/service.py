from fastapi import HTTPException, status
from sqlalchemy.orm import Session
import requests
from html.parser import HTMLParser
from urllib.parse import parse_qs, unquote, urlparse
from cachetools import TTLCache

from .models import SocialPost, SocialFollow, SocialLike, SocialNotification, SocialStory, SocialStoryView
from .schemas import SocialPostCreate, SocialPostResponse, SocialPostUpdate, StoryCreate, StoryResponse, StoryViewCreate, StoryViewerItem
from .repository import SocialRepository

preview_cache = TTLCache(maxsize=1000, ttl=86400)

def _normalize_preview_url(url: str) -> str:
    normalized = url.strip()
    for _ in range(2):
        decoded = unquote(normalized)
        if decoded == normalized:
            break
        normalized = decoded
    return normalized

def _extract_youtube_video_id(url: str) -> str | None:
    parsed = urlparse(_normalize_preview_url(url))
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]

    if host == "youtu.be":
        return parsed.path.strip("/").split("/")[0] or None

    if host in {"youtube.com", "m.youtube.com", "music.youtube.com"}:
        if parsed.path == "/watch":
            return parse_qs(parsed.query).get("v", [None])[0]
        for prefix in ("/shorts/", "/embed/"):
            if parsed.path.startswith(prefix):
                return parsed.path.removeprefix(prefix).split("/")[0] or None

    return None

def _extract_github_repo_path(url: str) -> str | None:
    parsed = urlparse(_normalize_preview_url(url))
    host = parsed.netloc.lower()
    if host.startswith("www."):
        host = host[4:]
    if host != "github.com":
        return None

    parts = [part for part in parsed.path.split("/") if part]
    if len(parts) < 2:
        return None
    return f"{parts[0]}/{parts[1]}"

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
            mood=post_data.mood,
            media_urls=post_data.media_urls,
            res_id=post_data.res_id,
            parent_id=post_data.parent_id
        )
        created_post = self.repo.create_post(post)

        if post_data.parent_id:
            # Increment replies count on parent
            self.repo.increment_post_replies(post_data.parent_id, 1)
            # Create notification for parent post owner (never notify self)
            parent_post = self.repo.get_post_by_id(post_data.parent_id)
            if parent_post and str(parent_post.user_id) != str(user_id):
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
            id=str(created_post.id),
            user_id=str(created_post.user_id),
            content=created_post.content,
            media_urls=created_post.media_urls if isinstance(created_post.media_urls, list) else ([] if created_post.media_urls is None else [str(created_post.media_urls)]),
            res_id=str(created_post.res_id) if created_post.res_id else None,
            parent_id=str(created_post.parent_id) if created_post.parent_id else None,
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

    def update_post(self, post_id: str, current_user_id: str, post_data: SocialPostUpdate) -> SocialPostResponse:
        post = self.repo.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")
        if str(post.user_id) != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to edit this post")

        content = post_data.content.strip()
        if not content:
            raise HTTPException(status_code=422, detail="Content cannot be empty")

        self.repo.update_post_content(post, content)
        result = self.repo.get_post_with_user_by_id(post_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Updated post could not be loaded",
            )
        return self._format_post_results([result], current_user_id=current_user_id)[0]
        
    def get_post_thread(self, post_id: str, current_user_id: str = None, include_descendants: bool = False) -> list[SocialPostResponse]:
        post = self.repo.get_post_by_id(post_id)
        if not post:
            raise HTTPException(status_code=404, detail="Post not found")

        replies = (
            self.repo.get_descendant_replies(post_id)
            if include_descendants
            else self.repo.get_replies(post_id)
        )
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
            
            # Notification (never notify self)
            post = self.repo.get_post_by_id(post_id)
            if post and str(post.user_id) != str(user_id):
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
                "friend_request": f"{actor.full_name or actor.username} đã gửi lời mời kết bạn",
                "friend_accept": f"{actor.full_name or actor.username} đã chấp nhận lời mời kết bạn",
                "friend_decline": f"{actor.full_name or actor.username} đã từ chối lời mời kết bạn",
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
        post_ids = [str(post.id) for post, _ in results]
        liked_post_ids = set()
        reply_counts = self.repo.count_replies_batch(post_ids)
        
        if current_user_id and post_ids:
            liked_post_ids = self.repo.check_likes_batch(current_user_id, post_ids)

        for post, user in results:
            is_liked = str(post.id) in liked_post_ids
                
            formatted.append(SocialPostResponse(
                id=str(post.id),
                user_id=str(post.user_id),
                content=post.content,
                mood=post.mood,
                media_urls=post.media_urls if isinstance(post.media_urls, list) else ([] if post.media_urls is None else [str(post.media_urls)]),
                res_id=str(post.res_id) if post.res_id else None,
                parent_id=str(post.parent_id) if post.parent_id else None,
                likes_count=post.likes_count or 0,
                replies_count=reply_counts.get(str(post.id), 0),
                created_at=post.created_at,
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                is_liked=is_liked,
                restaurant_name=post.restaurant.name if post.res_id and post.restaurant else None,
                restaurant_image_url=post.restaurant.image_url if post.res_id and post.restaurant else None
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

    def create_story(self, user_id: str, story_data: StoryCreate) -> StoryResponse:
        from datetime import datetime, timezone, timedelta
        now = datetime.now(timezone.utc)
        expires = now + timedelta(hours=24)
        
        story = SocialStory(
            user_id=user_id,
            media_url=story_data.media_url,
            overlays=story_data.overlays or [],
            created_at=now,
            expires_at=expires
        )
        self.repo.create_story(story)
        
        # We need the user account to return the full UI response
        from app.domains.users.models import UserAccount
        user_account = self.repo.db.query(UserAccount).filter(UserAccount.id == user_id).first()

        return StoryResponse(
            id=str(story.id),
            user_id=str(story.user_id),
            media_url=story.media_url,
            created_at=story.created_at,
            expires_at=story.expires_at,
            views_count=story.views_count,
            overlays=story.overlays,
            username=user_account.username if user_account else None,
            full_name=user_account.full_name if user_account else None,
            avatar_url=user_account.avatar_url if user_account else None
        )

    def get_active_stories(self, user_id: str) -> list[StoryResponse]:
        results = self.repo.get_active_stories(user_id)
        stories = []
        for story, user in results:
            stories.append(StoryResponse(
                id=str(story.id),
                user_id=str(story.user_id),
                media_url=story.media_url,
                created_at=story.created_at,
                expires_at=story.expires_at,
                views_count=story.views_count,
                overlays=story.overlays,
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url
            ))
        return stories

    def increment_story_views(self, story_id: str, user_id: str, reaction: str = None):
        story = self.repo.db.query(SocialStory).filter(SocialStory.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")

        # Check if view already exists
        view = self.repo.db.query(SocialStoryView).filter(
            SocialStoryView.story_id == story_id,
            SocialStoryView.user_id == user_id
        ).first()

        if view:
            # Update reaction if provided
            if reaction:
                view.reaction = reaction
                self.repo.db.commit()
            return {"status": "ok", "message": "View updated"}
        
        # New view
        new_view = SocialStoryView(story_id=story_id, user_id=user_id, reaction=reaction)
        self.repo.db.add(new_view)
        story.views_count += 1
        self.repo.db.commit()
        return {"status": "ok", "message": "View recorded"}

    def get_story_viewers(self, story_id: str, current_user_id: str) -> list[StoryViewerItem]:
        story = self.repo.db.query(SocialStory).filter(SocialStory.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        if str(story.user_id) != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to view this story's viewers")

        from app.domains.users.models import UserAccount
        viewers = self.repo.db.query(SocialStoryView, UserAccount).join(
            UserAccount, SocialStoryView.user_id == UserAccount.id
        ).filter(SocialStoryView.story_id == story_id).order_by(SocialStoryView.created_at.desc()).all()

        return [
            StoryViewerItem(
                id=str(user.id),
                username=user.username,
                full_name=user.full_name,
                avatar_url=user.avatar_url,
                reaction=view.reaction,
                viewed_at=view.created_at
            ) for view, user in viewers
        ]

    def delete_story(self, story_id: str, current_user_id: str):
        story = self.repo.db.query(SocialStory).filter(SocialStory.id == story_id).first()
        if not story:
            raise HTTPException(status_code=404, detail="Story not found")
        if str(story.user_id) != current_user_id:
            raise HTTPException(status_code=403, detail="Not authorized to delete this story")
        
        self.repo.db.delete(story)
        self.repo.db.commit()
        return {"status": "ok", "message": "Story deleted successfully"}

    def get_link_preview(self, url: str) -> dict:
        normalized_url = _normalize_preview_url(url)
        youtube_video_id = _extract_youtube_video_id(normalized_url)
        github_repo_path = _extract_github_repo_path(normalized_url)

        if normalized_url in preview_cache:
            return preview_cache[normalized_url]
        
        try:
            headers = {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
            }
            # Add timeout to avoid hanging the endpoint
            response = requests.get(normalized_url, headers=headers, timeout=5)
            response.raise_for_status()
            
            parser = OGParser()
            parser.feed(response.text)
            
            meta = parser.meta_tags
            
            import html
            title = html.unescape(meta.get("og:title") or parser.title_tag_content or "")
            description = html.unescape(meta.get("og:description") or meta.get("description") or "")
            image_url = html.unescape(meta.get("og:image") or "")
            
            parsed_uri = urlparse(normalized_url)
            site_name = html.unescape(meta.get("og:site_name") or ("YouTube" if youtube_video_id else "GitHub" if github_repo_path else parsed_uri.netloc))

            if youtube_video_id:
                title = title or "YouTube video"
                image_url = image_url or f"https://img.youtube.com/vi/{youtube_video_id}/hqdefault.jpg"

            if github_repo_path:
                title = title or github_repo_path
                image_url = image_url or f"https://opengraph.githubassets.com/wanderbite/{github_repo_path}"
            
            result = {
                "url": normalized_url,
                "title": title,
                "description": description,
                "image_url": image_url,
                "site_name": site_name
            }
            preview_cache[normalized_url] = result
            return result
            
        except Exception as e:
            print(f"Error fetching link preview for {normalized_url}: {e}")
            parsed_uri = urlparse(normalized_url)
            fallback = {
                "url": normalized_url,
                "title": "YouTube video" if youtube_video_id else (github_repo_path or parsed_uri.netloc),
                "description": "",
                "image_url": (
                    f"https://img.youtube.com/vi/{youtube_video_id}/hqdefault.jpg"
                    if youtube_video_id
                    else f"https://opengraph.githubassets.com/wanderbite/{github_repo_path}" if github_repo_path else ""
                ),
                "site_name": "YouTube" if youtube_video_id else ("GitHub" if github_repo_path else parsed_uri.netloc)
            }
            preview_cache[normalized_url] = fallback
            return fallback
