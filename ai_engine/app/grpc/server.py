import logging
import grpc
from . import ai_service_pb2
from . import ai_service_pb2_grpc
from .servicer import AIServiceServicer
from grpc_reflection.v1alpha import reflection

logger = logging.getLogger(__name__)

class GRPCServer:
    """
    Manages the lifecycle of the async gRPC server.
    """
    def __init__(self, host: str = "0.0.0.0", port: int = 50051):
        self.host = host
        self.port = port
        self.server = None

    async def start(self):
        # Create asynchronous gRPC server
        self.server = grpc.aio.server()
        ai_service_pb2_grpc.add_AIServiceServicer_to_server(
            AIServiceServicer(), self.server
        )
        
        # Enable gRPC reflection for easy debugging (e.g. Postman)
        SERVICE_NAMES = (
            ai_service_pb2.DESCRIPTOR.services_by_name['AIService'].full_name,
            reflection.SERVICE_NAME,
        )
        reflection.enable_server_reflection(SERVICE_NAMES, self.server)

        listen_addr = f"{self.host}:{self.port}"
        self.server.add_insecure_port(listen_addr)
        logger.info(f"Starting async gRPC server on {listen_addr}...")
        await self.server.start()
        logger.info("async gRPC server started successfully.")

    async def stop(self):
        if self.server:
            logger.info("Stopping gRPC server...")
            # Gracefully stop within 5 seconds
            await self.server.stop(grace=5.0)
            logger.info("gRPC server stopped.")
