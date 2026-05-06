from app.core.database import SessionLocal
from app.domains.ranking.retrieval_service import RetrievalService

db = SessionLocal()
svc = RetrievalService(db)
try:
    res = svc.get_candidates(tags=[], budget=30000, user_location=[10.7636, 106.5983], radius=2.0, query_vector=[0.1]*773)
    print('Found:', len(res))
except Exception as e:
    import traceback
    traceback.print_exc()
