from unittest.mock import MagicMock, patch

from app.domains.users.models import UserAccount, UserOnboarding
from app.services.user_services import (
    get_user_allergies,
    get_user_preferences_vector,
    get_user_recommendation_context,
)

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

def test_get_user_recommendation_context_reads_allergies_and_profile_vector_once(db_session):
    user_id = "context-user"
    profile_vector = [0.3] * 768
    onboarding_vector = [0.2] * 768
    db_session.add(
        UserAccount(
            id=user_id,
            username="context-user",
            password_hash="hash",
            preferences_vector=profile_vector,
        )
    )
    db_session.add(
        UserOnboarding(
            user_id=user_id,
            favorite_dishes=[],
            spicy_level="medium",
            allergies=["peanut"],
            budget="medium",
            location="HCM",
            age=25,
            preferences_vector=onboarding_vector,
        )
    )
    db_session.flush()

    statements = []
    original_execute = db_session.execute

    def count_execute(*args, **kwargs):
        statements.append(args[0])
        return original_execute(*args, **kwargs)

    with patch.object(db_session, "execute", side_effect=count_execute):
        allergies, vector = get_user_recommendation_context(db_session, user_id)

    assert allergies == ["peanut"]
    assert vector == profile_vector
    assert len(statements) == 1


def test_get_user_recommendation_context_uses_onboarding_vector_fallback(db_session):
    user_id = "context-fallback-user"
    onboarding_vector = [0.2] * 768
    db_session.add(
        UserAccount(id=user_id, username="context-fallback-user", password_hash="hash")
    )
    db_session.add(
        UserOnboarding(
            user_id=user_id,
            favorite_dishes=[],
            spicy_level="medium",
            allergies=[],
            budget="medium",
            location="HCM",
            age=25,
            preferences_vector=onboarding_vector,
        )
    )
    db_session.flush()

    allergies, vector = get_user_recommendation_context(db_session, user_id)

    assert allergies == []
    assert vector == onboarding_vector
