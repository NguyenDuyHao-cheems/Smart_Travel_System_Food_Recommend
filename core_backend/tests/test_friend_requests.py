import uuid
from fastapi.testclient import TestClient
from app.domains.users.models import FriendRequest, UserFriend

SIGN_UP_URL = "/api/v1/users/sign_up"
FRIENDS_URL = "/api/v1/users/friends"
REQUESTS_URL = "/api/v1/users/friends/requests"


def _register_user(client: TestClient, username: str) -> dict:
    resp = client.post(SIGN_UP_URL, json={"username": username, "password": "strongpassword123"})
    assert resp.status_code == 200
    return resp.json()


def test_friend_request_flow(client: TestClient):
    # 1. Register User A, User B, and User C
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    username_c = f"userc_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    user_b = _register_user(client, username_b)
    user_c = _register_user(client, username_c)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}
    headers_c = {"Authorization": f"Bearer {user_c['access_token']}"}
    
    # 2. User A sends friend request to User B
    resp_req = client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    assert resp_req.status_code == 200
    assert resp_req.json() == {"status": "success", "message": "Gửi yêu cầu kết bạn thành công"}
    
    # 3. Check lists:
    # A should see it in sent requests
    resp_reqs_a = client.get(REQUESTS_URL, headers=headers_a)
    assert resp_reqs_a.status_code == 200
    data_a = resp_reqs_a.json()
    assert len(data_a["sent"]) == 1
    assert data_a["sent"][0]["receiver_username"] == username_b
    assert data_a["sent"][0]["status"] == "pending"
    assert len(data_a["received"]) == 0
    
    # B should see it in received requests
    resp_reqs_b = client.get(REQUESTS_URL, headers=headers_b)
    assert resp_reqs_b.status_code == 200
    data_b = resp_reqs_b.json()
    assert len(data_b["received"]) == 1
    assert data_b["received"][0]["sender_username"] == username_a
    assert data_b["received"][0]["status"] == "pending"
    assert len(data_b["sent"]) == 0
    
    request_id = data_b["received"][0]["id"]
    
    # 4. User B declines the request from User A
    resp_decline = client.post(f"{REQUESTS_URL}/{request_id}/decline", headers=headers_b)
    assert resp_decline.status_code == 200
    assert resp_decline.json() == {"status": "success", "message": "Đã từ chối kết bạn"}
    
    # 5. Verify lists after decline:
    # B should see no pending received requests
    resp_reqs_b = client.get(REQUESTS_URL, headers=headers_b)
    assert len(resp_reqs_b.json()["received"]) == 0
    
    # A should see it in sent list as 'declined'
    resp_reqs_a = client.get(REQUESTS_URL, headers=headers_a)
    data_a = resp_reqs_a.json()
    assert len(data_a["sent"]) == 1
    assert data_a["sent"][0]["status"] == "declined"
    
    # 6. User A cancels/deletes the declined request
    resp_delete = client.delete(f"{REQUESTS_URL}/{request_id}", headers=headers_a)
    assert resp_delete.status_code == 200
    assert resp_delete.json() == {"status": "success", "message": "Đã hủy yêu cầu kết bạn"}
    
    # Verify A's sent list is now empty
    resp_reqs_a = client.get(REQUESTS_URL, headers=headers_a)
    assert len(resp_reqs_a.json()["sent"]) == 0

    # 7. User A sends request again to B
    resp_req2 = client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    assert resp_req2.status_code == 200
    
    # B gets the new request and accepts
    resp_reqs_b = client.get(REQUESTS_URL, headers=headers_b)
    new_request_id = resp_reqs_b.json()["received"][0]["id"]
    
    resp_accept = client.post(f"{REQUESTS_URL}/{new_request_id}/accept", headers=headers_b)
    assert resp_accept.status_code == 200
    assert resp_accept.json() == {"status": "success", "message": "Đã chấp nhận kết bạn"}
    
    # Verify A and B are now mutual friends
    friends_a = client.get(FRIENDS_URL, headers=headers_a).json()
    assert len(friends_a) == 1
    assert friends_a[0]["username"] == username_b
    
    friends_b = client.get(FRIENDS_URL, headers=headers_b).json()
    assert len(friends_b) == 1
    assert friends_b[0]["username"] == username_a


def test_friend_request_auto_accept(client: TestClient):
    # A sends to B, then B sends to A -> auto-accept
    username_a = f"usera_{uuid.uuid4().hex[:8]}"
    username_b = f"userb_{uuid.uuid4().hex[:8]}"
    
    user_a = _register_user(client, username_a)
    user_b = _register_user(client, username_b)
    
    headers_a = {"Authorization": f"Bearer {user_a['access_token']}"}
    headers_b = {"Authorization": f"Bearer {user_b['access_token']}"}
    
    # A -> B
    resp1 = client.post(FRIENDS_URL, json={"username": username_b}, headers=headers_a)
    assert resp1.status_code == 200
    
    # B -> A (should auto-accept and become friends)
    resp2 = client.post(FRIENDS_URL, json={"username": username_a}, headers=headers_b)
    assert resp2.status_code == 200
    assert resp2.json()["message"] == "Đã chấp nhận lời mời kết bạn và trở thành bạn bè"
    
    # Verify friendship
    friends_a = client.get(FRIENDS_URL, headers=headers_a).json()
    assert len(friends_a) == 1
    assert friends_a[0]["username"] == username_b
