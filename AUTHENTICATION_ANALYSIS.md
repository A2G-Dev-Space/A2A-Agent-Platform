# A2A Agent Platform - Authentication System & Mock SSO Analysis

## Executive Summary
This document provides a comprehensive analysis of the authentication system and mock-SSO implementation in the A2A Agent Platform. The system uses a mock SSO provider for development purposes, with JWT-based token authentication and multi-service architecture.

---

## 1. Mock SSO Implementation

### Location
- **File**: `/home/aidivn/A2A-Agent-Platform/repos/infra/mock-sso/main.py`
- **Port**: 9999
- **Framework**: FastAPI

### Architecture
The mock SSO service is a lightweight FastAPI application designed to simulate an SSO provider for local development.

### Key Endpoints

#### 1.1 Login Page
- **Endpoint**: `GET /mock-sso/login`
- **Parameters**: 
  - `redirect_uri` (required): Callback URL after authentication
  - `client_id` (optional): Client ID (ignored in mock)
  - `state` (optional): State parameter for CSRF protection
- **Response**: HTML page with user selection interface
- **Features**:
  - Pre-defined mock users (dev1, dev2, dev3, dev4, testuser, pending)
  - Custom user creation form
  - Beautiful gradient UI with user cards

#### 1.2 Process Login (GET)
- **Endpoint**: `GET /mock-sso/do-login`
- **Parameters**:
  - `redirect_uri` (required)
  - `user` (optional): User key (default: dev1)
  - `state` (optional): CSRF state token
- **Process**: Generates ID token and redirects to callback URI with token in query parameter
- **Token Format**: JWT with HS256 algorithm

#### 1.3 Process Login (POST)
- **Endpoint**: `POST /mock-sso/do-login`
- **Body**: JSON with custom user data
- **Response**: JSON with redirect_url containing ID token
- **Use Case**: Custom user creation from login page

#### 1.4 Logout
- **Endpoint**: `GET /mock-sso/logout`
- **Parameters**: `redirect_uri` (optional)
- **Response**: Redirect or logout message

#### 1.5 Token Verification
- **Endpoint**: `GET /mock-sso/verify`
- **Parameters**: `token` (required)
- **Response**: Token validity status and decoded payload

#### 1.6 List Users
- **Endpoint**: `GET /mock-sso/users`
- **Response**: JSON array of available mock users with roles

#### 1.7 Health Check
- **Endpoint**: `GET /health`
- **Response**: Service health status

### Mock Users Database

```python
MOCK_USERS = {
    "dev1": {
        "loginid": "syngha.han",
        "username": "한승하",
        "mail": "syngha.han@company.com",
        "deptid": "ai_platform",
        "deptname": "AI 플랫폼팀",
        "deptname_en": "AI Platform Team",
        "role": "ADMIN"
    },
    "dev2": {...},  # byungju.lee - ADMIN
    "dev3": {...},  # youngsub.kim - ADMIN
    "dev4": {...},  # junhyung.ahn - ADMIN
    "testuser": {...},  # test.user - USER
    "pending": {...}   # pending.user - PENDING
}
```

### JWT Token Generation

```python
def create_id_token(user_data: dict) -> str:
    payload = {
        **user_data,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1),  # 1-hour expiration
        "iss": "mock-sso",
        "aud": "a2g-platform"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
```

**Key Claims**:
- `loginid`: User login ID
- `username`: Full name (Korean)
- `mail`: Email address
- `deptid`: Department ID
- `deptname`: Department name (Korean)
- `deptname_en`: Department name (English)
- `role`: User role (ADMIN, USER, PENDING, NEW)
- `iat`: Issued at timestamp
- `exp`: Expiration timestamp (1 hour)
- `iss`: Issuer (mock-sso)
- `aud`: Audience (a2g-platform)

### CORS Configuration
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 2. Backend Authentication Flow

### 2.1 API Gateway (Port 9050)

**Location**: `/home/aidivn/A2A-Agent-Platform/repos/api-gateway/`

