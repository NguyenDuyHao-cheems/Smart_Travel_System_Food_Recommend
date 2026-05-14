from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from .schema import RestaurantDetailResponse
from .service import RestaurantService

router = APIRouter()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/restaurants/{id}", response_model=RestaurantDetailResponse)
async def get_restaurant_detail(id: str, db: Session = Depends(get_db)):
    """
    Lấy thông tin chi tiết của một nhà hàng bao gồm danh sách món ăn.
    """
    return await RestaurantService.get_restaurant_detail(db, id)
