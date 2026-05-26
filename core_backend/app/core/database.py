import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv
import sys
is_testing = "pytest" in sys.modules or os.getenv("TESTING") == "1"
load_dotenv(override=not is_testing)

DATABASE_URL = os.getenv("DATABASE_URL")

from sqlalchemy.pool import NullPool

if DATABASE_URL and DATABASE_URL.startswith("sqlite"):
    engine = create_engine(DATABASE_URL, poolclass=NullPool)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=1800,
    )
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
class Base(DeclarativeBase):
    pass

def check_db_connection():
    try:
        if not DATABASE_URL:
            print("Database Connection Error: DATABASE_URL is not set!")
            return False
        
        # Log a masked version of the URL for debugging
        masked_url = DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else "INVALID URL"
        print(f"Attempting to connect to database at: ...@{masked_url}")
        
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
            connection.commit() # Ensure connection is valid
        return True
    except Exception as e:
        print(f"Database Connection Error: {type(e).__name__}: {e}")
        return False
