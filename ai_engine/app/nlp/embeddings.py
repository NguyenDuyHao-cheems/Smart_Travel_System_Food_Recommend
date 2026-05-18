import asyncio
from fastapi import APIRouter
from .schemas import ExtractIntentRequest, ExtractIntentResponse, EmbedRequest, EmbedResponse
from .llm_parser import clean_query_with_gemini
from .service import generate_mean_pooled_embedding

router = APIRouter()


@router.post("/extract-intent", response_model=ExtractIntentResponse)
async def extract_intent(request: ExtractIntentRequest):
    """
    Unified endpoint: Gemini cleans query → word_tokenize → embed.
    """
    # Step 1: Gemini reformulates raw query
    cleaned_query = await clean_query_with_gemini(request.text)
    print("request.text", request.text)
    print("cleaned_query", cleaned_query)
    # Step 2: Embed the CLEANED query (not raw text!)
    # generate_mean_pooled_embedding already calls word_tokenize internally
    vector = await asyncio.to_thread(generate_mean_pooled_embedding, cleaned_query)

    return ExtractIntentResponse(
        raw_text=request.text,
        cleaned_query=cleaned_query,
        vector=vector,
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
