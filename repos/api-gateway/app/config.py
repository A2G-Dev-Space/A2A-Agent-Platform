"""
Configuration for API Gateway
"""
from pydantic import BaseSettings
from typing import Optional, Dict

class Settings(BaseSettings):
    """API Gateway configuration"""

    # Gateway settings
    gateway_port: int = 9050
    gateway_host: str = "0.0.0.0"
    environment: str = "development"

    # Service URLs (using localhost for local development)
    user_service_url: str = "http://localhost:8001"
    agent_service_url: str = "http://localhost:8002"
    chat_service_url: str = "http://localhost:8003"
    tracing_service_url: str = "http://localhost:8004"
    admin_service_url: str = "http://localhost:8005"

    # Mock SSO
    enable_mock_sso: bool = True
    mock_sso_url: str = "http://mock-sso:9999"

    # CORS settings
    cors_origins: list = [
        "http://localhost:9060",
        "http://localhost:9050",
        "https://localhost:9050",
        "http://localhost:3000",
    ]

    # Timeout settings
    request_timeout: int = 30
    connect_timeout: int = 5

    # Rate limiting (requests per minute)
    rate_limit_per_ip: int = 100

    # Logging
    log_level: str = "INFO"

    # Security
    jwt_secret_key: str = "local-dev-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 720  # 12 hours

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def get_service_routes(self) -> Dict[str, str]:
        """Get service routing configuration"""
        return {
            '/api/auth': self.user_service_url,
            '/api/users': self.user_service_url,
            '/api/agents': self.agent_service_url,
            '/api/chat': self.chat_service_url,
            '/api/tracing': self.tracing_service_url,
            '/api/admin': self.admin_service_url,
            '/api/llm-models': self.admin_service_url,
            '/api/statistics': self.admin_service_url,
        }

    def get_websocket_routes(self) -> Dict[str, str]:
        """Get WebSocket routing configuration"""
        return {
            '/ws/chat': self.chat_service_url,
            '/ws/session': self.chat_service_url,
        }

settings = Settings()