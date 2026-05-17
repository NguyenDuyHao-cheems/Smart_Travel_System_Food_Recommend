"""
Analyze review sentiment and aggregate it to restaurants.

Usage:
    python Data_Pipeline/update_review_sentiment.py --limit 1000
    python Data_Pipeline/update_review_sentiment.py --all
"""

import argparse
import io
import os
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from dotenv import load_dotenv


ROOT = Path(__file__).resolve().parent.parent
CORE_BACKEND = ROOT / "core_backend"
sys.path.insert(0, str(CORE_BACKEND))

from app.services.review_sentiment import (  # noqa: E402
    SENTIMENT_MODEL_NAME,
    aggregate_restaurant_sentiment,
    analyze_review_sentiment,
)


load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("DB_URI")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL/DB_URI not found")
    sys.exit(1)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update review sentiment scores.")
    parser.add_argument("--limit", type=int, default=1000, help="Max unanalyzed reviews to process.")
    parser.add_argument("--all", action="store_true", help="Re-analyze all reviews.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False
    cur = conn.cursor()

    where_clause = "" if args.all else "WHERE sentiment_score IS NULL"
    limit_clause = "" if args.all else "LIMIT %s"
    params = [] if args.all else [args.limit]

    cur.execute(
        f"""
        SELECT id, res_id, text, rating
        FROM reviews
        {where_clause}
        ORDER BY date DESC NULLS LAST
        {limit_clause}
        """,
        params,
    )
    rows = cur.fetchall()
    print(f"[READ] reviews={len(rows)}")

    touched_restaurants: set[str] = set()
    now = datetime.now(timezone.utc)

    for review_id, res_id, text, rating in rows:
        sentiment = analyze_review_sentiment(text, rating)
        cur.execute(
            """
            UPDATE reviews
            SET sentiment_label = %s,
                sentiment_score = %s,
                sentiment_confidence = %s,
                sentiment_model = %s,
                sentiment_analyzed_at = %s
            WHERE id = %s
            """,
            (
                sentiment.label,
                sentiment.score,
                sentiment.confidence,
                SENTIMENT_MODEL_NAME,
                now,
                review_id,
            ),
        )
        if res_id:
            touched_restaurants.add(str(res_id))

    if touched_restaurants:
        update_restaurant_aggregates(cur, touched_restaurants, now)

    conn.commit()
    cur.close()
    conn.close()
    print(f"[OK] analyzed_reviews={len(rows)} restaurants_updated={len(touched_restaurants)}")


def update_restaurant_aggregates(cur, restaurant_ids: set[str], now: datetime) -> None:
    cur.execute(
        """
        SELECT res_id, sentiment_label, sentiment_score, sentiment_confidence, sentiment_model
        FROM reviews
        WHERE res_id::text = ANY(%s)
          AND sentiment_score IS NOT NULL
        """,
        (list(restaurant_ids),),
    )

    grouped = defaultdict(list)
    for res_id, label, score, confidence, model in cur.fetchall():
        grouped[str(res_id)].append(
            _review_sentiment_like(label, score, confidence, model)
        )

    for res_id, sentiments in grouped.items():
        summary = aggregate_restaurant_sentiment(sentiments)
        cur.execute(
            """
            UPDATE restaurants
            SET sentiment_score = %s,
                positive_review_count = %s,
                neutral_review_count = %s,
                negative_review_count = %s,
                sentiment_updated_at = %s
            WHERE id::text = %s
            """,
            (
                summary.sentiment_score,
                summary.positive_count,
                summary.neutral_count,
                summary.negative_count,
                now,
                res_id,
            ),
        )


def _review_sentiment_like(label, score, confidence, model):
    from app.services.review_sentiment import ReviewSentiment

    return ReviewSentiment(
        label=label or "neutral",
        score=float(score or 0.0),
        confidence=float(confidence or 0.1),
        model=model or SENTIMENT_MODEL_NAME,
    )


if __name__ == "__main__":
    main()
