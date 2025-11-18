"""
Database models and connection for Worker Service
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, JSON, Float, Boolean, BigInteger
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from datetime import datetime
import os

# Database connection
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@postgres:5432/worker_db"
)

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True, future=True)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

class StatisticsSnapshot(Base):
    """Daily snapshot of platform statistics for historical tracking"""
    __tablename__ = "statistics_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    snapshot_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    # User statistics
    total_users = Column(Integer, nullable=False)

    # Agent statistics
    total_agents = Column(Integer, nullable=False)
    deployed_agents = Column(Integer, nullable=False)
    development_agents = Column(Integer, nullable=False)

    # Token usage by agent - all models combined (JSON format: {agent_id: {tokens, calls, name}})
    agent_token_usage = Column(JSON, nullable=True)

    # Token usage by agent and model (JSON format: {agent_id: {model: {tokens, calls}, ...}})
    agent_token_usage_by_model = Column(JSON, nullable=True)

    # Model usage statistics (JSON format)
    model_usage_stats = Column(JSON, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

class LLMHealthStatus(Base):
    """Track LLM health status over time"""
    __tablename__ = "llm_health_status"

    id = Column(Integer, primary_key=True, index=True)
    llm_id = Column(Integer, nullable=False, index=True)
    provider = Column(String, nullable=False)
    model = Column(String, nullable=False)
    endpoint_url = Column(String, nullable=False)

    # Health check results
    is_healthy = Column(Boolean, default=True)
    response_time_ms = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)

    # Status tracking
    consecutive_failures = Column(Integer, default=0)
    last_healthy_at = Column(DateTime, nullable=True)
    checked_at = Column(DateTime, default=datetime.utcnow)

    # Active status (updated based on health checks)
    is_active = Column(Boolean, default=True)

async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()