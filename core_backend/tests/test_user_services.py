import pytest
from unittest.mock import MagicMock
from app.services.user_services import get_user_preferences_vector, get_user_allergies

def test_get_user_preferences_vector_profile_first():
    db = MagicMock()
    user_id = "user1"
    profile_vector = [0.1] * 768
    
    # Mock UserAccountRepository to return a user with a profile vector
    mock_user = MagicMock()
    mock_user.preferences_vector = profile_vector
    
    with patch("app.services.user_services.UserAccountRepository") as MockRepo:
        MockRepo.return_value.get_by_id.return_value = mock_user
        
        vector = get_user_preferences_vector(db, user_id)
        assert vector == profile_vector

def test_get_user_preferences_vector_onboarding_fallback():
    db = MagicMock()
    user_id = "user1"
    onboarding_vector = [0.2] * 768
    
    # Mock UserAccountRepository to return user with NO profile vector
    mock_user = MagicMock()
    mock_user.preferences_vector = None
    
    # Mock UserOnboardingRepository to return record with vector
    mock_record = MagicMock()
    mock_record.preferences_vector = onboarding_vector
    
    with patch("app.services.user_services.UserAccountRepository") as MockAccountRepo, \
         patch("app.services.user_services.UserOnboardingRepository") as MockOnboardingRepo:
        
        MockAccountRepo.return_value.get_by_id.return_value = mock_user
        MockOnboardingRepo.return_value.get_by_user_id.return_value = mock_record
        
        vector = get_user_preferences_vector(db, user_id)
        assert vector == onboarding_vector

def test_get_user_preferences_vector_none():
    db = MagicMock()
    user_id = "user1"
    
    with patch("app.services.user_services.UserAccountRepository") as MockAccountRepo, \
         patch("app.services.user_services.UserOnboardingRepository") as MockOnboardingRepo:
        
        MockAccountRepo.return_value.get_by_id.return_value = None
        MockOnboardingRepo.return_value.get_by_user_id.return_value = None
        
        vector = get_user_preferences_vector(db, user_id)
        assert vector is None

from unittest.mock import patch
