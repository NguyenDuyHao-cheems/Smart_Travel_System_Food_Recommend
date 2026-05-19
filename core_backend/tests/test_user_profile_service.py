import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from app.services.user_profile_service import rebuild_user_profile_vector
from app.domains.users.models import UserOnboarding

@pytest.mark.asyncio
async def test_rebuild_no_onboarding_returns_none():
    db = MagicMock()
    user_id = "user-123"

    # Mock UserOnboardingRepository to return None
    with patch("app.services.user_profile_service.UserOnboardingRepository") as mock_repo_cls:
        mock_repo = MagicMock()
        mock_repo.get_by_user_id.return_value = None
        mock_repo_cls.return_value = mock_repo

        result = await rebuild_user_profile_vector(db, user_id)
        assert result is None
        mock_repo.get_by_user_id.assert_called_once_with(user_id)

@pytest.mark.asyncio
async def test_rebuild_embed_fails_returns_none():
    db = MagicMock()
    user_id = "user-123"
    
    # Mock UserOnboarding record
    onboarding = UserOnboarding(
        user_id=user_id,
        favorite_dishes=["Phở", "Bún chả"],
        spicy_level="cay nhẹ",
        is_vegetarian=False,
        dietary_restrictions=None,
        budget="50k",
        location="Thủ Đức"
    )

    with patch("app.services.user_profile_service.UserOnboardingRepository") as mock_onboard_repo_cls, \
         patch("app.services.user_profile_service.embed_text", new_callable=AsyncMock) as mock_embed:
         
        mock_onboard_repo = MagicMock()
        mock_onboard_repo.get_by_user_id.return_value = onboarding
        mock_onboard_repo_cls.return_value = mock_onboard_repo
        
        # embed_text returns None (fails)
        mock_embed.return_value = None

        result = await rebuild_user_profile_vector(db, user_id)
        assert result is None
        mock_embed.assert_called_once()

@pytest.mark.asyncio
async def test_rebuild_user_not_found_returns_none():
    db = MagicMock()
    user_id = "user-123"
    onboarding = UserOnboarding(
        user_id=user_id,
        favorite_dishes=["Phở"],
        spicy_level="không cay",
        is_vegetarian=True,
        dietary_restrictions=None,
        budget="50k",
        location="Thủ Đức"
    )

    with patch("app.services.user_profile_service.UserOnboardingRepository") as mock_onboard_repo_cls, \
         patch("app.services.user_profile_service.embed_text", new_callable=AsyncMock) as mock_embed, \
         patch("app.services.user_profile_service.UserAccountRepository") as mock_user_repo_cls:
         
        mock_onboard_repo = MagicMock()
        mock_onboard_repo.get_by_user_id.return_value = onboarding
        mock_onboard_repo_cls.return_value = mock_onboard_repo
        
        mock_embed.return_value = [0.1] * 768
        
        # User not found or update returns False
        mock_user_repo = MagicMock()
        mock_user_repo.update_preferences_vector.return_value = False
        mock_user_repo_cls.return_value = mock_user_repo

        result = await rebuild_user_profile_vector(db, user_id)
        assert result is None
        mock_user_repo.update_preferences_vector.assert_called_once_with(user_id, [0.1] * 768)

@pytest.mark.asyncio
async def test_rebuild_happy_path_returns_vector():
    db = MagicMock()
    user_id = "user-123"
    onboarding = UserOnboarding(
        user_id=user_id,
        favorite_dishes=["Phở"],
        spicy_level="không cay",
        is_vegetarian=False,
        dietary_restrictions=["no-peanuts"],
        budget="50k",
        location="Thủ Đức"
    )
    dummy_vector = [0.2] * 768

    with patch("app.services.user_profile_service.UserOnboardingRepository") as mock_onboard_repo_cls, \
         patch("app.services.user_profile_service.embed_text", new_callable=AsyncMock) as mock_embed, \
         patch("app.services.user_profile_service.UserAccountRepository") as mock_user_repo_cls:
         
        mock_onboard_repo = MagicMock()
        mock_onboard_repo.get_by_user_id.return_value = onboarding
        mock_onboard_repo_cls.return_value = mock_onboard_repo
        
        mock_embed.return_value = dummy_vector
        
        mock_user_repo = MagicMock()
        mock_user_repo.update_preferences_vector.return_value = True
        mock_user_repo_cls.return_value = mock_user_repo

        result = await rebuild_user_profile_vector(db, user_id)
        assert result == dummy_vector
        mock_user_repo.update_preferences_vector.assert_called_once_with(user_id, dummy_vector)
