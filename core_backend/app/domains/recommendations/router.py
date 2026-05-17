from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_db, get_optional_current_user
from app.domains.users.models import UserAccount
from .schemas import HomeRecommendationResponse
from .service import RecommendationService

router = APIRouter()

@router.get("/recommendations/home", response_model=HomeRecommendationResponse)
def get_home_recommendations(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    limit: int = Query(6, description="Limit of results"),
    user: UserAccount | None = Depends(get_optional_current_user),
    db: Session = Depends(get_db)
):
    results = RecommendationService.get_home_recommendations(user, lat, lng, limit, db)
    return HomeRecommendationResponse(results=results)
