"""
Add review-based sentiment columns and normalize restaurant sentiment scale.

Usage:
    python Data_Pipeline/migration_add_review_sentiment.py
"""

import io
import os
import sys
from pathlib import Path

import psycopg2
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URI")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL/DB_URI not found")
    sys.exit(1)


def main() -> None:
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    cur = conn.cursor()

    statements = [
        """
        ALTER TABLE reviews
        ADD COLUMN IF NOT EXISTS sentiment_label varchar,
        ADD COLUMN IF NOT EXISTS sentiment_score double precision,
        ADD COLUMN IF NOT EXISTS sentiment_confidence double precision,
        ADD COLUMN IF NOT EXISTS sentiment_model varchar,
        ADD COLUMN IF NOT EXISTS sentiment_analyzed_at timestamptz
        """,
        """
        ALTER TABLE restaurants
        ADD COLUMN IF NOT EXISTS positive_review_count int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS neutral_review_count int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS negative_review_count int DEFAULT 0,
        ADD COLUMN IF NOT EXISTS sentiment_updated_at timestamptz
        """,
        """
        UPDATE restaurants
        SET sentiment_score = GREATEST(-1.0, LEAST(1.0, (sentiment_score - 5.0) / 5.0))
        WHERE sentiment_score IS NOT NULL
          AND sentiment_score >= 0.0
          AND sentiment_score <= 10.0
          AND (sentiment_score > 1.0 OR sentiment_score < -1.0)
        """,
    ]

    for stmt in statements:
        cur.execute(stmt)

    cur.close()
    conn.close()
    print("[OK] Review sentiment columns are ready.")


if __name__ == "__main__":
    main()
