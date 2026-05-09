"""
migration_add_vegetarian_flag.py
Thêm cột is_vegetarian vào bảng restaurants và update data cho các quán chay.

Cách dùng:
    python Data_Pipeline/migration_add_vegetarian_flag.py
"""

import json, os, re
from pathlib import Path
import sys

# Fix stdout encoding for Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import psycopg2

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "Data_Pipeline" / "db_snapshot"

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL not found")
    sys.exit(1)

VEGAN_NAME_PATTERNS = [
    r"\bchay\b", r"\bvegan\b", r"\bvegetarian\b", r"\bveggie\b",
    r"\bđồ chay\b", r"\bquán chay\b", r"\bmón chay\b",
    r"\bthuần chay\b", r"\băn chay\b", r"\bcơm chay\b",
]

VEGAN_NAME_EXACT = {
    "annyeong", "tuệ an", "từ đức", "phật pháp", "tịnh đức",
    "nam phương chay", "gom", "lagom", "bread", "bánh mì chay",
    "veggi", "vgreen", "green", "organic", "lương thực",
}


def is_vegan_restaurant(name: str) -> bool:
    name_lower = name.lower()
    for pat in VEGAN_NAME_PATTERNS:
        if re.search(pat, name_lower):
            return True
    for kw in VEGAN_NAME_EXACT:
        if kw in name_lower:
            return True
    return False


def main():
    print("[DB] Connecting...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    print("[OK]\n")

    cur = conn.cursor()

    # Step 1: Check if column exists
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'restaurants' AND column_name = 'is_vegetarian'
    """)
    col_exists = cur.fetchone() is not None

    if not col_exists:
        print("[1/3] Adding column is_vegetarian...")
        cur.execute("""
            ALTER TABLE restaurants
            ADD COLUMN is_vegetarian BOOLEAN DEFAULT FALSE
        """)
        print("  -> Column added\n")
    else:
        print("[1/3] Column is_vegetarian already exists, skipping ADD\n")

    # Step 2: Identify vegan restaurants by name
    print("[2/3] Scanning restaurants for vegan keywords...")
    cur.execute('SELECT id, name FROM restaurants LIMIT 10000')
    rows = cur.fetchall()

    updated = 0
    vegan_restaurants = []
    for row_id, name in rows:
        if is_vegan_restaurant(name):
            vegan_restaurants.append({"id": row_id, "name": name})

    print(f"  -> Found {len(vegan_restaurants)} vegan/vegetarian restaurants:\n")
    for r in vegan_restaurants:
        print(f"     - {r['name']}")

    # Step 3: Update is_vegetarian = TRUE
    if vegan_restaurants:
        print(f"\n[3/3] Updating {len(vegan_restaurants)} rows...")
        vegan_ids = [str(r["id"]) for r in vegan_restaurants]
        placeholders = ",".join(["'" + i.replace("'", "''") + "'" for i in vegan_ids])
        cur.execute(f"""
            UPDATE restaurants
            SET is_vegetarian = TRUE
            WHERE id IN ({placeholders})
        """)
        updated = cur.rowcount
        print(f"  -> Updated {updated} rows\n")
    else:
        print("[3/3] No vegan restaurants found, nothing to update\n")

    # Step 4: Save snapshot
    print("[4/4] Saving updated snapshot...")
    cur.execute('SELECT id, name, is_vegetarian, is_active FROM restaurants LIMIT 100')
    all_rows = cur.fetchall()
    with open(OUT_DIR / "restaurants_updated.json", "w", encoding="utf-8") as f:
        json.dump([{"id": r[0], "name": r[1], "is_vegetarian": r[2], "is_active": r[3]} for r in all_rows], f, ensure_ascii=False, indent=2)
    print(f"  -> Saved to db_snapshot/restaurants_updated.json\n")

    cur.close()
    conn.close()
    print("[DONE] Migration complete!")
    print(f"\nSummary:")
    print(f"  - Vegan restaurants identified: {len(vegan_restaurants)}")
    print(f"  - Rows updated: {updated}")


if __name__ == "__main__":
    main()