import uuid
from fastapi.testclient import TestClient
from jose import jwt

from app.core.config import settings

SIGN_UP_URL = "/api/v1/users/sign_up"
SIGN_IN_URL = "/api/v1/users/sign_in"


def test_sign_up_success(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    resp = client.post(SIGN_UP_URL, json={"username": username, "password": "strongpass123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["username"] == username
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    
    # Assert user_id is a valid UUID string
    user_id = body["user_id"]
    assert isinstance(user_id, str)
    uuid.UUID(user_id) # Should not raise ValueError

    payload = jwt.decode(body["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload["sub"] == user_id
    assert payload["username"] == username
    assert "exp" in payload


def test_sign_up_duplicate_username_returns_409(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    payload = {"username": username, "password": "strongpass123"}
    client.post(SIGN_UP_URL, json=payload)
    resp = client.post(SIGN_UP_URL, json=payload)
    assert resp.status_code == 409


def test_sign_in_success(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    payload = {"username": username, "password": "strongpass123"}
    signup_resp = client.post(SIGN_UP_URL, json=payload)
    user_id_from_signup = signup_resp.json()["user_id"]

    resp = client.post(SIGN_IN_URL, json=payload)
    assert resp.status_code == 200
    body = resp.json()
    assert body["message"] == "Sign in successful"
    assert body["access_token"]
    assert body["token_type"] == "bearer"
    
    # Sign in returns the same user_id
    assert body["user_id"] == user_id_from_signup

    payload_jwt = jwt.decode(body["access_token"], settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert payload_jwt["sub"] == body["user_id"]
    assert payload_jwt["username"] == username
    assert "exp" in payload_jwt


def test_sign_in_wrong_password_returns_401(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    client.post(SIGN_UP_URL, json={"username": username, "password": "strongpass123"})
    resp = client.post(SIGN_IN_URL, json={"username": username, "password": "wrongpass123"})
    assert resp.status_code == 401


def test_sign_in_unknown_user_returns_401(client: TestClient):
    resp = client.post(SIGN_IN_URL, json={"username": "ghost", "password": "strongpass123"})
    assert resp.status_code == 401


def test_sign_up_short_password_returns_422(client: TestClient):
    resp = client.post(SIGN_UP_URL, json={"username": "hao123", "password": "123"})
    assert resp.status_code == 422


def test_sign_up_short_username_returns_422(client: TestClient):
    resp = client.post(SIGN_UP_URL, json={"username": "ab", "password": "strongpass123"})
    assert resp.status_code == 422


def test_sign_in_short_password_returns_422(client: TestClient):
    resp = client.post(SIGN_IN_URL, json={"username": "hao123", "password": "123"})
    assert resp.status_code == 422


def test_sign_up_empty_username_returns_422(client: TestClient):
    resp = client.post(SIGN_UP_URL, json={"username": "", "password": "validpass1"})
    assert resp.status_code == 422


def test_sign_up_empty_password_returns_422(client: TestClient):
    resp = client.post(SIGN_UP_URL, json={"username": "validuser", "password": ""})
    assert resp.status_code == 422


def test_sign_up_extra_fields_is_ignored(client: TestClient):
    username = f"user_{uuid.uuid4().hex[:8]}"
    payload = {
        "username": username, 
        "password": "strongpass123",
        "extra_field": "some_value",
        "nested": {"key": "val"}
    }
    resp = client.post(SIGN_UP_URL, json=payload)
    assert resp.status_code == 200
    assert resp.json()["username"] == username


def test_sign_up_missing_body_returns_422(client: TestClient):
    resp = client.post(SIGN_UP_URL)
    assert resp.status_code == 422

