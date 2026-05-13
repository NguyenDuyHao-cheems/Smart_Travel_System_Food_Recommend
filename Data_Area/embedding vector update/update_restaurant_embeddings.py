from __future__ import annotations

import argparse, json, os, re, unicodedata
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg
from sentence_transformers import SentenceTransformer
from underthesea import word_tokenize

MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"
EXPECTED_DIM = 768
BATCH_SIZE = 64
NORMALIZE_EMBEDDINGS = True
TOP_DISH_CANDIDATES = 60
TOP_DISHES_LIMIT = 10
TOP_REVIEWS_LIMIT = 3

TRASH_DISH_PATTERNS = [
    r"^\d+\s*(người|nguoi)$",
    r"^\d+\s*(phần|phan)$",
    r"^\d+$",
    r"^size\s*[sml]$",
    r"^(thêm|them)$",
    r"^(combo|set)\s*\d*$",
]


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def normalize_space(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def no_accent(value: Any) -> str:
    text = normalize_space(value).lower()
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return text.replace("đ", "d")


def segment_vi(value: Any) -> str:
    text = normalize_space(value)
    if not text:
        return ""
    return word_tokenize(text, format="text")


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not url:
        raise ValueError("Thiếu DATABASE_URL hoặc SUPABASE_DB_URL")
    return url


def pgvector_literal(vector: List[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vector) + "]"


def list_from_db(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [normalize_space(x) for x in value if normalize_space(x)]
    if isinstance(value, str):
        if value.startswith("{") and value.endswith("}"):
            raw = value.strip("{}")
            return [normalize_space(x.strip('"')) for x in raw.split(",") if normalize_space(x)]
        return [normalize_space(x) for x in value.split(",") if normalize_space(x)]
    return []


def parse_top_reviews(value: Any) -> List[str]:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except Exception:
            text = normalize_space(value)
            return [text] if text else []
    if not isinstance(value, list):
        return []

    texts: List[str] = []
    for review in value[:TOP_REVIEWS_LIMIT]:
        if isinstance(review, dict):
            text = normalize_space(review.get("text"))
            if text:
                texts.append(text)
    return texts


def is_trash_dish_name(name: str) -> bool:
    norm = no_accent(name)
    if len(norm) < 4:
        return True
    return any(re.search(pattern, norm) for pattern in TRASH_DISH_PATTERNS)


def dish_usefulness_score(name: str) -> int:
    norm = no_accent(name)
    score = min(len(norm) // 10, 5)
    useful_terms = [
        "bun", "com", "pho", "mi", "hu tieu", "banh mi", "pizza", "burger",
        "ga", "bo", "heo", "tom", "cua", "muc", "hai san", "sushi", "sashimi",
        "salad", "lau", "nuong", "chay", "banh", "tra sua", "ca phe",
        "bong lan", "banh kem", "dimsum", "pasta",
    ]
    weak_terms = ["coca", "pepsi", "sprite", "nuoc suoi", "khuyen mai"]
    score += sum(5 for term in useful_terms if term in norm)
    score -= sum(4 for term in weak_terms if term in norm)
    return score


def clean_top_dishes(value: Any) -> str:
    dishes = list_from_db(value)
    seen = set()
    cleaned = []
    for name in dishes:
        if is_trash_dish_name(name):
            continue
        key = no_accent(name)
        if key in seen:
            continue
        seen.add(key)
        cleaned.append(name)
    cleaned.sort(key=dish_usefulness_score, reverse=True)
    return segment_vi(", ".join(cleaned[:TOP_DISHES_LIMIT]))


def clean_tags(value: Any) -> str:
    tags = list_from_db(value)
    seen = set()
    cleaned = []
    for tag in tags:
        key = no_accent(tag)
        if not key or key in seen:
            continue
        seen.add(key)
        cleaned.append(tag)
    return segment_vi(", ".join(cleaned))


FETCH_SQL = f"""
with dish_candidates as (
    select
        d.res_id,
        array_agg(d.name order by coalesce(d.price, 0) desc, length(d.name) desc, d.name) as dish_names
    from (
        select
            id,
            res_id,
            name,
            price,
            row_number() over (
                partition by res_id
                order by coalesce(price, 0) desc, length(name) desc, name
            ) as rn
        from public.dishes
        where name is not null
    ) d
    where d.rn <= {TOP_DISH_CANDIDATES}
    group by d.res_id
),
tag_names as (
    select
        rt.res_id,
        array_agg(t.name order by t.name) as tags
    from public.res_tags rt
    join public.tags t on t.id = rt.tag_id
    group by rt.res_id
)
select
    r.id,
    r.name,
    r.price_range,
    r.top_reviews,
    coalesce(tag_names.tags, array[]::text[]) as tags,
    coalesce(dish_candidates.dish_names, array[]::text[]) as top_dishes
from public.restaurants r
left join tag_names on tag_names.res_id = r.id
left join dish_candidates on dish_candidates.res_id = r.id
where r.id is not null
order by r.name nulls last, r.id
"""


def build_restaurant_text(row: Dict[str, Any]) -> str:
    restaurant_name = segment_vi(row.get("name"))
    price_range = normalize_space(row.get("price_range"))
    tags = clean_tags(row.get("tags"))
    top_reviews = " | ".join(segment_vi(text) for text in parse_top_reviews(row.get("top_reviews")) if segment_vi(text))
    top_dishes = clean_top_dishes(row.get("top_dishes"))

    fields = [
        f"restaurant_name: {restaurant_name}" if restaurant_name else "",
        f"price_range: {price_range}" if price_range else "",
        f"tags: {tags}" if tags else "",
        f"top_reviews: {top_reviews}" if top_reviews else "",
        f"top_dishes: {top_dishes}" if top_dishes else "",
    ]
    return " | ".join(x for x in fields if x)


def fetch_restaurants(conn: psycopg.Connection, limit: Optional[int]) -> List[Dict[str, Any]]:
    sql = FETCH_SQL
    if limit is not None:
        sql += f"\nlimit {int(limit)}"
    with conn.cursor(row_factory=psycopg.rows.dict_row) as cur:
        cur.execute(sql)
        return list(cur.fetchall())


def update_embeddings(conn: psycopg.Connection, payloads: List[Dict[str, Any]], dry_run: bool) -> None:
    if dry_run:
        log("DRY RUN: không update database")
        return
    sql = """
    update public.restaurants
    set embedding_vector = %s::vector
    where id = %s
    """
    with conn.cursor() as cur:
        for i, item in enumerate(payloads, start=1):
            cur.execute(sql, (pgvector_literal(item["embedding_vector"]), item["id"]))
            if i == 1 or i % 50 == 0 or i == len(payloads):
                log(f"Đã update restaurants.embedding_vector: {i}/{len(payloads)}")
    conn.commit()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--show-text", action="store_true")
    args = parser.parse_args()

    db_url = get_database_url()
    log(f"Đang load model: {MODEL_NAME}")
    model = SentenceTransformer(MODEL_NAME)

    dim = len(model.encode(["món_ăn ngon"], normalize_embeddings=NORMALIZE_EMBEDDINGS)[0])
    log(f"Embedding dimension = {dim}")
    if dim != EXPECTED_DIM:
        raise ValueError(f"Model trả ra {dim} chiều, không đúng chuẩn {EXPECTED_DIM}")

    with psycopg.connect(db_url, autocommit=False, prepare_threshold=None) as conn:
        rows = fetch_restaurants(conn, args.limit)
        log(f"Tổng restaurants cần xử lý: {len(rows)}")
        payloads = []
        texts = []
        for i, row in enumerate(rows, start=1):
            text = build_restaurant_text(row)
            texts.append(text)
            payloads.append({"id": row["id"], "embedding_text": text})
            if i == 1 or i % 100 == 0 or i == len(rows):
                log(f"Build text: {i}/{len(rows)}")

        if args.show_text:
            log("=== TEXT MẪU ===")
            for item in payloads[:5]:
                log(f"{item['id']} => {item['embedding_text'][:900]}")

        vectors = model.encode(
            texts,
            batch_size=BATCH_SIZE,
            show_progress_bar=True,
            normalize_embeddings=NORMALIZE_EMBEDDINGS,
            convert_to_numpy=True,
        )
        for item, vector in zip(payloads, vectors):
            item["embedding_vector"] = vector.tolist()

        update_embeddings(conn, payloads, args.dry_run)

    log("=== HOÀN TẤT RESTAURANT EMBEDDINGS CLEAN ===")


if __name__ == "__main__":
    main()
