"""
WebSocket connection manager for trace events
Each agent has its own WebSocket connection for trace events
"""
import logging
from typing import Dict, Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class TraceWebSocketManager:
    """Manages WebSocket connections for trace events per agent"""

    def __init__(self):
        # agent_id -> Set of WebSocket connections
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, agent_id: str):
        """Accept and register a WebSocket connection for an agent"""
        await websocket.accept()

        if agent_id not in self._connections:
            self._connections[agent_id] = set()

        self._connections[agent_id].add(websocket)
        logger.info(f"[TraceWS] New connection for agent {agent_id}. Total: {len(self._connections[agent_id])}")

    def disconnect(self, websocket: WebSocket, agent_id: str):
        """Remove a WebSocket connection"""
        if agent_id in self._connections:
            self._connections[agent_id].discard(websocket)
            logger.info(f"[TraceWS] Disconnected from agent {agent_id}. Remaining: {len(self._connections[agent_id])}")

            # Clean up empty sets
            if not self._connections[agent_id]:
                del self._connections[agent_id]

    async def broadcast_to_agent(self, agent_id: str, message: dict):
        """Broadcast a message to all connections for a specific agent"""
        if agent_id not in self._connections:
            logger.debug(f"[TraceWS] No connections for agent {agent_id}")
            return

        dead_connections = set()

        for websocket in self._connections[agent_id]:
            try:
                await websocket.send_json(message)
                logger.debug(f"[TraceWS] Sent trace event to agent {agent_id}: {message.get('type')}")
            except Exception as e:
                logger.error(f"[TraceWS] Failed to send to connection: {e}")
                dead_connections.add(websocket)

        # Clean up dead connections
        for websocket in dead_connections:
            self.disconnect(websocket, agent_id)


# Global manager instance
trace_manager = TraceWebSocketManager()