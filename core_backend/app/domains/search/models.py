import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, String, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB

from app.core.database import Base

class SearchSession(Base):
    __tablename__ = "search_sessions"

    id = Column(
        PG_UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    user_id = Column(PG_UUID(as_uuid=True), nullable=True, index=True)
    query = Column(String, nullable=False)
    lat = Column(Float, nullable=True)
    lng = Column(Float, nullable=True)
    budget = Column(Integer, nullable=True)
    results_json = Column(JSONB, nullable=True)
    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
