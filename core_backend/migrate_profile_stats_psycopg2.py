import os
import json
import psycopg2
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL").replace(":6543", ":5432")

def migrate():
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT id, profile_stats FROM users WHERE profile_stats IS NOT NULL;")
            users = cur.fetchall()
            
            updated_count = 0
            for user_id, profile_stats in users:
                if isinstance(profile_stats, str):
                    try:
                        parsed = json.loads(profile_stats)
                        cur.execute(
                            "UPDATE users SET profile_stats = %s WHERE id = %s",
                            (json.dumps(parsed), user_id)
                        )
                        updated_count += 1
                    except json.JSONDecodeError:
                        print(f"Failed to parse JSON for user {user_id}")
            
            conn.commit()
            print(f"Successfully converted {updated_count} records from String JSON to JSONB Object.")
    except Exception as e:
        print(f"Error: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
