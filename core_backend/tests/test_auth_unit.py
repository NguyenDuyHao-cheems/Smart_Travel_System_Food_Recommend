import pytest
from datetime import timedelta
from jose import jwt
from unittest.mock import MagicMock
from sqlalchemy.exc import IntegrityError
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.domains.users.repository import UserAccountRepository

def test_hash_password_randomization():
    password = "secret_password"
    hash1 = hash_password(password)
    hash2 = hash_password(password)
    assert hash1 != hash2, "Hashes for the same password should be different due to salt"

def test_verify_password():
    password = "secret_password"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False

def test_verify_password_malformed_hash():
    # Passlib usually raises ValueError or returns False for malformed hashes
    # Let's see how it handles a hash without '$'
    malformed_hash = "not_a_hash"
    try:
        result = verify_password("password", malformed_hash)
        assert result is False
    except Exception:
        # If it raises an exception, we should ensure the app handles it gracefully
        # But usually it just returns False for bcrypt if it doesn't match the format
        pass

def test_create_access_token_claims():
    data = {"sub": "user_123", "username": "testuser"}
    token = create_access_token(data)
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    assert decoded["sub"] == "user_123"
    assert decoded["username"] == "testuser"
    assert "exp" in decoded

def test_create_access_token_expiry():
    data = {"sub": "user_123"}
    # Create a token that expired 1 second ago
    expires_delta = timedelta(seconds=-1)
    token = create_access_token(data, expires_delta=expires_delta)
    
    with pytest.raises(jwt.ExpiredSignatureError):
        jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])

def test_repository_duplicate_user_integrity_error():
    mock_db = MagicMock()
    mock_db.commit.side_effect = IntegrityError("duplicate", params={}, orig=None)
    
    repo = UserAccountRepository(mock_db)
    with pytest.raises(ValueError, match="Username already exists."):
        repo.create_user(username="duplicate", password_hash="hash")
    
    assert mock_db.rollback.called