#### Gateway Configuration
```python
# Service routing
SERVICE_ROUTES = {
    '/api/auth': 'http://user-service:8001',
    '/api/users': 'http://user-service:8001',
    '/api/agents': 'http://agent-service:8002',
    '/api/chat': 'http://chat-service:8003',
    '/api/tracing': 'http://tracing-service:8004',
    '/api/admin': 'http://admin-service:8005',
    '/api/llm': 'http://llm-proxy-service:8006',
}
```

#### Middleware Stack
1. **CORSMiddleware**: Allow all origins for development
2. **AuthenticationMiddleware**: JWT verification
3. **LoggingMiddleware**: Request/response logging
4. **RateLimitMiddleware**: Rate limiting (100 requests/minute per IP)
5. **CacheMiddleware**: Response caching for GET requests (60s TTL)

#### Authentication Middleware
- **Public Paths** (no auth required):
  - `/health`
  - `/api/health`
  - `/api/auth/login`
  - `/api/auth/callback`
  - `/api/auth/refresh`
  - `/mock-sso`
  - `/docs`
  - `/openapi.json`

- **Token Extraction**: 
  - Format: `Authorization: Bearer <token>`
  - JWT Algorithm: HS256
  - Claims extracted to `request.state.user`

### 2.2 User Service Authentication (Port 8001)

**Location**: `/home/aidivn/A2A-Agent-Platform/repos/user-service/`

#### Authentication Endpoints

##### POST /api/auth/login
**Purpose**: Initiate SSO login process
**Request**:
```json
{
  "redirect_uri": "http://localhost:9060/callback"
}
```

**Response**:
```json
{
  "sso_login_url": "http://mock-sso:9999/mock-sso/login?redirect_uri=..."
}
```

**Logic**:
```python
sso_url = f"{settings.IDP_ENTITY_ID}?redirect_uri={request.redirect_uri}"
# IDP_ENTITY_ID = "http://172.17.0.1:9999/mock-sso/login"
```

##### POST /api/auth/callback
**Purpose**: Handle SSO callback with ID token
**Request (Body or Query)**:
```json
{
  "id_token": "<JWT_ID_TOKEN>"
}
// OR
GET /api/auth/callback?id_token=<JWT_ID_TOKEN>
```

**Response**:
```json
{
  "access_token": "<JWT_ACCESS_TOKEN>",
  "token_type": "Bearer",
  "expires_in": 43200,  // 12 hours in seconds
  "user": {
    "username": "syngha.han",
    "username_kr": "한승하",
    "email": "syngha.han@company.com",
    "department": "ai_platform",
    "department_kr": "AI 플랫폼팀",
    "department_en": "AI Platform Team",
    "role": "ADMIN"
  }
}
```

**Token Verification Process**:
```python
# ID token decoding with loose verification (dev only)
id_payload = jwt.decode(
    token, 
    settings.JWT_SECRET_KEY,
    algorithms=["HS256"],
    options={
        "verify_signature": False,  # Skip signature in dev
        "verify_aud": False,        # Skip audience in dev
        "verify_exp": True,         # Still verify expiration
        "verify_iat": False         # Skip issued-at in dev
    }
)
```

**User Handling**:
- **Existing Users**: Update `last_login` and department fields from SSO
- **New Users**: Issue token with role="NEW" without creating DB entry
- **Database**: User created separately via signup request

##### POST /api/auth/logout
**Purpose**: Logout user (client-side token invalidation)
**Response**:
```json
{
  "message": "Successfully logged out"
}
```

#### Security Utilities
**Location**: `/home/aidivn/A2A-Agent-Platform/repos/user-service/app/core/security.py`

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=720)  # 12 hours
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.JWT_SECRET_KEY, 
        algorithm=settings.JWT_ALGORITHM
    )
    return encoded_jwt
