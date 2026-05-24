import os
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Load env from core_backend
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("Error: DATABASE_URL not found!")
    exit(1)

engine = create_engine(DATABASE_URL)

def update_schema():
    queries = [
        "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS price_min INTEGER;",
        "ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS price_max INTEGER;",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON social_notifications (user_id) WHERE is_read = FALSE;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS cover_url VARCHAR;",
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_stats JSON;",
        """CREATE TABLE IF NOT EXISTS social_posts (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            content TEXT,
            mood VARCHAR,
            media_urls JSONB,
            res_id VARCHAR REFERENCES restaurants(id),
            parent_id VARCHAR REFERENCES social_posts(id),
            likes_count INTEGER DEFAULT 0,
            replies_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );""",
        """CREATE TABLE IF NOT EXISTS social_follows (
            follower_id VARCHAR NOT NULL REFERENCES users(id),
            following_id VARCHAR NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (follower_id, following_id)
        );""",
        """CREATE TABLE IF NOT EXISTS social_likes (
            user_id VARCHAR NOT NULL REFERENCES users(id),
            post_id VARCHAR NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (user_id, post_id)
        );""",
        """CREATE TABLE IF NOT EXISTS social_notifications (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            actor_id VARCHAR NOT NULL REFERENCES users(id),
            type VARCHAR NOT NULL,
            post_id VARCHAR REFERENCES social_posts(id) ON DELETE CASCADE,
            is_read BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );""",
        """CREATE TABLE IF NOT EXISTS social_stories (
            id VARCHAR PRIMARY KEY,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            media_url VARCHAR NOT NULL,
            overlays JSONB DEFAULT '[]'::jsonb,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            views_count INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );""",
        """CREATE TABLE IF NOT EXISTS social_story_views (
            id SERIAL PRIMARY KEY,
            story_id VARCHAR NOT NULL REFERENCES social_stories(id) ON DELETE CASCADE,
            user_id VARCHAR NOT NULL REFERENCES users(id),
            reaction VARCHAR,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );""",
        """CREATE TABLE IF NOT EXISTS friend_requests (
            id UUID PRIMARY KEY,
            sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            status VARCHAR NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT uq_sender_receiver UNIQUE (sender_id, receiver_id)
        );"""
    ]
    
    with engine.connect() as conn:
        for query in queries:
            try:
                print(f"Executing: {query}")
                conn.execute(text(query))
                conn.commit()
                print("Success!")
            except Exception as e:
                print(f"Failed or already exists: {e}")

if __name__ == "__main__":
    update_schema()
