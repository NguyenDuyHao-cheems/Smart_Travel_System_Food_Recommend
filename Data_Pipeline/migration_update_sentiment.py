"""
migration_update_sentiment.py
Cap nhat sentiment_score cho restaurants.

- Nhung quang da co diem (sentiment_score != 0) -> giu nguyen
- Nhung quang chua co diem (NULL hoac = 0) -> set = 5.0 (neutral)

Cach dung:
    python Data_Pipeline/migration_update_sentiment.py
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

    cur.execute("""
        UPDATE restaurants
        SET sentiment_score = 5.0
        WHERE sentiment_score IS NULL OR sentiment_score = 0.0
    """)
    updated = cur.rowcount

    cur.execute("SELECT COUNT(*) FROM restaurants WHERE sentiment_score != 0.0")
    has_score = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM restaurants WHERE sentiment_score = 0.0 OR sentiment_score IS NULL")
    no_score = cur.fetchone()[0]

    cur.execute("""
        UPDATE restaurants
        SET sentiment_score = 5.0
        WHERE sentiment_score IS NULL OR sentiment_score = 0.0
    """)
    updated2 = cur.rowcount

    print(f"[OK] Updated: {updated} rows")
    print(f"     Has sentiment_score: {has_score}")
    print(f"     Still neutral (0/Null): {no_score}")

    conn.close()
    print("\n[DONE]")


if __name__ == "__main__":
    main()