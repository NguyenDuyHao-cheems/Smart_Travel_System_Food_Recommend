from sqlalchemy.orm import Session
from app.domains.users.repository import UserOnboardingRepository
from typing import List


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

    except Exception as e:
        print(f"[ERROR] get_user_allergies: {e}")
        return []