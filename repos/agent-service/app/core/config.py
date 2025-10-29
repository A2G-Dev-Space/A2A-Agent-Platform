"""
Core configuration and settings
"""
from pydantic_settings import BaseSettings
from typing import List, Optional
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "agent-service"
    SERVICE_PORT: int = 8002
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dev_user:dev_password@postgres:5432/agent_service_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/1"
    
    # Security
    JWT_SECRET_KEY: str = "local-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:9060", "http://localhost:9050"]
    
    # OpenAI API
    OPENAI_API_KEY: Optional[str] = None
    
    # Agent Registry
    AGENT_REGISTRY_URL: Optional[str] = None
    
    class Config:
        env_file = ".env.local"
        case_sensitive = True

settings = Settings()