```

**Token Claims in Access Token**:
- `sub`: Username (from loginid)
- `role`: User role (NEW, USER, ADMIN, PENDING)
- `department`: Department code
- `department_kr`: Korean department name
- `department_en`: English department name
- `exp`: Expiration time
- `iat`: Issued at time

---

## 3. Frontend Authentication Flow

### 3.1 Architecture
- **State Management**: Zustand with persistence
- **API Client**: Axios with interceptors
- **Storage**: localStorage (Zustand persist middleware)

### 3.2 Authentication Store
**Location**: `/home/aidivn/A2A-Agent-Platform/frontend/src/stores/authStore.ts`

```typescript
interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}
```

**Key Methods**:

#### login()
- Calls `initiateLogin(redirectUri)` with callback URL
- Redirects to SSO login URL
- Sets `isLoading: true`

#### loginCallback(idToken: string)
- Receives ID token from SSO callback
- Sends to backend: `POST /api/auth/callback`
- Stores `accessToken` in Zustand and localStorage
- Updates user info
- Sets `isAuthenticated: true`

#### logout()
- Calls `POST /api/auth/logout`
- Clears auth state
- Removes localStorage tokens

#### Persistence
```typescript
{
  name: 'auth-storage',
  partialize: (state) => ({
    user: state.user,
    accessToken: state.accessToken,
    isAuthenticated: state.isAuthenticated,
  }),
}
```

### 3.3 API Service
**Location**: `/home/aidivn/A2A-Agent-Platform/frontend/src/services/authService.ts`

```typescript
export const authService = {
  initiateLogin: (redirectUri: string) =>
    api.post<{ sso_login_url: string; session_id: string }>('/auth/login', {
      redirect_uri: redirectUri,
    }),

  handleCallback: (idToken: string) =>
    api.post<LoginResponse>('/auth/callback', { id_token: idToken }),

  logout: () =>
    api.post<{ message: string }>('/auth/logout'),
}
```

### 3.4 API Client & Interceptors
**Location**: `/home/aidivn/A2A-Agent-Platform/frontend/src/services/api.ts`

#### Request Interceptor
```typescript
api.interceptors.request.use((config) => {
  // Extract token from Zustand persist storage
  const authStorage = localStorage.getItem('auth-storage')
  if (authStorage) {
    const authData = JSON.parse(authStorage)
    const token = authData?.state?.accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  }
  // Add trace ID
  config.headers['X-Trace-ID'] = generateTraceId()
  return config
})
```

#### Response Interceptor
```typescript
api.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    if (error.response?.status === 401) {
      // Clear auth and logout
      const authStore = await import('@/stores/authStore')
      authStore.useAuthStore.getState().clearAuth()
    }
    return Promise.reject(error)
  }
)
```

### 3.5 Pages

#### LoginPage
**Location**: `/home/aidivn/A2A-Agent-Platform/frontend/src/pages/LoginPage.tsx`
- Checks if already authenticated, redirects to `/hub` if true
- Renders "Login with SSO" button
- Calls `login()` action on button click

#### CallbackPage
**Location**: `/home/aidivn/A2A-Agent-Platform/frontend/src/pages/CallbackPage.tsx`
- Receives `id_token` from URL parameter
- Calls `loginCallback(idToken)`
- Shows processing state while auth completes
- Redirects to `/hub` on success
- Shows error on failure with retry option

---

## 4. Configuration & Environment Variables

### 4.1 Master Configuration
**Location**: `/home/aidivn/A2A-Agent-Platform/repos/infra/.env`

```env
# Core IP Configuration
HOST_IP=172.26.110.192

# Port Configuration
FRONTEND_PORT=9060
GATEWAY_PORT=9050

# Mock SSO Configuration
ENABLE_MOCK_SSO=true
MOCK_SSO_URL=http://mock-sso:9999
IDP_ENTITY_ID=http://${HOST_IP}:9999/mock-sso/login
SP_REDIRECT_URL=http://${HOST_IP}:${GATEWAY_PORT}/api/auth/callback/

# Security
JWT_SECRET_KEY=local-dev-secret-key-change-in-production

# Database
DB_USER=dev_user
DB_PASSWORD=dev_password
DB_HOST=postgres
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

