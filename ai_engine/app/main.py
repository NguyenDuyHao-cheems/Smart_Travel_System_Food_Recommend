from contextlib import asynccontextmanager
from fastapi import FastAPI
import logging
from app.nlp.embeddings import router as nlp_router
from app.ranking.router import router as ranking_router
from app.nlp.model_provider import get_embedding_model

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Loading AI model on startup...")
    get_embedding_model()
    logger.info("AI model loaded successfully.")
    yield

app = FastAPI(title="Smart Travel System - AI Engine", lifespan=lifespan)

# Register the NLP router
app.include_router(nlp_router, prefix="/api/v1/nlp", tags=["NLP"])

# Register the Ranking router — endpoint: /api/v1/ml/rank
app.include_router(ranking_router, prefix="/api/v1", tags=["Ranking"])


@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API - AI Engine"}

@app.get("/api/health")
def get_health_status():
    return {"status": "online", "ai_engine": True, "model_loaded": True}
