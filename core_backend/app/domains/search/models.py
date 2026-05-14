import uuid
from sqlalchemy import Column, String, Float, Integer, DateTime, func, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from app.core.database import Base

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(String, nullable=True, index=True)
    query = Column(Text, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    budget = Column(Integer, nullable=True)
    results_json = Column(JSONB, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