### 4.2 Docker Compose Configuration
**Location**: `/home/aidivn/A2A-Agent-Platform/repos/infra/docker-compose.yml`

#### Mock SSO Service
```yaml
mock-sso:
  image: python:3.11-slim
  container_name: a2g-mock-sso
  ports:
    - "0.0.0.0:9999:9999"  # All interfaces
  volumes:
    - ./mock-sso:/app
  command: >
    sh -c "pip install fastapi uvicorn python-jose PyJWT &&
           python main.py"
```

#### API Gateway Service
```yaml
api-gateway:
  ports:
    - "0.0.0.0:9050:9050"  # All interfaces
  environment:
    HOST_IP: ${HOST_IP:-localhost}
    FRONTEND_PORT: ${FRONTEND_PORT:-9060}
    GATEWAY_PORT: 9050
    GATEWAY_HOST: 0.0.0.0
    ENVIRONMENT: development
    USER_SERVICE_URL: http://${HOST_IP:-localhost}:8001
    ENABLE_MOCK_SSO: "true"
    MOCK_SSO_URL: http://${HOST_IP:-localhost}:9999
    JWT_SECRET_KEY: local-dev-secret-key
    RATE_LIMIT_PER_IP: 100
```

#### User Service
```yaml
user-service:
  ports:
    - "0.0.0.0:8001:8001"
  environment:
    JWT_SECRET_KEY: local-dev-secret-key
    IDP_ENTITY_ID: http://${HOST_IP:-localhost}:9999/mock-sso/login
    SP_REDIRECT_URL: http://${HOST_IP:-localhost}:${GATEWAY_PORT:-9050}/api/auth/callback/
```

### 4.3 Service Configuration Files

#### API Gateway Config
**File**: `/home/aidivn/A2A-Agent-Platform/repos/api-gateway/app/config.py`
```python
class Settings(BaseSettings):
    gateway_port: int = 9050
    gateway_host: str = "0.0.0.0"
    
    enable_mock_sso: bool = True
    mock_sso_url: str = "http://mock-sso:9999"
    
    jwt_secret_key: str = "local-dev-secret-key"
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 720
```

#### User Service Config
**File**: `/home/aidivn/A2A-Agent-Platform/repos/user-service/app/core/config.py`
```python
class Settings(BaseSettings):
    SERVICE_PORT: int = 8001
    JWT_SECRET_KEY: str = "local-dev-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 720
    
    IDP_ENTITY_ID: str = "http://172.17.0.1:9999/mock-sso/login"
    SP_REDIRECT_URL: str = "http://172.17.0.1:9050/api/auth/callback/"
    
    CORS_ORIGINS: List[str] = [
        "http://localhost:9050",
        "http://localhost:9060"
    ]
```

### 4.4 Frontend Configuration
**File**: `/home/aidivn/A2A-Agent-Platform/frontend/.env`
```env
VITE_HOST_IP=172.26.110.192
VITE_GATEWAY_PORT=9050
VITE_API_URL=/api
```

### 4.5 CORS Configuration

#### API Gateway
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### Gateway Config
```python
cors_origins: list = [
    "http://10.229.95.228:9060",
    "http://10.229.95.228:9050",
    "https://10.229.95.228:9050",
    "http://localhost:9060",
    "http://localhost:9050",
    "https://localhost:9050",
    "http://localhost:3000",
]
```

---

## 5. HTTPS/TLS Configuration

### Current Status
**HTTPS/TLS: NOT CONFIGURED** - All communications use HTTP only

### Configuration Details
- **Mock SSO**: HTTP only on port 9999
- **API Gateway**: HTTP only on port 9050
- **Frontend**: HTTP only (proxy setup redirects to HTTP)
- **Services**: All internal services use HTTP

### Environment Variable Status
```env
HTTP_PROXY=         # Empty (not configured)
HTTPS_PROXY=        # Empty (not configured)
NO_PROXY=localhost,127.0.0.1,*.local,10.*,172.*,192.168.*
```

