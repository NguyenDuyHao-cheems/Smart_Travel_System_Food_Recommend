import asyncio
import sys
import os

# Add core_backend to sys.path so we can import services
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = current_dir
while project_root:
    if os.path.isdir(os.path.join(project_root, "core_backend")):
        break
    parent = os.path.dirname(project_root)
    if parent == project_root:
        break
    project_root = parent

sys.path.insert(0, os.path.join(project_root, "core_backend"))

print("Project root:", project_root)
print("sys.path:", sys.path[:2])

async def run_tests():
    from app.services.grpc_client import GRPCServiceClient
    
    # Connect to the local gRPC port (must be running first)
    client = GRPCServiceClient("localhost:50051")
    
    print("\n--- 1. Testing CheckHealth ---")
    health = await client.check_health()
    print("Health Status:", health)
    
    print("\n--- 2. Testing ExtractIntentAndVectorize ---")
    try:
        intent = await client.extract_intent_and_vectorize("Tôi muốn ăn phở Hà Nội ngon giá rẻ tầm 50k")
        print("Cleaned Query:", intent["cleaned_query"])
        print("Vector shape:", len(intent["vector"]))
    except Exception as e:
        print("Failed:", e)
        
    print("\n--- 3. Testing EmbedText ---")
    try:
        vec = await client.embed_text("phở Hà Nội")
        print("Vector shape:", len(vec))
    except Exception as e:
        print("Failed:", e)
        
    print("\n--- 4. Testing GetLightFMRecommendations ---")
    try:
        recs = await client.get_lightfm_recommendations("user_123", limit=5)
        print("Recommendations:", recs)
    except Exception as e:
        print("Failed:", e)
        
    print("\n--- 5. Testing RankCandidates ---")
    try:
        candidates = [
            {"res_id": "res_1", "rating": 450, "sentiment_score": 80, "distance_m": 500, "price_normalized": 30, "review_count": 100, "similarity_score": 50, "is_open": 1},
            {"res_id": "res_2", "rating": 480, "sentiment_score": 90, "distance_m": 1200, "price_normalized": 50, "review_count": 250, "similarity_score": 90, "is_open": 1},
            {"res_id": "res_3", "rating": 380, "sentiment_score": 40, "distance_m": 200, "price_normalized": 10, "review_count": 10, "similarity_score": 10, "is_open": 0},
        ]
        ranked = await client.rank_candidates("user_123", candidates, top_k=2)
        print("Ranked IDs:", ranked["ranked_ids"])
        print("Scores:", ranked["scores"])
    except Exception as e:
        print("Failed:", e)

    await client.close()
    print("\nTests completed.")

if __name__ == "__main__":
    try:
        # Reconfigure stdout to support UTF-8 characters (like Vietnamese) in Windows terminals
        sys.stdout.reconfigure(encoding='utf-8')
    except AttributeError:
        pass  # sys.stdout might not support reconfigure in some environments
    asyncio.run(run_tests())
