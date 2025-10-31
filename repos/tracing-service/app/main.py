"""
Tracing Service - A2G Platform
로그 프록시, 실시간 추적, Agent Transfer 감지 담당
"""
from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.v1 import logs

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    logger.info("Starting Tracing Service...")
    # NOTE: Database tables are created by Alembic migrations, not by ORM
    # Removed init_db() call to prevent schema conflicts with migrations
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
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(logs.router, prefix="/api/tracing", tags=["logs"])

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
