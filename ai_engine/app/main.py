from fastapi import FastAPI
from app.nlp.embeddings import router as nlp_router

app = FastAPI(title="Smart Travel System - AI Engine")

# Register the NLP router
app.include_router(nlp_router, prefix="/api/v1/nlp", tags=["NLP"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API - AI Engine"}

@app.get("/api/health")
def get_health_status():
    return {"status": "online", "ai_engine": True}
