import asyncio
import logging
import grpc
from . import ai_service_pb2
from . import ai_service_pb2_grpc
from app.nlp.llm_parser import clean_query_with_gemini
from app.nlp.service import generate_mean_pooled_embedding
from app.ranking.lightfm.recommendation_service import recommendation_service as lf_rec_service
from app.ranking.router import get_ranking_service

logger = logging.getLogger(__name__)

class AIServiceServicer(ai_service_pb2_grpc.AIServiceServicer):
    """
    gRPC Servicer for the AI Engine.
    Maps gRPC requests to existing NLP, LightFM, and LambdaMART logic.
    """

    async def CheckHealth(self, request, context):
        try:
            return ai_service_pb2.HealthCheckResponse(
                status="online",
                ai_engine=True,
                model_loaded=True
            )
        except Exception as e:
            logger.error("gRPC CheckHealth failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.HealthCheckResponse(status="offline")

    async def ExtractIntentAndVectorize(self, request, context):
        try:
            # Step 1: LLM clean query
            cleaned_query = await clean_query_with_gemini(request.text)
            print("request.text", request.text)
            print("cleaned_query", cleaned_query)
            # Step 2: Generate PhoBERT embedding
            vector = await asyncio.to_thread(generate_mean_pooled_embedding, cleaned_query)
            return ai_service_pb2.ExtractIntentResponse(
                vector=vector,
                cleaned_query=cleaned_query
            )
        except Exception as e:
            logger.error("gRPC ExtractIntentAndVectorize failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.ExtractIntentResponse()

    async def EmbedText(self, request, context):
        try:
            vector = await asyncio.to_thread(generate_mean_pooled_embedding, request.text)
            return ai_service_pb2.EmbedTextResponse(vector=vector)
        except Exception as e:
            logger.error("gRPC EmbedText failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.EmbedTextResponse()

    async def ReloadRecommendationModel(self, request, context):
        try:
            await asyncio.to_thread(lf_rec_service.load_model)
            return ai_service_pb2.ReloadResponse(message="Model đã được nạp lại thành công!")
        except Exception as e:
            logger.error("gRPC ReloadRecommendationModel failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.ReloadResponse(message=f"Error: {str(e)}")

    async def GetLightFMRecommendations(self, request, context):
        try:
            restaurant_ids = await asyncio.to_thread(
                lf_rec_service.get_recommendations,
                request.user_id,
                limit=request.limit
            )
            return ai_service_pb2.GetRecommendationsResponse(restaurant_ids=restaurant_ids)
        except Exception as e:
            logger.error("gRPC GetLightFMRecommendations failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.GetRecommendationsResponse()

    async def RankCandidates(self, request, context):
        try:
            payload = {
                "user_id": request.user_id,
                "candidates": [
                    {
                        "res_id": c.res_id,
                        "rating": c.rating,
                        "sentiment_score": c.sentiment_score,
                        "distance_m": c.distance_m,
                        "price_normalized": c.price_normalized,
                        "review_count": c.review_count,
                        "similarity_score": c.similarity_score,
                        "is_open": c.is_open,
                    }
                    for c in request.candidates
                ],
                "top_k": request.top_k
            }
            ranking_svc = get_ranking_service()
            result = await asyncio.to_thread(ranking_svc.rank, payload)
            return ai_service_pb2.RankResponse(
                ranked_ids=result["ranked_ids"],
                scores=result.get("scores", [])
            )
        except Exception as e:
            logger.error("gRPC RankCandidates failed: %s", e)
            context.set_code(grpc.StatusCode.INTERNAL)
            context.set_details(str(e))
            return ai_service_pb2.RankResponse()
