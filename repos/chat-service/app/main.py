"""
Chat Service - A2G Platform
채팅 세션 관리, WebSocket 실시간 통신 담당
"""
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
import uvicorn
import logging
import json
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, List

from app.core.config import settings
from app.api.v1 import sessions, messages
from app.websocket.manager import ConnectionManager
from app.websocket.chat_handler import ChatWebSocketHandler

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# WebSocket connection manager
manager = ConnectionManager()
chat_handler = ChatWebSocketHandler(manager)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Chat Service...")
    # NOTE: Database tables are created by Alembic migrations, not by ORM
    # Removed init_db() call to prevent schema conflicts with migrations
    logger.info("Chat Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Chat Service...")

# Create FastAPI app
app = FastAPI(
    title="A2G Chat Service",
    description="Chat Session and WebSocket Communication Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(sessions.router, prefix="/api/chat", tags=["sessions"])
app.include_router(messages.router, prefix="/api/chat", tags=["messages"])

@app.websocket("/ws/chat/{session_id}")
async def websocket_chat_endpoint(websocket: WebSocket, session_id: str, token: str = None):
    """WebSocket endpoint for real-time chat with agent streaming

    Query params:
        token: JWT authentication token
    """
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return

    # Use enhanced chat handler with A2A proxy integration
    await chat_handler.handle_connection(websocket, session_id, token)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "chat-service",
        "version": "1.0.0"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"CHT_{exc.status_code:03d}",
                "message": exc.detail,
                "timestamp": "2025-01-01T00:00:00Z"
            }
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8003,
        reload=True,
        log_level="info"
    )
