import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL) # type: ignore
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
