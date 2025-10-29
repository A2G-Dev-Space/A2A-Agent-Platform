# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Tasks

### Starting the Development Environment

```bash
# Quick start with Docker Compose (all services including API Gateway)
docker compose -f repos/infra/docker-compose.dev.yml up -d
cd frontend && npm install && npm run dev

# Minimal setup (Frontend + API Gateway + Mock SSO)
docker compose -f repos/infra/docker-compose.dev.yml up -d api-gateway mock-sso postgres redis
cd frontend && npm install && npm run dev

# Frontend will be at http://localhost:9060
# API Gateway will be at http://localhost:9050
```

### Running Tests

```bash
# Frontend tests (use browser console at http://localhost:9060)
# Test authentication
localStorage.getItem('accessToken')

# Test API calls
fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(console.log)

# Backend service tests (local development)
cd repos/{service-name}
uv sync  # Install all dependencies from pyproject.toml
uv run pytest tests/

# Or activate virtual environment first
uv venv && source .venv/bin/activate
uv sync
pytest tests/
```

### Building for Production

```bash
# Frontend build
cd frontend
npm run build

# Backend services use Docker
cd repos/{service-name}
docker build -f Dockerfile -t a2g-{service-name}:latest .
```

### Database Migrations

```bash
# For each backend service
cd repos/{service-name}
alembic revision --autogenerate -m "Description"
alembic upgrade head

# Initialize databases in Docker
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres <<EOF
CREATE DATABASE user_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
CREATE DATABASE admin_service_db;
EOF

# Enable pgvector for Agent Service
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## High-Level Architecture

### System Overview

The A2G Platform is a microservices-based AI agent development platform with three operational modes:

- **Workbench**: Agent development and testing environment
- **Hub**: Production agent marketplace
- **Flow**: Multi-agent orchestration interface

### Core Components

#### Frontend (`/frontend`)
- **Tech Stack**: React 19, TypeScript, Vite, Tailwind CSS, Zustand
- **Port**: 9060
- **Key Features**:
  - Three distinct operational modes with unique themes
  - SSO authentication integration
  - Real-time WebSocket communication
  - Responsive design for all screen sizes
  - Communicates through unified API Gateway

#### Backend Services (`/repos/*`)

Each service follows a standard FastAPI microservice pattern:

1. **API Gateway** (Port 9050): Request routing, authentication, rate limiting
2. **User Service** (Port 8001): Authentication, authorization, user management
3. **Agent Service** (Port 8002): Agent CRUD, A2A protocol, Top-K recommendations
4. **Chat Service** (Port 8003): WebSocket sessions, message streaming
5. **Tracing Service** (Port 8004): Log proxy, real-time tracing
6. **Admin Service** (Port 8005): LLM model management, platform statistics
7. **Worker Service**: Celery-based background tasks

#### Infrastructure

- **PostgreSQL** (Port 5432): Primary database with separate schemas per service
- **Redis** (Port 6379): Session cache, Celery broker, WebSocket pub/sub
- **Mock SSO** (Port 9999): Development authentication service

### A2A (Agent-to-Agent) Protocol

The platform implements a standardized JSON-RPC 2.0 based protocol for agent communication:

```json
{
  "jsonrpc": "2.0",
  "method": "agent.execute",
  "params": {
    "task": "Task description",
    "context": {"user_id": "user.id"}
  },
  "id": "request-001"
}
```

Supported frameworks: Agno, ADK, Langchain, Custom

### Service Communication Flow

```
User → Frontend (9060) → API Gateway (9050) → Backend Services (800X) → PostgreSQL/Redis
                            ↓
                        WebSocket → Chat Service → Redis Pub/Sub
```

### Authentication Flow

1. User initiates login from Frontend
2. Redirects to SSO provider (Mock SSO in dev)
3. SSO validates and returns to callback URL
4. User Service validates SSO response and issues JWT
5. Frontend stores JWT in localStorage
6. All API calls include JWT in Authorization header

### Development Workflow

1. **Frontend Development**: Start with API Gateway and Mock SSO for rapid UI development
2. **Service Implementation**: Develop backend services independently with their own databases
3. **Integration Testing**: Use Frontend to test real backend services through API Gateway
4. **Real-time Features**: Test WebSocket connections through API Gateway to Chat Service

### Key Architectural Decisions

- **Microservices**: Each service is independently deployable with its own database
- **API Gateway**: Centralized entry point with authentication and routing
- **Git Submodules**: Services are managed as separate repositories
- **Docker Compose**: Unified development environment setup
- **JWT Authentication**: Stateless authentication across services
- **WebSocket + Redis**: Real-time communication and pub/sub messaging
- **pgvector**: Vector database capabilities for agent similarity search

### Important File Locations

- Frontend configuration: `frontend/vite.config.ts`
- API Gateway: `repos/api-gateway/`
- Docker Compose: `repos/infra/docker-compose.dev.yml`
- Service templates: `repos/shared/`
- Database init: `repos/infra/init-db.sql`

### Environment Variables

Each service uses `.env.local` for configuration:

```bash
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/{service}_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=local-dev-secret-key
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9060/callback
```

### Port Allocation Strategy

- 9060: Frontend application
- 9050: API Gateway (FastAPI)
- 9999: Mock SSO
- 800X: Backend services (8001-8005)
- 5432: PostgreSQL
- 6379: Redis