import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

REVIEWS_FILE = "reviews.json"
OUTPUT_JSON = "restaurants_top_reviews.json"
OUTPUT_CSV = "restaurants_top_reviews.csv"
TOP_K = 3
MIN_TEXT_LEN = 20


def log(message: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"[{ts}] {message}", flush=True)


def load_reviews(path: str) -> List[Dict[str, Any]]:
    if not Path(path).exists():
        raise FileNotFoundError(f"Không tìm thấy {path}")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError(f"{path} phải là JSON array")
    return data


def normalize_text(text: Any) -> str:
    if text is None:
        return ""
    return " ".join(str(text).split()).strip()


def review_score_key(review: Dict[str, Any]):
    rating = review.get("rating")
    try:
        rating_val = float(rating) if rating is not None else 0.0
    except Exception:
        rating_val = 0.0

    text = normalize_text(review.get("text"))
    images = review.get("review_images") or []
    image_count = len(images) if isinstance(images, list) else 0

    return (rating_val, len(text), image_count)


def select_top_reviews(reviews, top_k=TOP_K):
    valid = []
    for review in reviews:
        text = normalize_text(review.get("text"))
        if not text:
            continue
        valid.append(review)

    valid.sort(key=review_score_key, reverse=True)

    top_reviews = []
    for review in valid[:top_k]:
        top_reviews.append({
            "review_id": review.get("id"),
            "reviewer_name": review.get("reviewer_name"),
            "rating": review.get("rating"),
            "text": normalize_text(review.get("text")),
            "date": review.get("date"),
        })
    return top_reviews


def build_top_reviews(groups: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    output = []
    total = len(groups)

    for idx, group in enumerate(groups, start=1):
        res_id = group.get("res_id")
        reviews = group.get("reviews") or []
        if not isinstance(reviews, list):
            reviews = []

        top_reviews = select_top_reviews(reviews)

        output.append({
            "res_id": res_id,
            "top_reviews": top_reviews,
        })

        if idx == 1 or idx == total or idx % 100 == 0:
            log(f"Đang xử lý: {idx}/{total} | res_id={res_id} | top_reviews={len(top_reviews)}")

    return output


def save_json(path: str, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def save_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    with open(path, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["res_id", "top_reviews"])
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "res_id": row.get("res_id"),
                "top_reviews": json.dumps(row.get("top_reviews") or [], ensure_ascii=False),
            })


def main() -> None:
    log(f"Đọc dữ liệu từ {REVIEWS_FILE} ...")
    groups = load_reviews(REVIEWS_FILE)
    log(f"Tổng số quán trong reviews.json: {len(groups)}")

    log("Bắt đầu chọn top review cho từng quán ...")
    rows = build_top_reviews(groups)

    save_json(OUTPUT_JSON, rows)
    save_csv(OUTPUT_CSV, rows)

    non_empty = sum(1 for row in rows if row.get("top_reviews"))
    log(f"Đã tạo {OUTPUT_JSON}")
    log(f"Đã tạo {OUTPUT_CSV}")
    log(f"Số quán có top_reviews: {non_empty}/{len(rows)}")


if __name__ == "__main__":
    main()
