from typing import Iterable


class TagRuleEngine:
    def infer_tags(
        self,
        restaurant: object,
        dishes: Iterable[object],
        reviews: Iterable[object],
    ) -> list[str]:
        # TODO: Replace/augment this rule-based classifier with a trained or
        # AI-assisted classifier once labeled restaurant-tag data is available.
        tags: set[str] = set()
        dishes = list(dishes)
        reviews = list(reviews)

        name = self._lower(getattr(restaurant, "name", ""))
        price_range = self._lower(getattr(restaurant, "price_range", ""))
        rating = getattr(restaurant, "rating_avg", None)
        sentiment = getattr(restaurant, "sentiment_score", None)
        top_review_text = self._lower(getattr(restaurant, "top_review_text", ""))

        dish_names = " ".join(self._lower(getattr(d, "name", "")) for d in dishes)
        dish_ingredients = " ".join(
            self._lower(getattr(d, "ingredients", "")) for d in dishes
        )
        dish_allergens = " ".join(
            self._lower(getattr(d, "allergens", "")) for d in dishes
        )
        review_text = " ".join(self._lower(getattr(r, "text", "")) for r in reviews)

        combined_text = " ".join(
            [
                name,
                top_review_text,
                dish_names,
                dish_ingredients,
                dish_allergens,
                review_text,
            ]
        )

        if any(term in combined_text for term in ["mi cay", "mì cay", "cay", "lau thai", "lẩu thái"]):
            tags.add("spicy")

        if any(term in combined_text for term in ["chay", "vegetarian", "rau"]):
            tags.add("vegetarian")
        if any(
            str(getattr(d, "is_vegetarian", "")).lower() in {"true", "1", "yes"}
            for d in dishes
        ):
            tags.add("vegetarian")

        if any(term in combined_text for term in ["hai san", "hải sản", "tom", "tôm", "muc", "mực", "cua"]):
            tags.add("seafood")

        if any(term in combined_text for term in ["tra sua", "trà sữa", "che", "chè", "bingsu", "ngot", "ngọt"]):
            tags.add("dessert")

        if any(term in combined_text for term in ["com", "cơm", "pho", "phở", "bun", "bún", "banh mi", "bánh mì"]):
            tags.add("vietnamese")

        if any(
            term in price_range
            for term in ["20", "30", "40", "50", "cheap", "low", "sinh vien", "sinh viên", "binh dan", "bình dân"]
        ):
            tags.add("budget_friendly")

        if rating is not None and rating >= 4.5:
            tags.add("high_rating")

        if sentiment is not None and sentiment >= 0.7:
            tags.add("positive_reviews")

        if any(
            term in combined_text
            for term in [
                "view",
                "sang",
                "dep",
                "đẹp",
                "check-in",
                "khong gian",
                "không gian",
                "thoang",
                "thoáng",
                "am cung",
                "ấm cúng",
            ]
        ):
            tags.add("good_ambience")

        return self._normalize_min_tags(tags)

    def _normalize_min_tags(self, tags: set[str]) -> list[str]:
        # TODO: Tune fallback tags from real analytics/popularity data instead
        # of static defaults after production data is available.
        fallback_tags = [
            "restaurant",
            "local_food",
            "general",
            "popular",
            "nearby",
        ]

        for tag in fallback_tags:
            if len(tags) >= 3:
                break
            tags.add(tag)

        return sorted(list(tags))[:5]

    @staticmethod
    def _lower(value: object | None) -> str:
        if value is None:
            return ""
        return str(value).lower().strip()
