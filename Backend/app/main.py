from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.database import check_db_connection
from app.domains.recomendations.router import router as recomendations_router

app = FastAPI(title="Smart Travel System - Food Recommend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register domain routers
app.include_router(recomendations_router)

@app.get("/api/health")
def get_health_status():
    db_status = check_db_connection()
    return {
        "status": "online",
        "backend": True,
        "database": db_status,
        "message": "Both backend and database systems reached" if db_status else "Backend ok, Database connection failed"
    }

@app.get("/")
def read_root():
    return {"message": "Welcome to Smart Travel System Food Recommend API"}