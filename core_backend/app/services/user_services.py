import logging
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError
from app.domains.users.repository import UserOnboardingRepository, UserAccountRepository

logger = logging.getLogger(__name__)


def get_user_allergies(db: Session, user_id: str) -> List[str]:
    """
    Lấy danh sách dị ứng của user từ bảng user_onboardings qua SQLAlchemy.
    Trả về list rỗng nếu user chưa onboard hoặc chưa khai báo dị ứng.
    """
    try:
        repo = UserOnboardingRepository(db)
        record = repo.get_by_user_id(user_id)

        if not record or not record.allergies:
            return []

        allergies = record.allergies

        # Phòng trường hợp DB lưu dạng string thay vì JSON list
        if isinstance(allergies, str):
            allergies = [a.strip() for a in allergies.split(",")]

        return allergies

    except SQLAlchemyError as e:
        logger.error(f"Database error in get_user_allergies for user {user_id}: {e}")
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_user_allergies for user {user_id}: {e}")
        return []


def get_user_preferences_vector(db: Session, user_id: str) -> Optional[List[float]]:
    """
    Lấy vector sở thích của user.

    Ưu tiên:
    1. users.preferences_vector (profile lâu dài, nếu đã có)
    2. user_onboardings.preferences_vector (cold-start từ onboarding)

    Cả hai đều là vector 768 chiều, cùng model embedding, so sánh trực tiếp
    được với restaurant/dish vectors.
    """
    try:
        # 1. Try long-term profile vector from users table first
        user_repo = UserAccountRepository(db)
        user = user_repo.get_by_id(user_id)
        if user and user.preferences_vector is not None:
            return list(user.preferences_vector)

        # 2. Fall back to onboarding vector
        onboarding_repo = UserOnboardingRepository(db)
        record = onboarding_repo.get_by_user_id(user_id)
        if record and record.preferences_vector is not None:
            return list(record.preferences_vector)

        return None

    except SQLAlchemyError as e:
        logger.error(f"Database error in get_user_preferences_vector for user {user_id}: {e}")
        raise
    except Exception as e:
        logger.exception(f"Unexpected error in get_user_preferences_vector for user {user_id}: {e}")
        return None