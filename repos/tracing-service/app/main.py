"""
Tracing Service - A2G Platform
로그 프록시, 실시간 추적, Agent Transfer 감지 담당
"""
from fastapi import FastAPI, HTTPException, Depends, Request, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
import json
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import logs
from app.websocket.manager import trace_manager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Tracing Service...")
    # Initialize database (create tables)
    await init_db()
    logger.info("Database initialized")
    logger.info("Tracing Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Tracing Service...")

# Create FastAPI app
app = FastAPI(
    title="A2G Tracing Service",
    description="Log Proxy and Real-time Tracing Service",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(logs.router, prefix="/api/tracing", tags=["logs"])

@app.websocket("/ws/trace/{trace_id}")
async def websocket_trace_endpoint(websocket: WebSocket, trace_id: str, token: str = None):
    """WebSocket endpoint for real-time log streaming

    Query params:
        token: JWT authentication token
    """
    if not token:
        await websocket.close(code=1008, reason="Missing authentication token")
        return

    # TODO: Validate token here if needed
    # For now, just accept the connection

    await trace_manager.connect(websocket, trace_id)

    try:
        # Keep connection alive with ping/pong
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            if message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
    except Exception as e:
        logger.error(f"WebSocket error for trace {trace_id}: {e}")
    finally:
        await trace_manager.disconnect(websocket, trace_id)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "tracing-service",
        "version": "1.0.0"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"TRC_{exc.status_code:03d}",
                "message": exc.detail,
                "timestamp": "2025-01-01T00:00:00Z"
            }
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8004,
        reload=True,
        log_level="info"
    )
