"""
Database configuration and models
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON
from datetime import datetime
from typing import Optional, Dict, Any

from app.core.config import settings

# Create async engine
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    """Base model class"""
    pass

class LogEntry(Base):
    """Log entry model - Simplified for Workbench"""
    __tablename__ = "log_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    trace_id: Mapped[str] = mapped_column(String(100), index=True)  # Encodes user+agent via MD5 hash
    service_name: Mapped[str] = mapped_column(String(50), index=True)
    level: Mapped[str] = mapped_column(String(20))  # INFO, WARN, ERROR, DEBUG
    message: Mapped[str] = mapped_column(Text)
    context: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, nullable=True, default=dict)  # Contains log_type and metadata
    is_transfer: Mapped[bool] = mapped_column(Boolean, default=False)
    user_id: Mapped[str] = mapped_column(String(50), index=True, default="system")
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

async def init_db():
    """Initialize database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

async def get_db():
    """Dependency function to get database session"""
    async with async_session_maker() as session:
        yield session
