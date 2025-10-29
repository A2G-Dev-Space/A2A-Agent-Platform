# 🚀 A2G Platform 백엔드 구현 가이드

**작성일**: 2025년 10월 29일  
**상태**: 프론트엔드 검증 완료 ✅  
**다음 단계**: 백엔드 서비스 구현

---

## 📋 현재 상태 요약

### ✅ 완료된 작업
1. **프론트엔드 검증 완료**: 모든 기능이 정상 작동
2. **로그인 문제 해결**: Mock SSO URL 포트 수정으로 해결
3. **API 통합 테스트**: 모든 엔드포인트 정상 작동
4. **Mock 서비스**: 완전한 테스트 환경 구축

### 🎯 다음 구현 목표
명세서에 맞는 실제 백엔드 서비스 구현

---

## 🏗️ 백엔드 구현 계획

### 1. 서비스별 구현 순서

| 순서 | 서비스 | 담당자 | 우선순위 | 설명 |
|------|--------|--------|----------|------|
| 1 | **User Service** | DEV1 (한승하) | 🔴 높음 | 인증/권한 기반 서비스 |
| 2 | **Agent Service** | DEV4 (안준형) | 🔴 높음 | 핵심 비즈니스 로직 |
| 3 | **Chat Service** | DEV3 (김영섭) | 🟡 중간 | 실시간 통신 |
| 4 | **Tracing Service** | DEV3 (김영섭) | 🟡 중간 | 로그 추적 |
| 5 | **Admin Service** | DEV2 (이병주) | 🟢 낮음 | 관리 기능 |
| 6 | **Worker Service** | DEV2 (이병주) | 🟢 낮음 | 백그라운드 작업 |

### 2. 기술 스택 및 요구사항

#### 공통 기술 스택
```yaml
Framework: FastAPI (Python 3.11+)
Package Manager: uv (NOT pip/poetry)
Database: PostgreSQL 15 + SQLAlchemy 2.0
Cache/Broker: Redis 7
Migration: Alembic
Testing: pytest + pytest-asyncio
```

#### 포트 할당
```yaml
User Service: 8001
Agent Service: 8002
Chat Service: 8003
Tracing Service: 8004
Admin Service: 8005
Worker Service: 8006 (Celery)
```

---

## 🔧 구현 가이드

### 1. User Service 구현 (우선순위 1)

#### 핵심 기능
- SSO 연동 로그인/로그아웃
- JWT 토큰 발급/검증
- 사용자 프로비저닝
- API Key 관리
- RBAC 권한 관리

#### 구현 단계
```bash
# 1. 프로젝트 초기화
cd repos/user-service
uv venv
source .venv/bin/activate
uv sync

# 2. 환경 설정
cp .env.example .env.local
# .env.local 편집

# 3. 데이터베이스 설정
alembic init alembic
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 4. 서비스 실행
uvicorn app.main:app --reload --port 8001
```

#### 테스트 방법
```javascript
// 브라우저 콘솔에서 테스트
const testUserService = async () => {
  // 로그인 테스트
  const loginRes = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uri: 'http://localhost:9060/callback'
    })
  });
  console.log('Login:', await loginRes.json());
  
  // 프로필 테스트
  const token = localStorage.getItem('accessToken');
  const profileRes = await fetch('/api/users/me/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Profile:', await profileRes.json());
};
```

### 2. Agent Service 구현 (우선순위 2)

#### 핵심 기능
- 에이전트 CRUD
- A2A Protocol 구현
- Top-K 추천 시스템
- Agent Registry 통합
- 상태 관리 (DEVELOPMENT/STAGING/PRODUCTION)

#### 특별 요구사항
```sql
-- pgvector 확장자 필요
CREATE EXTENSION IF NOT EXISTS vector;
```

#### 구현 단계
```bash
# 1. 프로젝트 초기화
cd repos/agent-service
uv venv
source .venv/bin/activate
uv sync

# 2. pgvector 설정
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 3. 환경 설정
cp .env.example .env.local
# OpenAI API 키 설정 필요

# 4. 마이그레이션 및 실행
alembic upgrade head
uvicorn app.main:app --reload --port 8002
```

#### 테스트 방법
```javascript
// 에이전트 CRUD 테스트
const testAgentService = async () => {
  const token = localStorage.getItem('accessToken');
  
  // 에이전트 생성
  const createRes = await fetch('/api/agents/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Agent',
      description: 'A test agent',
      framework: 'Langchain',
      is_public: true
    })
  });
  console.log('Created:', await createRes.json());
  
  // Top-K 추천 테스트
  const recommendRes = await fetch('/api/agents/recommend/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'customer support',
      k: 5
    })
  });
  console.log('Recommendations:', await recommendRes.json());
};
```

### 3. Chat Service 구현 (우선순위 3)

#### 핵심 기능
- 채팅 세션 관리
- WebSocket 실시간 통신
- 메시지 스트리밍
- 세션 히스토리

