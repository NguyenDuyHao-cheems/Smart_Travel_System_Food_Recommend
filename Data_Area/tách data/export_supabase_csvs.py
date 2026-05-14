import csv
import json
import re
import unicodedata
import uuid
from collections import defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


DATA_INPUTS = "data.json"
REVIEWS_INPUT = "reviews.json"

OUTPUT_DIR = "supabase_csv_export"
LOG_FILE = "export_supabase_csv_debug.log"

PROGRESS_EVERY = 100
TIMEZONE_DEFAULT = "Asia/Ho_Chi_Minh"
SKIP_ORPHAN_ROWS = True

TAG_NAMESPACE = uuid.UUID("db4e6853-9b31-4ba2-99a9-93449fd341e8")
RES_TAG_NAMESPACE = uuid.UUID("8bfb18de-a72a-4e56-8e18-1327e3aa4b45")
REVIEW_NAMESPACE = uuid.UUID("1f9cd585-8bd6-4528-b181-015ca1812719")

SCHEMAS = {
    "restaurants": [
        "id", "name", "address", "lat", "lng", "price_range", "opening_hours",
        "image_url", "rating_avg", "sentiment_score", "top_review_text",
        "is_active", "embedding_vector", "total_reviews", "open_time",
        "close_time", "timezone", "is_open_now", "google_maps_url",
    ],
    "dishes": [
        "id", "res_id", "name", "price", "image_url", "ingredients",
        "allergens", "is_vegetarian", "embedding_vector",
    ],
    "reviews": [
        "id", "res_id", "reviewer_name", "rating", "text", "date",
    ],
    "tags": [
        "id", "name",
    ],
    "res_tags": [
        "id", "res_id", "tag_id",
    ],
}

OUTPUT_FILES = {
    "restaurants": "restaurants.csv",
    "tags": "tags.csv",
    "dishes": "dishes.csv",
    "reviews": "reviews.csv",
    "res_tags": "res_tags.csv",
}

TAG_GROUPS = {
    "Loại món": [
        "trà sữa", "cà phê", "đồ uống", "ăn vặt", "cơm", "bún", "phở", "mì",
        "cháo", "gà", "bò", "heo", "hải sản", "lẩu", "nướng", "pizza",
        "burger", "sushi", "healthy", "tráng miệng", "món chay", "đồ cay",
    ],
    "Ngữ cảnh": ["ăn sáng", "ăn trưa", "ăn tối", "mở khuya"],
    "Mức giá / chất lượng": ["giá rẻ", "tầm trung", "cao cấp", "đánh giá cao", "nhiều đánh giá"],
}

TAG_GROUP_LOOKUP: Dict[str, str] = {}
for group_name, tag_names in TAG_GROUPS.items():
    for tag_name in tag_names:
        TAG_GROUP_LOOKUP[tag_name] = group_name

KEYWORD_RULES: Dict[str, List[str]] = {
    "trà sữa": ["tra sua", "milk tea", "gong cha", "tocotoco", "koi", "phuc long"],
    "cà phê": ["ca phe", "coffee", "espresso", "latte", "cappuccino", "americano"],
    "đồ uống": ["nuoc", "drink", "smoothie", "juice", "tea", "tra dao", "matcha", "soda"],
    "ăn vặt": ["an vat", "snack", "banh trang", "ca vien", "xuc xich", "tokbokki", "kho ga", "vien chien"],
    "cơm": ["com ", "com tam", "com ga", "com chien", "fried rice", "rice"],
    "bún": ["bun ", "bun bo", "bun rieu", "bun thit", "bun mam", "bun cha"],
    "phở": ["pho ", "pho bo", "pho ga"],
    "mì": ["mi ", "my ", "mì ", "noodle", "ramen", "udon", "mi cay", "spaghetti", "pasta"],
    "cháo": ["chao ", "porridge"],
    "gà": ["ga ", "chicken", "ga ran", "ga nuong", "ga sot"],
    "bò": ["bo ", "beef", "steak", "bo ne"],
    "heo": ["heo ", "pork", "suon", "thit heo", "ba chi"],
    "hải sản": ["hai san", "seafood", "tom", "cua", "muc", "oc ", "ca hoi"],
    "lẩu": ["lau ", "hotpot"],
    "nướng": ["nuong", "bbq", "barbecue", "grill"],
    "pizza": ["pizza"],
    "burger": ["burger"],
    "sushi": ["sushi", "sashimi", "maki"],
    "healthy": ["healthy", "salad", "eat clean", "granola", "uc ga", "smoothie bowl"],
    "tráng miệng": ["trang mieng", "dessert", "banh", "che", "kem", "flan", "tiramisu", "croffle"],
    "món chay": ["chay", "vegetarian", "vegan"],
    "đồ cay": ["cay", "spicy", "mala", "mi cay", "tokbokki"],
}


