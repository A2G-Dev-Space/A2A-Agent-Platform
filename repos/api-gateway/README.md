# API Gateway Service

## Overview

The API Gateway is the centralized entry point for all A2G Platform backend services. It provides request routing, authentication, rate limiting, and monitoring capabilities.

## Key Features

- **Request Routing**: Automatically routes requests to appropriate backend services
- **JWT Authentication**: Validates JWT tokens and enforces authentication
- **Rate Limiting**: IP-based rate limiting (100 requests per minute)
- **WebSocket Proxy**: Supports WebSocket connections for real-time features
- **Health Monitoring**: Aggregated health checks for all services
- **CORS Support**: Configurable CORS for frontend integration
- **Mock SSO**: Development-only SSO simulator

## Service Routing

| Path Pattern | Target Service | Port |
|-------------|---------------|------|
| `/api/auth/*` | User Service | 8001 |
| `/api/users/*` | User Service | 8001 |
| `/api/agents/*` | Agent Service | 8002 |
| `/api/chat/*` | Chat Service | 8003 |
| `/api/tracing/*` | Tracing Service | 8004 |
| `/api/admin/*` | Admin Service | 8005 |
| `/ws/*` | WebSocket Services | Various |

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Start all services including API Gateway
cd repos/infra
docker compose -f docker-compose.dev.yml up -d

# API Gateway will be available at http://localhost:9050
```

### Local Development

```bash
# Install dependencies
cd repos/api-gateway
uv venv
source .venv/bin/activate
uv sync

# Set environment variables
cp .env.local .env

# Run the gateway
uv run uvicorn app.main:app --host 0.0.0.0 --port 9050 --reload
```

## Configuration

### Environment Variables

```env
# Gateway Settings
GATEWAY_PORT=9050
ENVIRONMENT=development

# Service URLs (Docker)
USER_SERVICE_URL=http://user-service:8001
AGENT_SERVICE_URL=http://agent-service:8002
CHAT_SERVICE_URL=http://chat-service:8003
TRACING_SERVICE_URL=http://tracing-service:8004
ADMIN_SERVICE_URL=http://admin-service:8005

# Mock SSO (Development only)
ENABLE_MOCK_SSO=true

# Security
JWT_SECRET_KEY=your-secret-key
RATE_LIMIT_PER_IP=100
```

## API Endpoints

### Health Check

```bash
# Gateway health
curl http://localhost:9050/health

# All services health
curl http://localhost:9050/api/health
```

### Authentication Flow

1. **Login Request**
```bash
curl -X POST http://localhost:9050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'
```

2. **SSO Callback**
```bash
curl -X POST http://localhost:9050/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "mock-id-token-dev1"}'
```

3. **Protected Request**
```bash
curl http://localhost:9050/api/agents \
  -H "Authorization: Bearer {jwt_token}"
```

## Mock SSO (Development)

When `ENABLE_MOCK_SSO=true`, a mock SSO login page is available at:

```
http://localhost:9050/mock-sso?redirect_uri=http://localhost:9060/callback
```

Available test users:
- 한승하 (syngha.han) - ADMIN
- 이병주 (byungju.lee) - ADMIN
- 김영섭 (youngsub.kim) - DEVELOPER
- 안준형 (junhyung.ahn) - DEVELOPER

## WebSocket Support

The gateway proxies WebSocket connections:

```javascript
const ws = new WebSocket('ws://localhost:9050/ws/chat/session-123');
ws.send(JSON.stringify({ type: 'message', content: 'Hello' }));
```

## Middleware

### Authentication Middleware

- Validates JWT tokens on all protected routes
- Adds user information to request context
- Public paths: `/health`, `/api/health`, `/api/auth/*`, `/mock-sso`

### Rate Limiting Middleware

- Limits requests per IP address
- Default: 100 requests per minute
- Returns 429 status when exceeded

### Logging Middleware

- Logs all requests and responses
- Includes duration and status codes
- Adds custom headers: `X-Process-Time`, `X-Gateway-Version`

## Error Handling

Standard error response format:

```json
{
  "error": {
    "code": "GTW_001",
    "message": "User-friendly message",
    "details": {},
    "timestamp": "2025-01-01T00:00:00Z",
    "trace_id": "uuid"
  }
}
```

## Development Tips

### Testing Service Routing

```bash
# Test User Service routing
curl http://localhost:9050/api/users/me \
  -H "Authorization: Bearer {token}"

# Test Agent Service routing
curl http://localhost:9050/api/agents

# Test Admin Service routing
curl http://localhost:9050/api/admin/statistics
```

### Debugging

1. Check gateway logs:
```bash
docker logs a2g-api-gateway -f
```

2. Verify service health:
```bash
curl http://localhost:9050/api/health | jq
```

3. Test individual service connectivity:
```bash
# From inside the gateway container
docker exec -it a2g-api-gateway curl http://user-service:8001/health
```

## Production Considerations

1. **SSL/TLS**: Use proper certificates in production
2. **Rate Limiting**: Adjust limits based on expected traffic
3. **Monitoring**: Integrate with APM tools (Datadog, New Relic, etc.)
4. **Logging**: Ship logs to centralized logging system
5. **Security**: Update JWT secret key, disable Mock SSO
6. **Scaling**: Deploy multiple gateway instances behind a load balancer

## Troubleshooting

### Common Issues

1. **502 Bad Gateway**
   - Check if backend service is running
   - Verify service URL configuration
   - Check Docker network connectivity

2. **401 Unauthorized**
   - Verify JWT token is valid
   - Check JWT secret key configuration
   - Ensure token hasn't expired

3. **429 Too Many Requests**
   - Rate limit exceeded
   - Wait or increase RATE_LIMIT_PER_IP

4. **Connection Refused**
   - Ensure gateway is running on correct port
   - Check firewall/security group settings

## Contributing

1. Follow FastAPI best practices
2. Add tests for new features
3. Update this README for significant changes
4. Ensure all endpoints are documented

## License

Copyright (c) 2025 A2G Platform Development Team