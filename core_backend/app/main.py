from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import check_db_connection, engine, Base
from app.domains.search.models import SearchSession
from app.domains.users.models import Base as UserBase
from app.services.ai_client import get_ai_client

# ── Create tables on startup (SQLite / Postgres compatible) ──────────────────
UserBase.metadata.create_all(bind=engine)
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Travel System - Food Recommend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def get_health_status():
    db_status = check_db_connection()
    ai_client = get_ai_client()
    ai_status = await ai_client.check_health()
    
    is_healthy = db_status and ai_status
    
    return {
        "status": "online" if is_healthy else "degraded",
        "backend": True,
        "database": db_status,
        "ai_engine": ai_status,
        "message": "All systems operational" if is_healthy else "Some systems are unreachable"
    }

from app.domains.search.router import router as search_router
from app.domains.users.router import router as users_router
from app.domains.ranking.router import router as ml_router
from app.domains.restaurants.router import router as restaurants_router

app.include_router(search_router, prefix="/api/v1", tags=["Search"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(ml_router, prefix="/api/v1", tags=["ML"])
app.include_router(restaurants_router, prefix="/api/v1", tags=["Restaurants"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API - Core Backend"}

