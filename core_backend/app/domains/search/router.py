from fastapi import APIRouter, Depends
from .schemas import (
    SearchRequest,
    AIResponseData,
    SearchRecommendRequest,
    SearchRecommendResponse,
    ExtractIntentRequest,
    ExtractIntentResponse,
)
from .service import SearchService
from app.services.ai_client import AIServiceClient, get_ai_client

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
    search_service: SearchService = Depends(get_search_service_dep)
):
    """
    Receives a food requirement and user GPS location (lat, lng),
    then returns the recommended food places near that location.
    """
    return await search_service.process_recommend_query(request)
@router.post("/nlp/extract-intent", response_model=ExtractIntentResponse)
async def extract_intent(
    request: ExtractIntentRequest,
    search_service: SearchService = Depends(get_search_service_dep)
):
    """
    Parse natural language query:
    - extract tags
    - extract budget
    - generate 768-d query vector with PhoBERT
    """
    return await search_service.extract_intent(request)