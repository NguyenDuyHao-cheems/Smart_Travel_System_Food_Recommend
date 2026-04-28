from .repository import TaggingRepository
from .rules import TagRuleEngine
from .schemas import TaggingResponse, RestaurantTagResult


class RestaurantTaggingService:
    def __init__(
        self,
        repository: TaggingRepository,
        rule_engine: TagRuleEngine,
    ):
        self._repo = repository
        self._rule_engine = rule_engine

    def tag_all_restaurants(self) -> TaggingResponse:
        restaurants = self._repo.get_restaurants()

        if not restaurants:
            return TaggingResponse(processed=0, skipped=0, results=[])

        results = []
        skipped = 0

        for restaurant in restaurants:
            res_id = str(getattr(restaurant, "id", ""))

            if not res_id:
                skipped += 1
                continue

            dishes = self._repo.get_dishes_by_res_id(res_id)
            reviews = self._repo.get_reviews_by_res_id(res_id)

            tags = self._rule_engine.infer_tags(restaurant, dishes, reviews)

            if not tags:
                skipped += 1
                continue

            for tag_name in tags:
                tag = self._repo.get_or_create_tag(tag_name)
                self._repo.attach_tag(res_id=res_id, tag_id=str(tag.id))

            results.append(
                RestaurantTagResult(
                    res_id=res_id,
                    restaurant_name=getattr(restaurant, "name", None),
                    tags=tags,
                    status="tagged",
                )
            )

        self._repo.commit()

        return TaggingResponse(
            processed=len(results),
            skipped=skipped,
            results=results,
        )
