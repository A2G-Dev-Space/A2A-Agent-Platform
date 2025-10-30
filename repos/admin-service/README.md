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

> **Base URL**: `http://localhost:8005` (개발) | `https://api.company.com/admin` (운영)

### 목차
1. [LLM 모델 관리 API](#1-llm-모델-관리-api) - LLM 모델 등록/조회/삭제
2. [통계 조회 API](#2-통계-조회-api) - 플랫폼 사용 통계

> ⚠️ **권한 요구사항**: 모든 Admin API는 **ADMIN 권한 필수**

---

### 1. LLM 모델 관리 API

#### `GET /api/v1/llm-models`
**등록된 LLM 모델 목록 조회**

**Permission**: ADMIN only

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "GPT-4",
    "provider": "OpenAI",
    "endpoint": "https://api.openai.com/v1",
    "configuration": {
      "temperature": 0.7,
      "max_tokens": 4000
    },
    "is_active": true,
    "created_at": "2025-10-01T09:00:00Z",
    "updated_at": "2025-10-30T10:00:00Z"
  },
  {
    "id": 2,
    "name": "Claude-3.5",
    "provider": "Anthropic",
    "endpoint": "https://api.anthropic.com/v1",
    "configuration": {
      "temperature": 0.8,
      "max_tokens": 8000
    },
    "is_active": true,
    "created_at": "2025-10-15T14:30:00Z",
    "updated_at": "2025-10-15T14:30:00Z"
  },
  {
    "id": 3,
    "name": "Custom LLM",
    "provider": "Internal",
    "endpoint": "http://custom-llm.company.com/api",
    "configuration": {
      "temperature": 0.5
    },
    "is_active": false,
    "created_at": "2025-10-20T11:00:00Z",
    "updated_at": "2025-10-25T15:30:00Z"
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
curl http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $TOKEN"
```

**사용 사례:**
- Admin 대시보드에서 등록된 LLM 모델 목록 표시
- Agent 생성 시 사용 가능한 모델 선택 옵션 제공
- LLM 모델 상태 모니터링

---

#### `POST /api/v1/llm-models`
**새 LLM 모델 등록**

**Permission**: ADMIN only

**Request:**
```json
{
  "name": "Gemini Pro",
  "provider": "Google",
  "endpoint": "https://generativelanguage.googleapis.com/v1",
  "configuration": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9
  }
}
```

**Response (201):**
```json
{
  "id": 4,
  "name": "Gemini Pro",
  "provider": "Google",
  "endpoint": "https://generativelanguage.googleapis.com/v1",
  "configuration": {
    "temperature": 0.7,
    "max_tokens": 2048,
    "top_p": 0.9
  },
  "is_active": true,
  "created_at": "2025-10-30T11:30:00Z",
  "updated_at": "2025-10-30T11:30:00Z"
}
```

**Error (400 - 중복된 이름):**
```json
{
  "detail": "LLM model with name 'Gemini Pro' already exists"
}
```

**Error (422 - 유효성 검증 실패):**
```json
{
  "detail": [
    {
      "loc": ["body", "endpoint"],
      "msg": "field required",
      "type": "value_error.missing"
    }
  ]
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
curl -X POST http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Gemini Pro",
    "provider": "Google",
    "endpoint": "https://generativelanguage.googleapis.com/v1",
    "configuration": {
      "temperature": 0.7,
      "max_tokens": 2048
    }
  }'
```

**사용 사례:**
- 새로운 LLM 모델을 플랫폼에 추가
- 커스텀 LLM 엔드포인트 등록
- 테스트용 LLM 모델 설정

---

#### `DELETE /api/v1/llm-models/{model_id}`
**LLM 모델 삭제**

**Permission**: ADMIN only

**Path Parameters:**
- `model_id`: LLM 모델 ID (정수)

**Response (200):**
```json
{
  "message": "LLM model deleted successfully"
}
```

**Error (404):**
```json
{
  "detail": "LLM model with id 999 not found"
}
```

**Error (409 - 사용 중인 모델):**
```json
{
  "detail": "Cannot delete LLM model: 15 agents are using this model"
}
```

**cURL 예제:**
```bash
TOKEN="admin-jwt-token"
MODEL_ID=3

curl -X DELETE http://localhost:8005/api/v1/llm-models/$MODEL_ID \
  -H "Authorization: Bearer $TOKEN"
```

**사용 사례:**
- 더 이상 사용하지 않는 LLM 모델 제거
- 테스트용으로 등록한 모델 삭제
- 중복 등록된 모델 정리

---

### 2. 통계 조회 API

#### `GET /api/v1/statistics`
**플랫폼 전체 사용 통계 조회**

**Permission**: ADMIN only

**Response (200):**
```json
{
  "total_users": 150,
  "active_users": 89,
  "pending_users": 5,
  "total_agents": 45,
  "active_agents": 38,
  "total_sessions": 3456,
  "active_sessions": 12,
  "total_api_calls": 98765,
  "period": {
    "start": "2025-10-01T00:00:00Z",
    "end": "2025-10-30T23:59:59Z"
  },
  "growth": {
    "users_last_7_days": 12,
    "users_last_30_days": 45,
    "agents_last_7_days": 3,
    "agents_last_30_days": 15
  },
  "by_department": {
    "AI Platform Team": {
      "users": 45,
      "agents": 20
    },
    "Data Science Team": {
      "users": 38,
      "agents": 12
    },
    "Development Team": {
      "users": 67,
      "agents": 13
    }
  },
  "by_framework": {
    "Langchain": 20,
    "Agno": 15,
    "ADK": 10
  },
  "llm_usage": {
    "GPT-4": {
      "total_calls": 45000,
      "active_agents": 18
    },
    "Claude-3.5": {
      "total_calls": 32000,
      "active_agents": 15
    },
    "Custom LLM": {
      "total_calls": 21765,
      "active_agents": 5
    }
  },
  "most_used_agents": [
    {
      "id": 1,
      "name": "Customer Service Agent",
      "owner": "syngha.han",
      "usage_count": 3456,
      "last_used": "2025-10-30T10:30:00Z"
    },
    {
      "id": 5,
      "name": "Data Analysis Agent",
      "owner": "byungju.lee",
      "usage_count": 2890,
      "last_used": "2025-10-30T09:15:00Z"
    },
    {
      "id": 12,
      "name": "Code Review Agent",
      "owner": "youngsub.kim",
      "usage_count": 2341,
      "last_used": "2025-10-29T16:45:00Z"
    }
  ]
}
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

# 전체 통계 조회
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $TOKEN"

# 특정 기간 통계 조회 (향후 구현 예정)
curl "http://localhost:8005/api/v1/statistics?start_date=2025-10-01&end_date=2025-10-31" \
  -H "Authorization: Bearer $TOKEN"
```

**사용 사례:**
- Admin 대시보드 메인 화면 통계 표시
- 플랫폼 사용 현황 모니터링
- 월간/분기별 리포트 생성
- 리소스 사용량 분석 및 최적화

---

## 🧪 API 테스트 시나리오

### 시나리오 1: LLM 모델 라이프사이클 관리

```bash
ADMIN_TOKEN="admin-jwt-token"

# 1. 현재 등록된 LLM 모델 확인
curl http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 2. 새로운 LLM 모델 등록
curl -X POST http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Llama-3-70B",
    "provider": "Meta",
    "endpoint": "http://llama.company.com/api",
    "configuration": {
      "temperature": 0.6,
      "max_tokens": 4096
    }
  }'