def reset_log() -> None:
    Path(LOG_FILE).write_text("", encoding="utf-8")


def log(message: str) -> None:
    ts = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    line = f"[{ts}] {message}"
    print(line, flush=True)
    with open(LOG_FILE, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def log_progress(prefix: str, index: int, total: int, extra: str = "") -> None:
    if total <= 0:
        return
    if index == 1 or index == total or index % PROGRESS_EVERY == 0:
        pct = (index / total) * 100
        suffix = f" | {extra}" if extra else ""
        log(f"{prefix}: {index}/{total} ({pct:.1f}%){suffix}")


def normalize_space(text: Any) -> str:
    if text is None:
        return ""
    return re.sub(r"\s+", " ", str(text)).strip()


def no_accent(text: Any) -> str:
    text = normalize_space(text).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d")


def stable_uuid(namespace: uuid.UUID, key: str) -> str:
    return str(uuid.uuid5(namespace, key))


def pick_data_file() -> str:
    for file_name in DATA_INPUTS:
        if Path(file_name).exists():
            return file_name
    raise FileNotFoundError(f"Không tìm thấy file dữ liệu. Cần một trong các file: {', '.join(DATA_INPUTS)}")


def load_json_file(path: str) -> Any:
    log(f"Đọc JSON: {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    log(f"Đọc xong JSON: {path}")
    return data


def as_number(value: Any) -> Any:
    if value is None or value == "":
        return None
    try:
        number = float(value)
        return int(number) if number.is_integer() else number
    except Exception:
        return value


def csv_json(value: Any) -> Optional[str]:
    if value is None:
        return None
    if value == "":
        return None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        if stripped.startswith("[") or stripped.startswith("{"):
            return stripped
        return stripped
    if isinstance(value, (list, dict)):
        return json.dumps(value, ensure_ascii=False)
    return json.dumps(value, ensure_ascii=False)


def csv_vector(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, list):
        return "[" + ",".join(str(x) for x in value) + "]"
    return str(value)


def csv_bool(value: Any) -> Optional[str]:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return "true" if value else "false"
    text = normalize_space(value).lower()
    if text in {"true", "t", "1", "yes", "y"}:
        return "true"
    if text in {"false", "f", "0", "no", "n"}:
        return "false"
    return text


def csv_number(value: Any) -> Optional[str]:
    value = as_number(value)
    if value is None or value == "":
        return None
    return str(value)


def csv_text(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = normalize_space(value)
    return text if text else None


def csv_time(value: Any) -> Optional[str]:
    text = normalize_space(value)
    if not text:
        return None

    m = re.fullmatch(r"(\d{1,2}):(\d{2})(?::(\d{2}))?", text)
    if not m:
        log(f"WARNING time không đúng format, để trống: {text}")
        return None

    h = int(m.group(1))
    minute = int(m.group(2))
    sec = int(m.group(3) or 0)

    if not (0 <= h <= 23 and 0 <= minute <= 59 and 0 <= sec <= 59):
        log(f"WARNING time ngoài range, để trống: {text}")
        return None

    return f"{h:02d}:{minute:02d}:{sec:02d}"


def csv_timestamp(value: Any) -> Optional[str]:
    text = normalize_space(value)
    if not text:
        return None

    candidates = [text, text.replace("Z", "+00:00")]

    for candidate in candidates:
        try:
            dt = datetime.fromisoformat(candidate)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            pass

    patterns = [
        (r"^(\d{1,2})/(\d{1,2})/(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$", "dmy"),
        (r"^(\d{4})-(\d{1,2})-(\d{1,2})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$", "ymd"),
    ]

    for pattern, mode in patterns:
        m = re.match(pattern, text)
        if not m:
            continue
        try:
            if mode == "dmy":
                day = int(m.group(1))
                month = int(m.group(2))
                year = int(m.group(3))
                hour = int(m.group(4) or 0)
                minute = int(m.group(5) or 0)
                sec = int(m.group(6) or 0)
            else:
                year = int(m.group(1))
                month = int(m.group(2))
                day = int(m.group(3))
                hour = int(m.group(4) or 0)
                minute = int(m.group(5) or 0)
                sec = int(m.group(6) or 0)

            dt = datetime(year, month, day, hour, minute, sec)
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            break

    log(f"WARNING date không parse được, để trống: {text}")
    return None


def google_maps_url_from_lat_lng(lat: Any, lng: Any) -> Optional[str]:
    if lat is None or lng is None or lat == "" or lng == "":
        return None
    return f"https://www.google.com/maps?q={lat},{lng}"


def exact_row(table: str, row_dict: Dict[str, Any]) -> Dict[str, Any]:
    expected = SCHEMAS[table]
    missing = [col for col in expected if col not in row_dict]
    extra = [col for col in row_dict if col not in expected]
    if missing:
        raise ValueError(f"{table}: row_dict thiếu cột {missing}")
    if extra:
        raise ValueError(f"{table}: row_dict dư cột {extra}")
    return {col: row_dict[col] for col in expected}


def validate_rows(table: str, rows: List[Dict[str, Any]]) -> None:
    expected = SCHEMAS[table]
    for i, row in enumerate(rows, start=2):
        keys = list(row.keys())
        if keys != expected:
            raise ValueError(f"{table}: row {i} sai header/order. expected={expected}, actual={keys}")
    log(f"{table}: validate OK, rows={len(rows)}, fields={len(expected)}")


def check_duplicate_pk(table: str, rows: List[Dict[str, Any]]) -> None:
    seen = set()
    dup = []
    for row in rows:
        pk = row.get("id")
        if not pk:
            log(f"WARNING {table}: có row thiếu id")
            continue
        if pk in seen:
            dup.append(pk)
        seen.add(pk)
    if dup:
        log(f"WARNING {table}: duplicate id count={len(dup)}, sample={dup[:5]}")
    else:
        log(f"{table}: id không trùng")


def parse_price_range(value: Any) -> Tuple[Optional[int], Optional[int]]:
    text = normalize_space(value)
    if not text:
        return None, None
    nums = re.findall(r"[\d\.,]+", text)
    cleaned = []
    for raw in nums[:2]:
        try:
            cleaned.append(int(raw.replace(".", "").replace(",", "")))
        except Exception:
            pass
    if len(cleaned) >= 2:
        return cleaned[0], cleaned[1]
    if len(cleaned) == 1:
        return cleaned[0], cleaned[0]
    return None, None


def parse_hhmm_minutes(value: Any) -> Optional[int]:
    text = normalize_space(value)
    m = re.fullmatch(r"(\d{1,2}):(\d{2})(?::\d{2})?", text)
    if not m:
        return None
    return int(m.group(1)) * 60 + int(m.group(2))


def collect_text_pool(item: Dict[str, Any]) -> str:
    restaurant = item.get("restaurant") or {}
    dishes = item.get("dishes") or []
    parts = [
        restaurant.get("name"),
        restaurant.get("address"),
        restaurant.get("price_range"),
        restaurant.get("top_review_text"),
    ]
    for dish in dishes[:30]:
        if isinstance(dish, dict):
            parts.append(dish.get("name"))
    return no_accent(" ".join(normalize_space(x) for x in parts if x))


def infer_tag_scores(item: Dict[str, Any]) -> Dict[str, float]:
    restaurant = item.get("restaurant") or {}
    text_pool = collect_text_pool(item)
    scores: Dict[str, float] = defaultdict(float)

    for tag_name, keywords in KEYWORD_RULES.items():
        hit_count = sum(1 for keyword in keywords if keyword in text_pool)
        if hit_count > 0:
            scores[tag_name] += 2.0 + min(hit_count * 0.7, 2.1)

    _, max_price = parse_price_range(restaurant.get("price_range"))
    if max_price is not None:
        if max_price <= 50000:
            scores["giá rẻ"] += 3.0
        elif max_price <= 150000:
            scores["tầm trung"] += 3.0
        else:
            scores["cao cấp"] += 3.0

    open_m = parse_hhmm_minutes(restaurant.get("open_time"))
    close_m = parse_hhmm_minutes(restaurant.get("close_time"))

    if open_m is not None and open_m <= 7 * 60:
        scores["ăn sáng"] += 2.0
    elif open_m is not None and open_m <= 11 * 60:
        scores["ăn trưa"] += 1.0

    if close_m is not None:
        if close_m >= 20 * 60 or close_m < 3 * 60:
            scores["ăn tối"] += 2.0
        if close_m >= 23 * 60 or close_m < 5 * 60:
            scores["mở khuya"] += 3.0

    try:
        rating_avg = float(restaurant.get("rating_avg")) if restaurant.get("rating_avg") is not None else None
    except Exception:
        rating_avg = None

    try:
        total_reviews = int(float(restaurant.get("total_reviews"))) if restaurant.get("total_reviews") is not None else None
    except Exception:
        total_reviews = None

    if rating_avg is not None:
        if rating_avg >= 4.5:
            scores["đánh giá cao"] += 3.0
        elif rating_avg >= 4.2:
            scores["đánh giá cao"] += 1.8

    if total_reviews is not None:
        if total_reviews >= 300:
            scores["nhiều đánh giá"] += 3.2
        elif total_reviews >= 100:
            scores["nhiều đánh giá"] += 2.2

    restaurant_name = no_accent(restaurant.get("name"))
    for tag_name in list(scores.keys()):
        if no_accent(tag_name) in restaurant_name:
            scores[tag_name] += 0.8

    return dict(scores)


def choose_best_tags(scores: Dict[str, float], max_tags: int = 6) -> List[str]:
    if not scores:
        return []

    by_group: Dict[str, List[Tuple[str, float]]] = defaultdict(list)
    for tag_name, score in scores.items():
        by_group[TAG_GROUP_LOOKUP.get(tag_name, "Khác")].append((tag_name, score))

    for group_name in by_group:
        by_group[group_name].sort(key=lambda x: (-x[1], x[0]))

    chosen: List[Tuple[str, float]] = []
    for group_name in ["Loại món", "Ngữ cảnh", "Mức giá / chất lượng"]:
        if by_group.get(group_name):
            chosen.append(by_group[group_name][0])

    chosen_names = {tag for tag, _ in chosen}
    remaining = [(tag, score) for tag, score in scores.items() if tag not in chosen_names]
    remaining.sort(key=lambda x: (-x[1], x[0]))

    for tag_name, score in remaining:
        if len(chosen) >= max_tags:
            break
        chosen.append((tag_name, score))

    chosen = [x for x in chosen if x[1] >= 1.5][:max_tags]
    order = ["Loại món", "Ngữ cảnh", "Mức giá / chất lượng", "Khác"]
    chosen.sort(key=lambda x: (order.index(TAG_GROUP_LOOKUP.get(x[0], "Khác")), -x[1], x[0]))
    return [tag for tag, _ in chosen]


def extract_restaurants(data_items: List[dict]) -> List[Dict[str, Any]]:
    log("Bắt đầu tách restaurants")
    rows: List[Dict[str, Any]] = []
    total = len(data_items)

    for idx, item in enumerate(data_items, start=1):
        r = item.get("restaurant") or {}
        lat = r.get("lat")
        lng = r.get("lng")

        rows.append(exact_row("restaurants", {
            "id": csv_text(r.get("id")),
            "name": csv_text(r.get("name")),
            "address": csv_text(r.get("address")),
            "lat": csv_number(lat),
            "lng": csv_number(lng),
            "price_range": csv_text(r.get("price_range")),
            "opening_hours": csv_text(r.get("opening_hours")),
            "image_url": csv_text(r.get("image_url")),
            "rating_avg": csv_number(r.get("rating_avg")),
            "sentiment_score": csv_number(r.get("sentiment_score")),
            "top_review_text": csv_text(r.get("top_review_text")),
            "is_active": csv_bool(r.get("is_active")),
            "embedding_vector": csv_vector(r.get("embedding_vector")),
            "total_reviews": csv_number(r.get("total_reviews")),
            "open_time": csv_time(r.get("open_time")),
            "close_time": csv_time(r.get("close_time")),
            "timezone": csv_text(r.get("timezone") or TIMEZONE_DEFAULT),
            "is_open_now": csv_bool(r.get("is_open_now")),
            "google_maps_url": csv_text(r.get("google_maps_url") or google_maps_url_from_lat_lng(lat, lng)),
        }))

        log_progress("restaurants", idx, total)

    validate_rows("restaurants", rows)
    check_duplicate_pk("restaurants", rows)
    return rows


def extract_dishes(data_items: List[dict], restaurant_ids: set) -> List[Dict[str, Any]]:
    log("Bắt đầu tách dishes")
    rows: List[Dict[str, Any]] = []
    seen_ids = set()
    skipped_duplicate = 0
    skipped_orphan = 0
    total = len(data_items)

    for idx, item in enumerate(data_items, start=1):
        for d in item.get("dishes") or []:
            if not isinstance(d, dict):
                continue

            dish_id = csv_text(d.get("id"))
            res_id = csv_text(d.get("res_id"))

            if dish_id in seen_ids:
                skipped_duplicate += 1
                continue

            if SKIP_ORPHAN_ROWS and res_id not in restaurant_ids:
                skipped_orphan += 1
                continue

            seen_ids.add(dish_id)
            rows.append(exact_row("dishes", {
                "id": dish_id,
                "res_id": res_id,
                "name": csv_text(d.get("name")),
                "price": csv_number(d.get("price")),
                "image_url": csv_text(d.get("image_url")),
                "ingredients": csv_json(d.get("ingredients")),
                "allergens": csv_json(d.get("allergens")),
                "is_vegetarian": csv_bool(d.get("is_vegetarian")),
                "embedding_vector": csv_vector(d.get("embedding_vector")),
            }))

        log_progress("dishes", idx, total, extra=f"rows={len(rows)}, dup_skip={skipped_duplicate}, orphan_skip={skipped_orphan}")

    validate_rows("dishes", rows)
    check_duplicate_pk("dishes", rows)
    log(f"dishes: skipped_duplicate={skipped_duplicate}, skipped_orphan={skipped_orphan}")
    return rows


def get_reviews_source(data_items: List[dict]) -> Tuple[str, List[dict]]:
    if Path(REVIEWS_INPUT).exists():
        reviews_data = load_json_file(REVIEWS_INPUT)
        if not isinstance(reviews_data, list):
            raise ValueError(f"{REVIEWS_INPUT} phải là JSON array")
        return REVIEWS_INPUT, reviews_data
    return "embedded_data", data_items


def review_id_or_generate(review: Dict[str, Any], res_id: str) -> str:
    if review.get("id"):
        return review.get("id")
    key = "|".join([
        res_id or "",
        normalize_space(review.get("reviewer_name")),
        normalize_space(review.get("date")),
        normalize_space(review.get("review_title")),
        normalize_space(review.get("text")),
    ])
    return stable_uuid(REVIEW_NAMESPACE, f"review:{key}")


def extract_reviews(data_items: List[dict], restaurant_ids: set) -> List[Dict[str, Any]]:
    source_name, source = get_reviews_source(data_items)
    log(f"Bắt đầu tách reviews từ nguồn: {source_name}")

    rows: List[Dict[str, Any]] = []
    seen_ids = set()
    skipped_duplicate = 0
    skipped_orphan = 0
    total = len(source)

    for idx, group in enumerate(source, start=1):
        if source_name == "embedded_data":
            group_res_id = csv_text((group.get("restaurant") or {}).get("id"))
            reviews = group.get("reviews") or []
        else:
            group_res_id = csv_text(group.get("res_id"))
            reviews = group.get("reviews") or []

        for review in reviews:
            if not isinstance(review, dict):
                continue

            res_id = csv_text(review.get("res_id") or group_res_id)
            review_id = csv_text(review_id_or_generate(review, res_id))

            if review_id in seen_ids:
                skipped_duplicate += 1
                continue

            if SKIP_ORPHAN_ROWS and res_id not in restaurant_ids:
                skipped_orphan += 1
                continue

            seen_ids.add(review_id)
            rows.append(exact_row("reviews", {
                "id": review_id,
                "res_id": res_id,
                "reviewer_name": csv_text(review.get("reviewer_name")),
                "rating": csv_number(review.get("rating")),
                "text": csv_text(review.get("text")),
                "date": csv_timestamp(review.get("date")),
            }))

        log_progress("reviews", idx, total, extra=f"rows={len(rows)}, dup_skip={skipped_duplicate}, orphan_skip={skipped_orphan}")

    validate_rows("reviews", rows)
    check_duplicate_pk("reviews", rows)
    log(f"reviews: skipped_duplicate={skipped_duplicate}, skipped_orphan={skipped_orphan}")
    return rows


def build_tags_and_res_tags(data_items: List[dict], restaurant_ids: set) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    log("Bắt đầu sinh tags và res_tags")

    tag_name_to_id: Dict[str, str] = {}
    tags_rows: List[Dict[str, Any]] = []
    res_tags_rows: List[Dict[str, Any]] = []
    seen_pairs = set()
    skipped_orphan = 0
    total = len(data_items)

    for idx, item in enumerate(data_items, start=1):
        restaurant = item.get("restaurant") or {}
        res_id = csv_text(restaurant.get("id"))

        if not res_id or (SKIP_ORPHAN_ROWS and res_id not in restaurant_ids):
            skipped_orphan += 1
            log_progress("tags/res_tags", idx, total)
            continue

        for tag_name in choose_best_tags(infer_tag_scores(item)):
            if tag_name not in tag_name_to_id:
                tag_id = stable_uuid(TAG_NAMESPACE, f"tag:{no_accent(tag_name)}")
                tag_name_to_id[tag_name] = tag_id
                tags_rows.append(exact_row("tags", {"id": tag_id, "name": tag_name}))

            tag_id = tag_name_to_id[tag_name]
            pair = (res_id, tag_id)

            if pair in seen_pairs:
                continue

            seen_pairs.add(pair)
            res_tags_rows.append(exact_row("res_tags", {
                "id": stable_uuid(RES_TAG_NAMESPACE, f"res_tag:{res_id}:{tag_id}"),
                "res_id": res_id,
                "tag_id": tag_id,
            }))

        log_progress("tags/res_tags", idx, total, extra=f"tags={len(tags_rows)}, res_tags={len(res_tags_rows)}")

    tags_rows.sort(key=lambda x: (str(x["name"]).lower(), str(x["id"])))
    res_tags_rows.sort(key=lambda x: (str(x["res_id"]), str(x["tag_id"])))

    validate_rows("tags", tags_rows)
    validate_rows("res_tags", res_tags_rows)
    check_duplicate_pk("tags", tags_rows)
    check_duplicate_pk("res_tags", res_tags_rows)
    log(f"tags/res_tags: skipped_orphan={skipped_orphan}")
    return tags_rows, res_tags_rows


def write_csv(table: str, rows: List[Dict[str, Any]]) -> None:
    headers = SCHEMAS[table]
    out_dir = Path(OUTPUT_DIR)
    out_dir.mkdir(exist_ok=True)
    path = out_dir / OUTPUT_FILES[table]

    log(f"{table}: bắt đầu ghi CSV {path}")

    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=headers,
            extrasaction="raise",
            quoting=csv.QUOTE_MINIMAL,
            lineterminator="\n",
        )
        writer.writeheader()
        for idx, row in enumerate(rows, start=1):
            clean_row = {col: ("" if row.get(col) is None else row.get(col)) for col in headers}
            writer.writerow(clean_row)
            log_progress(f"{table}: ghi CSV", idx, len(rows))

    log(f"{table}: đã ghi {path} | rows={len(rows)} | fields={len(headers)}")


def write_import_order_file() -> None:
    out_dir = Path(OUTPUT_DIR)
    out_dir.mkdir(exist_ok=True)
    content = """Import order for Supabase:
1. restaurants.csv
2. tags.csv
3. dishes.csv
4. reviews.csv
5. res_tags.csv

Notes:
- CSV headers exactly match database columns.
- Datetime format: YYYY-MM-DD HH:mm:ss
- Empty cells are intended as NULL.
- JSONB fields are JSON strings.
"""
    (out_dir / "IMPORT_ORDER.txt").write_text(content, encoding="utf-8")


def main() -> None:
    reset_log()
    log("=== BẮT ĐẦU EXPORT CSV CHO SUPABASE ===")
    log("Mục tiêu: CSV đúng header DB, không dư/không thiếu cột")
    log("Supabase import: dùng file CSV trong thư mục supabase_csv_export")
    log(f"SKIP_ORPHAN_ROWS={SKIP_ORPHAN_ROWS}")

    data_file = pick_data_file()
    data_items = load_json_file(data_file)

    if not isinstance(data_items, list):
        raise ValueError(f"{data_file} phải là JSON array")

    log(f"Input data: {data_file}")
    log(f"Số restaurant blocks: {len(data_items)}")
    if Path(REVIEWS_INPUT).exists():
        log(f"Input reviews: {REVIEWS_INPUT}")
    else:
        log("Không thấy reviews.json, reviews sẽ lấy từ data nếu có")

    restaurants_rows = extract_restaurants(data_items)
    restaurant_ids = {row["id"] for row in restaurants_rows if row.get("id")}
    log(f"restaurant_ids hợp lệ: {len(restaurant_ids)}")

    dishes_rows = extract_dishes(data_items, restaurant_ids)
    reviews_rows = extract_reviews(data_items, restaurant_ids)
    tags_rows, res_tags_rows = build_tags_and_res_tags(data_items, restaurant_ids)

    table_rows = {
        "restaurants": restaurants_rows,
        "tags": tags_rows,
        "dishes": dishes_rows,
        "reviews": reviews_rows,
        "res_tags": res_tags_rows,
    }

    for table in ["restaurants", "tags", "dishes", "reviews", "res_tags"]:
        log(f"{table}: final schema = {SCHEMAS[table]}")
        validate_rows(table, table_rows[table])
        write_csv(table, table_rows[table])

    write_import_order_file()

    log("=== HOÀN TẤT EXPORT CSV CHO SUPABASE ===")
    for table in ["restaurants", "tags", "dishes", "reviews", "res_tags"]:
        log(f"{table}: {OUTPUT_DIR}/{OUTPUT_FILES[table]} | rows={len(table_rows[table])} | fields={len(SCHEMAS[table])}")
    log(f"File hướng dẫn import: {OUTPUT_DIR}/IMPORT_ORDER.txt")
    log(f"Log debug: {LOG_FILE}")


if __name__ == "__main__":
    main()
