"""
A2G Platform API Gateway
Centralized entry point for all backend services
"""
from fastapi import FastAPI, Request, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import httpx
import os
import logging
from typing import Optional, Dict, Any
import json
import asyncio
from datetime import datetime

from app.websocket_proxy import proxy_websocket

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Service routing configuration
# NOTE: Order matters! More specific routes must come first
SERVICE_ROUTES = {
    # Authentication & Users (User Service)
    '/api/auth': os.getenv('USER_SERVICE_URL', 'http://user-service:8001'),
    '/api/v1/users': os.getenv('USER_SERVICE_URL', 'http://user-service:8001'),  # Platform keys and other v1 endpoints
    '/api/users': os.getenv('USER_SERVICE_URL', 'http://user-service:8001'),

    # Admin - User Management (User Service) - Must be before /api/admin
    '/api/admin/users': os.getenv('USER_SERVICE_URL', 'http://user-service:8001'),

    # Admin - LLM & Statistics (Admin Service)
    '/api/admin/llm-models': os.getenv('ADMIN_SERVICE_URL', 'http://admin-service:8005'),
    '/api/admin/statistics': os.getenv('ADMIN_SERVICE_URL', 'http://admin-service:8005'),
    '/api/admin': os.getenv('ADMIN_SERVICE_URL', 'http://admin-service:8005'),

    # LLM Proxy Service (OpenAI Compatible Endpoint)
    '/api/llm': os.getenv('LLM_PROXY_SERVICE_URL', 'http://llm-proxy-service:8006'),

    # Other Services
    '/api/agents': os.getenv('AGENT_SERVICE_URL', 'http://agent-service:8002'),
    '/api/workbench': os.getenv('CHAT_SERVICE_URL', 'http://chat-service:8003'),  # Workbench endpoints
    '/api/chat': os.getenv('CHAT_SERVICE_URL', 'http://chat-service:8003'),
    '/api/tracing': os.getenv('TRACING_SERVICE_URL', 'http://tracing-service:8004'),
}

# Services that need path prefix stripping (prefix will be removed before forwarding)
STRIP_PREFIX_SERVICES = {
    '/api/llm',  # LLM Proxy expects /v1/... not /api/llm/v1/...
}

# WebSocket routes
WEBSOCKET_ROUTES = {
    '/ws/chat': os.getenv('CHAT_SERVICE_URL', 'http://chat-service:8003'),
    '/ws/trace': os.getenv('TRACING_SERVICE_URL', 'http://tracing-service:8004'),
}

