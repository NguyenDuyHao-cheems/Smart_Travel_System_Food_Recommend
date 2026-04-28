import uuid
from sqlalchemy.orm import Session

from app.domains.ranking.models import RestaurantModel, TagModel, RestaurantTagModel
from app.domains.tagging.models import DishModel, ReviewModel


class TaggingRepository:
    def __init__(self, db: Session):
        self._db = db

    def get_restaurants(self) -> list[RestaurantModel]:
        return self._db.query(RestaurantModel).all()

    def get_dishes_by_res_id(self, res_id: str):
        return self._db.query(DishModel).filter(DishModel.res_id == res_id).all()

    def get_reviews_by_res_id(self, res_id: str):
        return self._db.query(ReviewModel).filter(ReviewModel.res_id == res_id).all()


    def get_or_create_tag(self, name: str) -> TagModel:
        tag = self._db.query(TagModel).filter(TagModel.name == name).first()
        if tag:
            return tag

        tag = TagModel(id=str(uuid.uuid4()), name=name)
        self._db.add(tag)
        self._db.flush()
        return tag

    def attach_tag(self, res_id: str, tag_id: str) -> None:
        exists = (
            self._db.query(RestaurantTagModel)
            .filter(
                RestaurantTagModel.res_id == res_id,
                RestaurantTagModel.tag_id == tag_id,
            )
            .first()
        )
        if exists:
            return

        self._db.add(
            RestaurantTagModel(
                id=str(uuid.uuid4()),
                res_id=res_id,
                tag_id=tag_id,
            )
        )

    def commit(self) -> None:
        self._db.commit()

