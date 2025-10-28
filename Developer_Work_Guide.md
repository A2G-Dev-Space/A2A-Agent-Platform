# 👥 A2G Platform - 개발자별 작업 가이드

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 28일
**개발 기간**: 6주 (Sprint 0-4)

---

## 📌 빠른 네비게이션

- [DEV1 - 한승하 (Frontend + Infra)](#dev1---한승하)
- [DEV2 - 이병주 (Admin/Worker Service)](#dev2---이병주)
- [DEV3 - 김영섭 (Chat/Tracing Service)](#dev3---김영섭)
- [DEV4 - 안준형 (Agent Service)](#dev4---안준형)

---

# 👤 DEV1 - 한승하
**역할**: SPRINT Lead, Frontend 총괄, Infrastructure, User Service
**담당 저장소**:
- `agent-platform-frontend`
- `agent-platform-infra`
- `agent-platform-user-service`

## 📋 Sprint별 작업 목록

### ✅ Sprint 0 (1주차) - 인프라 구축
```bash
# 작업 순서
1. Docker Compose로 Mock 서비스 구축
2. Nginx API Gateway 설정
3. Mock SSO 서비스 구현
4. 환경 변수 템플릿 작성
```

**상세 작업**:
```bash
# 1. Infra 레포지토리 생성
git clone https://github.com/A2G-Dev-Space/agent-platform-infra.git
cd agent-platform-infra

# 2. Mock SSO 구현 (참고: Authentication_and_Security.md - Section 2)
mkdir -p mock-sso
# mock-sso/main.py 작성 (FastAPI)
# mock-sso/templates/login.html 작성

# 3. Docker Compose 작성
# docker-compose/docker-compose.external.yml 작성
# - PostgreSQL, Redis, Mock SSO 포함

# 4. Nginx 설정
# nginx/nginx.conf 작성 (HTTPS, 프록시 설정)

# 5. 실행 테스트
docker-compose -f docker-compose.external.yml up -d
```

### ✅ Sprint 1 (2주차) - User Service + Frontend 기초
```bash
# User Service (백엔드)
1. User Service API 구현
   - SSO 로그인/콜백 (/api/auth/*)
   - JWT 토큰 발급/검증
   - 사용자 CRUD
   - API Key 관리

# Frontend 기초
2. React 19 프로젝트 초기화
3. 라우팅 설정 (Workbench/Hub/Flow)
4. 전역 스타일 설정 (참고: UI_UX_Design.md)
5. Zustand 스토어 구성
```

**Frontend 프로젝트 시작**:
```bash
# Frontend 레포지토리
git clone https://github.com/A2G-Dev-Space/agent-platform-frontend.git
cd agent-platform-frontend

# 프로젝트 초기화
npm create vite@latest . -- --template react-ts
npm install

# 핵심 패키지 설치
npm install axios zustand react-router-dom socket.io-client
npm install @mui/material @emotion/react @emotion/styled
npm install -D tailwindcss postcss autoprefixer
```

### ✅ Sprint 2 (3주차) - Frontend Core UI
```bash
1. Layout 구현
   - WorkspaceHeader (로고, 사용자 프로필)
   - Sidebar (모드 전환 버튼)
   - Main Content 영역

2. 인증 플로우 구현
   - 로그인 페이지
   - SSO 리디렉션 처리
   - JWT 토큰 관리
   - Protected Routes

3. 공통 컴포넌트
   - AgentCard
   - LoadingSpinner
   - ErrorBoundary
```

**참고 파일 위치**:
- 색상 테마: `UI_UX_Design.md` - Section 3
- 컴포넌트 명세: `UI_UX_Design.md` - Section 4-5
- API 연동: `Technical_Architecture.md` - Section 4.1

### ✅ Sprint 3 (4-5주차) - Frontend 고급 기능
```bash
1. Workbench 모드 구현
   - PlaygroundSidebar
   - ChatPlayground
   - TraceCapturePanel (실시간 로그)
   - AddAgentModal

2. Hub 모드 구현
   - Agent 목록 그리드
   - 검색/필터링
   - Agent 상세 정보

3. WebSocket 통합
   - Socket.IO 연결 관리
   - 실시간 메시지 스트리밍
   - 재연결 로직
```

### ✅ Sprint 4 (6주차) - 마무리 및 배포
```bash
1. 성능 최적화
   - Code Splitting
   - Lazy Loading
   - 번들 사이즈 최적화

2. E2E 테스트
   - Cypress 설정
   - 주요 시나리오 테스트

3. 배포 준비
   - Production 빌드
   - Docker 이미지 생성
   - CI/CD 파이프라인
```

## 📚 필수 참고 문서
1. **UI 구현**: `UI_UX_Design.md` (전체)
2. **API 연동**: `Technical_Architecture.md` - Section 4.1 (User Service API)
3. **인증 구현**: `Authentication_and_Security.md` - Section 2-3
4. **환경 설정**: `Development_Environment_Settings.md` - Section 2 (빠른 시작)

---

# 👤 DEV2 - 이병주
**역할**: Admin Service, Worker Service (LLM 관리, Celery)
**담당 저장소**:
- `agent-platform-admin-service`
- `agent-platform-worker-service`

## 📋 Sprint별 작업 목록

### ✅ Sprint 0 (1주차) - 환경 설정
```bash
# 1. 레포지토리 생성
git clone https://github.com/A2G-Dev-Space/agent-platform-admin-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-worker-service.git

# 2. DB 스키마 설계
# admin_service_db: llm_models, platform_statistics
# 참고: Technical_Architecture.md - Section 4.5
```

### ✅ Sprint 1 (2주차) - Admin Service 기초
```bash
1. FastAPI 프로젝트 구조 설정
2. 데이터베이스 모델 생성
   - LLMModel (name, provider, endpoint, api_key)
   - Statistics (usage, counts)

3. 기본 CRUD API 구현
   - GET /api/admin/llm-models/
   - POST /api/admin/llm-models/
   - PUT /api/admin/llm-models/{id}
   - DELETE /api/admin/llm-models/{id}
```

**Admin Service 구현**:
```python
# app/models.py
class LLMModel(Base):
    __tablename__ = "llm_models"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    provider = Column(String)  # OpenAI, Anthropic, Custom
    endpoint = Column(String)
    api_key = Column(String)  # 암호화 필요
    is_active = Column(Boolean, default=True)
    health_status = Column(String)
    last_health_check = Column(DateTime)
```

### ✅ Sprint 2 (3주차) - Worker Service 구현
```bash
1. Celery 설정
   - Redis 브로커 연결
   - Task 정의

2. 주기적 작업 구현
   - LLM 헬스 체크 (매 5분)
   - 통계 집계 (매시간)
   - Agent 상태 체크 (매 10분)
```

**Celery Tasks**:
```python
# app/worker.py
from celery import Celery

app = Celery('worker',
             broker='redis://localhost:6379/0',
             backend='redis://localhost:6379/1')

@app.task
def check_llm_health():
    """LLM 서비스 헬스 체크"""
    # 각 LLM endpoint에 ping
    # health_status 업데이트
    pass

@app.task
def aggregate_statistics():
    """시간별 통계 집계"""
    # 각 서비스에서 데이터 수집
    # platform_statistics 테이블 업데이트
    pass
```

### ✅ Sprint 3 (4-5주차) - 통계 및 모니터링
```bash
1. 통계 API 구현
   - GET /api/admin/statistics/
   - 일별/주별/월별 집계
   - 서비스별 사용량

2. 대시보드 API
   - 실시간 통계
   - LLM 사용량
   - 에러율 모니터링
```

### ✅ Sprint 4 (6주차) - 통합 및 최적화
```bash
1. Frontend(DEV1)와 통합 테스트
2. 성능 최적화
3. 로깅 및 모니터링 개선
```

## 📚 필수 참고 문서
1. **API 명세**: `Technical_Architecture.md` - Section 4.5 (Admin Service API)
2. **데이터 모델**: `Project_Guide.md` - Section 8 (데이터 모델)
3. **Celery 설정**: `Development_Environment_Settings.md` - Section 7.2 (Worker Service)

---

# 👤 DEV3 - 김영섭
**역할**: Chat Service, Tracing Service (WebSocket, 실시간 로그)
**담당 저장소**:
- `agent-platform-chat-service`
- `agent-platform-tracing-service`

## 📋 Sprint별 작업 목록

### ✅ Sprint 0 (1주차) - 환경 설정
```bash
# 레포지토리 설정
git clone https://github.com/A2G-Dev-Space/agent-platform-chat-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-tracing-service.git

# DB 스키마 설계
# chat_service_db: sessions, messages
# tracing_service_db: log_entries
```

### ✅ Sprint 1 (2주차) - Chat Service 기초
```bash
1. FastAPI + WebSocket 설정
2. 세션 관리 API
   - POST /api/chat/sessions/
   - GET /api/chat/sessions/{id}
   - DELETE /api/chat/sessions/{id}

3. 메시지 저장 구조
   - ChatSession 모델
   - ChatMessage 모델
```

**WebSocket 구현 시작**:
```python
# app/websocket/manager.py
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, session_id: str):
        await websocket.accept()
        self.active_connections[session_id] = websocket

    async def send_message(self, message: str, session_id: str):
        websocket = self.active_connections.get(session_id)
        if websocket:
            await websocket.send_text(message)
```

### ✅ Sprint 2 (3주차) - Tracing Service 구현
```bash
1. 로그 프록시 API
   - POST /api/tracing/logs
   - GET /api/tracing/logs/{trace_id}

2. Agent Transfer 감지 로직
   - 특정 패턴 감지
   - 플래그 설정

3. 로그 필터링/검색
   - 시간 범위
   - 로그 레벨
   - 서비스별
```

### ✅ Sprint 3 (4-5주차) - WebSocket 스트리밍
```bash
1. 실시간 메시지 스트리밍
   - Token 단위 스트리밍
   - 타이핑 인디케이터

2. Redis Pub/Sub 통합
   - 다중 서버 지원
   - 메시지 브로드캐스트

3. 에러 처리
   - 재연결 로직
   - 메시지 큐잉
```

**스트리밍 구현**:
```python
# SSE (Server-Sent Events) 스트리밍
@router.post("/api/chat/sessions/{session_id}/messages/stream")
async def stream_message(session_id: str):
    async def generate():
        yield f"data: {json.dumps({'type': 'start'})}\n\n"

        # LLM 응답 스트리밍
        for token in llm_response:
            yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            await asyncio.sleep(0.01)

        yield f"data: {json.dumps({'type': 'end'})}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

### ✅ Sprint 4 (6주차) - 성능 및 안정성
```bash
1. WebSocket 성능 최적화
   - Connection pooling
   - Message batching

2. 로그 인덱싱
   - trace_id 인덱스
   - timestamp 인덱스

3. 통합 테스트
   - 부하 테스트
   - 장애 복구 테스트
```

## 📚 필수 참고 문서
1. **WebSocket 명세**: `Technical_Architecture.md` - Section 8
2. **Chat API**: `Technical_Architecture.md` - Section 4.3
3. **Tracing API**: `Technical_Architecture.md` - Section 4.4
4. **실시간 UI**: `UI_UX_Design.md` - Section 5 (TraceCapturePanel)

---

# 👤 DEV4 - 안준형
**역할**: Agent Service (A2A Protocol, Top-K 추천, Registry 통합)
**담당 저장소**:
- `agent-platform-agent-service`

## 📋 Sprint별 작업 목록

### ✅ Sprint 0 (1주차) - 환경 설정
```bash
# 레포지토리 설정
git clone https://github.com/A2G-Dev-Space/agent-platform-agent-service.git

# PostgreSQL pgvector extension 설치
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db
CREATE EXTENSION IF NOT EXISTS vector;
```

### ✅ Sprint 1 (2주차) - Agent CRUD 구현
```bash
1. 데이터 모델 생성
   - Agent 모델 (framework, status, capabilities)
   - pgvector 필드 (embedding_vector)

2. 기본 CRUD API
   - GET /api/agents/
   - POST /api/agents/
   - PUT /api/agents/{id}
   - DELETE /api/agents/{id}

3. 상태 전환 API
   - DEVELOPMENT → STAGING → PRODUCTION
```

**Agent 모델 구현**:
```python
# app/models.py
from sqlalchemy.dialects.postgresql import VECTOR

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True)
    name = Column(String, unique=True)
    framework = Column(Enum(AgentFramework))
    status = Column(Enum(AgentStatus))
    a2a_endpoint = Column(String)
    capabilities = Column(JSON)
    embedding_vector = Column(VECTOR(1536))  # OpenAI embedding
    owner_id = Column(String)
    is_public = Column(Boolean, default=True)
```

### ✅ Sprint 2 (3주차) - A2A Protocol 구현
```bash
1. A2A 등록 API
   - POST /api/agents/a2a/register
   - 프레임워크별 검증

2. A2A 실행 프록시
   - POST /api/agents/a2a/execute/{agent_id}
   - JSON-RPC 2.0 형식

3. 프레임워크별 어댑터
   - Agno 어댑터
   - ADK 어댑터
   - Langchain 어댑터
   - Custom 어댑터
```

**A2A Protocol 구현**:
```python
# app/a2a/protocol.py
class A2AProtocol:
    async def execute(self, agent_id: str, request: dict):
        agent = await get_agent(agent_id)

        # 프레임워크별 어댑터 선택
        adapter = self.get_adapter(agent.framework)

        # 요청 변환 및 실행
        response = await adapter.execute(
            endpoint=agent.a2a_endpoint,
            request=request
        )

        return self.format_response(response)
```

### ✅ Sprint 3 (4-5주차) - Top-K 추천 시스템
```bash
1. 임베딩 생성
   - OpenAI API 통합
   - Agent 설명 → Vector 변환

2. 유사도 검색
   - pgvector 쿼리
   - 코사인 유사도 계산

3. 추천 API
   - POST /api/agents/recommend
   - 필터링 옵션
   - 매칭 이유 생성
```

**Top-K 구현**:
```python
# app/services/recommendation.py
import openai
from pgvector.sqlalchemy import Vector

async def get_recommendations(query: str, k: int = 5):
    # 1. 쿼리 임베딩
    query_embedding = openai.Embedding.create(
        input=query,
        model="text-embedding-ada-002"
    )

    # 2. 유사도 검색
    agents = db.query(Agent).filter(
        Agent.status == "PRODUCTION"
    ).order_by(
        Agent.embedding_vector.cosine_distance(query_embedding)
    ).limit(k).all()

    # 3. 매칭 이유 생성
    for agent in agents:
        agent.match_reason = generate_match_reason(query, agent)

    return agents
```

### ✅ Sprint 4 (6주차) - Registry 통합
```bash
1. Agent Registry Client 구현
   - ExtendedAgentCard 스키마
   - 접근 제어 필터링

2. 캐싱 전략
   - Redis 캐싱
   - TTL 5분

3. 마이그레이션
   - 기존 Agent → Registry
   - 하위 호환성 유지
```

**Registry 통합**:
```python
# app/registry/client.py
class AgentRegistryClient:
    async def sync_with_registry(self):
        # Local DB → Registry 동기화
        local_agents = await get_all_agents()

        for agent in local_agents:
            extended_card = ExtendedAgentCard(
                name=agent.name,
                framework=agent.framework,
                endpoint=agent.a2a_endpoint,
                access_level=self.determine_access_level(agent),
                owner_id=agent.owner_id
            )

            await self.registry.register(extended_card)
```

## 📚 필수 참고 문서
1. **A2A Protocol**: `Technical_Architecture.md` - Section 3
2. **Agent API**: `Technical_Architecture.md` - Section 4.2
3. **Top-K 시스템**: `Technical_Architecture.md` - Section 6
4. **Registry 통합**: `Technical_Architecture.md` - Section 7

---

## 🤝 협업 포인트

### 통합 지점별 담당자

| 통합 시점 | 관련 개발자 | 작업 내용 |
|-----------|-------------|-----------|
| Sprint 1 끝 | DEV1 ↔ DEV2-4 | User Service 인증 API 제공 |
| Sprint 2 중간 | DEV1 ↔ DEV3 | WebSocket 연결 테스트 |
| Sprint 2 끝 | DEV4 ↔ DEV3 | Agent 실행 → Tracing 로그 |
| Sprint 3 시작 | DEV1 ↔ DEV4 | Frontend에서 Agent CRUD |
| Sprint 3 중간 | DEV1 ↔ DEV3 | 실시간 로그 UI 통합 |
| Sprint 3 끝 | DEV2 ↔ DEV4 | LLM 헬스체크 → Agent 상태 |
| Sprint 4 | 전체 | 통합 테스트 |

### 일일 스탠드업 체크 항목

```markdown
## Daily Standup Template

**날짜**: 2025-XX-XX
**Sprint**: X
**개발자**: DEVX

### 어제 완료한 작업
- [ ] 작업 1
- [ ] 작업 2

### 오늘 할 작업
- [ ] 작업 1
- [ ] 작업 2

### 블로커/이슈
- 없음 / 있음 (상세 설명)

### 다른 팀원 필요 사항
- DEVX: API 스펙 확인 필요
```

---

## 📞 소통 채널

- **Slack**: #a2g-platform-dev
- **일일 스탠드업**: 매일 오전 10시
- **주간 리뷰**: 매주 금요일 오후 3시
- **긴급 이슈**: @syngha.han (DEV1/Sprint Lead)

---

**이 문서를 북마크하고 매일 참고하세요!**