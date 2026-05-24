import asyncio
import logging
from typing import List, Optional
import grpc
from app.core.config import settings
from .grpc import ai_service_pb2
from .grpc import ai_service_pb2_grpc

logger = logging.getLogger(__name__)

class GRPCServiceClient:
    """
    gRPC Client for communicating with the AI Engine.
    Uses async gRPC channel and reusable stub.
    """
    def __init__(self, target: str):
        self.target = target
        self._channel = None
        self._stub = None
        self._loop = None

    def _get_channel_and_stub(self):
        try:
            loop = asyncio.get_running_loop()
        except RuntimeError:
            loop = None

        if self._channel is None or self._loop is not loop:
            self._channel = grpc.aio.insecure_channel(
                self.target,
                options=[
                    ('grpc.max_receive_message_length', 50 * 1024 * 1024),
                    ('grpc.max_send_message_length', 50 * 1024 * 1024)
                ]
            )
            self._stub = ai_service_pb2_grpc.AIServiceStub(self._channel)
            self._loop = loop
        return self._channel, self._stub

    @property
    def channel(self):
        channel, _ = self._get_channel_and_stub()
        return channel

    @property
    def stub(self):
        _, stub = self._get_channel_and_stub()
        return stub

    async def check_health(self) -> bool:
        try:
            req = ai_service_pb2.HealthCheckRequest()
            resp = await self.stub.CheckHealth(req, timeout=3.0)
            return resp.status == "online"
        except grpc.RpcError as e:
            logger.warning("gRPC health check failed: %s (%s)", e.code(), e.details())
            return False
        except Exception as e:
            logger.warning("gRPC health check failed: %s", e)
            return False

    async def extract_intent_and_vectorize(self, query: str) -> Optional[dict]:
        try:
            req = ai_service_pb2.ExtractIntentRequest(text=query)
            resp = await self.stub.ExtractIntentAndVectorize(req, timeout=10.0)
            return {
                "raw_text": query,
                "cleaned_query": resp.cleaned_query,
                "vector": list(resp.vector)
            }
        except Exception as e:
            logger.error("gRPC extract_intent_and_vectorize failed: %s", e)
            raise e

    async def embed_text(self, text: str) -> Optional[List[float]]:
        try:
            req = ai_service_pb2.EmbedTextRequest(text=text)
            resp = await self.stub.EmbedText(req, timeout=5.0)
            return list(resp.vector)
        except Exception as e:
            logger.error("gRPC embed_text failed: %s", e)
            raise e

    async def reload_recommendation_model(self) -> dict:
        try:
            req = ai_service_pb2.ReloadRequest()
            resp = await self.stub.ReloadRecommendationModel(req, timeout=15.0)
            return {"message": resp.message}
        except Exception as e:
            logger.error("gRPC reload_recommendation_model failed: %s", e)
            raise e

    async def get_lightfm_recommendations(self, user_id: str, limit: int = 10) -> List[str]:
        try:
            req = ai_service_pb2.GetRecommendationsRequest(user_id=str(user_id), limit=limit)
            resp = await self.stub.GetLightFMRecommendations(req, timeout=5.0)
            return list(resp.restaurant_ids)
        except Exception as e:
            logger.error("gRPC get_lightfm_recommendations failed: %s", e)
            raise e

    async def rank_candidates(self, user_id: str, candidates: List[dict], top_k: int) -> dict:
        try:
            grpc_candidates = []
            for c in candidates:
                grpc_candidates.append(
                    ai_service_pb2.CandidateWithFeatures(
                        res_id=str(c.get("res_id")),
                        rating=int(c.get("rating", 0)),
                        sentiment_score=int(c.get("sentiment_score", 0)),
                        distance_m=int(c.get("distance_m", 0)),
                        price_normalized=int(c.get("price_normalized", 0)),
                        review_count=int(c.get("review_count", 0)),
                        similarity_score=int(c.get("similarity_score", 0)),
                        is_open=int(c.get("is_open", 0))
                    )
                )
            req = ai_service_pb2.RankRequest(
                user_id=str(user_id),
                candidates=grpc_candidates,
                top_k=top_k
            )
            resp = await self.stub.RankCandidates(req, timeout=10.0)
            return {
                "ranked_ids": list(resp.ranked_ids),
                "scores": list(resp.scores)
            }
        except Exception as e:
            logger.error("gRPC rank_candidates failed: %s", e)
            raise e

    async def close(self):
        if self._channel is not None:
            await self._channel.close()
            self._channel = None
            self._stub = None
            self._loop = None
