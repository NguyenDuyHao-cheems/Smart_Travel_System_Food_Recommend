from app.core.database import SessionLocal
from app.domains.ranking.retrieval_service import RetrievalService
from app.services.ai_client import AIServiceClient

import asyncio

async def main():
    ai = AIServiceClient('http://127.0.0.1:8001')
    ai_res = await ai.extract_intent_and_vectorize('Tìm quán bún nước dùng thanh mát')
    print('Vector len:', len(ai_res.vector))
    
    db = SessionLocal()
    svc = RetrievalService(db)
    try:
        res = svc.get_candidates(tags=[], budget=30000, user_location=[10.7636, 106.5983], radius=2.0, query_vector=ai_res.vector)
        print('Found:', len(res))
    except Exception as e:
        import traceback
        traceback.print_exc()

asyncio.run(main())
