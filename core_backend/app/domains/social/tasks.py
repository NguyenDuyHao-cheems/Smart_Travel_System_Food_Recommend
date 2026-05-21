import httpx
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.core.config import settings
from app.domains.social.models import SocialStory

def cleanup_expired_stories():
    """
    Background task to clean up expired stories from both Supabase Storage and Database.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        print("Missing Supabase credentials, skipping story cleanup.")
        return

    db: Session = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        # Find all stories where expires_at is in the past
        expired_stories = db.query(SocialStory).filter(SocialStory.expires_at < now).all()
        
        if not expired_stories:
            return

        print(f"Found {len(expired_stories)} expired stories to clean up.")

        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json"
        }

        with httpx.Client() as client:
            for story in expired_stories:
                try:
                    # Extract the relative file path from public URL
                    # Format: https://<supabase_url>/storage/v1/object/public/social_media/stories/file.jpg
                    parts = story.media_url.split('/public/social_media/')
                    if len(parts) == 2:
                        file_path = parts[1]
                        delete_url = f"{settings.SUPABASE_URL}/storage/v1/object/social_media/{file_path}"
                        
                        # Request Supabase to delete the file
                        res = client.delete(delete_url, headers=headers)
                        if res.status_code in (200, 204):
                            print(f"Successfully deleted {file_path} from Supabase.")
                        else:
                            print(f"Failed to delete {file_path}. Status: {res.status_code}, Response: {res.text}")
                    
                    # Delete the database record
                    db.delete(story)
                    db.commit()
                except Exception as e:
                    print(f"Error processing story {story.id}: {e}")
                    db.rollback()
                    
    except Exception as e:
        print(f"Critical error in story cleanup task: {e}")
    finally:
        db.close()
