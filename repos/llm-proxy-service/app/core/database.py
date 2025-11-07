"""
Database configuration and models for LLM Proxy Service
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, DateTime, JSON, Text, Float, Boolean
from datetime import datetime
from typing import Optional, Dict, Any
import uuid
import os

# Database URL
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://dev_user:dev_password@postgres:5432/llm_proxy_db")

# Create async engine
engine = create_async_engine(DATABASE_URL, echo=True)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    """Base model class"""
    pass


class LLMCall(Base):
    """Records every LLM API call"""
    __tablename__ = "llm_calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id: Mapped[str] = mapped_column(String, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    trace_id: Mapped[Optional[str]] = mapped_column(String, index=True)

    # LLM Info
    provider: Mapped[str] = mapped_column(String)  # google, openai, anthropic
    model: Mapped[str] = mapped_column(String)

    # Request
    request_messages: Mapped[Dict[str, Any]] = mapped_column(JSON)
    request_params: Mapped[Dict[str, Any]] = mapped_column(JSON)  # temperature, max_tokens, etc

    # Response
    response_content: Mapped[Optional[str]] = mapped_column(Text)
    response_metadata: Mapped[Dict[str, Any]] = mapped_column(JSON)  # tokens, finish_reason, etc

    # Metrics
    request_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    response_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    total_tokens: Mapped[Optional[int]] = mapped_column(Integer)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)

    # Status
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)


class TraceEvent(Base):
    """Records trace events for debugging and monitoring"""
    __tablename__ = "trace_events"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id: Mapped[str] = mapped_column(String, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    trace_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    llm_call_id: Mapped[Optional[str]] = mapped_column(String, index=True)

    # Event Info
    event_type: Mapped[str] = mapped_column(String)  # llm_request, llm_response, tool_call, etc
    event_data: Mapped[Dict[str, Any]] = mapped_column(JSON)
    event_metadata: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)

    # Timestamp
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class ToolCall(Base):
    """Records tool calls made by agents"""
    __tablename__ = "tool_calls"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    agent_id: Mapped[str] = mapped_column(String, index=True)
    session_id: Mapped[Optional[str]] = mapped_column(String, index=True)
    llm_call_id: Mapped[Optional[str]] = mapped_column(String, index=True)

    # Tool Info
    tool_name: Mapped[str] = mapped_column(String)
    tool_args: Mapped[Dict[str, Any]] = mapped_column(JSON)
    tool_result: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)

    # Status
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text)

    # Timestamps
    called_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    latency_ms: Mapped[Optional[int]] = mapped_column(Integer)


async def init_db():
    """Initialize database tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_db():
    """Get database session"""
    async with async_session_maker() as session:
        yield session