from app.core.database import SessionLocal
from sqlalchemy import text
db = SessionLocal()
res = db.execute(text("SELECT regexp_replace(' 65,000đ', '\D', '', 'g')")).scalar()
print('Result:', res)
