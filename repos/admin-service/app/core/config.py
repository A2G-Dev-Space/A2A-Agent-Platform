"""
Core configuration and settings
"""
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "admin-service"
    SERVICE_PORT: int = 8005
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dev_user:dev_password@postgres:5432/admin_service_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/4"
    
    # Security
    JWT_SECRET_KEY: str = "local-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:9060", "http://localhost:9050"]

    # Microservice URLs
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8001")
    AGENT_SERVICE_URL: str = os.getenv("AGENT_SERVICE_URL", "http://agent-service:8002")
    CHAT_SERVICE_URL: str = os.getenv("CHAT_SERVICE_URL", "http://chat-service:8003")
    LLM_PROXY_SERVICE_URL: str = os.getenv("LLM_PROXY_SERVICE_URL", "http://llm-proxy-service:8006")

    class Config:
        env_file = ".env.local"
        case_sensitive = True

settings = Settings()
