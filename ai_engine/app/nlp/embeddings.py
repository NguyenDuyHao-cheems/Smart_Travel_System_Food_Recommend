import asyncio
from fastapi import APIRouter
from .schemas import ExtractIntentRequest, ExtractIntentResponse, EmbedRequest, EmbedResponse
from .llm_parser import parse_query_with_gemini
from .service import generate_mean_pooled_embedding

router = APIRouter()


@router.post("/extract-intent", response_model=ExtractIntentResponse)
async def extract_intent(request: ExtractIntentRequest):
    """
    Unified endpoint to extract tags, budget, intent using Gemini API and generate embeddings.
    """
    # Fix #6: parse_query_with_gemini is now async (uses httpx internally)
    tags, budget, intent = await parse_query_with_gemini(request.text)

    # Wrap CPU-bound PhoBERT embedding in thread to avoid blocking event loop
    vector = await asyncio.to_thread(generate_mean_pooled_embedding, request.text)

    return ExtractIntentResponse(
        raw_text=request.text,
        tags=tags,
        budget=budget,
        vector=vector,
        intent=intent,
        lat=request.lat,
        lng=request.lng,
    )

@router.post("/embed", response_model=EmbedResponse)
async def embed_text_endpoint(request: EmbedRequest):
    """
    Generate embedding for the given text without intent extraction.
    """
    vector = await asyncio.to_thread(generate_mean_pooled_embedding, request.text)
    return EmbedResponse(vector=vector)
