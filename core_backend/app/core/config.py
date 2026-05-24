import os
from dotenv import load_dotenv
import sys
is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "1"
load_dotenv(override=not is_testing)

class Settings:
    AI_ENGINE_BASE_URL: str = os.getenv("AI_ENGINE_BASE_URL", "http://localhost:8001")
    ENABLE_GRPC: bool = os.getenv("ENABLE_GRPC", "true").lower() in ("true", "1", "yes")
    AI_ENGINE_GRPC_TARGET: str = os.getenv("AI_ENGINE_GRPC_TARGET", "localhost:50051")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 ngày cho dev
    VECTOR_DIM: int = int(os.getenv("VECTOR_DIM", "768"))
    
    # Supabase (For background tasks)
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

settings = Settings()
