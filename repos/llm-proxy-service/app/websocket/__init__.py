"""
WebSocket router for trace events
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
import logging

from .manager import trace_manager

logger = logging.getLogger(__name__)

websocket_router = APIRouter()


@websocket_router.websocket("/trace/{agent_id}")
async def trace_websocket_endpoint(
    websocket: WebSocket,
    agent_id: str,
    token: str = Query(None)  # Optional auth token
):
    """
    WebSocket endpoint for receiving trace events from a specific agent

    Args:
        websocket: WebSocket connection
        agent_id: ID or name of the agent to trace
        token: Optional authentication token
    """
    logger.info(f"[TraceWS] New WebSocket connection request for agent {agent_id}")

    try:
        # Connect the WebSocket
        await trace_manager.connect(websocket, agent_id)

        # Send connection confirmation
        await websocket.send_json({
            "type": "connected",
            "agent_id": agent_id,
            "message": "Connected to LLM Proxy trace stream"
        })

        # Keep connection alive and handle messages
        while True:
            # Wait for messages (mainly for ping/pong)
            data = await websocket.receive_text()
            logger.debug(f"[TraceWS] Received from agent {agent_id}: {data}")

            # Handle ping/pong
            if data == "ping":
                await websocket.send_text("pong")

    except WebSocketDisconnect:
        logger.info(f"[TraceWS] Client disconnected from agent {agent_id}")
    except Exception as e:
        logger.error(f"[TraceWS] Error in WebSocket for agent {agent_id}: {e}")
    finally:
        trace_manager.disconnect(websocket, agent_id)