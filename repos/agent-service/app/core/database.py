"""
Database configuration and models
"""
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import String, Integer, Boolean, DateTime, Text, JSON, Enum as SQLAlchemyEnum, Date, ForeignKey
from datetime import datetime, date
from typing import Optional, Dict, Any, List
from enum import Enum as PyEnum
import uuid

from app.core.config import settings

# Create async engine
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
async_session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

# Database dependency for FastAPI
async def get_db():
    """Get database session dependency"""
    async with async_session_maker() as session:
        yield session

class Base(DeclarativeBase):
    """Base model class"""
    pass

class AgentFramework(str, PyEnum):
    """Agent framework types"""
    LANGCHAIN = "Langchain(custom)"
    AGNO = "Agno"
    ADK = "ADK"

class AgentStatus(str, PyEnum):
    """Agent status types"""
    DEVELOPMENT = "DEVELOPMENT"
    STAGING = "STAGING"
    PRODUCTION = "PRODUCTION"
    DEPLOYED_TEAM = "DEPLOYED_TEAM"
    DEPLOYED_ALL = "DEPLOYED_ALL"
    ARCHIVED = "ARCHIVED"

class HealthStatus(str, PyEnum):
    """Health status types"""
    HEALTHY = "healthy"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"

class Agent(Base):
    """Agent model with Access Control"""
    __tablename__ = "agents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    framework: Mapped[AgentFramework] = mapped_column(SQLAlchemyEnum(AgentFramework))
    status: Mapped[AgentStatus] = mapped_column(SQLAlchemyEnum(AgentStatus), default=AgentStatus.DEVELOPMENT)
    a2a_endpoint: Mapped[Optional[str]] = mapped_column(String(500))
    trace_id: Mapped[Optional[str]] = mapped_column(String(100), unique=True, index=True)  # Unique trace ID for LLM tracking
    capabilities: Mapped[Dict[str, Any]] = mapped_column(JSON)
    embedding_vector: Mapped[Optional[List[float]]] = mapped_column(JSON)  # Store embedding as JSON array

    # UI Customization Fields
    card_color: Mapped[Optional[str]] = mapped_column(String(20))  # Hex color for agent card
    logo_url: Mapped[Optional[str]] = mapped_column(String(500))  # URL for agent logo

    # Access Control Fields
    owner_id: Mapped[str] = mapped_column(String(50), index=True)
    department: Mapped[Optional[str]] = mapped_column(String(100))
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    visibility: Mapped[str] = mapped_column(String(20), default="public", index=True)  # public, private, team
    allowed_users: Mapped[Optional[List[str]]] = mapped_column(JSON)  # List of usernames with access

    # Deploy Fields
    deployed_at: Mapped[Optional[datetime]] = mapped_column(DateTime)
    deployed_by: Mapped[Optional[str]] = mapped_column(String(50))
    deploy_config: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON, default={})
    validated_endpoint: Mapped[Optional[str]] = mapped_column(String(500))  # Validated public endpoint for deployed agents

    # A2A Protocol Support
    agent_card_json: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)  # A2A Agent Card
    workbench_messages: Mapped[Optional[List[Dict[str, Any]]]] = mapped_column(JSON)  # Workbench test messages

    # Health and Metadata
    health_status: Mapped[HealthStatus] = mapped_column(SQLAlchemyEnum(HealthStatus), default=HealthStatus.UNKNOWN)
    last_health_check: Mapped[Optional[datetime]] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    @property
    def agent_card(self) -> Dict[str, Any]:
        """Get agent card (for backward compatibility with a2a_proxy.py)"""
        return self.agent_card_json or {}

    @property
    def original_endpoint(self) -> Optional[str]:
        """
        Get the original agent endpoint
        Returns validated_endpoint if deployed, otherwise a2a_endpoint
        """
        return self.validated_endpoint if self.validated_endpoint else self.a2a_endpoint

class AgentCallStatistics(Base):
    """Agent call statistics for tracking Hub/Workbench Chat and A2A Router usage"""
    __tablename__ = "agent_call_statistics"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[str] = mapped_column(String(50), index=True)
    call_type: Mapped[str] = mapped_column(String(20), index=True)  # 'chat', 'a2a_router'
    agent_status: Mapped[str] = mapped_column(String(20))  # DEPLOYED, DEVELOPMENT at call time
    called_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    date: Mapped[date] = mapped_column(Date, default=date.today, index=True)  # For daily aggregation

class DeploymentLog(Base):
    """Deployment history log"""
    __tablename__ = "deployment_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    agent_id: Mapped[int] = mapped_column(Integer, ForeignKey("agents.id", ondelete="CASCADE"), index=True)
    action: Mapped[str] = mapped_column(String(20))  # 'deploy', 'undeploy'
    performed_by: Mapped[str] = mapped_column(String(50))
    visibility: Mapped[Optional[str]] = mapped_column(String(20))  # team, public (for deploy)
    validated_endpoint: Mapped[Optional[str]] = mapped_column(String(500))
    previous_status: Mapped[str] = mapped_column(String(20))
    new_status: Mapped[str] = mapped_column(String(20))
    extra_data: Mapped[Optional[Dict[str, Any]]] = mapped_column(JSON)  # Additional info (renamed from metadata)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

async def init_db():
    """Initialize database"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
