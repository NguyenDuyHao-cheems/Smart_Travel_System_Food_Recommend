from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session
from typing import List, Optional


from .schemas import (
    SearchRequest,
    AIResponseData,
    SearchRecommendRequest,
    SessionCreateResponse,
    SessionDataResponse,
    NewspaperMenuResponse,
)
from .service import SearchService
from app.services.ai_client import AIServiceClient, get_ai_client
from app.core.dependencies import get_db

router = APIRouter()


def get_search_service_dep(ai_client: AIServiceClient = Depends(get_ai_client)) -> SearchService:
    return SearchService(ai_client=ai_client)


@router.post("/search/process", response_model=AIResponseData)
async def process_search_query(
    request: SearchRequest,
    search_service: SearchService = Depends(get_search_service_dep),
):
    """Vectorize a raw text query via ai_engine (utility endpoint)."""
    return await search_service.process_search_query(request.query)


@router.post("/search/recommend", response_model=SessionCreateResponse)
async def recommend_food_with_gps(
    request_data: SearchRecommendRequest,
    request: Request,
    search_service: SearchService = Depends(get_search_service_dep),
    db: Session = Depends(get_db),
):
    """
    Nhận query + GPS, chạy AI pipeline, lưu session vào DB.
    Trả về: { session_id, results, fallback_applied, ... }
    """
    return await search_service.process_recommend_query(request_data, db, request)


@router.get("/search/sessions/{session_id}", response_model=SessionDataResponse)
def get_search_session(
    session_id: str,
    db: Session = Depends(get_db),
):
    """
    Lấy kết quả tìm kiếm đã lưu theo session_id.
    Không chạy lại AI — chỉ đọc từ database.
    """
    return SearchService.get_session(session_id, db)


@router.get("/search/lucky-wheel-dishes", response_model=List[str])
def get_lucky_wheel_dishes(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lấy danh sách 12 món ăn cho vòng quay may mắn.
    Ưu tiên các món gần GPS (nếu có) và lọc chay nếu user có profile chay.
    """
    return SearchService.get_lucky_wheel_dishes(db, lat, lng, user_id)


@router.get("/search/newspaper-menu", response_model=NewspaperMenuResponse)
async def get_newspaper_menu(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    user_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    """
    Lấy thực đơn ngẫu nhiên dạng tờ báo gồm 3 món: Sáng, Trưa, Tối.
    """
    return await SearchService.get_newspaper_menu(db, lat, lng, user_id)


@router.get("/search/tags", response_model=List[str])
def get_all_tags(db: Session = Depends(get_db)):
    """Lấy danh sách tất cả tag name có trong hệ thống để hiển thị bộ lọc."""
    from app.domains.ranking.models import TagModel
    tags = db.query(TagModel.name).order_by(TagModel.name).all()
    return [t[0] for t in tags if t[0]]


