from __future__ import annotations

import argparse
import os
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

import psycopg
from sentence_transformers import SentenceTransformer
from underthesea import word_tokenize

MODEL_NAME = "bkai-foundation-models/vietnamese-bi-encoder"
EXPECTED_DIM = 768
BATCH_SIZE = 64
NORMALIZE_EMBEDDINGS = True


def log(message: str) -> None:
    print(f"[{datetime.now().strftime('%H:%M:%S')}] {message}", flush=True)


def normalize_space(value: Any) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value)).strip()


def segment_vi(value: Any) -> str:
    text = normalize_space(value)
    if not text:
        return ""
    return word_tokenize(text, format="text")


def bool_to_text(value: Any) -> str:
    if value is True:
        return "true"
    if value is False:
        return "false"
    return ""


def get_database_url() -> str:
    url = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if not url:
        raise ValueError("Thiếu DATABASE_URL hoặc SUPABASE_DB_URL")
    return url


def pgvector_literal(vector: List[float]) -> str:
    return "[" + ",".join(f"{x:.8f}" for x in vector) + "]"


FETCH_SQL = """
with tag_names as (
    select
        rt.res_id,
        string_agg(t.name, ', ' order by t.name) as restaurant_tags
    from public.res_tags rt
    join public.tags t on t.id = rt.tag_id
    group by rt.res_id
)
select
    d.id,
    d.res_id,
    d.name,
    d.is_vegetarian,
    r.name as restaurant_name,
    coalesce(tag_names.restaurant_tags, '') as restaurant_tags
from public.dishes d
left join public.restaurants r on r.id = d.res_id
left join tag_names on tag_names.res_id = d.res_id
where d.id is not null
order by d.name nulls last, d.id
"""


def build_dish_text(row: Dict[str, Any]) -> str:
    dish_name = segment_vi(row.get("name"))
    is_vegetarian = bool_to_text(row.get("is_vegetarian"))
    restaurant_name = segment_vi(row.get("restaurant_name"))
    restaurant_tags = segment_vi(row.get("restaurant_tags"))

    fields = [
        f"dish_name: {dish_name}" if dish_name else "",
        f"is_vegetarian: {is_vegetarian}" if is_vegetarian else "",
        f"restaurant_name: {restaurant_name}" if restaurant_name else "",
        f"restaurant_tags: {restaurant_tags}" if restaurant_tags else "",
    ]
    return " | ".join(x for x in fields if x)


def fetch_dishes(conn: psycopg.Connection, limit: Optional[int]) -> List[Dict[str, Any]]:
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
    update public.dishes
    set embedding_vector = %s::vector
    where id = %s
    """
    with conn.cursor() as cur:
        for i, item in enumerate(payloads, start=1):
            cur.execute(sql, (pgvector_literal(item["embedding_vector"]), item["id"]))
            if i == 1 or i % 50 == 0 or i == len(payloads):
                log(f"Đã update dishes.embedding_vector: {i}/{len(payloads)}")
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

    dim = len(model.encode(["bánh_mì ngon"], normalize_embeddings=NORMALIZE_EMBEDDINGS)[0])
    log(f"Embedding dimension = {dim}")
    if dim != EXPECTED_DIM:
        raise ValueError(f"Model trả ra {dim} chiều, không đúng chuẩn {EXPECTED_DIM}")

    with psycopg.connect(db_url, autocommit=False, prepare_threshold=None) as conn:
        rows = fetch_dishes(conn, args.limit)
        log(f"Tổng dishes cần xử lý: {len(rows)}")
        texts = []
        payloads = []
        for i, row in enumerate(rows, start=1):
            text = build_dish_text(row)
            texts.append(text)
            payloads.append({"id": row["id"], "embedding_text": text})
            if i == 1 or i % 200 == 0 or i == len(rows):
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

    log("=== HOÀN TẤT DISH EMBEDDINGS CLEAN ===")


if __name__ == "__main__":
    main()
