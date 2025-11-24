# Authentication Architecture Diagram

## High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          USER BROWSER (Port 9060)                       │
│                         Frontend React Application                      │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    │                │                │
            [1] Login Page    [2] Callback Page    [3] Hub Page
            authStore.login() loginCallback()     (authenticated)
                    │                │                │
                    └────────────────┼────────────────┘
                                     │
                    HTTP (Port 9050) │ Bearer Token
                                     │
┌─────────────────────────────────────────────────────────────────────────┐
│                      API GATEWAY (Port 9050)                            │
│                          - CORS Middleware                              │
│                          - Auth Middleware                              │
│                          - Rate Limit Middleware                        │
│                          - Request Router                               │
└─────────────────────────────────────────────────────────────────────────┘
        │                  │                  │                  │
        │                  │                  │                  │
        v                  v                  v                  v
    ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐
    │   User     │  │   Agent    │  │   Chat     │  │   Admin    │
    │  Service   │  │  Service   │  │  Service   │  │  Service   │
    │ (Port 8001)│  │ (Port 8002)│  │ (Port 8003)│  │ (Port 8005)│
    └────────────┘  └────────────┘  └────────────┘  └────────────┘
        │
        │ (Authentication)
        │
    ┌────────────────────────────────────────────────────┐
    │     User Service Auth Endpoints                    │
    │ - POST /api/auth/login                             │
    │ - POST /api/auth/callback                          │
    │ - POST /api/auth/logout                            │
    │ - GET /api/users/*                                 │
    └────────────────────────────────────────────────────┘
        │
        │ (Creates Access Token)
        │
        └─────────────────────┐
                              │
        ┌─────────────────────┴──────────────────────┐
        │                                             │
        v                                             v
    ┌──────────────────────┐               ┌──────────────────────┐
    │  PostgreSQL Database │               │  JWT Token           │
    │                      │               │  (Zustand Storage)   │
    │  - Users table       │               │  - localStorage      │
    │  - Sessions table    │               │  - Access Token      │
    │  - Roles table       │               │  - User Info         │
    └──────────────────────┘               └──────────────────────┘


```

## Authentication Flow Detail

```
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  STEP 1: LOGIN INITIATION                                               │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  Browser                  API Gateway              User Service          │
│    │                           │                        │                │
│    │─── POST /api/auth/login ─>│─────────────────────>│                │
│    │   redirect_uri: ...        │                       │                │
│    │                           │  Generate redirect URL  │                │
│    │<─────── sso_login_url ─────│<─────────────────────│                │
│    │                           │                        │                │
│    └─── Redirect to Mock SSO ───────────────────────────────────────>   │
│                              (Port 9999)                                  │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  STEP 2: SSO LOGIN                                                      │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  Browser                    Mock SSO Service                             │
│    │                              │                                      │
│    │─── GET /mock-sso/login ──────>│                                    │
│    │                              │ Show HTML login form                │
│    │<───── Login Form HTML ────────│                                    │
│    │                              │                                      │
│    │─── Click User (dev1) ────────>│                                    │
│    │     GET /mock-sso/do-login    │                                    │
│    │                              │ Generate ID Token (JWT)            │
│    │<───────────────────────────────│ Encode user data with HS256      │
│    │  Redirect with id_token       │                                    │
│    │                              │                                      │
│                                                                           │
│  ID Token Payload:                                                      │
│  {                                                                       │
│    "loginid": "syngha.han",                                             │
│    "username": "한승하",                                                 │
│    "mail": "syngha.han@company.com",                                    │
│    "deptid": "ai_platform",                                             │
│    "deptname": "AI 플랫폼팀",                                             │
│    "deptname_en": "AI Platform Team",                                   │
│    "role": "ADMIN",                                                     │
│    "iat": <timestamp>,                                                  │
│    "exp": <timestamp + 1 hour>,                                         │
│    "iss": "mock-sso",                                                   │
│    "aud": "a2g-platform"                                                │
│  }                                                                       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  STEP 3: CALLBACK & TOKEN EXCHANGE                                      │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  Browser                API Gateway           User Service              │
│    │                         │                     │                    │
│    │─ GET /callback?id_token=JWT                  │                    │
│    │                         │                     │                    │
│    │  (CallbackPage)         │                     │                    │
│    │  Extract id_token from URL                   │                    │
│    │  Call loginCallback(idToken)                 │                    │
│    │                         │                     │                    │
│    │  POST /api/auth/callback│                     │                    │
│    │  {id_token: JWT}       >│────────────────────>│                    │
│    │                         │   Verify ID token   │                    │
│    │                         │   (loose verify)    │                    │
│    │                         │   Extract username  │                    │
│    │                         │   Query user DB     │                    │
│    │                         │   Create JWT token  │                    │
│    │<─ Access Token ─────────│<────────────────────│                    │
│    │  {                      │                     │                    │
│    │    access_token: JWT,   │                     │                    │
│    │    expires_in: 43200,   │                     │                    │
│    │    user: {...}          │                     │                    │
│    │  }                      │                     │                    │
│    │                         │                     │                    │
│  (Store in localStorage)                                                 │
│    │                         │                     │                    │
│    │  Redirect to /hub       │                     │                    │
│                                                                           │
│  Access Token Payload:                                                  │
│  {                                                                       │
│    "sub": "syngha.han",                                                 │
│    "role": "ADMIN",                                                     │
│    "department": "ai_platform",                                         │
│    "department_kr": "AI 플랫폼팀",                                       │
│    "department_en": "AI Platform Team",                                 │
│    "exp": <timestamp + 12 hours>,                                       │
│    "iat": <timestamp>                                                   │
│  }                                                                       │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                                                                           │
│  STEP 4: AUTHENTICATED REQUESTS                                         │
│  ────────────────────────────────────────────────────────────────────   │
│                                                                           │
│  Browser                 API Gateway           Backend Services         │
│    │                         │                     │                    │
│    │  GET /api/agents        │                     │                    │
│    │  Authorization:         │                     │                    │
│    │  Bearer <access_token> >│                     │                    │
│    │                         │  Verify JWT         │                    │
│    │                         │  Extract claims     │                    │
│    │                         │  Add to request     │                    │
│    │                         │                    >│ Process with user  │
│    │                         │                     │ context            │
│    │<─────── Response ───────│<────────────────────│                    │
│    │                         │                     │                    │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘

```

## Database Schema (Simplified)

```
┌──────────────────────────────────┐
│         users Table              │
├──────────────────────────────────┤
│ id (PK)                          │
│ username                         │
│ username_kr                      │
│ email                            │
│ role (ADMIN|USER|PENDING|NEW)   │
│ department                       │
│ department_kr                    │
│ department_en                    │
│ created_at                       │
│ last_login                       │
│ is_approved                      │
└──────────────────────────────────┘
        │
        │ (User has many...)
        │
     ┌──┴──────────────────────────────┐
     │                                  │
     v                                  v
┌──────────────┐               ┌──────────────┐
│ sessions TB  │               │   roles TB   │
├──────────────┤               ├──────────────┤
│ id           │               │ id           │
│ user_id      │               │ name         │
│ token        │               │ permissions  │
│ expires_at   │               └──────────────┘
└──────────────┘

```

## Component Interaction Map

```
┌──────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                            │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─ LoginPage.tsx ────┐                                         │
│  │  - Render login UI  │                                         │
│  │  - Call authStore.login()                                     │
│  └─────────┬──────────┘                                          │
│            │                                                     │
│  ┌─────────v─────────────────────────────────────────┐          │
│  │  authStore.ts (Zustand)                           │          │
│  │  - Manages auth state (user, token, auth status)  │          │
│  │  - login(): Calls authService.initiateLogin()    │          │
│  │  - loginCallback(): Exchanges ID for access token│          │
│  │  - logout(): Clears auth state                    │          │
│  │  - Persists to localStorage (auth-storage)        │          │
│  └──────────┬────────────────────────────────────────┘          │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────┐            │
│  │  authService.ts                                 │            │
│  │  - Calls API endpoints for auth operations      │            │
│  │  - Methods: initiateLogin(), handleCallback()   │            │
│  └──────────┬──────────────────────────────────────┘            │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────┐            │
│  │  api.ts (Axios with Interceptors)               │            │
│  │  - Request: Adds Authorization header           │            │
│  │  - Response: Handles 401, unwraps data          │            │
│  │  - Error: Auto-logout on 401                    │            │
│  └──────────┬──────────────────────────────────────┘            │
│             │                                                    │
└─────────────┼────────────────────────────────────────────────────┘
              │ HTTP Bearer Token
              │
┌─────────────v────────────────────────────────────────────────────┐
│                    API Gateway Layer (9050)                      │
├───────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌── CORSMiddleware ────────────────────────────────────────┐    │
│  │  - Allow all origins, methods, headers                   │    │
│  └──────────┬──────────────────────────────────────────────┘    │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────────────┐    │
│  │  AuthenticationMiddleware                              │    │
│  │  - Extract Bearer token from Authorization header       │    │
│  │  - Verify JWT signature (loose in dev)                  │    │
│  │  - Skip for public paths (/auth/login, /auth/callback)  │    │
│  │  - Add user info to request.state                       │    │
│  └──────────┬──────────────────────────────────────────────┘    │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────────────┐    │
│  │  LoggingMiddleware                                      │    │
│  │  - Log request/response details                         │    │
│  └──────────┬──────────────────────────────────────────────┘    │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────────────┐    │
│  │  RateLimitMiddleware                                    │    │
│  │  - Limit: 100 req/min per IP                            │    │
│  └──────────┬──────────────────────────────────────────────┘    │
│             │                                                    │
│  ┌──────────v──────────────────────────────────────────────┐    │
│  │  Service Router                                         │    │
│  │  - Route /api/auth → User Service (8001)                │    │
│  │  - Route /api/agents → Agent Service (8002)             │    │
│  │  - Route /api/chat → Chat Service (8003)                │    │
│  │  - etc.                                                 │    │
│  └──────────┬──────────────────────────────────────────────┘    │
│             │                                                    │
└─────────────┼─────────────────────────────────────────────────────┘
              │
        ┌─────┼──────┬──────┬────────┐
        │     │      │      │        │
        v     v      v      v        v
    ┌────┐┌────┐┌────┐┌────┐┌────┐
    │ US ││ AS ││ CS ││ TS ││ AD │  (Services verify JWT independently)
    │ 1  ││ 2  ││ 3  ││ 4  ││ S5 │
    └────┘└────┘└────┘└────┘└────┘

Legend:
  US = User Service (8001)
  AS = Agent Service (8002)
  CS = Chat Service (8003)
  TS = Tracing Service (8004)
  ADS = Admin Service (8005)
```

## Environment Configuration Flow

```
┌──────────────────────────────────────┐
│  /repos/infra/.env (Master Config)   │
│  - HOST_IP=172.26.110.192            │
│  - GATEWAY_PORT=9050                 │
│  - FRONTEND_PORT=9060                │
│  - ENABLE_MOCK_SSO=true              │
│  - JWT_SECRET_KEY=...                │
└─────────────────┬────────────────────┘
                  │
        ┌─────────┼──────────┬────────────┐
        │         │          │            │
        v         v          v            v
    ┌────────┐ ┌──────┐ ┌────────┐ ┌──────────┐
    │Docker- │ │User  │ │ API    │ │Frontend  │
    │Compose │ │Svc   │ │Gateway │ │ .env     │
    │ .yml   │ │Config│ │Config  │ │          │
    └────────┘ └──────┘ └────────┘ └──────────┘
       │         │         │          │
       │         │         │          │
    Mounts     Env vars  Env vars   Env vars
    configs    from      from        from
    and        master    master      master
    secrets    config    config      config

```

## Token Lifecycle

```
TIME AXIS →

[T=0] User Login
      │
      v
[T=1] ID Token Generated (1 hour validity)
      │  {loginid, username, mail, deptid, deptname, role, iat, exp}
      │
      v
[T=2] ID Token Verified at API Gateway
      │  (loose verification in dev)
      │
      v
[T=3] Access Token Generated (12 hour validity)
      │  {sub, role, department, department_kr, department_en, exp, iat}
      │
      v
[T=4] Access Token Stored in localStorage (auth-storage)
      │
      v
[T=5-11H] Requests made with Bearer Token
      │  - Each request includes access token
      │  - Gateway verifies token
      │  - Services receive user context
      │
      v
[T=12H] Access Token Expires
      │  - API Gateway returns 401
      │  - Frontend axios interceptor catches 401
      │  - authStore.clearAuth() called
      │  - User redirected to login
      │
      v
[T=12H+] User redirected to LoginPage
      └─> Cycle repeats

```

