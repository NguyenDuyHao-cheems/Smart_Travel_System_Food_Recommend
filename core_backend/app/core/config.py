import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    AI_ENGINE_BASE_URL: str = os.getenv("AI_ENGINE_BASE_URL", "http://localhost:8001")
    ENABLE_GRPC: bool = os.getenv("ENABLE_GRPC", "true").lower() in ("true", "1", "yes")
    AI_ENGINE_GRPC_TARGET: str = os.getenv("AI_ENGINE_GRPC_TARGET", "localhost:50051")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.environ["SECRET_KEY"]
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 ngày cho dev
    VECTOR_DIM: int = int(os.getenv("VECTOR_DIM", "768"))

settings = Settings()
