import uuid
import pytest
from fastapi.testclient import TestClient

SIGN_UP_URL = "/api/v1/users/sign_up"
POSTS_URL = "/api/v1/social/posts"
STORIES_URL = "/api/v1/social/stories"
FEED_URL = "/api/v1/social/feed"

def _register_user(client: TestClient, username: str) -> dict:
    resp = client.post(SIGN_UP_URL, json={"username": username, "password": "strongpassword123"})
    assert resp.status_code == 200
    return resp.json()

def test_social_flow(client: TestClient):
    # 1. Register User A and User B
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    user_b = _register_user(client, username_b)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}

    # 2. User A creates a post
    post_payload = {"content": "Hello foodies!", "mood": "happy"}
    resp = client.post(POSTS_URL, json=post_payload, headers=headers_a)
    assert resp.status_code == 200
    post_data = resp.json()
    assert post_data["content"] == "Hello foodies!"
    assert post_data["username"] == username_a
    post_id = post_data["id"]

    # 3. User B likes the post
    resp_like = client.post(f"{POSTS_URL}/{post_id}/like", headers=headers_b)
    assert resp_like.status_code == 200
    assert resp_like.json() == {"status": "liked"}

    # 4. Verify User A gets a notification for the like
    resp_notif = client.get("/api/v1/social/notifications", headers=headers_a)
    assert resp_notif.status_code == 200
    notifs = resp_notif.json()
    assert len(notifs) >= 1
    assert notifs[0]["type"] == "like"
    assert username_b in notifs[0]["message"]

    # 5. User B replies to the post
    reply_payload = {"content": "Yummy!", "parent_id": post_id}
    resp_reply = client.post(POSTS_URL, json=reply_payload, headers=headers_b)
    assert resp_reply.status_code == 200
    reply_data = resp_reply.json()
    assert reply_data["parent_id"] == post_id

    # 6. User B follows User A
    user_a_id = user_a["user_id"]
    resp_follow = client.post(f"/api/v1/social/users/{user_a_id}/follow", headers=headers_b)
    assert resp_follow.status_code == 200
    assert resp_follow.json() == {"status": "followed"}

    # 7. User A creates a story
    story_payload = {"media_url": "https://example.com/food.jpg", "overlays": [{"text": "Love this!"}]}
    resp_story = client.post(STORIES_URL, json=story_payload, headers=headers_a)
    assert resp_story.status_code == 200
    story_data = resp_story.json()
    assert story_data["media_url"] == "https://example.com/food.jpg"
    story_id = story_data["id"]

    # 8. User B views User A's active stories
    resp_stories = client.get(STORIES_URL, headers=headers_b)
    assert resp_stories.status_code == 200
    active_stories = resp_stories.json()
    assert len(active_stories) >= 1
    assert active_stories[0]["id"] == story_id

    # 9. User B records a view on the story
    resp_view = client.post(f"{STORIES_URL}/{story_id}/view", json={"reaction": "❤️"}, headers=headers_b)
    assert resp_view.status_code == 200
    assert resp_view.json() == {"status": "ok", "message": "View recorded"}

    # 10. User A checks story viewers
    resp_viewers = client.get(f"{STORIES_URL}/{story_id}/viewers", headers=headers_a)
    assert resp_viewers.status_code == 200
    viewers = resp_viewers.json()
    assert len(viewers) == 1
    assert viewers[0]["username"] == username_b
    assert viewers[0]["reaction"] == "❤️"

def test_unread_count_sse(client: TestClient):
    # Register user
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = _register_user(client, username)
    token = user['access_token']
    
    # 1. Test NotificationNotifier directly
    from app.domains.social.notifier import notifier
    import asyncio
    
    q = asyncio.Queue()
    user_id = user['user_id']
    notifier.subscribe(user_id, q)
    assert q.empty()
    
    notifier.notify(user_id)
    assert not q.empty()
    assert q.get_nowait() is True
    notifier.unsubscribe(user_id, q)

    # 2. Test SSE endpoint connection and initial yield
    with client.stream("GET", f"/api/v1/social/notifications/unread-count/sse?token={token}") as response:
        assert response.status_code == 200
        # Read the first line of the stream, which should be the initial count "data: 0\n\n"
        lines = response.iter_lines()
        first_line = next(lines)
        assert b"data: 0" in first_line

