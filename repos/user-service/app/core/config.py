"""
Core configuration and settings
"""
from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    """Application settings"""
    
    # Service settings
    SERVICE_NAME: str = "user-service"
    SERVICE_PORT: int = 8001
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://dev_user:dev_password@postgres:5432/user_service_db"
    
    # Redis
    REDIS_URL: str = "redis://redis:6379/0"
    
    # Security
    JWT_SECRET_KEY: str = "local-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    # CORS
    CORS_ORIGINS: List[str] = ["http://localhost:9060", "http://localhost:9050"]
    
    # SSO
    IDP_ENTITY_ID: str = "http://localhost:9999/mock-sso/login"
    SP_REDIRECT_URL: str = "http://localhost:9050/api/auth/callback/"
    
    class Config:
        env_file = ".env.local"
        case_sensitive = True

settings = Settings()
