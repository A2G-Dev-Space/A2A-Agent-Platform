# 📊 Tracing Service

**담당자**: DEV3 (김영섭, youngsub.kim@company.com)
**포트**: 8004
**데이터베이스**: tracing_service_db (PostgreSQL)

---

## 📋 목차

1. [서비스 개요](#서비스-개요)
2. [주요 기능](#주요-기능)
3. [기술 스택](#기술-스택)
4. [API 명세](#api-명세)
5. [데이터베이스 스키마](#데이터베이스-스키마)
6. [Agent Transfer 탐지](#agent-transfer-탐지)
7. [테스트 가이드](#테스트-가이드)
8. [개발 환경 설정](#개발-환경-설정)
9. [Sprint 체크리스트](#sprint-체크리스트)

---

## 서비스 개요

Tracing Service는 A2G Platform의 **로그 추적 및 모니터링 시스템**입니다.

### 핵심 역할
- **로그 프록시**: 모든 서비스의 로그 중앙 수집
- **Agent Transfer 감지**: 멀티 에이전트 간 작업 전달 자동 탐지
- **실시간 추적**: WebSocket 기반 실시간 로그 스트리밍
- **로그 저장 및 조회**: trace_id 기반 세션별 로그 관리

### 특징
- **Time-series 최적화**: TimescaleDB 사용 (선택적)
- **실시간 스트리밍**: WebSocket + Redis Pub/Sub
- **Agent Transfer 시각화**: 에이전트 간 전달 자동 감지
- **trace_id 추적**: 전체 요청 흐름 추적

---

## 주요 기능

### 1. 로그 프록시
모든 백엔드 서비스에서 로그를 전송받아 중앙 저장:

```json
{
  "trace_id": "trace-uuid-789",
  "service_name": "agent-service",
  "agent_id": 1,
  "level": "INFO",
  "message": "에이전트 실행 시작",
  "metadata": {
    "user_id": "test.user",
    "action": "execute"
  }
}
```

### 2. Agent Transfer 감지
로그 메시지에서 Agent Transfer 패턴 감지:

```
로그: "[Agent Transfer] agent-1 → agent-2"
↓
자동 탐지 및 시각화
```

### 3. trace_id 기반 조회
세션별 전체 로그 추적:

```
GET /api/tracing/logs/{trace_id}
→ 해당 세션의 모든 로그 반환
```

---

## 기술 스택

### Backend
- **Framework**: FastAPI 0.104.0
- **Database**: PostgreSQL 15 (선택적: TimescaleDB)
- **Cache**: Redis 7.2 (WebSocket Pub/Sub)
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
    "pydantic==2.5.0"
]
```

---

## API 명세

### 1. 로그 수집 API

#### POST /api/tracing/logs
**로그 엔트리 생성**

Request:
```json
{
  "trace_id": "trace-uuid-789",
  "service_name": "agent-service",
  "agent_id": 1,
  "level": "INFO",
  "message": "에이전트 실행 시작",
  "metadata": {
    "user_id": "test.user",
    "action": "execute",
    "execution_time": 1250
  }
}
```

Response:
```json
{
  "log_id": 12345,
  "timestamp": "2025-01-01T00:00:00Z"
}
```

### 2. 로그 조회 API

#### GET /api/tracing/logs/{trace_id}
**trace_id로 로그 조회**

Response:
```json
{
  "trace_id": "trace-uuid-789",
  "logs": [
    {
      "timestamp": "2025-01-01T00:00:00Z",
      "service": "agent-service",
      "agent_id": 1,
      "level": "INFO",
      "message": "에이전트 실행 시작"
    },
    {
      "timestamp": "2025-01-01T00:00:01Z",
      "service": "agent-service",
      "agent_id": 1,
      "level": "INFO",
      "message": "[Agent Transfer] agent-1 → agent-2",
      "is_transfer": true
    }
  ],
  "total_logs": 25
}
```

#### GET /api/tracing/logs
**로그 검색**

Query Parameters:
- `service_name`: 서비스 필터
- `level`: 로그 레벨 (DEBUG, INFO, WARNING, ERROR)
- `agent_id`: 에이전트 ID
- `start_time`: 시작 시간
- `end_time`: 종료 시간

Response:
```json
{
  "logs": [...],
  "total": 150,
  "page": 1,
  "size": 20
}
```

### 3. Agent Transfer API

#### GET /api/tracing/transfers
**Agent Transfer 이벤트 조회**

Query Parameters:
- `trace_id`: Trace ID
- `from_agent`: 시작 에이전트 ID
- `to_agent`: 대상 에이전트 ID

Response:
```json
{
  "transfers": [
    {
      "id": 1,
      "trace_id": "trace-uuid-789",
      "from_agent": 1,
      "to_agent": 2,
      "timestamp": "2025-01-01T00:00:01Z",
      "reason": "전문 분야 전환"
    }
  ],
  "total": 5
}
```

---

## 데이터베이스 스키마

### 1. logs 테이블

```sql
CREATE TABLE logs (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(100) NOT NULL,
    service_name VARCHAR(100) NOT NULL,
    agent_id INTEGER,
    level VARCHAR(20) NOT NULL,
    message TEXT NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_logs_trace_id ON logs(trace_id);
CREATE INDEX idx_logs_service_name ON logs(service_name);
CREATE INDEX idx_logs_timestamp ON logs(timestamp DESC);
CREATE INDEX idx_logs_agent_id ON logs(agent_id);
CREATE INDEX idx_logs_level ON logs(level);
```

### 2. agent_transfers 테이블

```sql
CREATE TABLE agent_transfers (
    id SERIAL PRIMARY KEY,
    trace_id VARCHAR(100) NOT NULL,
    from_agent_id INTEGER NOT NULL,
    to_agent_id INTEGER NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    reason TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_transfers_trace_id ON agent_transfers(trace_id);
CREATE INDEX idx_transfers_from_agent ON agent_transfers(from_agent_id);
CREATE INDEX idx_transfers_to_agent ON agent_transfers(to_agent_id);
```

### 3. TimescaleDB (선택적 최적화)

시계열 데이터 최적화를 위한 TimescaleDB 사용:

```sql
-- TimescaleDB Hypertable 변환
SELECT create_hypertable('logs', 'timestamp',
    chunk_time_interval => INTERVAL '1 day');

-- 압축 정책 (7일 이상 된 데이터)
ALTER TABLE logs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'service_name'
);

SELECT add_compression_policy('logs', INTERVAL '7 days');
```

---

## Agent Transfer 탐지

### 패턴 인식 시스템

Tracing Service는 로그 메시지에서 Agent Transfer 패턴을 자동 감지합니다:

```python
# app/services/transfer_detector.py
import re

class TransferDetector:
    """Agent Transfer 자동 탐지"""

    PATTERNS = [
        r'\[Agent Transfer\]\s*agent-(\d+)\s*→\s*agent-(\d+)',
        r'Transferring to agent:\s*(\d+)',
        r'Agent (\d+) delegates to agent (\d+)'
    ]

    def detect_transfer(self, message: str, agent_id: int) -> dict:
        """메시지에서 Transfer 패턴 감지"""
        for pattern in self.PATTERNS:
            match = re.search(pattern, message)
            if match:
                return {
                    'from_agent': agent_id,
                    'to_agent': int(match.group(2) if len(match.groups()) > 1 else match.group(1)),
                    'detected': True
                }
        return {'detected': False}
```

### Frontend 시각화

Frontend에서 Agent Transfer를 시각화:

```javascript
// Agent Transfer 그래프 표시
fetch(`/api/tracing/transfers?trace_id=${traceId}`)
  .then(r => r.json())
  .then(data => {
    data.transfers.forEach(t => {
      console.log(`${t.from_agent} → ${t.to_agent}`);
      // 그래프 UI 업데이트
    });
  });
```

---

## 테스트 가이드

### 브라우저 콘솔 테스트

```javascript
const token = localStorage.getItem('accessToken');

// 1. 로그 생성 테스트
fetch('http://localhost:9050/api/tracing/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    trace_id: 'test-trace-001',
    service_name: 'test-service',
    level: 'INFO',
    message: 'Test log message'
  })
}).then(r => r.json()).then(console.log);

// 2. 로그 조회 테스트
fetch('http://localhost:9050/api/tracing/logs/test-trace-001', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.table);

// 3. Agent Transfer 테스트
fetch('http://localhost:9050/api/tracing/logs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    trace_id: 'test-trace-001',
    service_name: 'agent-service',
    agent_id: 1,
    level: 'INFO',
    message: '[Agent Transfer] agent-1 → agent-2'
  })
}).then(r => r.json()).then(console.log);

// Transfer 확인
fetch('http://localhost:9050/api/tracing/transfers?trace_id=test-trace-001', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

### cURL 테스트

```bash
TOKEN="your-jwt-token"

# 로그 생성
curl -X POST http://localhost:8004/api/tracing/logs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "trace_id": "test-trace-001",
    "service_name": "test-service",
    "level": "INFO",
    "message": "Test log"
  }'

# 로그 조회
curl http://localhost:8004/api/tracing/logs/test-trace-001 \
  -H "Authorization: Bearer $TOKEN"
```

---

## 개발 환경 설정

### 일반 사용 (권장)

```bash
# 모든 서비스 시작 (start-dev.sh 사용)
cd ~/projects/Agent-Platform-Development
./start-dev.sh full

# 로그 확인
docker logs -f a2g-tracing-service
```

### 로컬 개발 (디버깅 시)

```bash
# 1. Docker에서 이 서비스만 중지
docker stop a2g-tracing-service

# 2. 로컬 환경 설정
cd repos/tracing-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<EOF
SERVICE_NAME=tracing-service
SERVICE_PORT=8004
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/tracing_service_db
REDIS_URL=redis://localhost:6379/3
JWT_SECRET_KEY=local-dev-secret-key
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
EOF

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 서비스 시작
uvicorn app.main:app --reload --port 8004

# 6. 헬스 체크
curl http://localhost:8004/health
```

### Docker 개발 환경

```yaml
# repos/infra/docker-compose.dev.yml
tracing-service:
  build: ../tracing-service
  container_name: a2g-tracing-service
  environment:
    DATABASE_URL: postgresql://dev_user:dev_password@postgres:5432/tracing_service_db
    REDIS_URL: redis://redis:6379/3
    SERVICE_PORT: 8004
  ports:
    - "8004:8004"
  volumes:
    - ../tracing-service:/app
  command: uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload
```

---

## Sprint 체크리스트

### 김영섭 (youngsub.kim@company.com)

#### Sprint 1 (1주차)
- [ ] 프로젝트 초기화 및 환경 설정
- [ ] 데이터베이스 스키마 설계
- [ ] 로그 수집 API 구현 (POST /api/tracing/logs)
- [ ] 로그 조회 API 구현 (GET /api/tracing/logs/{trace_id})

#### Sprint 2 (2주차)
- [ ] Agent Transfer 감지 로직 구현
- [ ] Agent Transfer API 구현
- [ ] 로그 검색 필터링 기능
- [ ] 단위 테스트 작성

#### Sprint 3 (3주차)
- [ ] WebSocket 실시간 로그 스트리밍 (선택)
- [ ] Redis Pub/Sub 통합 (선택)
- [ ] Frontend 통합 테스트
- [ ] 성능 최적화

#### Sprint 4 (4주차)
- [ ] TimescaleDB 최적화 (선택)
- [ ] 로그 압축 및 보관 정책
- [ ] 통합 테스트 및 버그 수정
- [ ] 문서 작성 완료

---

## 관련 문서

- [PROJECT_OVERVIEW.md](../../PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [PROJECT_INTEGRATED_GUIDE.md](../../PROJECT_INTEGRATED_GUIDE.md) - 통합 개발 가이드
- [Technical_Architecture.md](../../Technical_Architecture.md) - 기술 아키텍처
- [Chat Service README](../chat-service/README.md) - WebSocket 채팅 서비스
- [Agent Service README](../agent-service/README.md) - 에이전트 서비스

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
docker exec a2g-tracing-service uv run alembic revision --autogenerate -m "Add new field"

# 3. 생성된 파일 확인 및 검토
ls alembic/versions/  # 새로 생성된 파일 확인
vim alembic/versions/00X_*.py  # 내용 검토

# 4. 로컬에서 테스트
docker exec a2g-tracing-service uv run alembic upgrade head

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
docker exec a2g-tracing-service uv run alembic current

# 마이그레이션 히스토리 확인
docker exec a2g-tracing-service uv run alembic history

# 특정 버전으로 롤백 (신중하게!)
docker exec a2g-tracing-service uv run alembic downgrade <revision>

# 최신 상태로 업그레이드
docker exec a2g-tracing-service uv run alembic upgrade head
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
docker exec a2g-tracing-service uv run alembic current
docker exec a2g-tracing-service uv run alembic upgrade head

# Q: "Table already exists" 에러
# A: 마이그레이션 stamp (이미 테이블이 있는 경우)
docker exec a2g-tracing-service uv run alembic stamp head

# Q: 모든 서비스를 한 번에 업데이트하고 싶어요
# A: 루트 디렉토리에서
./start-dev.sh update
```

**© 2025 A2G Platform Team - Tracing Service**
