import json
import re
import shutil
from pathlib import Path
from typing import Any, Dict, List, Optional

INPUT_FILE = "data.json"
OUTPUT_FILE = "data.cleaned.json"
BACKUP_FILE = "data.before_cleaning.backup.json"

TIMEZONE = "Asia/Ho_Chi_Minh"


def backup_file(src: str, dst: str) -> None:
    src_path = Path(src)
    if src_path.exists() and not Path(dst).exists():
        shutil.copyfile(src, dst)


def load_data(path: str) -> List[Dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} phải là JSON array")
    return data


def save_data(path: str, data: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def normalize_space(text: Optional[str]) -> Optional[str]:
    if text is None:
        return None
    text = re.sub(r"\s+", " ", str(text)).strip()
    return text or None


def normalize_price_range(value: Optional[str]) -> Optional[str]:
    value = normalize_space(value)
    if not value:
        return None

    # Chuẩn hóa dấu gạch nối và khoảng trắng
    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"\s*-\s*", " - ", value)

    # Nếu có dạng "20,000đ - 40,000đ" thì giữ nguyên
    m = re.match(r"^([\d\.,]+)\s*đ?\s*-\s*([\d\.,]+)\s*đ?$", value, re.IGNORECASE)
    if m:
        left = m.group(1).replace(".", ",")
        right = m.group(2).replace(".", ",")
        return f"{left}đ - {right}đ"

    return value


def normalize_opening_hours(value: Optional[str]) -> Optional[str]:
    value = normalize_space(value)
    if not value:
        return None

    value = value.replace("–", "-").replace("—", "-")
    value = re.sub(r"\s*-\s*", " - ", value)

    # Bắt dạng 9:00 - 23:00 hoặc 09:00-23:00
    m = re.search(r"(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})", value)
    if not m:
        return None

    open_raw, close_raw = m.group(1), m.group(2)

    def to_hhmm(t: str) -> str:
        h, m = t.split(":")
        return f"{int(h):02d}:{int(m):02d}"

    return f"{to_hhmm(open_raw)} - {to_hhmm(close_raw)}"


def split_opening_hours(value: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    value = normalize_opening_hours(value)
    if not value:
        return None, None
    left, right = value.split(" - ")
    return left, right


def dedupe_dishes(dishes: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    output = []

    for dish in dishes or []:
        key = (
            dish.get("id"),
            normalize_space(dish.get("name")),
            dish.get("price"),
            dish.get("image_url"),
        )
        if key in seen:
            continue
        seen.add(key)
        output.append(dish)

    return output


def dedupe_reviews(reviews: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    output = []

    for review in reviews or []:
        text = normalize_space(review.get("text"))
        key = (
            normalize_space(review.get("reviewer_name")),
            review.get("rating"),
            text,
            review.get("date"),
        )
        if key in seen:
            continue
        seen.add(key)
        review["text"] = text
        output.append(review)

    return output


def choose_top_review_text(reviews: List[Dict[str, Any]]) -> Optional[str]:
    valid = [r for r in reviews if normalize_space(r.get("text"))]
    if not valid:
        return None
    best = max(
        valid,
        key=lambda r: (
            r.get("rating") or 0,
            len(normalize_space(r.get("text")) or ""),
        ),
    )
    return normalize_space(best.get("text"))


def clean_restaurant_block(restaurant: Dict[str, Any], reviews: List[Dict[str, Any]]) -> Dict[str, Any]:
    restaurant["name"] = normalize_space(restaurant.get("name"))
    restaurant["address"] = normalize_space(restaurant.get("address"))
    restaurant["price_range"] = normalize_price_range(restaurant.get("price_range"))
    restaurant["opening_hours"] = normalize_opening_hours(restaurant.get("opening_hours"))
    restaurant["top_review_text"] = choose_top_review_text(reviews) or restaurant.get("top_review_text")
    restaurant["timezone"] = TIMEZONE

    open_time, close_time = split_opening_hours(restaurant.get("opening_hours"))
    restaurant["open_time"] = open_time
    restaurant["close_time"] = close_time

    return restaurant


def clean_item(item: Dict[str, Any]) -> Dict[str, Any]:
    restaurant = item.get("restaurant") or {}
    dishes = item.get("dishes") or []
    reviews = item.get("reviews") or []

    dishes = dedupe_dishes(dishes)
    reviews = dedupe_reviews(reviews)

    for dish in dishes:
        dish["name"] = normalize_space(dish.get("name"))
        if dish.get("price") is not None:
            try:
                dish["price"] = int(float(dish["price"]))
            except Exception:
                pass

    restaurant = clean_restaurant_block(restaurant, reviews)

    return {
        "restaurant": restaurant,
        "dishes": dishes,
        "reviews": reviews,
    }


def main() -> None:
    backup_file(INPUT_FILE, BACKUP_FILE)
    data = load_data(INPUT_FILE)

    cleaned = []
    seen_restaurants = set()

    for item in data:
        if not isinstance(item, dict):
            continue

        item = clean_item(item)
        restaurant = item.get("restaurant") or {}

        unique_key = restaurant.get("id") or restaurant.get("shopeefood_url") or restaurant.get("foody_url")
        if unique_key in seen_restaurants:
            continue
        seen_restaurants.add(unique_key)

        cleaned.append(item)

    save_data(OUTPUT_FILE, cleaned)

    print(f"Đã backup file gốc vào: {BACKUP_FILE}")
    print(f"Đã ghi file sạch ra: {OUTPUT_FILE}")
    print(f"Tổng số quán sau khi làm sạch: {len(cleaned)}")


if __name__ == "__main__":
    main()
