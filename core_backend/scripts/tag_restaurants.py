from app.core.database import SessionLocal
from app.domains.tagging.repository import TaggingRepository
from app.domains.tagging.rules import TagRuleEngine
from app.domains.tagging.service import RestaurantTaggingService

db = SessionLocal()

try:
    service = RestaurantTaggingService(
        repository=TaggingRepository(db),
        rule_engine=TagRuleEngine(),
    )
    result = service.tag_all_restaurants()
    print(result.model_dump())
finally:
    db.close()
