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
    CORS_ORIGINS: List[str] = [
        "http://172.17.0.1:9060",
        "http://172.17.0.1:9050",
        "https://172.17.0.1:9050",
        "http://localhost:9060",
        "http://localhost:9050"
    ]

    # Mock SSO (Development)
    ENABLE_MOCK_SSO: bool = os.getenv("ENABLE_MOCK_SSO", "false").lower() == "true"
    MOCK_SSO_URL: str = os.getenv("MOCK_SSO_URL", "http://mock-sso:9999")

    # Real SSO Configuration
    SSO_ENABLED: bool = os.getenv("SSO_ENABLED", "false").lower() == "true"
    SSO_CLIENT_ID: str = os.getenv("SSO_CLIENT_ID", "41211cae-1fda-49f7-a462-f01d51ed4b6d")
    IDP_ENTITY_ID: str = os.getenv("IDP_ENTITY_ID", "https://your-idp-domain.com")
    SP_REDIRECT_URL: str = os.getenv("SP_REDIRECT_URL", "https://172.17.0.1:9050/callback")
    SP_LOGOUT_URL: str = os.getenv("SP_LOGOUT_URL", "")
    SSO_SCOPE: str = os.getenv("SSO_SCOPE", "openid profile")
    SSO_RESPONSE_TYPE: str = os.getenv("SSO_RESPONSE_TYPE", "code id_token")
    SSO_RESPONSE_MODE: str = os.getenv("SSO_RESPONSE_MODE", "form_post")
    SSO_CERT_FILE: str = os.getenv("SSO_CERT_FILE", "/app/certs/sso.cer")
    
    class Config:
        env_file = ".env.local"
        case_sensitive = True

settings = Settings()
