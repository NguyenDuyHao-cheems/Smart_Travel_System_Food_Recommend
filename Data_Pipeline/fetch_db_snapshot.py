"""
fetch_db_snapshot.py
Fetch mẫu dữ liệu thực tế từ Supabase PostgreSQL (tối đa 5 hàng mỗi bảng).
Lưu vào Data_Pipeline/db_snapshot/ dưới dạng JSON.

Cách dùng:
    python Data_Pipeline/fetch_db_snapshot.py
"""

import json, os, sys
from pathlib import Path
from datetime import datetime

import psycopg2
from psycopg2.extras import RealDictCursor

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "Data_Pipeline" / "db_snapshot"

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL not found in .env")
    sys.exit(1)

TABLES = [
    "restaurants",
    "dishes",
    "users",
    "user_onboardings",
    "tags",
    "res_tags",
    "user_interactions",
    "reviews",
]

def fetch_table(conn, table_name: str, limit: int = 5):
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute(f'SELECT * FROM "{table_name}" LIMIT {limit}')
        rows = cur.fetchall()
        cur.close()
        return [dict(r) for r in rows]
    except Exception as e:
        print(f"  [WARN] {table_name}: {e}")
        return None

def clean_for_json(obj):
    """Convert pgvector and other non-serializable types to serializable."""
    if obj is None:
        return None
    if isinstance(obj, (list, tuple)):
        return [clean_for_json(v) for v in obj]
    if isinstance(obj, dict):
        return {k: clean_for_json(v) for k, v in obj.items()}
    if isinstance(obj, (int, float, str, bool)):
        return obj
    # pgvector.Vector, uuid, datetime, bytes → string
    return str(obj)

def main():
    print(f"[DB] Connecting to Supabase...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    print(f"[OK] Connected\n")

    snapshot_meta = {
        "fetched_at": datetime.now().isoformat(),
        "database_url_host": DATABASE_URL.split("@")[1].split(":")[0] if "@" in DATABASE_URL else "unknown",
        "tables": {}
    }

    for table in TABLES:
        print(f"[>] Fetching {table}...")
        rows = fetch_table(conn, table)
        if rows is None:
            snapshot_meta["tables"][table] = {"error": "fetch failed", "count": 0}
            continue

        snapshot_meta["tables"][table] = {
            "count": len(rows),
            "columns": list(rows[0].keys()) if rows else []
        }

        out_file = OUT_DIR / f"{table}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(clean_for_json(rows), f, ensure_ascii=False, indent=2)
        print(f"  -> saved {len(rows)} rows -> {out_file.name}")

    conn.close()

    meta_file = OUT_DIR / "_snapshot_meta.json"
    with open(meta_file, "w", encoding="utf-8") as f:
        json.dump(snapshot_meta, f, ensure_ascii=False, indent=2)

    print(f"\n[DONE] Snapshot saved to {OUT_DIR}")

if __name__ == "__main__":
    main()