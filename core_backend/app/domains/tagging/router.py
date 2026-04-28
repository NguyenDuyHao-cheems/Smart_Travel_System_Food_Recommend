from functools import lru_cache
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_db
from .repository import TaggingRepository
from .rules import TagRuleEngine
from .service import RestaurantTaggingService
from .schemas import TaggingResponse

router = APIRouter()


@lru_cache(maxsize=1)
def get_tag_rule_engine() -> TagRuleEngine:
    return TagRuleEngine()


def get_tagging_service(
    db: Session = Depends(get_db),
    rule_engine: TagRuleEngine = Depends(get_tag_rule_engine),
) -> RestaurantTaggingService:
    repository = TaggingRepository(db)
    return RestaurantTaggingService(repository, rule_engine)


@router.post("/restaurants/tag-all", response_model=TaggingResponse)
def tag_all_restaurants(
    service: RestaurantTaggingService = Depends(get_tagging_service),
):
    return service.tag_all_restaurants()
