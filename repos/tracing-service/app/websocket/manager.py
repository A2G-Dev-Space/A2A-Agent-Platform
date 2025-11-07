"""
WebSocket manager for trace log streaming
Broadcasts log entries to all connected clients subscribed to a trace_id
"""
from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio
import logging

logger = logging.getLogger(__name__)


class TraceConnectionManager:
    """
    Manages WebSocket connections for real-time log streaming
    Maps trace_id → Set of WebSocket connections
    """

    def __init__(self):
        # Map trace_id → Set of WebSocket connections
        self.connections: Dict[str, Set[WebSocket]] = {}
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket, trace_id: str):
        """Connect a client to trace stream"""
        await websocket.accept()

        async with self.lock:
            if trace_id not in self.connections:
                self.connections[trace_id] = set()
            self.connections[trace_id].add(websocket)

        logger.info(f"Client connected to trace {trace_id}. Total: {len(self.connections[trace_id])}")

    async def disconnect(self, websocket: WebSocket, trace_id: str):
        """Disconnect a client"""
        async with self.lock:
            if trace_id in self.connections:
                self.connections[trace_id].discard(websocket)
                if not self.connections[trace_id]:
                    # Remove trace_id if no more connections
                    del self.connections[trace_id]
                    logger.info(f"No more clients for trace {trace_id}, removed")
                else:
                    logger.info(f"Client disconnected from trace {trace_id}. Remaining: {len(self.connections[trace_id])}")

    async def broadcast_log(self, trace_id: str, log_entry: dict):
        """
        Broadcast log entry to all connected clients for this trace_id

        Args:
            trace_id: The trace identifier
            log_entry: Log entry dict with fields: timestamp, service, level, message, metadata, etc.
        """
        async with self.lock:
            if trace_id not in self.connections:
                return

            connections = self.connections[trace_id].copy()

        if not connections:
            return

        message = json.dumps({
            "type": "log_entry",
            "trace_id": trace_id,
            "log": log_entry
        })

        disconnected = set()
        for websocket in connections:
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Failed to send to client: {e}")
                disconnected.add(websocket)

        # Clean up disconnected clients
        if disconnected:
            async with self.lock:
                if trace_id in self.connections:
                    self.connections[trace_id] -= disconnected
                    if not self.connections[trace_id]:
                        del self.connections[trace_id]

    def get_connection_count(self, trace_id: str = None) -> int:
        """Get number of connections for a trace_id, or total if trace_id is None"""
        if trace_id:
            return len(self.connections.get(trace_id, set()))
        return sum(len(conns) for conns in self.connections.values())


# Global instance
trace_manager = TraceConnectionManager()
