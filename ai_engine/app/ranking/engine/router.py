from fastapi import APIRouter, HTTPException
from .service import RankingService
from .Logic.schemas import RankRequest, RankResponse

# Khởi tạo router và service
router = APIRouter()
ranking_service = RankingService()

@router.post("ml/rank", response_model=RankResponse)
async def ml_ranking_endpoint(payload: RankRequest):
    """
    Endpoint chính để nhận danh sách món ăn và thực hiện xếp hạng bằng AI.
    """
    try:
        # 1. Chuyển đổi dữ liệu từ Pydantic Model sang List[Dict]
        # model_dump() sẽ giúp xử lý các alias (res_id -> id, vector -> embedding_vector)
        # để logic bên trong service chạy đồng bộ.
        candidate_dicts = [c.model_dump() for c in payload.candidates]

        # 2. Gọi Nhạc trưởng (RankingService) để thực hiện Pipeline xếp hạng
        results = await ranking_service.execute_ranking_pipeline(
            user_id=payload.user_id,
            user_vector=payload.user_vector,
            candidates=candidate_dicts,
            user_allergies=payload.user_allergies
        )

        # 3. Trả về kết quả cho Core Backend
        return RankResponse(
            status="success", 
            ranked_candidates=results
        )

    except Exception as e:
        # Log lỗi nếu có vấn đề trong quá trình xử lý
        print(f"❌ Error in ml_ranking_endpoint: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Ranking Error: {str(e)}")