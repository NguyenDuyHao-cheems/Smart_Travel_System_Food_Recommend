from fastapi import APIRouter 
from .schemas import NLPRequest, NLPResponse, ExtractIntentRequest, ExtractIntentResponse
from .extractor import extract_intent_and_budget
from .query_parser import extract_budget, extract_tags
from .service import generate_mean_pooled_embedding
from app.core.allergy_filter import filter_allergy

router = APIRouter()



@router.post("/process", response_model=NLPResponse)
def process_nlp(request: NLPRequest):
    """
    Takes user text, extracts intents and budget, and returns a 
    PhoBERT vector embedding.
    """
    # 1. Extract intents & budget
    extracted_data = extract_intent_and_budget(request.text)
    
    # 2. Generate vector embeddings
    embeddings = generate_mean_pooled_embedding(request.text)
        
    return NLPResponse(
        vector=embeddings,
        extracted_budget=extracted_data["extracted_budget"],
        intent=extracted_data["intent"]
    )

@router.post("/extract-intent", response_model=ExtractIntentResponse)
def extract_intent(request: ExtractIntentRequest):
    tags = extract_tags(request.text)
    budget = extract_budget(request.text)

    query_vector = generate_mean_pooled_embedding(request.text)

    # ── Allergy Filtering Step ──────────────────────────────────────────────
    # ``candidates`` at this stage are the parsed tags (used as food-item proxies).
    # Each tag is wrapped in a minimal dict so filter_allergy can operate on it.
    # In a full pipeline this would be the list returned by Candidate Generation.
    tag_candidates = [{"name": tag, "ingredients": [tag]} for tag in tags]
    filtered_candidates = filter_allergy(tag_candidates, request.allergies)
    filtered_count = len(tag_candidates) - len(filtered_candidates)
    safe_tags = [c["name"] for c in filtered_candidates]
    # ────────────────────────────────────────────────────────────────────────

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=safe_tags,
        budget=budget,
        query_vector=query_vector,
        lat=request.lat,
        lng=request.lng,
        allergies=request.allergies,
        filtered_count=filtered_count,
    )
