from sqlalchemy.orm import Session
from app.services.user_services import get_user_allergies, get_user_preferences_vector
from app.services.allergy_filter import filter_allergy, handle_fallback
from app.services.candidate_mapper import to_candidates
from app.domains.ranking.ranking_service import RankingService
from app.core.config import settings


# TODO: Replace with real implementation that queries the database.
def generate_candidates(query: str):
    """
    Temporary mock function để dùng cho recommendation pipeline.
    Sau này sẽ thay bằng SearchService + AI + DB.
    """

    return [
        {
            "id": 1,
            "name": "Mì Cay Sasin - Làng Đại Học",
            "ingredients": ["tôm", "ớt", "mì", "hải sản"],
            "vector": [0.1] * settings.VECTOR_DIM
        },
        {
            "id": 2,
            "name": "Mì Cay Seoul - Dĩ An",
            "ingredients": ["thịt bò", "mì", "ớt", "trân châu"],
            "vector": [0.2] * settings.VECTOR_DIM
        },
        {
            "id": 3,
            "name": "Mì Cay Naga - Làng Đại Học",
            "ingredients": ["hải sản", "mì", "ớt"],
            "vector": [0.15] * settings.VECTOR_DIM
        },
        {
            "id": 4,
            "name": "Yagami - Ẩm Thực Lẩu Thái-Nhật-Hàn",
            "ingredients": ["bạch tuộc", "mì", "ớt"],
            "vector": [0.3] * settings.VECTOR_DIM
        },
        {
            "id": 5,
            "name": "Mì Cay Sasin Hoàng Diệu 2",
            "ingredients": ["tôm", "ớt", "mì", "thịt bò"],
            "vector": [0.12] * settings.VECTOR_DIM
        }
    ]

def recommend(query: str, user_id: str, db: Session):
    """
    Deprecated.

    Flow recommend cũ dùng user_vector để ranking đã bị loại bỏ
    vì sai mục đích semantic search.

    Luồng đúng hiện tại nằm ở:
    app/domains/search/service.py -> SearchService.process_recommend_query()

    Luồng đúng:
    query -> AI Engine tạo query_vector -> RankingService.get_recommendations()
    -> SemanticRetrievalService -> restaurants.embedding_vector bằng pgvector.
    """
    raise RuntimeError(
        "Deprecated recommend() flow. Use SearchService.process_recommend_query() instead."
    )