#### WebSocket 테스트
```javascript
// WebSocket 연결 테스트
const testWebSocket = () => {
  const token = localStorage.getItem('accessToken');
  const ws = new WebSocket(`ws://localhost:8003/ws/test-session?token=${token}`);
  
  ws.onopen = () => {
    console.log('✅ WebSocket 연결됨');
    ws.send(JSON.stringify({
      type: 'message',
      content: 'Hello from test!',
      timestamp: new Date().toISOString()
    }));
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 수신:', data);
  };
  
  ws.onerror = (error) => {
    console.error('❌ WebSocket 오류:', error);
  };
};
```

---

## 🧪 통합 테스트 방법

### 1. Frontend를 통한 API 테스트

#### 브라우저 콘솔 테스트 스크립트
```javascript
// 전체 서비스 테스트
const testAllServices = async () => {
  console.log('🚀 A2G Platform 백엔드 테스트 시작');
  
  // 1. User Service 테스트
  console.log('\n1️⃣ User Service 테스트');
  await testUserService();
  
  // 2. Agent Service 테스트
  console.log('\n2️⃣ Agent Service 테스트');
  await testAgentService();
  
  // 3. Chat Service 테스트
  console.log('\n3️⃣ Chat Service 테스트');
  testWebSocket();
  
  console.log('\n✅ 모든 테스트 완료');
};

// 실행
testAllServices();
```

### 2. 네트워크 탭 모니터링

1. 브라우저 DevTools 열기 (F12)
2. Network 탭 활성화
3. Frontend에서 기능 사용
4. API 요청/응답 모니터링:
   - 요청 헤더 (인증 토큰)
   - 요청 페이로드
   - 응답 데이터
   - 응답 시간
   - 에러 상태

### 3. 실시간 로그 모니터링

```bash
# 서비스별 로그 확인
tail -f user-service.log
tail -f agent-service.log
tail -f chat-service.log

# Docker 로그 확인
docker-compose logs -f user-service
docker-compose logs -f agent-service
docker-compose logs -f chat-service
```

---

## 🔄 개발 워크플로우

### 1. 서비스별 개발 사이클

```
코드 작성 → 로컬 테스트 → Frontend로 테스트 → 작동?
  ↑                                            ↓
  ← 아니오                                   예 ↓
                                            테스트 작성 → Commit & Push → PR 생성
```

### 2. 테스트 체크리스트

- [ ] 로컬 단위 테스트 통과
- [ ] 서비스 오류 없이 시작
- [ ] Frontend에서 엔드포인트 접근 가능
- [ ] 인증/권한 작동
- [ ] WebSocket 연결 안정적 (해당하는 경우)
- [ ] 오류 처리 정상 작동
- [ ] 로그가 추적 서비스에 나타남

### 3. 환경 설정 관리

#### 공통 환경 변수
```bash
# 모든 서비스 공통
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]

# 데이터베이스
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/{service}_db

# Redis
REDIS_URL=redis://localhost:6379/{service_number}
```

---

## 🐛 문제 해결 가이드

### 1. 일반적인 문제

#### CORS 오류
```python
# 서비스의 main.py에 추가
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9060"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 데이터베이스 연결 문제
```bash
# PostgreSQL 실행 중인지 확인
docker ps | grep postgres

# 데이터베이스 존재 확인
docker exec -it a2g-postgres-dev psql -U dev_user -c "\l"

# 누락된 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE your_service_db;"
```

#### JWT 토큰 문제
```javascript
// 토큰 디코딩 (디버깅 용도)
const token = localStorage.getItem('accessToken');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

### 2. 서비스별 특수 문제

#### Agent Service - pgvector 문제
```sql
-- 데이터베이스에 연결
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db

-- 확장자 생성
CREATE EXTENSION IF NOT EXISTS vector;

-- 확인
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### Chat Service - WebSocket 문제
```javascript
// WebSocket 직접 테스트
const ws = new WebSocket('ws://localhost:8003/ws/test');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

---

## 📚 참고 자료

### 내부 문서
- [프로젝트 가이드](./Project_Guide.md)
- [기술 아키텍처](./Technical_Architecture.md)
- [서브모듈 개발 가이드](./repos/SUBMODULE_DEVELOPMENT_GUIDE.md)
- [개발 환경 설정](./Development_Environment_Settings.md)

### 외부 문서
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/)

---

## 🎯 구현 완료 후 다음 단계

1. **통합 테스트**: 모든 서비스가 함께 작동하는지 확인
2. **성능 최적화**: 데이터베이스 쿼리 및 API 응답 시간 최적화
3. **보안 강화**: 프로덕션 환경을 위한 보안 설정
4. **모니터링 구축**: Prometheus + Grafana 설정
5. **CI/CD 파이프라인**: GitHub Actions 설정

---

**© 2025 A2G Platform 개발팀**  
**문의**: syngha.han@company.com
