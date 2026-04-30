# -*- coding: utf-8 -*-
"""
seed.py
Upload dishes.json lên Supabase PostgreSQL.

Cách dùng:
    python Data_Pipeline/seed.py

Yêu cầu:
    pip install psycopg2-binary sqlalchemy pandas python-dotenv
"""

import json, sys, time, os
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

ROOT = Path(__file__).resolve().parent.parent

# Load .env (chứa DB_URI hoặc từng biến riêng lẻ)
load_dotenv(ROOT / ".env")

DB_URI = os.getenv("DB_URI") or os.getenv("DATABASE_URL")
if not DB_URI:
    print("[ERR] Khong tim thay DB_URI hoac DATABASE_URL trong .env")
    sys.exit(1)

DISHES_PATH = ROOT / "dishes.json"
BATCH_SIZE  = 500   # số row mỗi lần insert

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")

    # --- Kiểm tra sqlalchemy ---
    try:
        from sqlalchemy import create_engine, text
        from sqlalchemy.dialects.postgresql import insert as pg_insert
        import pandas as pd
    except ImportError:
        print("[ERR] Thieu thu vien. Chay: pip install sqlalchemy psycopg2-binary pandas python-dotenv")
        sys.exit(1)

    # --- Đọc JSON ---
    print(f"[READ] {DISHES_PATH}")
    t0 = time.perf_counter()
    with open(DISHES_PATH, encoding="utf-8") as f:
        dishes: list[dict] = json.load(f)
    print(f"[OK]   {len(dishes):,} mon an")

    # --- Chuẩn hóa data cho PostgreSQL ---
    # allergens: list → JSON string (Postgres nhận kiểu json/jsonb)
    # embedding_vector: null → giữ nguyên None (pg sẽ bỏ qua)
    rows = []
    for d in dishes:
        rows.append({
            "id":               d["id"],
            "res_id":           d["res_id"],
            "name":             d.get("name"),
            "price":            d.get("price"),
            "image_url":        d.get("image_url"),
            "ingredients":      d.get("ingredients"),       # None hoặc list/dict → JSONB
            "allergens":        d.get("allergens", []),     # list → JSONB array (không dùng json.dumps)
            "is_vegetarian":    d.get("is_vegetarian"),
            "embedding_vector": None,
        })

    # --- Kết nối DB ---
    print(f"\n[DB]   Ket noi: {DB_URI[:60]}...")
    engine = create_engine(DB_URI, pool_pre_ping=True)
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("[OK]   Ket noi thanh cong!")
    except Exception as e:
        print(f"[ERR]  Ket noi that bai: {e}")
        sys.exit(1)

    # --- Batch insert (ON CONFLICT DO NOTHING để idempotent) ---
    from sqlalchemy import Table, MetaData, Column, String, Integer, Boolean, Text
    from sqlalchemy.dialects.postgresql import JSONB, UUID

    meta    = MetaData()
    meta.reflect(bind=engine, only=["dishes"])
    dishes_table = meta.tables["dishes"]

    total   = len(rows)
    success = 0
    skipped = 0

    print(f"\n[INS]  Bat dau insert {total:,} rows (batch {BATCH_SIZE})...")
    with engine.begin() as conn:
        for i in range(0, total, BATCH_SIZE):
            batch = rows[i : i + BATCH_SIZE]
            stmt  = pg_insert(dishes_table).values(batch)
            stmt  = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={
                    "allergens":     stmt.excluded.allergens,
                    "is_vegetarian": stmt.excluded.is_vegetarian,
                }
            )
            result = conn.execute(stmt)
            success += result.rowcount
            skipped += len(batch) - result.rowcount
            pct = (i + len(batch)) / total * 100
            print(f"  [{pct:5.1f}%]  {i+len(batch):>7,}/{total:,}  "
                  f"inserted={success:,}  skipped={skipped:,}", end="\r")

    elapsed = time.perf_counter() - t0
    print(f"\n\n{'='*52}")
    print(f"  HOAN THANH")
    print(f"{'='*52}")
    print(f"  Tong rows        : {total:>8,}")
    print(f"  Inserted (moi)   : {success:>8,}")
    print(f"  Skipped (da co)  : {skipped:>8,}")
    print(f"  Thoi gian        : {elapsed:.1f}s")
    print(f"{'='*52}")


if __name__ == "__main__":
    main()