# HTTP client pool for better performance
http_client: Optional[httpx.AsyncClient] = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle"""
    global http_client
    # Startup
    logger.info("Starting API Gateway...")
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(30.0, connect=5.0),
        limits=httpx.Limits(max_keepalive_connections=20, max_connections=100)
    )

    # Log service routes
    logger.info("Service routing configuration:")
    for route, service_url in SERVICE_ROUTES.items():
        logger.info(f"  {route} -> {service_url}")

    yield

    # Shutdown
    logger.info("Shutting down API Gateway...")
    if http_client:
        await http_client.aclose()

# Create FastAPI app
app = FastAPI(
    title="A2G API Gateway",
    description="Centralized API Gateway for A2G Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9060",  # Frontend dev server
        "http://localhost:9061",  # Frontend dev server (alternate port)
        "http://localhost:9050",  # Production frontend
        "https://localhost:9050",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_service_url(path: str) -> Optional[str]:
    """Determine which service should handle this request"""
    for route_prefix, service_url in SERVICE_ROUTES.items():
        if path.startswith(route_prefix):
            return service_url
    return None

def get_route_prefix(path: str) -> Optional[str]:
    """Get the matched route prefix for stripping"""
    for route_prefix in SERVICE_ROUTES.keys():
        if path.startswith(route_prefix):
            return route_prefix
    return None

def get_target_path(path: str) -> str:
    """Get the target path for the backend service, optionally stripping the route prefix"""
    route_prefix = get_route_prefix(path)
    if route_prefix and route_prefix in STRIP_PREFIX_SERVICES:
        # Strip the route prefix for services that need it (e.g., /api/llm from /api/llm/v1/chat/completions)
        target_path = path[len(route_prefix):]
        # Ensure path starts with /
        if not target_path.startswith('/'):
            target_path = '/' + target_path
        return target_path
    # For other services, keep the full path
    # Remove any double slashes
    return path.replace('//', '/')

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "api-gateway",
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/health")
async def api_health_check():
    """Check health of all backend services"""
    health_status = {}

    for route, service_url in SERVICE_ROUTES.items():
        try:
            response = await http_client.get(f"{service_url}/health", timeout=2.0)
            health_status[route] = {
                "status": "healthy" if response.status_code == 200 else "unhealthy",
                "status_code": response.status_code,
                "service_url": service_url
            }
        except Exception as e:
            health_status[route] = {
                "status": "unhealthy",
                "error": str(e),
                "service_url": service_url
            }

    # Determine overall health
    all_healthy = all(
        service.get("status") == "healthy"
        for service in health_status.values()
    )

    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": health_status,
        "timestamp": datetime.utcnow().isoformat()
    }

async def proxy_request(request: Request, service_url: str, path: str):
    """Proxy HTTP request to backend service"""
    if not http_client:
        raise HTTPException(status_code=500, detail="HTTP client not initialized")

    # Get target path (with route prefix stripped)
    target_path = get_target_path(path)

    # Build target URL
    target_url = f"{service_url}{target_path}"

    # Get query parameters
    query_params = dict(request.query_params)

    # Get headers (excluding host)
    headers = dict(request.headers)
    headers.pop("host", None)

    # Get body for non-GET requests
    body = None
    if request.method != "GET":
        body = await request.body()

    logger.info(f"Proxying {request.method} {path} -> {target_url}")

    try:
        # Make the request to the backend service
        response = await http_client.request(
            method=request.method,
            url=target_url,
            params=query_params,
            headers=headers,
            content=body
        )

        # Return the response
        return StreamingResponse(
            content=response.iter_bytes(),
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type", "application/json")
        )

    except httpx.TimeoutException:
        logger.error(f"Timeout while proxying to {target_url}")
        raise HTTPException(status_code=504, detail="Gateway timeout")
    except httpx.ConnectError:
        logger.error(f"Connection error while proxying to {target_url}")
        raise HTTPException(status_code=502, detail="Bad gateway - service unavailable")
    except Exception as e:
        logger.error(f"Error proxying request: {str(e)}")
        raise HTTPException(status_code=502, detail=f"Bad gateway: {str(e)}")

@app.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"])
async def gateway_proxy(request: Request, path: str):
    """Main gateway proxy handler"""

    # Add /api prefix if not present (for backward compatibility)
    if not path.startswith("api/"):
        path = f"/{path}"
    else:
        path = f"/{path}"

    # Find the appropriate service
    service_url = get_service_url(path)

    if not service_url:
        logger.warning(f"No service found for path: {path}")
        raise HTTPException(status_code=404, detail=f"No service found for path: {path}")

    # Get the target path
    target_path = get_target_path(path)

    # Proxy the request
    return await proxy_request(request, service_url, target_path)

@app.websocket("/ws/{path:path}")
async def websocket_proxy_handler(websocket: WebSocket, path: str):
    """WebSocket proxy handler"""

    # Determine the backend service
    ws_path = f"/ws/{path}"
    service_url = None
    matched_route = None

    for route_prefix, url in WEBSOCKET_ROUTES.items():
        if ws_path.startswith(route_prefix):
            service_url = url
            matched_route = route_prefix
            break

    if not service_url:
        await websocket.close(code=1008, reason="No service found for WebSocket path")
        return

    # Convert http to ws protocol
    ws_service_url = service_url.replace("http://", "ws://").replace("https://", "wss://")
    target_url = f"{ws_service_url}{ws_path}"

    # Extract query parameters (e.g., token)
    query_params = dict(websocket.query_params)

    logger.info(f"Proxying WebSocket {ws_path} -> {target_url}")

    # Use the proper WebSocket proxy
    await proxy_websocket(websocket, target_url, query_params)

# SSO Mock endpoint (for development)
if os.getenv("ENABLE_MOCK_SSO", "false").lower() == "true":
    @app.get("/mock-sso")
    async def mock_sso_login(redirect_uri: str):
        """Mock SSO login page for development"""
        html_content = """
        <!DOCTYPE html>
        <html>
        <head>
            <title>Mock SSO Login</title>
            <style>
                body {
                    font-family: system-ui, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    margin: 0;
                    padding: 20px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    min-height: 100vh;
                }
                .container {
                    background: white;
                    border-radius: 12px;
                    padding: 30px;
                    box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                    max-width: 500px;
                    width: 100%;
                }
                h1 {
                    color: #333;
                    margin: 0 0 20px 0;
                }
                .user-card {
                    background: #f8f9fa;
                    border: 1px solid #e0e0e0;
                    border-radius: 8px;
                    padding: 15px;
                    margin: 10px 0;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .user-card:hover {
                    background: #e9ecef;
                    border-color: #667eea;
                    transform: translateY(-1px);
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>🔐 Mock SSO Login</h1>
                <p>Select a user to login (Development Only):</p>
                <div class="user-card" onclick="login('dev1')">
                    <strong>한승하 (syngha.han)</strong><br>
                    AI Platform Team - ADMIN
                </div>
                <div class="user-card" onclick="login('dev2')">
                    <strong>이병주 (byungju.lee)</strong><br>
                    AI Platform Team - ADMIN
                </div>
                <div class="user-card" onclick="login('dev3')">
                    <strong>김영섭 (youngsub.kim)</strong><br>
                    AI Platform Team - DEVELOPER
                </div>
                <div class="user-card" onclick="login('dev4')">
                    <strong>안준형 (junhyung.ahn)</strong><br>
                    AI Platform Team - DEVELOPER
                </div>
            </div>
            <script>
                function login(userId) {
                    const token = 'mock-id-token-' + userId;
                    window.location.href = '""" + redirect_uri + """?id_token=' + token;
                }
            </script>
        </body>
        </html>
        """
        from fastapi.responses import HTMLResponse
        return HTMLResponse(content=html_content)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=9050,
        reload=True,
        log_level="info"
    )