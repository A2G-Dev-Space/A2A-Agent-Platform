# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Table of Contents

1. [Common Development Tasks](#common-development-tasks)
   - [Starting the Development Environment](#starting-the-development-environment)
   - [Hybrid Development](#hybrid-development-run-specific-service-locally)
   - [Python Package Management with UV](#python-package-management-with-uv)
   - [Running Tests](#running-tests)
   - [Building for Production](#building-for-production)
   - [Database Migrations](#database-migrations)
   - [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

2. [High-Level Architecture](#high-level-architecture)
   - [System Overview](#system-overview)
   - [Core Components](#core-components)
   - [A2A Protocol](#a2a-agent-to-agent-protocol)
   - [Service Communication Flow](#service-communication-flow)
   - [Authentication Flow](#authentication-flow)
   - [Development Workflow](#development-workflow)
   - [Key Architectural Decisions](#key-architectural-decisions)

3. [Frontend Development Guidelines](#frontend-development-guidelines)
   - [Performance Optimization](#performance-optimization)
   - [Accessibility (WCAG 2.1 AA)](#accessibility-wcag-21-aa)
   - [Rendering Strategy](#rendering-strategy)
   - [Performance Monitoring](#performance-monitoring)
   - [Pre-Launch Checklist](#pre-launch-checklist)

---

## Common Development Tasks

### Starting the Development Environment

**IMPORTANT: Always use start-dev.sh script instead of direct docker compose commands.**

```bash
# Initial setup (run once)
./start-dev.sh setup

# Start all services
./start-dev.sh full
cd frontend && npm install && npm run dev

# Minimal setup (Frontend + API Gateway + Mock SSO)
./start-dev.sh minimal
cd frontend && npm install && npm run dev

# Stop all services
./start-dev.sh stop

# Frontend will be at http://localhost:9060
# API Gateway will be at http://localhost:9050
```

**Available start-dev.sh commands:**
- `./start-dev.sh setup` - Initialize databases (first time only)
- `./start-dev.sh update` - Update all service databases with latest migrations (after git pull)
- `./start-dev.sh full` - Start all services
- `./start-dev.sh minimal` - Start minimal services (Gateway + SSO + DB)
- `./start-dev.sh gateway` - Start Gateway + DB only
- `./start-dev.sh stop` - Stop all services

### Hybrid Development (Run Specific Service Locally)

For debugging a specific service while keeping others in Docker:

```bash
# 1. Start all services
./start-dev.sh full

# 2. Stop the service you want to debug
docker stop a2g-agent-service

# 3. Run that service locally
cd repos/agent-service
uv sync
uv run uvicorn app.main:app --reload --port 8002

# The service will connect to the same PostgreSQL/Redis as Docker services
# Frontend and API Gateway will route requests to your local instance
```

**When to use:**
- Setting breakpoints for debugging
- Rapid iteration without Docker rebuild
- Testing database migrations locally
- Live development with hot reload

### Python Package Management with UV

**IMPORTANT: This project uses `uv` instead of `pip` for Python dependency management.**

UV is a fast, modern Python package manager. All backend services use `pyproject.toml` for dependency management.

```bash
# Install dependencies from pyproject.toml
cd repos/{service-name}
uv sync

# Run commands in the UV environment (without activating venv)
uv run pytest tests/
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8001

# Create/activate virtual environment (traditional method)
uv venv
source .venv/bin/activate  # Linux/Mac
.venv\Scripts\activate     # Windows

# After activation, commands work normally
pytest tests/
alembic upgrade head
```

**Why UV?**
- Faster than pip (10-100x)
- Deterministic dependency resolution with uv.lock
- Integrated with pyproject.toml standard
- No need to activate virtual environments for `uv run` commands

### Running Tests

```bash
# Backend service tests (recommended: use uv run)
cd repos/{service-name}
uv sync  # Install all dependencies from pyproject.toml
uv run pytest tests/ -v

# Run specific test file
uv run pytest tests/test_agents.py -v

# Run with coverage report
uv run pytest tests/ --cov=app --cov-report=html

# Alternative: activate venv first, then run pytest directly
uv venv && source .venv/bin/activate
uv sync
pytest tests/

# Frontend tests (use browser console at http://localhost:9060)
# Test authentication
localStorage.getItem('accessToken')

# Test API calls
fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(console.log)

# Test WebSocket connection
const ws = new WebSocket('ws://localhost:9050/ws/test-session?token=' + localStorage.getItem('accessToken'))
ws.onopen = () => console.log('Connected')
ws.onmessage = (e) => console.log('Message:', e.data)
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
# Initialize all databases (first time setup)
./start-dev.sh setup

# Update migrations after git pull (important for team development)
./start-dev.sh update

# Create new migration for a service
cd repos/{service-name}
uv run alembic revision --autogenerate -m "Description"

# Apply migrations
uv run alembic upgrade head

# Check current migration version
uv run alembic current

# Manual database operations (if needed)
docker exec -it a2g-postgres-dev psql -U dev_user -d {service}_db
```

### Common Issues and Troubleshooting

**Database connection errors:**
```bash
# Check if PostgreSQL is running
docker exec a2g-postgres-dev pg_isready -U dev_user

# Verify database exists
docker exec a2g-postgres-dev psql -U dev_user -l | grep service_db

# Check service logs for connection issues
docker logs a2g-agent-service | grep -i "database\|connection"
```

**Service won't start:**
```bash
# Check logs for the specific service
docker logs a2g-{service-name}

# Check if port is already in use
lsof -i :8002  # Linux/Mac
netstat -ano | findstr :8002  # Windows

# Restart specific service
docker restart a2g-{service-name}

# Rebuild service if dependencies changed
cd repos/infra
docker compose -f docker-compose.dev.yml up -d --build {service-name}
```

**Migration conflicts:**
```bash
# If migration fails with "already exists" error
# Check current migration version
docker exec a2g-agent-service uv run alembic current

# Stamp database as up-to-date (marks migrations as applied without running)
docker exec a2g-agent-service uv run alembic stamp head

# Or use the update command which handles this automatically
./start-dev.sh update
```

**Frontend can't connect to backend:**
```bash
# Verify API Gateway is running
curl http://localhost:9050/health

# Check if services are registered
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Test direct service access
curl http://localhost:8002/health  # Agent service
curl http://localhost:8001/health  # User service

# Check browser console (F12) for CORS or network errors
```

**UV/Python dependency issues:**
```bash
# Clear UV cache and reinstall
cd repos/{service-name}
rm -rf .venv uv.lock
uv venv
uv sync

# Check Python version
python --version  # Should be 3.11+

# Verify uv is installed
uv --version
```

**Docker issues:**
```bash
# Clean up all containers and volumes (WARNING: deletes all data)
cd repos/infra
docker compose -f docker-compose.dev.yml down -v

# Remove dangling images
docker system prune -a

# Restart Docker Desktop if containers won't start
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
   - Celery workers for async processing
   - Beat scheduler for periodic tasks
   - Flower monitoring UI at http://localhost:5555
   - Uses Redis as broker and result backend

**Standard Service Structure:**
```
service-name/
├── app/
│   ├── main.py              # FastAPI app entry point
│   ├── api/v1/endpoints/    # API route handlers
│   ├── core/                # Config, security, dependencies
│   ├── models/              # SQLAlchemy database models
│   ├── schemas/             # Pydantic request/response schemas
│   └── services/            # Business logic layer
├── alembic/                 # Database migrations
│   ├── versions/            # Migration files
│   └── env.py               # Alembic configuration
├── tests/                   # Pytest tests
├── pyproject.toml           # UV dependencies (replaces requirements.txt)
├── uv.lock                  # Lockfile for deterministic installs
├── Dockerfile.dev           # Development container
└── .env.local               # Local environment variables (gitignored)
```

#### Infrastructure

- **PostgreSQL** (Port 5432): Primary database with separate schemas per service
- **Redis** (Port 6379): Session cache, Celery broker, WebSocket pub/sub
- **Mock SSO** (Port 9999): Development authentication service

### A2A (Agent-to-Agent) Protocol

The platform implements a standardized JSON-RPC 2.0 based protocol for agent communication:

```json
{
  "jsonrpc": "2.0",
  "method": "sendMessage",
  "params": {
    "message": {
      "messageId": "msg-123",
      "role": "user",
      "parts": [{"kind": "text", "text": "Task description"}],
      "kind": "message"
    },
    "configuration": {"blocking": true}
  },
  "id": "request-001"
}
```

**Supported frameworks (3가지 유형)**:

**1️⃣ A2A Native Frameworks (Direct Call - Proxy 불필요) ⭐**
- **Google ADK**: A2A Protocol 네이티브 지원
  - Input: Base URL only (`http://your-server:8080`)
  - Agent Card Discovery: `{base_url}/.well-known/agent-card.json`
  - Call Flow: Frontend → Agent A2A Endpoint (Direct)
  - **No Proxy Required** → Optimal performance

**2️⃣ Well-known Non-A2A Frameworks (Proxy 필요) 🔄**
- **Agno OS**: Standard endpoint pattern, protocol translation required
  - Input: Base URL + Agent ID
  - Pattern: `{base_url}/agents/{agent_id}/runs`
  - Call Flow: Frontend → A2A Proxy → Protocol Translation → Agent

**3️⃣ Custom Frameworks (Proxy 필요) 🔧**
- **Langchain**: User provides full URL (`http://my-server.com/langchain/invoke`)
- **Custom**: User provides full URL for custom A2A-compliant agents
  - Call Flow: Frontend → A2A Proxy → Protocol Translation → Agent

**💡 Note**: Agno OS will transition to A2A Native once A2A Protocol support is complete.

---

**Universal A2A Proxy**: Agent Service provides a unified A2A interface for **Non-A2A frameworks only** (Agno OS, Langchain, Custom):
- **A2A Native Bypass**: Google ADK agents are called directly without proxy
- **Agent Card Discovery**: Standard `.well-known/agent-card.json` endpoint for metadata
- **Framework Adapters**: Automatic protocol translation for Non-A2A frameworks
- **A2A JS SDK Compatible**: Frontend can use standard A2A JS SDK to communicate with any agent
- **Unified Access Control**: Visibility rules (public/private/team) enforced at proxy layer
- **Streaming Support**: Server-Sent Events (SSE) for real-time responses (`blocking: false`)

Key endpoints:
- `GET /api/a2a/proxy/{agent_id}/.well-known/agent-card.json` - Agent Card discovery (metadata)
- `POST /api/a2a/proxy/{agent_id}/tasks/send` - Send message (Non-A2A frameworks only)
- **Workbench Testing**: Supports both A2A Proxy endpoint and Direct Original endpoint
- See [A2A_INTEGRATION_DESIGN.md](./A2A_INTEGRATION_DESIGN.md) for detailed architecture

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
- **Git Submodules**: Services are managed as separate git repositories
  - Each service in `repos/` is an independent git repository
  - Main repo coordinates all services via git submodules
  - Clone with `--recursive` flag: `git clone --recursive <url>`
  - Update submodules after pull: `git submodule update --remote`
  - See `repos/SUBMODULE_DEVELOPMENT_GUIDE.md` for detailed workflow
- **Docker Compose**: Unified development environment setup
- **UV Package Manager**: Fast, modern Python dependency management with pyproject.toml
- **JWT Authentication**: Stateless authentication across services
- **WebSocket + Redis**: Real-time communication and pub/sub messaging
- **pgvector**: Vector database capabilities for agent similarity search (Agent Service)

### Important File Locations

- Frontend configuration: `frontend/vite.config.ts`
- API Gateway: `repos/api-gateway/`
- Docker Compose: `repos/infra/docker-compose.dev.yml`
- Service templates: `repos/shared/`
- Database init: `repos/infra/init-db.sql`

### Environment Variables

Each service uses `.env.local` for local development configuration:

```bash
# Services look for .env.local first, falling back to .env
# NEVER commit .env.local (contains secrets and local settings)
# Use .env.example as template if provided

# Copy example and customize:
cp .env.example .env.local  # Then edit .env.local

# Common variables across all services:
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@localhost:5432/{service}_db
REDIS_URL=redis://localhost:6379/{db_number}
JWT_SECRET_KEY=local-dev-secret-key
DEBUG=true
LOG_LEVEL=INFO

# Service-specific variables:

# User Service
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9060/callback

# Agent Service (requires OpenAI API key for Top-K embeddings)
OPENAI_API_KEY=sk-...  # Get from https://platform.openai.com/api-keys

# Chat Service
WEBSOCKET_PING_INTERVAL=30
WEBSOCKET_PING_TIMEOUT=10

# Worker Service (Celery)
CELERY_BROKER_URL=redis://localhost:6379/6
CELERY_RESULT_BACKEND=redis://localhost:6379/7
```

**Important Notes:**
- Each service uses a different Redis database number (0-7) to avoid conflicts
- PostgreSQL uses separate databases per service (e.g., `user_service_db`, `agent_service_db`)
- The `+asyncpg` in DATABASE_URL is required for async SQLAlchemy support
- In Docker, `localhost` is replaced with service names (e.g., `postgres:5432`)

### Port Allocation Strategy

- 9060: Frontend application
- 9050: API Gateway (FastAPI)
- 9999: Mock SSO
- 800X: Backend services (8001-8005)
- 5432: PostgreSQL
- 6379: Redis

## Frontend Development Guidelines

### Performance Optimization

**IMPORTANT: This is an internal web application (intranet, desktop-only). Focus on performance and accessibility, not SEO or mobile optimization.**

#### Core Web Vitals Targets
- **LCP (Largest Contentful Paint)**: < 2.5s
- **INP (Interaction to Next Paint)**: < 200ms
- **CLS (Cumulative Layout Shift)**: < 0.1
- **FCP (First Contentful Paint)**: < 1.8s

#### Image Optimization
```typescript
// Use Next.js Image component or similar optimization
import Image from 'next/image';

<Image
  src="/charts/sales-report.png"
  alt="Sales report chart"
  width={1200}
  height={600}
  priority  // Only for LCP images
  loading="lazy"  // For below-the-fold images
/>
```

**Guidelines:**
- Use WebP format (30% smaller than JPEG)
- Lazy load images below the fold
- Specify explicit width/height to prevent CLS
- Alt text for all images (accessibility)

#### Font Optimization
```html
<!-- index.html: Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

```css
/* Tailwind CSS configuration */
@layer base {
  body {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  code, pre {
    font-family: 'JetBrains Mono', monospace;
  }
}
```

**Guidelines:**
- Use Google Fonts with `display=swap` parameter (automatically applied)
- preconnect to reduce DNS lookup time
- Load only required font-weights (400, 500, 700)
- System font fallback for better performance

#### JavaScript Optimization
```typescript
// Dynamic imports for heavy components
import dynamic from 'next/dynamic';

const SalesChart = dynamic(() => import('@/components/SalesChart'), {
  loading: () => <p>Loading chart...</p>,
  ssr: false
});
```

**Guidelines:**
- Code splitting by route
- Dynamic imports for heavy components (charts, tables)
- Tree-shaking enabled
- Bundle size < 500KB for first load
- All assets hosted internally (no external CDN)

### Accessibility (WCAG 2.1 AA)

#### Semantic HTML
```tsx
<html lang="ko">
  <body>
    <header>
      <nav aria-label="Main navigation">
        {/* Navigation */}
      </nav>
    </header>

    <main id="main-content">
      <article>
        <h1>Page Title</h1>  {/* Exactly one H1 per page */}
        <h2>Section</h2>     {/* Hierarchical structure */}
      </article>
    </main>

    <aside aria-label="Sidebar">
      {/* Secondary content */}
    </aside>

    <footer>
      {/* Footer */}
    </footer>
  </body>
</html>
```

#### Keyboard Navigation
```tsx
// Accessible Modal Example
function Modal({ isOpen, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      modalRef.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Modal content */}
    </div>
  );
}
```

**Guidelines:**
- Tab navigation for all interactive elements
- Enter/Space to activate buttons
- Escape to close modals
- Visible focus indicators
- aria-labels for screen readers
- Color contrast 4.5:1 for text

### Rendering Strategy

| Strategy | Use Case | Performance |
|----------|----------|-------------|
| **SSG** | Company policies, announcements | Fastest |
| **SSR** | Admin pages, reports (server auth) | Moderate |
| **CSR** | Dashboards, real-time data | Fast interaction |

```typescript
// Next.js App Router examples

// SSG: Static pages
export const revalidate = false;

// SSR: Server authentication required
export const dynamic = 'force-dynamic';

// CSR: Client-side rendering
'use client';
```

### Performance Monitoring

```bash
# Run Lighthouse audit (target: 90+)
npm run build
npx lighthouse http://localhost:9060 --view

# Bundle analyzer
ANALYZE=true npm run build
```

**Tools:**
- Lighthouse (Chrome DevTools)
- Bundle Analyzer
- Web Vitals library

### Pre-Launch Checklist

#### Performance
- [ ] LCP < 2.5s
- [ ] INP < 200ms
- [ ] CLS < 0.1
- [ ] Images: WebP + lazy loading
- [ ] Fonts: WOFF2 + preload
- [ ] JavaScript bundle < 500KB

#### Accessibility
- [ ] WCAG 2.1 AA compliance
- [ ] Keyboard navigation complete
- [ ] Screen reader tested
- [ ] Color contrast 4.5:1
- [ ] Focus indicators visible

#### Code Quality
- [ ] Semantic HTML structure
- [ ] Exactly one H1 per page
- [ ] aria-labels properly used
- [ ] No console errors
- [ ] TypeScript strict mode

#### Security
- [ ] HTTPS (internal certificate)
- [ ] CSP headers
- [ ] No XSS vulnerabilities
- [ ] SSO integration complete