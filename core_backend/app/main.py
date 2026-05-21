from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import check_db_connection, engine, Base
from app.domains.users.models import Base as UserBase
from app.services.ai_client import get_ai_client

# ── Import models trước create_all ──────────────────────────────────────
import app.domains.search.models
import app.domains.ranking.models
import app.domains.social.models

# ── Create tables on startup (SQLite / Postgres compatible) ──────────────────
UserBase.metadata.create_all(bind=engine)
print('TABLES:', Base.metadata.tables.keys())
Base.metadata.create_all(bind=engine)

import asyncio
from contextlib import asynccontextmanager
from app.domains.social.tasks import cleanup_expired_stories

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Khởi chạy background task
    async def run_cleanup_task():
        while True:
            try:
                # Chạy dọn dẹp trong thread/executor hoặc đồng bộ nếu dùng block nhỏ
                # Do hàm cleanup gọi http block, ta dùng to_thread để ko block async event loop
                await asyncio.to_thread(cleanup_expired_stories)
            except Exception as e:
                print(f"Lỗi task dọn dẹp: {e}")
            await asyncio.sleep(3600)  # Chạy mỗi 1 giờ
            
    task = asyncio.create_task(run_cleanup_task())
    yield
    task.cancel()

app = FastAPI(title="Smart Travel System - Food Recommend", lifespan=lifespan)

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
from app.domains.recommendations.router import router as recommendations_router
from app.domains.social.router import router as social_router

app.include_router(search_router, prefix="/api/v1", tags=["Search"])
app.include_router(users_router, prefix="/api/v1/users", tags=["Users"])
app.include_router(ml_router, prefix="/api/v1", tags=["ML"])
app.include_router(recommendations_router, prefix="/api/v1", tags=["Recommendations"])
app.include_router(restaurants_router, prefix="/api/v1", tags=["Restaurants"])
app.include_router(social_router, prefix="/api/v1/social", tags=["Social"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API - Core Backend"}

