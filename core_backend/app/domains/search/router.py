from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from .schemas import SearchRequest, AIResponseData, SearchRecommendRequest, SearchRecommendResponse
from .service import SearchService
from app.services.ai_client import AIServiceClient, get_ai_client
from app.core.dependencies import get_db

router = APIRouter()

def get_search_service_dep(ai_client: AIServiceClient = Depends(get_ai_client)) -> SearchService:
    return SearchService(ai_client=ai_client)

@router.post("/search/process", response_model=AIResponseData)
async def process_search_query(
    request: SearchRequest,
    search_service: SearchService = Depends(get_search_service_dep)
):
    """
    Receives a raw text query from the client, forwards it to the ai_engine
    to extract intents/embeddings, and then uses that data to perform a search 
    in PostgreSQL using pgvector (implementation pending).
    """
    return await search_service.process_search_query(request.query)

@router.post("/search/recommend", response_model=SearchRecommendResponse)
async def recommend_food_with_gps(
    request: SearchRecommendRequest,
    search_service: SearchService = Depends(get_search_service_dep),
    db: Session = Depends(get_db)
):
    """
    Receives a food requirement and user GPS location (lat, lng),
    then returns the recommended food places near that location.
    """
    return await search_service.process_recommend_query(request, db)

@router.get("/search/sessions/{session_id}", response_model=SearchRecommendResponse)
async def get_search_session(
    session_id: str,
    search_service: SearchService = Depends(get_search_service_dep),
    db: Session = Depends(get_db)
):
    """
    Fetch a previously saved search session by its ID.
    Returns the exact same results without re-running AI.
    """
    return await search_service.get_session_by_id(session_id, db)
