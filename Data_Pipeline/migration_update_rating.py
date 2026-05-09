"""
migration_update_rating.py
Cap nhat rating_avg cho restaurants.

- Nhung quang da co diem (rating_avg > 0) -> giu nguyen
- Nhung quang chua co diem (NULL hoac = 0) -> set = 5.0 (neutral, thang 0-10)

Cach dung:
    python Data_Pipeline/migration_update_rating.py
"""

import os, io, sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL not found")
    sys.exit(1)


def main():
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    # Dem truoc update
    cur.execute('''
        SELECT
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE rating_avg IS NOT NULL AND rating_avg > 0) as has_rating,
            COUNT(*) FILTER (WHERE rating_avg IS NULL OR rating_avg = 0) as no_rating
        FROM restaurants
    ''')
    r = cur.fetchone()
    print(f"Total restaurants: {r[0]}")
    print(f"  Da co diem:     {r[1]} (range 0-10, giu nguyen)")
    print(f"  Chua co diem:   {r[2]} (se set = 5.0)")

    # Update nhung quang chua co rating
    cur.execute('''
        UPDATE restaurants
        SET rating_avg = 5.0
        WHERE rating_avg IS NULL OR rating_avg = 0.0
    ''')
    updated = cur.rowcount

    # Verify sau update
    cur.execute('SELECT MIN(rating_avg), MAX(rating_avg), AVG(rating_avg) FROM restaurants')
    r2 = cur.fetchone()
    print(f"\n[Sau update]")
    print(f"  Min: {r2[0]:.2f}, Max: {r2[1]:.2f}, Avg: {r2[2]:.4f}")
    print(f"  Rows updated: {updated}")

    conn.close()
    print("\n[DONE]")


if __name__ == "__main__":
    main()