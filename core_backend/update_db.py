import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env from core_backend
load_dotenv(dotenv_path="c:/Users/ADMIN/Smart_Travel_System_Food_Recommend/core_backend/.env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found!")
    exit(1)

engine = create_engine(DATABASE_URL)

def update_schema():
    queries = [
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;"
    ]
    
    with engine.connect() as conn:
        for query in queries:
            try:
                print(f"Executing: {query}")
                conn.execute(text(query))
                conn.commit()
                print("Success!")
            except Exception as e:
                print(f"Failed or already exists: {e}")

if __name__ == "__main__":
    update_schema()
