from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import check_db_connection, engine
from app.domains.users.models import Base as UserBase

# ── Create tables on startup (SQLite / Postgres compatible) ──────────────────
UserBase.metadata.create_all(bind=engine)

app = FastAPI(title="Smart Travel System - Food Recommend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def get_health_status():
    db_status = check_db_connection()
    return {
        "status": "online",
        "backend": True,
        "database": db_status,
        "message": "Both backend and database systems reached" if db_status else "Backend ok, Database connection failed"
    }

from app.domains.search.router import router as search_router
from app.domains.users.router import router as users_router
from app.domains.ranking.router import router as ml_router

app.include_router(search_router, prefix="/api/v1", tags=["Search"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(ml_router, prefix="/api/v1", tags=["ML"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API - Core Backend"}

