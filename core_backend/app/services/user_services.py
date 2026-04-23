from supabase import create_client
import os

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_user_allergies(user_id: str):
    try:
        response = supabase.table("user_onboardings") \
            .select("allergies") \
            .eq("user_id", user_id) \
            .limit(1) \
            .execute()

        if response.data:
            allergies = response.data[0].get("allergies", [])

            if isinstance(allergies, str):
                allergies = [a.strip() for a in allergies.split(",")]

            return allergies or []

        return []

    except Exception as e:
        print(f"[ERROR] get_user_allergies: {e}")
        return []