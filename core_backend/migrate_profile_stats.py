import json
import traceback
import sys

try:
    from sqlalchemy.orm.attributes import flag_modified
    from app.core.database import SessionLocal
    from app.domains.users.models import UserAccount

    def migrate_stats():
        db = SessionLocal()
        try:
            users = db.query(UserAccount).all()
            updated_count = 0
            
            for user in users:
                stats = user.profile_stats
                
                if isinstance(stats, str):
                    try:
                        parsed_stats = json.loads(stats)
                        user.profile_stats = parsed_stats
                        flag_modified(user, "profile_stats")
                        updated_count += 1
                    except json.JSONDecodeError:
                        print(f"Lỗi parse JSON cho user {user.id}")
                        
            if updated_count > 0:
                db.commit()
                print(f"Đã chuyển đổi thành công {updated_count} records từ String JSON sang định dạng JSONB Object.")
            else:
                print("Không tìm thấy user nào cần chuyển đổi (tất cả đã ở dạng JSONB object).")
                
        finally:
            db.close()

    if __name__ == "__main__":
        migrate_stats()
except Exception as e:
    with open("crash.log", "w") as f:
        f.write(traceback.format_exc())
    print("Crashed! See crash.log")
    sys.exit(1)
