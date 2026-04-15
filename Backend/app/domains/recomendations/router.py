import time
from fastapi import APIRouter
from app.domains.recomendations.schemas import QueryParserRequest, QueryParserResponse
from app.domains.recomendations.service import parse_query

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.post("/query-parser", response_model=QueryParserResponse)
def query_parser_api(payload: QueryParserRequest):
    start_time = time.time()

    result = parse_query(
        text=payload.text,
        lat=payload.lat,
        lng=payload.lng,
    )

    elapsed = time.time() - start_time
    print(f"[query-parser] elapsed_time = {elapsed:.4f}s")

    return result