### Production Recommendations
For production deployment, HTTPS should be:
1. Enabled on API Gateway (port 9050)
2. Enabled on Mock SSO replacement (IDP)
3. Configured with valid SSL certificates
4. Environment-specific configuration added

---

## 6. Port Configuration Summary

| Service | Port | Protocol | Purpose |
|---------|------|----------|---------|
| Mock SSO | 9999 | HTTP | SSO Provider |
| API Gateway | 9050 | HTTP | Main API Entry Point |
| User Service | 8001 | HTTP | Authentication & User Management |
| Agent Service | 8002 | HTTP | Agent Management |
| Chat Service | 8003 | HTTP | Chat & Hub |
| Tracing Service | 8004 | HTTP | Request Tracing |
| Admin Service | 8005 | HTTP | Admin Panel |
| LLM Proxy Service | 8006 | HTTP | LLM Provider Integration |
| Worker API | 8010 | HTTP | Background Tasks |
| Frontend | 9060 | HTTP | Web UI |
| PostgreSQL | 5432 | - | Database |
| Redis | 6379 | - | Cache & Message Broker |

---

## 7. Security Analysis

### Strengths
1. **JWT-based stateless authentication**: No session storage needed
2. **Role-based access control**: ADMIN, USER, PENDING, NEW roles
3. **Token expiration**: 12-hour window for access tokens, 1-hour for ID tokens
4. **Automatic token refresh**: 401 responses trigger logout
5. **CORS protection**: Whitelist configured
6. **Rate limiting**: 100 requests per minute per IP

### Development-Only Issues
1. **JWT signature verification disabled**: `"verify_signature": False`
2. **No HTTPS/TLS**: All HTTP connections
3. **Hardcoded secrets**: `"local-dev-secret-key-change-in-production"`
4. **Mock SSO credentials**: Hardcoded mock users
5. **CORS allows all origins**: `allow_origins=["*"]`
6. **No token refresh mechanism**: Direct logout on expiration

### Required Production Hardening
1. Enable JWT signature verification
2. Implement HTTPS with valid certificates
3. Use environment-based secure secrets (AWS Secrets Manager, HashiCorp Vault)
4. Replace mock SSO with real IDP (OAuth2/OIDC)
5. Restrict CORS origins
6. Implement token refresh flow
7. Add additional security headers
8. Enable request signing/validation

---

## 8. Token Management Flow

### Complete Flow Diagram
```
User Browser
    |
    v
[1] Login Page
    |
    v [login()]
[2] API Gateway -> User Service
    | POST /api/auth/login
    |
    v [response: sso_login_url]
[3] Redirect to Mock SSO
    | GET /mock-sso/login?redirect_uri=...
    |
    v [show user selection]
[4] User Selects Account
    | GET /mock-sso/do-login?user=dev1
    |
    v [generate ID token]
[5] Redirect to Callback
    | GET /callback?id_token=<JWT>
    |
    v [loginCallback(idToken)]
[6] Exchange ID Token for Access Token
    | POST /api/auth/callback
    | Body: {id_token: <JWT>}
    |
    v [API Gateway -> User Service]
[7] Verify ID Token & Create Access Token
    | - Decode ID token
    | - Check/create user in DB
    | - Generate access token
    |
    v [response: access_token]
[8] Store Token & Authenticate
    | - localStorage.setItem('auth-storage', {...})
    | - Set Zustand state
    | - Add Authorization header to requests
    |
    v [All subsequent API calls]
[9] API Requests with Bearer Token
    | Authorization: Bearer <access_token>
    |
    v [API Gateway Middleware]
[10] JWT Verification
    | - Decode token
    | - Validate claims
    | - Extract user info
    |
    v
[11] Route to Target Service
    | - All services verify token independently
    | - Extract user context from token
```

### Storage Strategy
**LocalStorage Key**: `auth-storage`
```json
{
  "state": {
    "user": {
      "username": "syngha.han",
      "email": "syngha.han@company.com",
      "role": "ADMIN",
      "department": "ai_platform",
      ...
    },
    "accessToken": "<JWT_TOKEN>",
    "isAuthenticated": true
  },
  "version": 0
}
```

