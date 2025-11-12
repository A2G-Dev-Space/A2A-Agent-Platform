"""
Security utilities and JWT handling
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.core.config import settings

# JWT token scheme
security = HTTPBearer(auto_error=False)  # Don't auto-error for internal service requests

# List of internal services that can access without user auth
INTERNAL_SERVICES = [
    "llm-proxy-service",
    "chat-service",
    "agent-service"
]

def verify_token(token: str) -> Optional[dict]:
    """Verify JWT token and return payload"""
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        return payload
    except JWTError:
        return None

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """Get current authenticated user (simplified for tracing service)"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = verify_token(token)

    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    if username is None:
        raise credentials_exception

    return {"username": username}

def get_user_or_service(
    authorization: Optional[str] = None,
    x_service_name: Optional[str] = None
) -> dict:
    """
    Get current authenticated user OR allow internal service requests
    - User requests: require valid JWT token in Authorization header
    - Internal service requests: require X-Service-Name header with valid service name

    Note: This is a regular function, not a FastAPI dependency.
    The endpoint should extract headers and pass them as arguments.
    """
    # Check for internal service request
    if x_service_name and x_service_name in INTERNAL_SERVICES:
        return {"username": f"service:{x_service_name}", "is_service": True}

    # Check for user authentication
    if authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)

        if payload:
            username: str = payload.get("sub")
            if username:
                return {"username": username, "is_service": False}

    # Neither valid service nor valid user token
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Not authenticated as user or internal service",
    )
