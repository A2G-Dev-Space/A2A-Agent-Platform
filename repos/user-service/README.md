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

## 📡 API 명세

> **Base URL**: `http://localhost:8001` (개발) | `https://api.company.com` (운영)

### 목차
1. [인증 API](#1-인증-api) - SSO 로그인/로그아웃
2. [사용자 프로필 API](#2-사용자-프로필-api) - 내 정보 조회/수정
3. [API Key 관리 API](#3-api-key-관리-api) - API Key 생성/조회/삭제
4. [사용자 관리 API (v1)](#4-사용자-관리-api-v1) - 사용자 초대/승인 (ADMIN)
5. [관리자 API](#5-관리자-api) - 전체 사용자 조회/권한 변경 (ADMIN)

---

### 1. 인증 API

#### `POST /api/auth/login`
**SSO 로그인 프로세스 시작**

**Permission**: None (공개)

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
  "session_id": "temp-session-abc123"
}
```

**cURL 예제:**
```bash
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'
```

**사용 방법:**
1. Frontend에서 이 API를 호출하여 SSO URL 받기
2. 사용자를 `sso_login_url`로 리다이렉트
3. SSO에서 로그인 후 `redirect_uri`로 콜백

---

#### `POST /api/auth/callback`
**SSO 콜백 처리 및 JWT 토큰 발급**

**Permission**: None (공개)

**Request:**
```json
{
  "id_token": "mock-id-token-dev1"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJzeW5naGEuaGFuIiwicm9sZSI6IkFETUlOIiwiZXhwIjoxNzMwMjgwMDAwfQ.signature",
  "token_type": "Bearer",
  "expires_in": 43200,
  "user": {
    "id": 1,
    "username": "syngha.han",
    "username_kr": "한승하",
    "username_en": "Syngha Han",
    "email": "syngha.han@company.com",
    "role": "ADMIN",
    "department_kr": "AI Platform Team",
    "department_en": "AI Platform Team",
    "is_active": true,
    "last_login": "2025-10-30T10:30:00Z"
  }
}
```

**Error Response (401):**
```json
{
  "detail": "Invalid SSO token"
}
```

**cURL 예제:**
```bash
# Mock SSO 개발 환경
curl -X POST http://localhost:8001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "mock-id-token-dev1"}'
```

---

#### `POST /api/auth/logout`
**사용자 로그아웃 (세션 무효화)**

**Permission**: Authenticated

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

**cURL 예제:**
```bash
TOKEN="your-jwt-token-here"
curl -X POST http://localhost:8001/api/auth/logout \
  -H "Authorization: Bearer $TOKEN"
```

---

### 2. 사용자 프로필 API

#### `GET /api/users/me`
**현재 로그인한 사용자 정보 조회**

**Permission**: Authenticated

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
  "username_en": "Syngha Han",
  "email": "syngha.han@company.com",
  "role": "ADMIN",
  "department_kr": "AI Platform Team",
  "department_en": "AI Platform Team",
  "is_active": true,
  "last_login": "2025-10-30T10:30:00Z",
  "created_at": "2025-10-01T09:00:00Z"
}
```

**Error (401 Unauthorized):**
```json
{
  "detail": "Could not validate credentials"
}
```

**Error (403 Forbidden - PENDING 사용자):**
```json
{
  "detail": "User access required. Your account may be pending approval."
}
```

**cURL 예제:**
```bash
TOKEN="your-jwt-token"
curl http://localhost:8001/api/users/me \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `PUT /api/users/me`
**사용자 프로필 정보 업데이트**

**Permission**: Authenticated (USER or ADMIN)

**Request:**
```json
{
  "username_kr": "한승하",
  "username_en": "Seungha Han",
  "department_kr": "플랫폼개발팀",
  "department_en": "Platform Development Team"
}
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
  "department_kr": "플랫폼개발팀",
  "department_en": "Platform Development Team",
  "is_active": true,
  "last_login": "2025-10-30T10:30:00Z",
  "created_at": "2025-10-01T09:00:00Z"
}
```

**cURL 예제:**
```bash
TOKEN="your-jwt-token"
curl -X PUT http://localhost:8001/api/users/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "department_kr": "플랫폼개발팀",
    "department_en": "Platform Development Team"
  }'
```

---

### 3. API Key 관리 API

#### `POST /api/users/me/api-keys`
**새 API Key 생성**

**Permission**: Authenticated

**Request:**
```json
{
  "name": "Agent Service API Key",
  "expires_in_days": 365
}
```

**Response (201):**
```json
{
  "id": 1,
  "name": "Agent Service API Key",
  "api_key": "sk_live_a2g_1a2b3c4d5e6f7g8h9i0j",
  "expires_at": "2026-10-30T10:30:00Z",
  "is_active": true,
  "created_at": "2025-10-30T10:30:00Z",
  "last_used": null
}
```

> ⚠️ **중요**: `api_key` 값은 **단 한 번만** 반환됩니다. 반드시 안전한 곳에 저장하세요!

**cURL 예제:**
```bash
TOKEN="your-jwt-token"
curl -X POST http://localhost:8001/api/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My Production Key",
    "expires_in_days": 365
  }'
```

---

#### `GET /api/users/me/api-keys`
**내 API Key 목록 조회**

**Permission**: Authenticated

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Agent Service API Key",
    "last_used": "2025-10-30T09:15:00Z",
    "expires_at": "2026-10-30T10:30:00Z",
    "is_active": true,
    "created_at": "2025-10-30T10:30:00Z"
  },
  {
    "id": 2,
    "name": "CLI Key",
    "last_used": null,
    "expires_at": "2026-10-30T11:00:00Z",
    "is_active": true,
    "created_at": "2025-10-30T11:00:00Z"
  }
]
```

> **Note**: 보안을 위해 실제 API Key 값은 조회되지 않습니다.

**cURL 예제:**
```bash
TOKEN="your-jwt-token"
curl http://localhost:8001/api/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `DELETE /api/users/me/api-keys/{key_id}`
**API Key 삭제**

**Permission**: Authenticated

**Path Parameters:**
- `key_id`: API Key ID (정수)

**Response (200):**
```json
{
  "message": "API key deleted successfully"
}
```

**Error (404):**
```json
{
  "detail": "API key not found"
}
```

**cURL 예제:**
```bash
TOKEN="your-jwt-token"
KEY_ID=1
curl -X DELETE http://localhost:8001/api/users/me/api-keys/$KEY_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

### 4. 사용자 관리 API (v1)

> 💡 **새로운 Frontend 사용자 관리 페이지용 API**
>
> 이 v1 API는 Admin 페이지의 "설정 > 사용자 관리" 기능을 위해 추가되었습니다.

#### `GET /api/v1/users`
**모든 사용자 목록 조회**

**Permission**: ADMIN only

**Response (200):**
```json
[
  {
    "id": 1,
    "username": "syngha.han",
    "username_kr": "한승하",
    "username_en": "Syngha Han",
    "email": "syngha.han@company.com",
    "role": "ADMIN",
    "department_kr": "AI Platform Team",
    "department_en": "AI Platform Team",
    "is_active": true,
    "last_login": "2025-10-30T10:30:00Z",
    "created_at": "2025-10-01T09:00:00Z",
    "updated_at": "2025-10-30T10:30:00Z"
  },
  {
    "id": 5,
    "username": "test.user",
    "username_kr": "테스트유저",
    "username_en": "Test User",
    "email": "test.user@company.com",
    "role": "PENDING",
    "department_kr": "Test Team",
    "department_en": "Test Team",
    "is_active": true,
    "last_login": null,
    "created_at": "2025-10-29T15:00:00Z",
    "updated_at": "2025-10-29T15:00:00Z"
  }
]
```

**Error (403):**
```json
{
  "detail": "Admin access required"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
curl http://localhost:8001/api/v1/users \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `POST /api/v1/users/invite`
**신규 사용자 초대**

**Permission**: ADMIN only

**Request:**
```json
{
  "email": "newuser@company.com",
  "username_kr": "신규사용자",
  "username_en": "New User",
  "department_kr": "개발팀",
  "department_en": "Development Team"
}
```

**Response (201):**
```json
{
  "id": 6,
  "username": "newuser",
  "username_kr": "신규사용자",
  "username_en": "New User",
  "email": "newuser@company.com",
  "role": "PENDING",
  "department_kr": "개발팀",
  "department_en": "Development Team",
  "is_active": true,
  "last_login": null,
  "created_at": "2025-10-30T11:00:00Z",
  "updated_at": "2025-10-30T11:00:00Z"
}
```

**Error (400 - 이미 존재하는 이메일):**
```json
{
  "detail": "User with email newuser@company.com already exists"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
curl -X POST http://localhost:8001/api/v1/users/invite \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@company.com",
    "username_kr": "신규사용자",
    "username_en": "New User",
    "department_kr": "개발팀",
    "department_en": "Development Team"
  }'
```

---

#### `PUT /api/v1/users/{user_id}/approve`
**사용자 승인 (PENDING → USER)**

**Permission**: ADMIN only

**Path Parameters:**
- `user_id`: 사용자 ID (정수)

**Response (200):**
```json
{
  "message": "User 5 approved successfully"
}
```

**Error (404):**
```json
{
  "detail": "User with id 999 not found"
}
```

**Error (400 - 이미 승인된 사용자):**
```json
{
  "detail": "User is already approved"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
USER_ID=5
curl -X PUT http://localhost:8001/api/v1/users/$USER_ID/approve \
  -H "Authorization: Bearer $TOKEN"
```

**워크플로우 예시:**
```
1. 신규 사용자 SSO 로그인 → 자동으로 PENDING 상태로 생성
2. 관리자가 GET /api/v1/users로 PENDING 사용자 확인
3. 관리자가 PUT /api/v1/users/{user_id}/approve로 승인
4. 사용자 role이 PENDING → USER로 변경
5. 이제 사용자는 에이전트 생성/실행 가능
```

---

#### `PUT /api/v1/users/{user_id}/reject`
**사용자 등록 거절 (is_active = false)**

**Permission**: ADMIN only

**Path Parameters:**
- `user_id`: 사용자 ID (정수)

**Response (200):**
```json
{
  "message": "User 5 rejected successfully"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
USER_ID=5
curl -X PUT http://localhost:8001/api/v1/users/$USER_ID/reject \
  -H "Authorization: Bearer $TOKEN"
```

---

### 5. 관리자 API

#### `GET /api/admin/users`
**전체 사용자 조회 (페이지네이션 지원)**

**Permission**: ADMIN only

**Query Parameters:**
- `role` (선택): 역할 필터 (PENDING | USER | ADMIN)
- `department` (선택): 부서 필터
- `page` (선택): 페이지 번호 (기본: 1)
- `limit` (선택): 페이지당 항목 수 (기본: 20, 최대: 100)

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "syngha.han",
      "username_kr": "한승하",
      "username_en": "Syngha Han",
      "email": "syngha.han@company.com",
      "role": "ADMIN",
      "department_kr": "AI Platform Team",
      "department_en": "AI Platform Team",
      "is_active": true,
      "last_login": "2025-10-30T10:30:00Z",
      "created_at": "2025-10-01T09:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "pages": 8
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"

# 전체 사용자 조회
curl "http://localhost:8001/api/admin/users" \
  -H "Authorization: Bearer $TOKEN"

# PENDING 사용자만 필터링
curl "http://localhost:8001/api/admin/users?role=PENDING" \
  -H "Authorization: Bearer $TOKEN"

# AI Platform Team 사용자만 조회
curl "http://localhost:8001/api/admin/users?department=AI%20Platform%20Team" \
  -H "Authorization: Bearer $TOKEN"

# 페이지네이션 (2페이지, 50개씩)
curl "http://localhost:8001/api/admin/users?page=2&limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `PUT /api/admin/users/{user_id}/role`
**사용자 권한 변경**

**Permission**: ADMIN only

**Path Parameters:**
- `user_id`: 사용자 ID (정수)

**Request:**
```json
{
  "role": "ADMIN"
}
```

**Allowed roles:**
- `PENDING`: 승인 대기 (로그인만 가능)
- `USER`: 일반 사용자 (에이전트 생성/실행)
- `ADMIN`: 관리자 (전체 권한)

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": 3,
    "username": "youngsub.kim",
    "role": "ADMIN",
    "updated_at": "2025-10-30T11:30:00Z"
  }
}
```

**Error (400 - 잘못된 role):**
```json
{
  "detail": "Invalid role. Allowed values: PENDING, USER, ADMIN"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
USER_ID=3

# USER를 ADMIN으로 승격
curl -X PUT http://localhost:8001/api/admin/users/$USER_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'

# PENDING을 USER로 승인
curl -X PUT http://localhost:8001/api/admin/users/$USER_ID/role \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "USER"}'
```

---

## 🧪 API 테스트 시나리오

### 시나리오 1: 신규 사용자 온보딩

```bash
# 1. SSO 로그인 (신규 사용자가 처음 로그인)
curl -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}'

# 2. 사용자가 Mock SSO에서 로그인 후 콜백
curl -X POST http://localhost:8001/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "mock-id-token-test-user"}'
# → role: "PENDING" 상태로 생성됨

# 3. 관리자가 PENDING 사용자 확인
curl "http://localhost:8001/api/v1/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. 관리자가 사용자 승인
curl -X PUT http://localhost:8001/api/v1/users/5/approve \
  -H "Authorization: Bearer $ADMIN_TOKEN"
# → role: "PENDING" → "USER"

# 5. 사용자가 다시 로그인하면 이제 에이전트 사용 가능
```

### 시나리오 2: API Key 관리

```bash
# 1. 사용자 로그인
TOKEN="user-jwt-token"

# 2. API Key 생성
curl -X POST http://localhost:8001/api/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Production Key", "expires_in_days": 365}'
# → api_key: "sk_live_a2g_..." 저장 필수!

# 3. API Key 목록 확인
curl http://localhost:8001/api/users/me/api-keys \
  -H "Authorization: Bearer $TOKEN"

# 4. 불필요한 API Key 삭제
curl -X DELETE http://localhost:8001/api/users/me/api-keys/1 \
  -H "Authorization: Bearer $TOKEN"
```

### 시나리오 3: 관리자 작업

```bash
ADMIN_TOKEN="admin-jwt-token"

# 1. 전체 사용자 통계 확인
curl "http://localhost:8001/api/admin/users" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. PENDING 사용자만 필터링
curl "http://localhost:8001/api/admin/users?role=PENDING" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 3. 우수 사용자를 ADMIN으로 승격
curl -X PUT http://localhost:8001/api/admin/users/10/role \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"role": "ADMIN"}'

# 4. 신규 사용자 직접 초대
curl -X POST http://localhost:8001/api/v1/users/invite \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "new.dev@company.com",
    "username_kr": "신규개발자",
    "username_en": "New Developer",
    "department_kr": "개발팀",
    "department_en": "Development Team"
  }'
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

## 📦 데이터베이스 관리

### Alembic 마이그레이션 시스템

이 서비스는 **Alembic**을 사용하여 데이터베이스 스키마를 관리합니다. 모든 스키마 변경은 마이그레이션 파일로 추적됩니다.

### 기본 규칙

1. **절대 수동으로 테이블을 생성/수정하지 마세요** ❌
   - ~~CREATE TABLE~~
   - ~~ALTER TABLE~~
   - ~~DROP TABLE~~

2. **모든 스키마 변경은 Alembic 마이그레이션으로만 수행합니다** ✅
   ```bash
   # 모델 변경 후 마이그레이션 생성
   uv run alembic revision --autogenerate -m "Add profile_image to users"

   # 마이그레이션 적용
   uv run alembic upgrade head
   ```

3. **팀원과 동기화**
   ```bash
   # 코드 받은 후
   git pull origin main

   # 루트 디렉토리에서 한 번에 모든 서비스 DB 동기화!
   ./start-dev.sh update
   ```

### 워크플로우

#### 스키마 변경이 필요한 개발자 (코드 작성자)

```bash
# 1. 모델 변경
vim app/core/database.py  # User 모델에 필드 추가

# 2. 마이그레이션 파일 생성
docker exec a2g-user-service uv run alembic revision --autogenerate -m "Add profile_image field"

# 3. 생성된 파일 확인 및 검토
ls alembic/versions/  # 새로 생성된 파일 확인
vim alembic/versions/00X_add_profile_image_field.py  # 내용 검토

# 4. 로컬에서 테스트
docker exec a2g-user-service uv run alembic upgrade head

# 5. 정상 작동 확인 후 커밋
git add app/core/database.py
git add alembic/versions/00X_add_profile_image_field.py
git commit -m "Add profile_image field to User model"
git push origin feature/add-profile-image
```

#### 스키마 변경을 받는 팀원 (코드 받는 사람)

```bash
# 1. 코드 받기
git pull origin main

# 2. 단 한 줄로 모든 서비스 DB 동기화!
./start-dev.sh update
```

**출력 예시:**
```
🔄 Updating all service databases with latest migrations...

📦 user-service: Checking for migrations...
   Current: 001_add_missing_columns
   Running: docker exec a2g-user-service uv run alembic upgrade head
   ✅ user-service migrations applied

📦 agent-service: Checking for migrations...
   ✅ agent-service migrations applied

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Migration Update Summary:
   ✅ Success: 5
   ⏭️  Skipped: 0
   ❌ Failed:  0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎉 All migrations completed successfully!
```

### 자주 사용하는 명령어

```bash
# 현재 마이그레이션 상태 확인
docker exec a2g-user-service uv run alembic current

# 마이그레이션 히스토리 확인
docker exec a2g-user-service uv run alembic history

# 특정 버전으로 롤백 (신중하게!)
docker exec a2g-user-service uv run alembic downgrade <revision>

# 최신 상태로 업그레이드
docker exec a2g-user-service uv run alembic upgrade head

# 다음 마이그레이션 하나만 적용
docker exec a2g-user-service uv run alembic upgrade +1
```

### 주의사항

⚠️ **운영(Production) 환경에서는**:
1. 마이그레이션 전 반드시 데이터 백업
2. Down-time이 필요한 변경인지 확인
3. 롤백 계획 수립
4. 테스트 환경에서 먼저 검증

⚠️ **충돌 발생 시**:
```bash
# 여러 명이 동시에 마이그레이션 생성 시 충돌 가능
# 해결: revision 파일의 down_revision을 올바르게 수정

# 또는 마이그레이션 순서 재정렬
docker exec a2g-user-service uv run alembic merge <rev1> <rev2>
```

### 문제 해결

```bash
# Q: "Target database is not up to date" 에러
# A: 현재 버전 확인 후 upgrade
docker exec a2g-user-service uv run alembic current
docker exec a2g-user-service uv run alembic upgrade head

# Q: "Table already exists" 에러
# A: 마이그레이션 stamp (이미 테이블이 있는 경우)
docker exec a2g-user-service uv run alembic stamp head

# Q: 모든 서비스를 한 번에 업데이트하고 싶어요
# A: 루트 디렉토리에서
./start-dev.sh update
```

---

**© 2025 A2G Platform Development Team**