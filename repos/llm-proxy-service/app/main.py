"""
LLM Proxy Service with WebSocket for Trace Events
"""
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.database import init_db
from app.core.redis_client import redis_client
from alembic.config import Config
from alembic import command
import os

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def run_migrations():
    """Run alembic migrations"""
    try:
        # Get the alembic.ini path (relative to the project root)
        alembic_cfg = Config("alembic.ini")

        # Override sqlalchemy.url with environment variable
        database_url = os.getenv("DATABASE_URL", "postgresql://dev_user:dev_password@postgres:5432/llm_proxy_db")
        # Convert asyncpg URL to psycopg2 for alembic
        if database_url.startswith("postgresql+asyncpg://"):
            database_url = database_url.replace("postgresql+asyncpg://", "postgresql://")
        alembic_cfg.set_main_option("sqlalchemy.url", database_url)

        logger.info("Running database migrations...")
        command.upgrade(alembic_cfg, "head")
        logger.info("Database migrations completed successfully")
    except Exception as e:
        logger.error(f"Failed to run migrations: {e}")
        # Don't raise - let the service continue if migrations fail
        # This is important for development when database might already be up to date


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting LLM Proxy Service...")

    # Run database migrations
    run_migrations()

    # Initialize database (creates tables if they don't exist)
    logger.info("Initializing database...")
    await init_db()
    logger.info("Database initialized successfully")

    # Initialize Redis for session trace lookup
    try:
        await redis_client.connect()
        logger.info("Redis client initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Redis: {e}")

    logger.info("LLM Proxy Service started successfully")
    yield
    logger.info("Shutting down LLM Proxy Service...")
    await redis_client.close()

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
from app.api.trace_openai import trace_openai_router
from app.api.v1.statistics import router as statistics_router
from app.websocket import websocket_router

# Include routers
app.include_router(proxy_router, prefix="/api/proxy", tags=["proxy"])
app.include_router(openai_router, prefix="/v1", tags=["openai-compatible"])
app.include_router(trace_openai_router, prefix="/trace/{trace_id}/v1", tags=["trace-openai"])
app.include_router(statistics_router, prefix="/api/v1", tags=["statistics"])
app.include_router(websocket_router, prefix="/ws", tags=["websocket"])

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "llm-proxy-service"}