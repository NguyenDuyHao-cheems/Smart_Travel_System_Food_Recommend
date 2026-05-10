"""
migration_add_vegetarian_flag_user.py
Thêm cột is_vegetarian vào bảng user_onboardings và backfill data từ dietary_restrictions.

Cách dùng:
    python Data_Pipeline/migration_add_vegetarian_flag_user.py
"""

import json, os, re
from pathlib import Path
import sys

# Fix stdout encoding for Windows
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

import psycopg2

ROOT = Path(__file__).resolve().parent.parent

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / "core_backend" / ".env")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("[ERR] DATABASE_URL not found")
    sys.exit(1)

def main():
    print("[DB] Connecting...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = True
    print("[OK]\n")

    cur = conn.cursor()

    # Step 1: Check if column exists
    cur.execute("""
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'user_onboardings' AND column_name = 'is_vegetarian'
    """)
    col_exists = cur.fetchone() is not None

    if not col_exists:
        print("[1/2] Adding column is_vegetarian to user_onboardings...")
        cur.execute("""
            ALTER TABLE user_onboardings
            ADD COLUMN is_vegetarian BOOLEAN DEFAULT FALSE
        """)
        print("  -> Column added\n")
    else:
        print("[1/2] Column is_vegetarian already exists in user_onboardings, skipping ADD\n")

    # Step 2: Backfill data from dietary_restrictions
    print("[2/2] Backfilling is_vegetarian from dietary_restrictions...")
    
    # Update is_vegetarian = TRUE if dietary_restrictions contains 'vegetarian' or 'vegan'
    # PostgreSQL JSONB containment operator @>
    cur.execute("""
        UPDATE user_onboardings
        SET is_vegetarian = TRUE
        WHERE dietary_restrictions @> '["vegetarian"]'::jsonb
           OR dietary_restrictions @> '["vegan"]'::jsonb
           OR dietary_restrictions @> '["chay"]'::jsonb
    """)
    updated = cur.rowcount
    print(f"  -> Backfilled {updated} rows\n")

    cur.close()
    conn.close()
    print("[DONE] Migration for user_onboardings complete!")

if __name__ == "__main__":
    main()
