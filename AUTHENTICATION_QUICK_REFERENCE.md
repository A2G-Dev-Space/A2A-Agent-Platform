# Authentication System - Quick Reference

## Mock SSO Service (Port 9999)
| Feature | Details |
|---------|---------|
| **Location** | `/repos/infra/mock-sso/main.py` |
| **Framework** | FastAPI |
| **Port** | 9999 (all interfaces) |
| **Token Type** | JWT (HS256) |
| **Secret** | `local-dev-secret-key-change-in-production` |
| **Token Expiry** | 1 hour |
| **Pre-defined Users** | dev1-4 (ADMIN), testuser (USER), pending (PENDING) |

## API Gateway (Port 9050)
| Feature | Details |
|---------|---------|
| **Location** | `/repos/api-gateway/` |
| **Framework** | FastAPI |
| **Port** | 9050 (all interfaces) |
| **Main Routes** | `/api/auth`, `/api/users`, `/api/agents`, `/api/chat`, etc. |
| **Auth Middleware** | JWT Bearer token verification |
| **CORS** | Allow all origins (`*`) |
| **Rate Limit** | 100 requests/minute per IP |
| **Token Expiry** | 12 hours |

## User Service (Port 8001)
| Feature | Details |
|---------|---------|
| **Location** | `/repos/user-service/` |
| **Framework** | FastAPI |
| **Port** | 8001 |
| **Auth Endpoints** | `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout` |
| **Token Verification** | Loose (signature disabled in dev) |
| **User Roles** | NEW, USER, ADMIN, PENDING |

## Authentication Flow
```
1. User clicks Login -> LoginPage calls authStore.login()
2. Frontend POST /api/auth/login -> Get SSO URL
3. User redirects to Mock SSO login page
4. User selects account -> Gets ID token (JWT)
5. Redirect to /callback with id_token in URL
6. CallbackPage calls loginCallback(idToken)
7. Frontend POST /api/auth/callback with ID token
8. Backend verifies ID token, creates access token
9. Frontend stores access token in localStorage
10. All API calls include Authorization: Bearer <token>
```

## Environment Variables - Master Config (repos/infra/.env)
```env
HOST_IP=172.26.110.192              # Server IP
FRONTEND_PORT=9060                  # Frontend port
GATEWAY_PORT=9050                   # API Gateway port

ENABLE_MOCK_SSO=true                # Enable mock SSO
MOCK_SSO_URL=http://mock-sso:9999   # Mock SSO service
IDP_ENTITY_ID=http://{HOST_IP}:9999/mock-sso/login
SP_REDIRECT_URL=http://{HOST_IP}:9050/api/auth/callback/

JWT_SECRET_KEY=local-dev-secret-key-change-in-production

DB_USER=dev_user
DB_PASSWORD=dev_password
REDIS_HOST=redis
```

## Token Storage
- **Key**: `auth-storage` (localStorage)
- **Format**: Zustand persist state with `{ state: { user, accessToken, isAuthenticated } }`
- **Location**: Browser localStorage
- **Backup Location**: `accessToken` stored separately for axios interceptor

## Security Status
| Aspect | Status | Notes |
|--------|--------|-------|
| JWT Signature Verification | Disabled | Dev only - must enable for production |
| HTTPS/TLS | Not Configured | All HTTP, no certificates |
| Hardcoded Secrets | Yes | Development secrets only |
| CORS Restriction | None | Allow all origins |
| Token Refresh | No | Direct logout on expiration |
| Rate Limiting | Yes | 100 req/min per IP |

## Key Files

### Backend
- Mock SSO: `/repos/infra/mock-sso/main.py`
- Gateway Main: `/repos/api-gateway/app/main.py`
- Gateway Config: `/repos/api-gateway/app/config.py`
- Gateway Middleware: `/repos/api-gateway/app/middleware.py`
- Auth Endpoints: `/repos/user-service/app/api/v1/auth.py`
- Security Utils: `/repos/user-service/app/core/security.py`

### Frontend
- Auth Store: `/frontend/src/stores/authStore.ts`
- Auth Service: `/frontend/src/services/authService.ts`
- API Client: `/frontend/src/services/api.ts`
- Login Page: `/frontend/src/pages/LoginPage.tsx`
- Callback Page: `/frontend/src/pages/CallbackPage.tsx`

### Configuration
- Master Config: `/repos/infra/.env`
- Docker Compose: `/repos/infra/docker-compose.yml`
- Frontend Config: `/frontend/.env`

## Mock Test Users
| Key | Username | Email | Role | Department |
|-----|----------|-------|------|-----------|
| dev1 | syngha.han | syngha.han@company.com | ADMIN | AI Platform |
| dev2 | byungju.lee | byungju.lee@company.com | ADMIN | AI Platform |
| dev3 | youngsub.kim | youngsub.kim@company.com | ADMIN | AI Platform |
| dev4 | junhyung.ahn | junhyung.ahn@company.com | ADMIN | AI Platform |
| testuser | test.user | test.user@company.com | USER | Test |
| pending | pending.user | pending.user@company.com | PENDING | New |

## Production TODOs
- [ ] Enable JWT signature verification
- [ ] Configure HTTPS/TLS with real certificates
- [ ] Replace mock SSO with real OAuth2/OIDC
- [ ] Use secure secret management
- [ ] Restrict CORS to specific origins
- [ ] Implement token refresh flow
- [ ] Add comprehensive audit logging
- [ ] Implement rate limiting per user
- [ ] Add security headers

