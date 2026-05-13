from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.dependencies import get_db
from .schemas import RestaurantWithDishes
from .service import get_restaurant_with_dishes

router = APIRouter()

@router.get("/{restaurant_id}", response_model=RestaurantWithDishes)
async def read_restaurant(restaurant_id: str, db: Session = Depends(get_db)):
    data = get_restaurant_with_dishes(restaurant_id, db)
    if not data:
        raise HTTPException(status_code=404, detail="Restaurant not found")
    return data
