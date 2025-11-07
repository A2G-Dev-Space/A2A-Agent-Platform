"""
WebSocket proxy for bidirectional communication between frontend and backend services
"""
import asyncio
import logging
from typing import Optional
from fastapi import WebSocket
import websockets
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class WebSocketProxy:
    """Bidirectional WebSocket proxy"""

    def __init__(self, client_ws: WebSocket, backend_url: str, query_params: dict = None):
        self.client_ws = client_ws
        self.backend_url = backend_url
        self.query_params = query_params or {}
        self.backend_ws: Optional[websockets.WebSocketClientProtocol] = None

    async def start(self):
        """Start the WebSocket proxy"""
        # Accept client connection
        await self.client_ws.accept()
        logger.info(f"Client connected, proxying to {self.backend_url}")

        # Build backend URL with query params
        backend_url = self.backend_url
        if self.query_params:
            backend_url += f"?{urlencode(self.query_params)}"

        try:
            # Connect to backend service
            self.backend_ws = await websockets.connect(backend_url)
            logger.info(f"Connected to backend: {backend_url}")

            # Create bidirectional relay tasks
            client_to_backend = asyncio.create_task(self._relay_client_to_backend())
            backend_to_client = asyncio.create_task(self._relay_backend_to_client())

            # Wait for either task to complete (indicates disconnection)
            done, pending = await asyncio.wait(
                [client_to_backend, backend_to_client],
                return_when=asyncio.FIRST_COMPLETED
            )

            # Cancel remaining tasks
            for task in pending:
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

        except websockets.exceptions.WebSocketException as e:
            logger.error(f"Backend WebSocket error: {e}")
            await self.client_ws.close(code=1011, reason=f"Backend error: {str(e)}")
        except Exception as e:
            logger.error(f"Proxy error: {e}")
            await self.client_ws.close(code=1011, reason=f"Proxy error: {str(e)}")
        finally:
            await self._cleanup()

    async def _relay_client_to_backend(self):
        """Relay messages from client to backend"""
        try:
            while True:
                # Receive from client
                data = await self.client_ws.receive_text()

                # Send to backend
                if self.backend_ws:
                    await self.backend_ws.send(data)

        except Exception as e:
            logger.error(f"Client to backend relay error: {e}")
            raise

    async def _relay_backend_to_client(self):
        """Relay messages from backend to client"""
        try:
            while True:
                # Receive from backend
                if self.backend_ws:
                    data = await self.backend_ws.recv()

                    # Send to client
                    await self.client_ws.send_text(data)

        except Exception as e:
            logger.error(f"Backend to client relay error: {e}")
            raise

    async def _cleanup(self):
        """Clean up connections"""
        try:
            if self.backend_ws:
                await self.backend_ws.close()
        except Exception as e:
            logger.error(f"Error closing backend connection: {e}")

        logger.info("WebSocket proxy closed")


async def proxy_websocket(
    client_ws: WebSocket,
    backend_url: str,
    query_params: dict = None
):
    """
    Proxy WebSocket connection between client and backend service

    Args:
        client_ws: FastAPI WebSocket connection from client
        backend_url: Backend WebSocket URL (ws:// or wss://)
        query_params: Optional query parameters to pass to backend
    """
    proxy = WebSocketProxy(client_ws, backend_url, query_params)
    await proxy.start()
