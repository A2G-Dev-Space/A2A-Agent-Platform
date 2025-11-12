"""
Chat Service - A2G Platform
채팅 세션 관리, REST + SSE 스트리밍 통신 담당
"""
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1 import sessions, messages, llm_proxy, workbench
from app.core.redis_client import redis_client

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Chat Service...")
    # NOTE: Database tables are created by Alembic migrations, not by ORM

    # Initialize Redis
    try:
        await redis_client.connect()
        logger.info("Redis client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")

    logger.info("Chat Service started successfully")

    yield

    # Shutdown
    logger.info("Shutting down Chat Service...")
    await redis_client.close()

# Create FastAPI app
app = FastAPI(
    title="A2G Chat Service",
    description="Chat Session and REST + SSE Streaming Communication Service",
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
app.include_router(llm_proxy.router, prefix="/api", tags=["llm-proxy"])
app.include_router(workbench.router, prefix="/api", tags=["workbench"])

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
