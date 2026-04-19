from fastapi.testclient import TestClient

SIGN_UP_URL = "/api/v1/users/sign_up"
SIGN_IN_URL = "/api/v1/users/sign_in"


def test_sign_up_success(client: TestClient):
    resp = client.post(SIGN_UP_URL, json={"username": "hao123", "password": "strongpass123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["username"] == "hao123"


def test_sign_up_duplicate_username_returns_409(client: TestClient):
    payload = {"username": "hao123", "password": "strongpass123"}
    client.post(SIGN_UP_URL, json=payload)
    resp = client.post(SIGN_UP_URL, json=payload)
    assert resp.status_code == 409


def test_sign_in_success(client: TestClient):
    payload = {"username": "hao123", "password": "strongpass123"}
    client.post(SIGN_UP_URL, json=payload)
    resp = client.post(SIGN_IN_URL, json=payload)
    assert resp.status_code == 200
    assert resp.json()["message"] == "Sign in successful"


def test_sign_in_wrong_password_returns_401(client: TestClient):
    client.post(SIGN_UP_URL, json={"username": "hao123", "password": "strongpass123"})
    resp = client.post(SIGN_IN_URL, json={"username": "hao123", "password": "wrongpass123"})
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
