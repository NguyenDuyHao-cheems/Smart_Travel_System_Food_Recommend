import requests
import json
import uuid

# Configuration
API_URL = "http://localhost:8000/api/v1/users/interaction"

def test_anonymous_interaction():
    print("Testing Anonymous User Interaction...")
    payload = {
        "anonymous_id": f"guest-{uuid.uuid4().hex[:8]}",
        "res_id": "76d7cf4b-d0c2-5ec7-bc94-074d891974d1",
        "action_type": "VIEW_RESTAURANT",
        "duration_sec": 45,
        "metadata": {"source": "homepage", "device": "mobile"}
    }
    
    try:
        response = requests.post(API_URL, json=payload)
        print(f"Status Code: {response.status_code}")
        print("Response:", json.dumps(response.json(), indent=2))
        
        if response.status_code == 200:
            print("[SUCCESS] Interaction logged.")
        else:
            print("[FAILED] Failed to log interaction.")
    except Exception as e:
        print(f"[ERROR] Error connecting to server: {e}")
        print("Make sure the backend is running at localhost:8000")

if __name__ == "__main__":
    test_anonymous_interaction()
