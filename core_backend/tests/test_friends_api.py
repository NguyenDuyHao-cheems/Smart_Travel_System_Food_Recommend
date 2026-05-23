import uuid
from fastapi.testclient import TestClient
from app.domains.users.models import UserFriend

SIGN_UP_URL = "/api/v1/users/sign_up"
FRIENDS_URL = "/api/v1/users/friends"


def _register_user(client: TestClient, username: str) -> dict:
    resp = client.post(SIGN_UP_URL, json={"username": username, "password": "strongpassword123"})
    assert resp.status_code == 200
    return resp.json()


def test_add_friend_success(client: TestClient):
    # 1. Register User A and User B
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    user_b = _register_user(client, username_b)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}
    
    # 2. User A adds User B by User B's username
    payload = {"username": username_b}
    resp = client.post(FRIENDS_URL, json=payload, headers=headers_a)
    assert resp.status_code == 200
    assert resp.json() == {"status": "success", "message": "Friend added successfully"}
    
    # 3. Verify User A's friend list contains User B
    resp_list_a = client.get(FRIENDS_URL, headers=headers_a)
    assert resp_list_a.status_code == 200
    friends_a = resp_list_a.json()
    assert len(friends_a) == 1
    assert friends_a[0]["username"] == username_b
    assert friends_a[0]["friend_id"] == user_b["user_id"]
    
    # 4. Verify User B's friend list contains User A (since it is mutual)
    resp_list_b = client.get(FRIENDS_URL, headers=headers_b)
    assert resp_list_b.status_code == 200
    friends_b = resp_list_b.json()
    assert len(friends_b) == 1
    assert friends_b[0]["username"] == username_a
    assert friends_b[0]["friend_id"] == user_a["user_id"]


def test_list_friends_empty(client: TestClient):
    # Register a new user
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = _register_user(client, username)
    headers = {"Authorization": f"Bearer {user['access_token']}"}
    
    # Verify friend list is empty initially
    resp = client.get(FRIENDS_URL, headers=headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_remove_friend_success(client: TestClient):
    # 1. Register User A and User B
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    user_b = _register_user(client, username_b)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}
    
    # 2. Establish friendship A <-> B
    client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    
    # 3. User A removes User B
    resp_delete = client.delete(f"{FRIENDS_URL}/{user_b['user_id']}", headers=headers_a)
    assert resp_delete.status_code == 200
    assert resp_delete.json() == {"status": "success", "message": "Friend removed successfully"}
    
    # 4. Verify both friend lists are empty
    resp_list_a = client.get(FRIENDS_URL, headers=headers_a)
    assert resp_list_a.status_code == 200
    assert resp_list_a.json() == []
    
    resp_list_b = client.get(FRIENDS_URL, headers=headers_b)
    assert resp_list_b.status_code == 200
    assert resp_list_b.json() == []


def test_add_nonexistent_user_returns_404(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = _register_user(client, username)
    headers = {"Authorization": f"Bearer {user['access_token']}"}
    
    resp = client.post(FRIENDS_URL, json={"username": "does_not_exist_user"}, headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "User not found"


def test_add_self_returns_400(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = _register_user(client, username)
    headers = {"Authorization": f"Bearer {user['access_token']}"}
    
    resp = client.post(FRIENDS_URL, json={"username": username}, headers=headers)
    assert resp.status_code == 400
    assert resp.json()["detail"] == "Cannot add yourself as a friend"


def test_add_duplicate_friend_returns_400(client: TestClient):
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    _register_user(client, username_b)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    
    # First addition
    resp1 = client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    assert resp1.status_code == 200
    
    # Second addition (duplicate)
    resp2 = client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    assert resp2.status_code == 400
    assert resp2.json()["detail"] == "Already friends"


def test_remove_nonexistent_friendship_returns_404(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    user = _register_user(client, username)
    headers = {"Authorization": f"Bearer {user['access_token']}"}
    
    random_uuid = str(uuid.uuid4())
    resp = client.delete(f"{FRIENDS_URL}/{random_uuid}", headers=headers)
    assert resp.status_code == 404
    assert resp.json()["detail"] == "Friendship not found"