---

## 9. Key Authentication Endpoints Summary

### Mock SSO Service (Port 9999)
- `GET /mock-sso/login` - Display login page
- `GET /mock-sso/do-login` - Process login with selected user
- `POST /mock-sso/do-login` - Process login with custom user
- `GET /mock-sso/logout` - Logout
- `GET /mock-sso/verify` - Verify token
- `GET /mock-sso/users` - List available users
- `GET /health` - Health check

### API Gateway (Port 9050)
- `POST /api/auth/login` - Initiate SSO login
- `POST /api/auth/callback` - Handle SSO callback
- `GET /api/auth/callback` - Handle SSO callback (query params)
- `POST /api/auth/logout` - Logout
- `GET /health` - Gateway health
- `GET /api/health` - All services health

### User Service (Port 8001)
- All `/api/auth/*` endpoints above
- `GET /api/users/*` - User management
- Proxied through API Gateway

---

## 10. Recommendations

### Immediate Actions
1. Document all test user credentials
2. Add token expiration monitoring
3. Implement token refresh endpoint
4. Add logout token blacklist (if needed)

### Short Term (Next Sprint)
1. Implement HTTPS/TLS for all services
2. Add password-based login as fallback
3. Enhance audit logging for auth events
4. Add multi-factor authentication support

### Medium Term
1. Replace mock SSO with real OAuth2/OIDC provider
2. Implement proper token refresh flow
3. Add session management (if needed for stateful auth)
4. Implement API key authentication for service-to-service
5. Add comprehensive security audit logging

### Production Hardening Checklist
- [ ] Enable JWT signature verification
- [ ] Configure HTTPS/TLS with valid certificates
- [ ] Use secure secret management (Vault, AWS Secrets Manager)
- [ ] Restrict CORS to specific origins
- [ ] Implement rate limiting per user/role
- [ ] Add request signing/validation
- [ ] Enable comprehensive audit logging
- [ ] Implement Web Application Firewall (WAF) rules
- [ ] Add DDoS protection
- [ ] Implement intrusion detection system (IDS)

---

## 11. File Locations Reference

### Backend Authentication
- `/home/aidivn/A2A-Agent-Platform/repos/infra/mock-sso/main.py` - Mock SSO service
- `/home/aidivn/A2A-Agent-Platform/repos/api-gateway/app/main.py` - API Gateway
- `/home/aidivn/A2A-Agent-Platform/repos/api-gateway/app/config.py` - Gateway config
- `/home/aidivn/A2A-Agent-Platform/repos/api-gateway/app/middleware.py` - Auth middleware
- `/home/aidivn/A2A-Agent-Platform/repos/user-service/app/api/v1/auth.py` - Auth endpoints
- `/home/aidivn/A2A-Agent-Platform/repos/user-service/app/core/security.py` - Security utilities
- `/home/aidivn/A2A-Agent-Platform/repos/user-service/app/core/config.py` - User service config

### Frontend Authentication
- `/home/aidivn/A2A-Agent-Platform/frontend/src/stores/authStore.ts` - Auth state management
- `/home/aidivn/A2A-Agent-Platform/frontend/src/services/authService.ts` - Auth API calls
- `/home/aidivn/A2A-Agent-Platform/frontend/src/services/api.ts` - API client & interceptors
- `/home/aidivn/A2A-Agent-Platform/frontend/src/pages/LoginPage.tsx` - Login page
- `/home/aidivn/A2A-Agent-Platform/frontend/src/pages/CallbackPage.tsx` - Callback page

### Configuration
- `/home/aidivn/A2A-Agent-Platform/repos/infra/.env` - Master environment config
- `/home/aidivn/A2A-Agent-Platform/repos/infra/docker-compose.yml` - Service orchestration
- `/home/aidivn/A2A-Agent-Platform/frontend/.env` - Frontend config

---

Generated: 2025-11-24
