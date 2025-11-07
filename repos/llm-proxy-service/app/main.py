"""
LLM Proxy Service with WebSocket for Trace Events
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting LLM Proxy Service...")

    # Initialize database
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully")

    logger.info("LLM Proxy Service started successfully")
    yield
    logger.info("Shutting down LLM Proxy Service...")

# Create FastAPI app
app = FastAPI(
    title="LLM Proxy Service",
    description="Proxy service for LLM calls with trace WebSocket",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9060",  # Frontend dev
        "http://localhost:3000",  # Frontend prod
        "http://localhost:9050",  # API Gateway
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import routers
from app.api import proxy_router
from app.api.openai_compatible import openai_router
from app.websocket import websocket_router

# Include routers
app.include_router(proxy_router, prefix="/api/proxy", tags=["proxy"])
app.include_router(openai_router, prefix="/v1", tags=["openai-compatible"])
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "llm-proxy-service"}