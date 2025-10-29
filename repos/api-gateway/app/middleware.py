"""
Middleware for API Gateway
"""
from fastapi import Request, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import jwt
import time
import logging
from typing import Optional
from datetime import datetime
import json

logger = logging.getLogger(__name__)

# Bearer token security
security = HTTPBearer(auto_error=False)

class AuthenticationMiddleware(BaseHTTPMiddleware):
    """JWT Authentication middleware"""

    def __init__(self, app, jwt_secret_key: str, jwt_algorithm: str = "HS256"):
        super().__init__(app)
        self.jwt_secret_key = jwt_secret_key
        self.jwt_algorithm = jwt_algorithm
        # Paths that don't require authentication
        self.public_paths = {
            "/health",
            "/api/health",
            "/api/auth/login",
            "/api/auth/callback",
            "/api/auth/refresh",
            "/mock-sso",
            "/docs",
            "/openapi.json",
            "/redoc",
        }

    async def dispatch(self, request: Request, call_next):
        # Skip authentication for public paths
        path = request.url.path
        if any(path.startswith(public_path) for public_path in self.public_paths):
            response = await call_next(request)
            return response

        # Skip authentication for OPTIONS requests (CORS preflight)
        if request.method == "OPTIONS":
            response = await call_next(request)
            return response

        # Extract and verify JWT token
        authorization = request.headers.get("Authorization")
        if not authorization:
            logger.warning(f"Missing authorization header for {path}")
            return Response(
                content=json.dumps({"detail": "Missing authorization header"}),
                status_code=401,
                media_type="application/json"
            )

        try:
            # Extract token
            if not authorization.startswith("Bearer "):
                raise ValueError("Invalid authorization format")

            token = authorization[7:]  # Remove "Bearer " prefix

            # Decode and verify JWT
            payload = jwt.decode(
                token,
                self.jwt_secret_key,
                algorithms=[self.jwt_algorithm]
            )

            # Add user info to request state
            request.state.user = payload
            request.state.user_id = payload.get("loginid", payload.get("sub"))

        except jwt.ExpiredSignatureError:
            logger.warning(f"Expired JWT token for {path}")
            return Response(
                content=json.dumps({"detail": "Token has expired"}),
                status_code=401,
                media_type="application/json"
            )
        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid JWT token for {path}: {str(e)}")
            return Response(
                content=json.dumps({"detail": "Invalid token"}),
                status_code=401,
                media_type="application/json"
            )
        except Exception as e:
            logger.error(f"Authentication error for {path}: {str(e)}")
            return Response(
                content=json.dumps({"detail": "Authentication failed"}),
                status_code=401,
                media_type="application/json"
            )

        # Continue with the request
        response = await call_next(request)
        return response

class LoggingMiddleware(BaseHTTPMiddleware):
    """Request/Response logging middleware"""

    async def dispatch(self, request: Request, call_next):
        # Start timer
        start_time = time.time()

        # Log request
        logger.info(
            f"Request: {request.method} {request.url.path} "
            f"from {request.client.host if request.client else 'unknown'}"
        )

        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        logger.info(
            f"Response: {request.method} {request.url.path} "
            f"status={response.status_code} duration={duration:.3f}s"
        )

        # Add custom headers
        response.headers["X-Process-Time"] = str(duration)
        response.headers["X-Gateway-Version"] = "1.0.0"

        return response

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Simple rate limiting middleware"""

    def __init__(self, app, requests_per_minute: int = 100):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.request_counts = {}  # IP -> list of timestamps
        self.window_seconds = 60

    async def dispatch(self, request: Request, call_next):
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"

        # Skip rate limiting for health checks
        if request.url.path in ["/health", "/api/health"]:
            response = await call_next(request)
            return response

        # Current time
        current_time = time.time()

        # Initialize or get request timestamps for this IP
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = []

        # Remove old timestamps outside the window
        self.request_counts[client_ip] = [
            timestamp for timestamp in self.request_counts[client_ip]
            if current_time - timestamp < self.window_seconds
        ]

        # Check rate limit
        if len(self.request_counts[client_ip]) >= self.requests_per_minute:
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return Response(
                content=json.dumps({
                    "detail": "Rate limit exceeded",
                    "retry_after": self.window_seconds
                }),
                status_code=429,
                media_type="application/json"
            )

        # Record this request
        self.request_counts[client_ip].append(current_time)

        # Continue with the request
        response = await call_next(request)
        return response

class CacheMiddleware(BaseHTTPMiddleware):
    """Simple response caching middleware for GET requests"""

    def __init__(self, app, cache_ttl_seconds: int = 60):
        super().__init__(app)
        self.cache_ttl_seconds = cache_ttl_seconds
        self.cache = {}  # Simple in-memory cache

    async def dispatch(self, request: Request, call_next):
        # Only cache GET requests
        if request.method != "GET":
            response = await call_next(request)
            return response

        # Skip caching for certain paths
        skip_cache_paths = ["/health", "/api/health", "/ws/"]
        if any(request.url.path.startswith(path) for path in skip_cache_paths):
            response = await call_next(request)
            return response

        # Create cache key
        cache_key = f"{request.url.path}?{request.url.query}"

        # Check cache
        if cache_key in self.cache:
            cached_data, cached_time = self.cache[cache_key]
            if time.time() - cached_time < self.cache_ttl_seconds:
                logger.debug(f"Cache hit for {cache_key}")
                return Response(
                    content=cached_data["content"],
                    status_code=cached_data["status_code"],
                    headers=cached_data["headers"],
                    media_type=cached_data["media_type"]
                )

        # Process request
        response = await call_next(request)

        # Cache successful responses
        if response.status_code == 200:
            # Read response body
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk

            # Store in cache
            self.cache[cache_key] = (
                {
                    "content": response_body,
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "media_type": response.media_type
                },
                time.time()
            )

            # Return new response with the body
            return Response(
                content=response_body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )

        return response