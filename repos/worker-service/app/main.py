"""
Worker Service FastAPI Application
Provides API endpoints for historical statistics and health monitoring
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

from app.api.statistics import router as statistics_router
from app.core.database import init_db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Worker Service API...")
    await init_db()
    logger.info("Database initialized")
    yield
    # Shutdown
    logger.info("Shutting down Worker Service API...")

# Create FastAPI app
app = FastAPI(
    title="Worker Service API",
    description="Historical statistics and health monitoring for A2G Platform",
    version="0.1.0",
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
app.include_router(statistics_router, tags=["statistics"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "worker-service"}

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Worker Service",
        "version": "0.1.0",
        "description": "Historical statistics and health monitoring"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8010)