# → 새 모델 생성, id 반환받기

# 3. 모델 목록 재확인
curl http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# 4. 테스트 후 불필요한 모델 삭제
curl -X DELETE http://localhost:8005/api/v1/llm-models/4 \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### 시나리오 2: 플랫폼 운영 모니터링

```bash
ADMIN_TOKEN="admin-jwt-token"

# 1. 전체 플랫폼 통계 확인
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.'

# 2. 사용자 증가 추세 확인
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.growth'

# 3. LLM 사용량 분석
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.llm_usage'

# 4. 가장 인기있는 에이전트 확인
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.most_used_agents'

# 5. 부서별 사용 현황 확인
curl http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.by_department'
```

### 시나리오 3: 정기 점검 체크리스트

```bash
ADMIN_TOKEN="admin-jwt-token"

echo "=== 1. LLM 모델 상태 확인 ==="
curl -s http://localhost:8005/api/v1/llm-models \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[] | {name, provider, is_active}'

echo -e "\n=== 2. 플랫폼 통계 확인 ==="
curl -s http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '{
    total_users,
    active_users,
    pending_users,
    total_agents,
    active_sessions
  }'

echo -e "\n=== 3. 승인 대기 사용자 확인 (User Service API) ==="
curl -s http://localhost:8001/api/v1/users \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.[] | select(.role == "PENDING")'

echo -e "\n=== 4. 리소스 사용량 확인 ==="
curl -s http://localhost:8005/api/v1/statistics \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq '.llm_usage'
```

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
   uv run alembic revision --autogenerate -m "Add new field"

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
vim app/core/database.py  # 모델에 필드 추가

# 2. 마이그레이션 파일 생성
docker exec a2g-admin-service uv run alembic revision --autogenerate -m "Add new field"

# 3. 생성된 파일 확인 및 검토
ls alembic/versions/  # 새로 생성된 파일 확인
vim alembic/versions/00X_*.py  # 내용 검토

# 4. 로컬에서 테스트
docker exec a2g-admin-service uv run alembic upgrade head

# 5. 정상 작동 확인 후 커밋
git add app/core/database.py
git add alembic/versions/00X_*.py
git commit -m "Add new field to model"
git push
```

#### 스키마 변경을 받는 팀원 (코드 받는 사람)

```bash
# 1. 코드 받기
git pull origin main

# 2. 단 한 줄로 모든 서비스 DB 동기화!
./start-dev.sh update
```

### 자주 사용하는 명령어

```bash
# 현재 마이그레이션 상태 확인
docker exec a2g-admin-service uv run alembic current

# 마이그레이션 히스토리 확인
docker exec a2g-admin-service uv run alembic history

# 특정 버전으로 롤백 (신중하게!)
docker exec a2g-admin-service uv run alembic downgrade <revision>

# 최신 상태로 업그레이드
docker exec a2g-admin-service uv run alembic upgrade head
```

### 주의사항

⚠️ **운영(Production) 환경에서는**:
1. 마이그레이션 전 반드시 데이터 백업
2. Down-time이 필요한 변경인지 확인
3. 롤백 계획 수립
4. 테스트 환경에서 먼저 검증

⚠️ **충돌 발생 시**:
- 여러 명이 동시에 마이그레이션 생성 시 충돌 가능
- 해결: revision 파일의 down_revision을 올바르게 수정

### 문제 해결

```bash
# Q: "Target database is not up to date" 에러
# A: 현재 버전 확인 후 upgrade
docker exec a2g-admin-service uv run alembic current
docker exec a2g-admin-service uv run alembic upgrade head

# Q: "Table already exists" 에러
# A: 마이그레이션 stamp (이미 테이블이 있는 경우)
docker exec a2g-admin-service uv run alembic stamp head

# Q: 모든 서비스를 한 번에 업데이트하고 싶어요
# A: 루트 디렉토리에서
./start-dev.sh update
```

**© 2025 A2G Platform Team - Admin Service**
