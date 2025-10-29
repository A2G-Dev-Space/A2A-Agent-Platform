"""
Agent Service - A2G Platform
에이전트 관리, A2A Protocol, Top-K 추천 시스템 담당
"""
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.core.database import init_db
from app.api.v1 import agents, registry
from app.core.security import get_current_user

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Agent Service...")
    await init_db()
    logger.info("Agent Service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Agent Service...")

# Create FastAPI app
app = FastAPI(
    title="A2G Agent Service",
    description="Agent Management and A2A Protocol Service",
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
# A2A Registry endpoints (following A2A spec)
app.include_router(registry.router, prefix="/api", tags=["registry"])

# Legacy CRUD endpoints (maintained for backward compatibility)
app.include_router(agents.router, prefix="/api/agents", tags=["agents-legacy"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "agent-service",
        "version": "1.0.0"
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Global HTTP exception handler"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": f"AGT_{exc.status_code:03d}",
                "message": exc.detail,
                "timestamp": "2025-01-01T00:00:00Z"
            }
        }
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8002,
        reload=True,
        log_level="info"
    )
