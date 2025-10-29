# ⚙️ Admin Service

**담당자**: DEV1 (한승하, syngha.han@company.com)
**포트**: 8005
**데이터베이스**: admin_service_db (PostgreSQL)

---

## 📋 목차

1. [서비스 개요](#서비스-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [API 명세](#api-명세)
5. [데이터베이스 스키마](#데이터베이스-스키마)
6. [테스트 가이드](#테스트-가이드)
7. [개발 환경 설정](#개발-환경-설정)
8. [Sprint 체크리스트](#sprint-체크리스트)

---

## 서비스 개요

Admin Service는 A2G Platform의 **관리자 전용 서비스**로, LLM 모델 관리, 사용 통계, 시스템 설정을 제공합니다.

### 핵심 역할
- **LLM 모델 관리**: 외부 LLM 모델 등록 및 Health Check
- **플랫폼 통계**: 사용자, 에이전트, 세션, API 호출 통계
- **사용자 관리**: 사용자 승인/거부, 권한 변경
- **에이전트 관리**: 에이전트 승인 프로세스
- **시스템 설정**: 플랫폼 전역 설정

### 권한 요구사항
- **ADMIN 권한 필요**: 모든 API는 ADMIN 권한 사용자만 접근 가능

---

## 주요 기능

### 1. LLM 모델 관리
외부 LLM 모델을 등록하고 상태를 모니터링:

```json
{
  "id": 1,
  "name": "GPT-4",
  "provider": "OpenAI",
  "endpoint": "https://api.openai.com/v1",
  "is_active": true,
  "health_status": "healthy"
}
```

### 2. 플랫폼 통계
사용자, 에이전트, 세션, API 호출 등 통계 제공:

```json
{
  "total_users": 150,
  "active_users": 89,
  "total_agents": 45,
  "production_agents": 12,
  "total_sessions": 3456,
  "total_api_calls": 98765
}
```

### 3. 사용자 승인
신규 가입 사용자 승인/거부:

```json
{
  "user_id": 10,
  "username": "new.user",
  "status": "PENDING",
  "requested_at": "2025-01-01T00:00:00Z"
}
```

---

## 기술 스택

### Backend
- **Framework**: FastAPI 0.104.0
- **Database**: PostgreSQL 15
- **Cache**: Redis 7.2
- **ORM**: SQLAlchemy 2.0
- **Migration**: Alembic

### 주요 라이브러리
```toml
[project]
dependencies = [
    "fastapi==0.104.0",
    "uvicorn[standard]==0.24.0",
    "sqlalchemy==2.0.23",
    "asyncpg==0.29.0",
    "redis==5.0.1",
    "pydantic==2.5.0",
    "httpx==0.25.2"
]
```

---

## API 명세

### 1. LLM 모델 관리 API

#### GET /api/admin/llm-models/
**등록된 LLM 모델 목록 조회**

Response:
```json
{
  "models": [
    {
      "id": 1,
      "name": "GPT-4",
      "provider": "OpenAI",
      "endpoint": "https://api.openai.com/v1",
      "is_active": true,
      "health_status": "healthy",
      "last_health_check": "2025-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Claude-3",
      "provider": "Anthropic",
      "endpoint": "https://api.anthropic.com/v1",
      "is_active": true,
      "health_status": "healthy"
    }
  ]
}
```

#### POST /api/admin/llm-models/
**새 LLM 모델 등록**

Request:
```json
{
  "name": "Custom LLM",
  "provider": "Custom",
  "endpoint": "http://custom-llm.local/api",
  "api_key": "encrypted-key",
  "model_config": {
    "temperature": 0.7,
    "max_tokens": 2000
  }
}
```

Response:
```json
{
  "id": 3,
  "name": "Custom LLM",
  "is_active": false,
  "health_status": "unknown",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### PUT /api/admin/llm-models/{id}/
**LLM 모델 업데이트**

Request:
```json
{
  "is_active": true,
  "model_config": {
    "temperature": 0.8
  }
}
```

#### DELETE /api/admin/llm-models/{id}/
**LLM 모델 삭제**

Response:
```json
{
  "message": "Model deleted successfully"
}
```

#### POST /api/admin/llm-models/{id}/health-check/
**수동 Health Check 실행**

Response:
```json
{
  "model_id": 1,
  "status": "healthy",
  "response_time": 245,
  "checked_at": "2025-01-01T00:00:00Z"
}
```

### 2. 통계 조회 API

#### GET /api/admin/statistics/
**플랫폼 통계 조회**

Query Parameters:
- `start_date`: 시작 날짜 (YYYY-MM-DD)
- `end_date`: 종료 날짜 (YYYY-MM-DD)
- `group_by`: 그룹화 기준 (day, week, month)

Response:
```json
{
  "period": "2025-01-01 to 2025-01-31",
  "statistics": {
    "total_users": 150,
    "active_users": 89,
    "total_agents": 45,
    "production_agents": 12,
    "total_sessions": 3456,
    "total_api_calls": 98765,
    "llm_usage": {
      "gpt-4": 45000,
      "claude-3": 32000,
      "custom": 21765
    }
  },
  "daily_breakdown": [
    {
      "date": "2025-01-01",
      "sessions": 112,
      "api_calls": 3200,
      "active_users": 45
    }
  ]
}
```

#### GET /api/admin/statistics/users/
**사용자 통계**

Response:
```json
{
  "total_users": 150,
  "by_role": {
    "ADMIN": 5,
    "USER": 140,
    "PENDING": 5
  },
  "by_department": {
    "AI팀": 45,
    "데이터팀": 38,
    "개발팀": 67
  },
  "growth": {
    "last_7_days": 12,
    "last_30_days": 45
  }
}
```

#### GET /api/admin/statistics/agents/
**에이전트 통계**

Response:
```json
{
  "total_agents": 45,
  "by_status": {
    "DEVELOPMENT": 25,
    "STAGING": 8,
    "PRODUCTION": 12
  },
  "by_framework": {
    "Langchain": 20,
    "Agno": 15,
    "ADK": 10
  },
  "most_used": [
    {
      "agent_id": 1,
      "name": "CS Agent",
      "usage_count": 3456
    }
  ]
}
```

### 3. 사용자 관리 API

#### GET /api/admin/users/
**사용자 목록 조회**

Query Parameters:
- `role`: 권한 필터 (PENDING, USER, ADMIN)
- `search`: 검색어
- `page`, `size`: 페이지네이션

Response:
```json
{
  "users": [
    {
      "id": 1,
      "username": "test.user",
      "email": "test@example.com",
      "role": "USER",
      "department": "AI팀",
      "created_at": "2025-01-01T00:00:00Z",
      "last_login": "2025-01-15T00:00:00Z"
    }
  ],
  "total": 150,
  "page": 1,
  "size": 20
}
```

#### PUT /api/admin/users/{id}/role/
**사용자 권한 변경**

Request:
```json
{
  "role": "ADMIN"
}
```

Response:
```json
{
  "user_id": 10,
  "username": "new.admin",
  "role": "ADMIN",
  "updated_at": "2025-01-01T00:00:00Z"
}
```

#### POST /api/admin/users/{id}/approve/
**사용자 승인 (PENDING → USER)**

Response:
```json
{
  "user_id": 10,
  "username": "new.user",
  "role": "USER",
  "approved_at": "2025-01-01T00:00:00Z"
}
```

#### POST /api/admin/users/{id}/reject/
**사용자 거부**

Request:
```json
{
  "reason": "소속 확인 불가"
}
```

### [신규 추가된 API] LLM 모델 관리

- **GET /api/v1/llm-models/**: 등록된 모든 LLM 모델 목록을 조회합니다.
  - **Permission**: `ADMIN`
  - **Response**: `List[LLMModelResponse]`

- **POST /api/v1/llm-models/**: 새 LLM 모델을 등록합니다.
  - **Permission**: `ADMIN`
  - **Request Body**: `LLMModelCreate`
  - **Response**: `LLMModelResponse`

- **DELETE /api/v1/llm-models/{model_id}**: LLM 모델을 삭제합니다.
    - **Permission**: `ADMIN`
    - **Response**: `{"message": "LLM model deleted successfully"}`

### [신규 추가된 API] 통계 조회

- **GET /api/v1/statistics/**: 플랫폼 통계를 조회합니다.
    - **Permission**: `ADMIN`
    - **Response**: `StatisticsResponse`

---

## 데이터베이스 스키마

### 1. llm_models 테이블

```sql
CREATE TABLE llm_models (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500) NOT NULL,
    api_key_encrypted TEXT,
    model_config JSONB,
    is_active BOOLEAN DEFAULT false,
    health_status VARCHAR(20) DEFAULT 'unknown',
    last_health_check TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_llm_models_provider ON llm_models(provider);
CREATE INDEX idx_llm_models_active ON llm_models(is_active);
```

### 2. platform_statistics 테이블

```sql
CREATE TABLE platform_statistics (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL UNIQUE,
    total_users INTEGER DEFAULT 0,
    active_users INTEGER DEFAULT 0,
    total_agents INTEGER DEFAULT 0,
    total_sessions INTEGER DEFAULT 0,
    total_api_calls INTEGER DEFAULT 0,
    llm_usage JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_statistics_date ON platform_statistics(date DESC);
```

### 3. system_settings 테이블

```sql
CREATE TABLE system_settings (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) NOT NULL UNIQUE,
    value JSONB NOT NULL,
    description TEXT,
    category VARCHAR(50),
    is_public BOOLEAN DEFAULT false,
    updated_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_settings_category ON system_settings(category);
```

---

## 테스트 가이드

### 브라우저 콘솔 테스트

```javascript
const token = localStorage.getItem('accessToken');

// 1. LLM 모델 목록 조회
fetch('http://localhost:9050/api/admin/llm-models/', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.table);

// 2. LLM 모델 등록
fetch('http://localhost:9050/api/admin/llm-models/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    name: 'Test LLM',
    provider: 'Test Provider',
    endpoint: 'http://test.local/api'
  })
}).then(r => r.json()).then(console.log);

// 3. 플랫폼 통계 조회
fetch('http://localhost:9050/api/admin/statistics/', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);

// 4. 사용자 목록 조회
fetch('http://localhost:9050/api/admin/users/?role=PENDING', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.table);

// 5. 사용자 승인
fetch('http://localhost:9050/api/admin/users/10/approve/', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

### cURL 테스트

```bash
TOKEN="your-admin-jwt-token"

# LLM 모델 조회
curl http://localhost:8005/api/admin/llm-models/ \
  -H "Authorization: Bearer $TOKEN"

# LLM 모델 등록
curl -X POST http://localhost:8005/api/admin/llm-models/ \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "GPT-4",
    "provider": "OpenAI",
    "endpoint": "https://api.openai.com/v1"
  }'

# 통계 조회
curl "http://localhost:8005/api/admin/statistics/?start_date=2025-01-01&end_date=2025-01-31" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 개발 환경 설정

### 일반 사용 (권장)

```bash
# 모든 서비스 시작
cd ~/projects/Agent-Platform-Development
./start-dev.sh full

# 로그 확인
docker logs -f a2g-admin-service
```

### 로컬 개발 (디버깅 시)

```bash
# 1. Docker에서 이 서비스만 중지
docker stop a2g-admin-service

# 2. 로컬 환경 설정
cd repos/admin-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<EOF
SERVICE_NAME=admin-service
SERVICE_PORT=8005
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/admin_service_db
REDIS_URL=redis://localhost:6379/4
JWT_SECRET_KEY=local-dev-secret-key
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
EOF

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 서비스 시작
uvicorn app.main:app --reload --port 8005
```

---

## Sprint 체크리스트

### 한승하 (syngha.han@company.com)

#### Sprint 1 (1주차)
- [ ] 프로젝트 초기화 및 환경 설정
- [ ] 데이터베이스 스키마 설계
- [ ] LLM 모델 CRUD API 구현
- [ ] Health Check 기능 구현

#### Sprint 2 (2주차)
- [ ] 플랫폼 통계 API 구현
- [ ] 통계 집계 로직 구현
- [ ] 사용자 관리 API 구현
- [ ] 단위 테스트 작성

#### Sprint 3 (3주차)
- [ ] 에이전트 승인 프로세스
- [ ] 시스템 설정 API
- [ ] Frontend 통합 테스트
- [ ] Worker Service 연동

#### Sprint 4 (4주차)
- [ ] 성능 최적화
- [ ] 캐싱 전략 구현
- [ ] 통합 테스트 및 버그 수정
- [ ] 문서 작성 완료

---

## 관련 문서

- [PROJECT_OVERVIEW.md](../../PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [PROJECT_INTEGRATED_GUIDE.md](../../PROJECT_INTEGRATED_GUIDE.md) - 통합 개발 가이드
- [Technical_Architecture.md](../../Technical_Architecture.md) - 기술 아키텍처
- [Worker Service README](../worker-service/README.md) - Celery 백그라운드 작업

---

**© 2025 A2G Platform Team - Admin Service**
