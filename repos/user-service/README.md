# 👤 User Service - A2G Platform

**포트**: 8001
**담당자**: DEV1 (한승하)
**기술 스택**: FastAPI, PostgreSQL, Redis, JWT, SSO Integration

---

## 📋 목차

1. [개요](#개요)
2. [주요 기능](#주요-기능)
3. [빠른 시작](#빠른-시작)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 명세](#api-명세)
6. [환경 변수](#환경-변수)
7. [테스트 가이드](#테스트-가이드)
8. [SSO 통합](#sso-통합)
9. [보안 미들웨어](#보안-미들웨어)
10. [문제 해결](#문제-해결)

---

## 개요

User Service는 A2G Platform의 인증, 권한부여, 사용자 관리를 담당하는 핵심 마이크로서비스입니다. 회사 SSO와 통합되어 있으며, JWT 기반의 세션 관리를 제공합니다.

### 아키텍처에서의 위치
```
사용자 → Frontend(9060) → API Gateway(9050) → User Service(8001) → PostgreSQL/Redis
                                     ↓
                                Mock SSO(9999)
```

---

## 주요 기능

### 핵심 기능
- **SSO 연동**: 회사 SSO 시스템과 SAML 2.0 통합
- **JWT 토큰 관리**: Access Token 발급/갱신/검증
- **사용자 프로비저닝**: SSO에서 사용자 정보 자동 동기화
- **API Key 관리**: 서비스 간 통신용 API Key 발급
- **RBAC 권한**: PENDING → USER → ADMIN 3단계 권한 체계

### 지원 역할
- **PENDING**: 승인 대기 사용자 (로그인만 가능)
- **USER**: 일반 사용자 (에이전트 생성/실행)
- **ADMIN**: 관리자 (전체 권한)

---

## 빠른 시작

### 방법 1: Docker Compose 사용 (권장)
```bash
# 프로젝트 루트에서
./start-dev.sh setup   # 최초 1회 - DB 초기화
./start-dev.sh full    # 모든 서비스 실행
```

### 방법 2: 로컬 개발 환경
```bash
# 1. Docker에서 이 서비스만 중지
docker stop a2g-user-service

# 2. 로컬 환경 설정
cd repos/user-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<EOF
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9060/callback
SERVICE_PORT=8001
EOF

# 4. DB 마이그레이션
alembic upgrade head

# 5. 서비스 실행
uvicorn app.main:app --reload --port 8001
```

---

## 데이터베이스 스키마

### Users 테이블
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,      -- SSO loginid
    username_kr VARCHAR(100),                   -- 한글 이름
    username_en VARCHAR(100),                   -- 영문 이름
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(20) DEFAULT 'PENDING',         -- PENDING/USER/ADMIN
    department_kr VARCHAR(200),                 -- 한글 부서명
    department_en VARCHAR(200),                 -- 영문 부서명
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

### API Keys 테이블
```sql
CREATE TABLE api_keys (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    last_used TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uk_user_key_name UNIQUE (user_id, name)
);

CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
```

### Sessions 테이블 (Redis에 저장)
```python
# Redis 키 구조
session:{session_id} = {
    "user_id": "syngha.han",
    "username": "한승하",
    "role": "ADMIN",
    "department": "AI Platform Team",
    "expires_at": "2025-10-29T12:00:00Z"
}
```

---

## API 명세

### 1. 인증 엔드포인트

#### POST /api/auth/login
SSO 로그인 프로세스 시작

**Request:**
```json
{
  "redirect_uri": "http://localhost:9060/callback"
}
```

**Response (200):**
```json
{
  "sso_login_url": "http://localhost:9999/mock-sso/login?redirect_uri=http://localhost:9060/callback",
  "session_id": "temp-session-12345"
}
```

**cURL 예제:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'
```

#### POST /api/auth/callback
SSO 콜백 처리 및 JWT 발급

**Request:**
```json
{
  "id_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "user": {
    "id": 1,
    "username": "syngha.han",
    "username_kr": "한승하",
    "email": "syngha.han@company.com",
    "role": "ADMIN",
    "department": "AI Platform Team"
  }
}
```

#### POST /api/auth/logout
사용자 로그아웃

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "message": "Successfully logged out"
}
```

### 2. 사용자 관리 엔드포인트

#### GET /api/users/me
현재 사용자 정보 조회

**Request Headers:**
```
Authorization: Bearer {access_token}
```

**Response (200):**
```json
{
  "id": 1,
  "username": "syngha.han",
  "username_kr": "한승하",
  "username_en": "Seungha Han",
  "email": "syngha.han@company.com",
  "role": "ADMIN",
  "department_kr": "AI 플랫폼팀",
  "department_en": "AI Platform Team",
  "is_active": true,
  "last_login": "2025-10-29T10:30:00Z",
  "created_at": "2025-10-01T09:00:00Z"
}
```

#### PUT /api/users/me
사용자 정보 업데이트

**Request:**
```json
{
  "department_kr": "플랫폼개발팀",
  "department_en": "Platform Development Team"
}
```

**Response (200):**
```json
{
  "message": "User updated successfully",
  "user": { ... }
}
```

### [신규 추가된 API] 사용자 관리

> **[NOTE]**
> 이 `v1` API는 새로운 Frontend 사용자 관리 페이지를 위해 추가되었습니다.
> 신규 기능 개발 시, 아래의 `4. 관리자 전용 엔드포인트`에 있는 기존 API(`GET /api/admin/users`)보다 이 `v1` API 사용을 권장합니다.

- **GET /api/v1/users/**: 모든 사용자 목록을 조회합니다.
  - **Permission**: `ADMIN`
  - **Response**: `List[UserManagementInfo]`

- **POST /api/v1/users/invite/**: 신규 사용자를 초대합니다.
  - **Permission**: `ADMIN`
  - **Request Body**: `UserInvite`
  - **Response**: `UserManagementInfo`

- **PUT /api/v1/users/{user_id}/approve/**: 사용자의 등록을 승인합니다.
  - **Permission**: `ADMIN`
  - **Response**: `{"message": "User {user_id} approved successfully"}`

- **PUT /api/v1/users/{user_id}/reject/**: 사용자의 등록을 거절합니다.
  - **Permission**: `ADMIN`
  - **Response**: `{"message": "User {user_id} rejected successfully"}`

### 3. API Key 관리 엔드포인트

#### POST /api/users/me/api-keys
새 API Key 생성

**Request:**
```json
{
  "name": "Agent Service Key",
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "Agent Service Key",
  "api_key": "sk_live_a2g_1234567890abcdef",  // 이 값은 한번만 표시됨
  "expires_at": "2026-10-29T10:30:00Z",
  "created_at": "2025-10-29T10:30:00Z"
}
```

#### GET /api/users/me/api-keys
API Key 목록 조회

**Response (200):**
```json
{
  "api_keys": [
    {
      "id": 1,
      "name": "Agent Service Key",
      "last_used": "2025-10-29T09:00:00Z",
      "expires_at": "2026-10-29T10:30:00Z",
      "is_active": true,
      "created_at": "2025-10-29T10:30:00Z"
    }
  ]
}
```

#### DELETE /api/users/me/api-keys/{key_id}
API Key 삭제

**Response (200):**
```json
{
  "message": "API key deleted successfully"
}
```

### 4. 관리자 전용 엔드포인트

#### GET /api/admin/users
모든 사용자 목록 조회 (ADMIN only)

**Query Parameters:**
- `role`: 역할별 필터 (PENDING/USER/ADMIN)
- `department`: 부서별 필터
- `page`: 페이지 번호 (기본: 1)
- `limit`: 페이지당 항목 수 (기본: 20)

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "syngha.han",
      "username_kr": "한승하",
      "email": "syngha.han@company.com",
      "role": "ADMIN",
      "department": "AI Platform Team",
      "is_active": true,
      "last_login": "2025-10-29T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "pages": 5
}
```

#### PUT /api/admin/users/{user_id}/role
사용자 권한 변경 (ADMIN only)

**Request:**
```json
{
  "role": "USER"
}
```

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "user": { ... }
}
```

---

## 환경 변수

### 개발 환경 (.env.local)
```bash
# Service Settings
SERVICE_NAME=user-service
SERVICE_PORT=8001
DEBUG=true
LOG_LEVEL=DEBUG

# Database
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Redis
REDIS_URL=redis://localhost:6379/0
REDIS_MAX_CONNECTIONS=50

# JWT Settings
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=720  # 12시간
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# CORS
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]

# SSO (Mock)
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9060/callback
SSO_CERTIFICATE=""  # Mock에서는 불필요

# Rate Limiting
RATE_LIMIT_ENABLED=false
RATE_LIMIT_REQUESTS_PER_MINUTE=60
```

### 운영 환경 (.env.production)
```bash
# Database (회사 DB)
DATABASE_URL=postgresql://prod_user:${VAULT_DB_PASSWORD}@prod-db.company.com:5432/user_service_db

# Redis (회사 Redis)
REDIS_URL=redis://:${VAULT_REDIS_PASSWORD}@prod-redis.company.com:6379/0

# JWT Settings
JWT_SECRET_KEY=${VAULT_JWT_SECRET}

# SSO (실제)
IDP_ENTITY_ID=https://sso.company.com/saml2/idp
SP_REDIRECT_URL=https://platform.company.com/callback
SSO_CERTIFICATE=${VAULT_SSO_CERT}

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

---

## 테스트 가이드

### 1. 브라우저 콘솔 테스트

Frontend (http://localhost:9060)에서 F12를 눌러 콘솔을 열고:

```javascript
// 1. 로그인 테스트
const testLogin = async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uri: window.location.origin + '/callback'
    })
  });
  const data = await res.json();
  console.log('SSO URL:', data.sso_login_url);
  // 새 창에서 SSO 로그인
  window.open(data.sso_login_url);
};
testLogin();

// 2. 토큰 확인
console.log('Token:', localStorage.getItem('accessToken'));

// 3. JWT 디코딩 (디버깅용)
const decodeToken = () => {
  const token = localStorage.getItem('accessToken');
  if (!token) return console.log('No token found');

  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Token Payload:', payload);
  console.log('Expires at:', new Date(payload.exp * 1000));
  console.log('User:', payload.sub);
  console.log('Role:', payload.role);
};
decodeToken();

// 4. 프로필 조회
const getProfile = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/users/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Profile:', await res.json());
};
getProfile();

// 5. API Key 생성
const createApiKey = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/users/me/api-keys', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test API Key',
      expires_in_days: 30
    })
  });
  const data = await res.json();
  console.log('New API Key:', data.api_key);
  console.log('Save this key! It won\'t be shown again.');
};
createApiKey();

// 6. 모든 사용자 조회 (관리자만)
const getAllUsers = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/admin/users', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (res.status === 403) {
    console.log('Admin access required');
  } else {
    console.log('All Users:', await res.json());
  }
};
getAllUsers();
```

### 2. cURL 테스트

```bash
# 헬스 체크
curl http://localhost:8001/health

# 로그인 시작
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'

# 토큰으로 프로필 조회
TOKEN="your-jwt-token-here"
curl http://localhost:8001/api/users/me \
  -H "Authorization: Bearer $TOKEN"

# API Key 생성
curl -X POST http://localhost:8001/api/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "CLI Key", "expires_in_days": 365}'
```

### 3. Python 테스트

```python
import requests
import json

BASE_URL = "http://localhost:8001"

# 1. 로그인
def login():
    response = requests.post(f"{BASE_URL}/api/auth/login",
        json={"redirect_uri": "http://localhost:9060/callback"})
    data = response.json()
    print(f"SSO Login URL: {data['sso_login_url']}")
    return data['session_id']

# 2. 콜백 처리 (Mock SSO 토큰 사용)
def handle_callback(id_token):
    response = requests.post(f"{BASE_URL}/api/auth/callback",
        json={"id_token": id_token})
    data = response.json()
    print(f"Access Token: {data['access_token']}")
    return data['access_token']

# 3. 프로필 조회
def get_profile(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/users/me", headers=headers)
    print(f"User Profile: {json.dumps(response.json(), indent=2)}")

# 실행
session_id = login()
# Mock SSO에서 로그인 후 받은 id_token 사용
# token = handle_callback(id_token)
# get_profile(token)
```

### 4. 단위 테스트

```bash
# 테스트 실행
cd repos/user-service
uv venv && source .venv/bin/activate
uv sync --dev

# 전체 테스트
pytest

# 커버리지 포함
pytest --cov=app --cov-report=html

# 특정 테스트만
pytest tests/test_auth.py -v

# 비동기 테스트
pytest tests/test_websocket.py -v --asyncio-mode=auto
```

---

## SSO 통합

### Mock SSO (개발)
개발 환경에서는 Mock SSO를 사용합니다:

```python
# repos/infra/mock-sso/main.py
MOCK_USERS = {
    "syngha.han": {
        "loginid": "syngha.han",
        "username": "한승하",
        "username_en": "Seungha Han",
        "mail": "syngha.han@company.com",
        "deptname": "AI Platform Team"
    },
    "byungju.lee": { ... },
    "youngsub.kim": { ... },
    "junhyung.ahn": { ... }
}
```

### 실제 SSO (운영)
운영 환경에서는 회사 SSO와 SAML 2.0으로 통합:

```python
# app/services/sso.py
async def validate_saml_response(saml_response: str) -> dict:
    """SAML Response 검증 및 사용자 정보 추출"""
    # 1. SAML Response 디코딩
    # 2. 서명 검증
    # 3. 사용자 속성 추출
    # 4. 사용자 프로비저닝
    return user_attributes
```

---

## 보안 미들웨어

### JWT 검증 미들웨어
```python
# app/middleware/auth.py
from fastapi import HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

security = HTTPBearer()

async def verify_token(credentials: HTTPAuthorizationCredentials):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            JWT_SECRET_KEY,
            algorithms=[JWT_ALGORITHM]
        )

        # 토큰 만료 확인
        if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired"
            )

        return payload

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
```

### RBAC 권한 체크
```python
# app/middleware/rbac.py
def require_role(required_role: str):
    async def role_checker(token_data: dict = Depends(verify_token)):
        user_role = token_data.get('role')

        role_hierarchy = {
            'PENDING': 0,
            'USER': 1,
            'ADMIN': 2
        }

        if role_hierarchy.get(user_role, 0) < role_hierarchy.get(required_role, 0):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        return token_data

    return role_checker

# 사용 예
@router.get("/admin/users")
async def get_all_users(
    auth: dict = Depends(require_role("ADMIN"))
):
    return await user_service.get_all_users()
```

---

## 문제 해결

### 1. 로그인이 안될 때

**증상**: SSO 로그인 후 콜백이 실패
```
해결 1: redirect_uri가 정확한지 확인
- 개발: http://localhost:9060/callback
- 운영: https://platform.company.com/callback

해결 2: Mock SSO가 실행 중인지 확인
docker ps | grep mock-sso
```

### 2. JWT 토큰 검증 실패

**증상**: "Invalid token" 에러
```
해결 1: JWT_SECRET_KEY가 모든 서비스에서 동일한지 확인

해결 2: 토큰 만료 확인
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(payload.exp * 1000));
```

### 3. 데이터베이스 연결 실패

**증상**: "Connection refused"
```
해결 1: PostgreSQL 컨테이너 확인
docker ps | grep postgres
docker logs a2g-postgres-dev

해결 2: 데이터베이스 존재 확인
docker exec -it a2g-postgres-dev psql -U dev_user -c "\l"

해결 3: 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE user_service_db;"
```

### 4. Redis 연결 실패

**증상**: "Redis connection error"
```
해결 1: Redis 컨테이너 확인
docker ps | grep redis
docker logs a2g-redis-dev

해결 2: Redis 연결 테스트
redis-cli -h localhost ping
```

### 5. CORS 오류

**증상**: "CORS policy blocked"
```
해결: CORS_ORIGINS 환경 변수에 Frontend URL 추가
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
```

---

## Sprint 체크리스트

### Sprint 1 (2주차) - DEV1 담당
- [x] 프로젝트 초기화 및 구조 설정
- [x] 데이터베이스 모델 생성
- [x] SSO 로그인/콜백 구현
- [x] JWT 토큰 발급/검증
- [x] 사용자 CRUD API
- [x] API Key 관리
- [x] Mock SSO 통합

### Sprint 2 (3주차)
- [ ] RBAC 미들웨어 완성
- [ ] 관리자 API 구현
- [ ] Redis 세션 캐싱
- [ ] Rate Limiting
- [ ] API 문서 자동화 (OpenAPI)

### Sprint 3 (4-5주차)
- [ ] 실제 SSO 통합 준비
- [ ] 성능 최적화
- [ ] 로깅 및 모니터링
- [ ] 통합 테스트

---

## 참고 자료

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [JWT.io](https://jwt.io/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/)
- [Redis Py](https://redis-py.readthedocs.io/)

---

**© 2025 A2G Platform Development Team**