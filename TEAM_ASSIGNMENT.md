# 👥 Team Assignment - 개발자 작업 분할 계획

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일
**목적**: 8명의 개발자가 병렬로 작업할 수 있도록 모듈별 책임 분할

---

## 1. 📋 개요

### 1.1 목표

- **8명의 개발자가 최소한의 의존성**으로 병렬 개발할 수 있도록 작업을 분할합니다.
- 각 개발자는 **명확한 API 계약**을 기반으로 독립적으로 개발하고 테스트합니다.
- **사외망에서 개발 → 사내망에서 통합 테스트**하는 하이브리드 워크플로우를 따릅니다.

### 1.2 팀 구성 원칙

1. **서비스 단위 분할**: 각 마이크로서비스를 1~2명이 담당합니다.
2. **Frontend/Backend 분리**: Frontend 팀은 Backend API를 Mock 데이터로 대체하여 개발합니다.
3. **주니어/시니어 페어링**: 복잡한 서비스는 시니어+주니어로 페어 프로그래밍을 권장합니다.
4. **일일 스탠드업**: 매일 오전 10시, API 인터페이스 변경 사항 공유합니다.

---

## 2. 👨‍💻 개발자별 역할 분담

### 📊 역할 매트릭스

| Developer | 주요 책임 | 서비스/모듈 | 기술 스택 | 예상 공수 |
|-----------|----------|------------|----------|----------|
| **Dev #1** | Frontend Lead | Frontend Core + Layout | React, TypeScript, Zustand | 100% |
| **Dev #2** | Frontend | Agent/Chat UI + Playground | React, WebSocket | 100% |
| **Dev #3** | Backend Lead | User Service + Mock SSO | FastAPI/Go, JWT, SSO | 100% |
| **Dev #4** | Backend | Admin Service + Statistics | Django, DRF, Celery | 100% |
| **Dev #5** | Backend | Agent Service + A2A | FastAPI, RAG, LangChain | 100% |
| **Dev #6** | Backend | Chat Service + WebSocket | FastAPI, Channels, Redis | 100% |
| **Dev #7** | Backend | Tracing Service + Log Proxy | Go/Rust, gRPC, High-Perf | 100% |
| **Dev #8** | Backend | Worker Service + Infra | Celery, Docker, CI/CD | 100% |

---

## 3. 🎯 Developer #1 - Frontend Lead

### 3.1 책임 범위

**핵심 역할**: Frontend 아키텍처 설계, 공통 컴포넌트, 레이아웃, 상태 관리

**담당 모듈**:
- `frontend/src/components/layout/` (Layout, WorkspaceHeader, Sidebar)
- `frontend/src/components/common/` (Button, Modal, Input, Card 등)
- `frontend/src/store/` (Zustand 스토어: auth, theme, workspace)
- `frontend/src/api/` (Axios 설정, API 클라이언트)
- `frontend/src/App.tsx`, `frontend/src/main.tsx`

### 3.2 주요 작업

#### Phase 1: 프로젝트 초기 설정 (1주)
- [ ] Vite + React + TypeScript 프로젝트 생성
- [ ] Tailwind CSS 설정 (모드별 색상 테마: 파스텔 블루/레드)
- [ ] MUI 또는 Chakra UI 설치 및 theme 설정
- [ ] React Router DOM 설정 (라우팅 구조)
- [ ] Zustand 스토어 생성 (`useAuthStore`, `useThemeStore`, `useWorkspaceStore`)
- [ ] Axios 인스턴스 설정 (JWT 인터셉터)

#### Phase 2: 레이아웃 및 인증 (1주)
- [ ] Layout.tsx: SSO 콜백 처리, 전역 테마 적용
- [ ] WorkspaceHeader.tsx: 로고, 모드 토글, 프로필 드롭다운
- [ ] PendingApprovalPage.tsx: PENDING 사용자용 승인 대기 페이지
- [ ] SSO 로그인/로그아웃 플로우 구현

#### Phase 3: 공통 컴포넌트 라이브러리 (1주)
- [ ] `components/common/Button.tsx` (Primary, Secondary, Danger 스타일)
- [ ] `components/common/Modal.tsx` (재사용 가능한 모달)
- [ ] `components/common/Input.tsx`, `Select.tsx`, `Textarea.tsx`
- [ ] `components/common/Card.tsx` (에이전트 카드 베이스)
- [ ] `components/common/LoadingSpinner.tsx`

#### Phase 4: 메인 대시보드 (1주)
- [ ] `pages/Dashboard.tsx`: 운영/워크스페이스 모드 조건부 렌더링
- [ ] `components/agent/AgentCard.tsx`: 에이전트 카드 디자인 (REQ 5)
- [ ] `components/agent/AddAgentModal.tsx`: 에이전트 생성/수정 모달
- [ ] Agent Service API 연동 (`GET /api/agents/`, `POST /api/agents/`)

### 3.3 API 의존성

**Mocking 필요**: Backend API가 완성되기 전까지 MSW (Mock Service Worker) 사용

```typescript
// frontend/src/mocks/handlers.ts
import { rest } from 'msw';

export const handlers = [
  rest.get('/api/agents/', (req, res, ctx) => {
    return res(
      ctx.json({
        count: 2,
        results: [
          { id: 1, name: 'Test Agent 1', framework: 'Agno' },
          { id: 2, name: 'Test Agent 2', framework: 'Custom' },
        ],
      })
    );
  }),
];
```

### 3.4 협업 포인트

- **Dev #2**: Agent/Chat 페이지 컴포넌트 분담
- **Dev #3**: User Service API 스펙 확인 (인증, 사용자 관리)
- **Dev #5**: Agent Service API 스펙 확인 (에이전트 CRUD)

---

## 4. 🖥️ Developer #2 - Frontend (Agent/Chat UI)

### 4.1 책임 범위

**핵심 역할**: Agent Playground, Chat UI, WebSocket 실시간 통신

**담당 모듈**:
- `frontend/src/pages/AgentPlayground/` (전체 Playground 페이지)
- `frontend/src/components/agent/` (AgentCard 제외, Dev #1 담당)
- `frontend/src/components/chat/` (ChatInput, ChatMessageList, ChatPlayground)
- `frontend/src/components/trace/` (LiveTrace, TraceLogItem)
- `frontend/src/hooks/useTraceLogSocket.ts` (WebSocket 훅)
- `frontend/src/services/agent-frameworks/` (Framework Strategy Pattern)

### 4.2 주요 작업

#### Phase 1: Agent Playground 레이아웃 (1주)
- [ ] `pages/AgentPlayground/AgentPlayground.tsx`: 메인 컨테이너
- [ ] `components/agent/PlaygroundSidebar.tsx`: 대화 히스토리 사이드바 (REQ 6, 8)
- [ ] `components/trace/TraceCapturePanel.tsx`: Trace 설정 및 로그 표시 (워크스페이스 모드)
- [ ] Framework Strategy Pattern 구현:
  - `services/agent-frameworks/framework.interface.ts`
  - `services/agent-frameworks/agno.service.tsx`
  - `services/agent-frameworks/custom.service.tsx`
  - `services/agent-frameworks/framework.registry.ts`

#### Phase 2: Chat UI 구현 (1주)
- [ ] `components/chat/ChatPlayground.tsx`: 메시지 목록 + 입력창 컨테이너
- [ ] `components/chat/ChatMessageList.tsx`: Markdown 렌더링, 코드 블록 (REQ 3)
- [ ] `components/chat/ChatInput.tsx`: 파일 업로드, 메시지 전송
- [ ] Chat Service API 연동 (`POST /api/chat/messages/`, `POST /api/chat/files/`)

#### Phase 3: Live Trace 실시간 로그 (1주)
- [ ] `hooks/useTraceLogSocket.ts`: WebSocket 연결 및 재연결 로직
- [ ] `components/trace/LiveTrace.tsx`: 로그 타임라인 컨테이너
- [ ] `components/trace/TraceLogItem.tsx`: 로그 타입별 아이콘/색상 (REQ 8, 10)
- [ ] WebSocket 메시지 수신 및 상태 업데이트

#### Phase 4: 프레임워크별 메시지 전송 로직 (1주)
- [ ] Agno Framework: FormData POST to `/agents/{agent_id}/runs`
- [ ] Custom Framework: JSON POST to Custom Endpoint
- [ ] 스트리밍 응답 처리 (SSE 또는 JSON Stream)
- [ ] 에러 처리 및 사용자 피드백

### 4.3 API 의존성

- **Chat Service** (Dev #6): WebSocket `wss://.../ws/trace/{trace_id}/`
- **Agent Service** (Dev #5): Agent 메타데이터 조회
- **Tracing Service** (Dev #7): Trace 히스토리 조회

### 4.4 협업 포인트

- **Dev #1**: 공통 컴포넌트 (Button, Modal) 사용
- **Dev #6**: WebSocket API 스펙 확정
- **Dev #7**: Trace Log 데이터 포맷 확인

---

## 5. 🔐 Developer #3 - Backend Lead (User Service)

### 5.1 책임 범위

**핵심 역할**: 인증/인가, SSO 연동, API Key 관리, Mock SSO 구현

**담당 모듈**:
- `services/user-service/` (FastAPI 또는 Go)
- `infra/mock-sso/` (Mock SSO Service)
- `backend/users/` (Django User 모델 - Phase 1 호환성 유지)

### 5.2 주요 작업

#### Phase 1: Mock SSO 구현 (우선순위 최상, 1주)
- [ ] Mock SSO FastAPI 서버 구현 (`infra/mock-sso/main.py`)
- [ ] 로그인 페이지 HTML 템플릿 (`templates/login.html`)
- [ ] JWT id_token 발급 (HS256, 검증 없음)
- [ ] 하드코딩된 테스트 사용자 목록 (SSO_GUIDE.md 스펙 준수)
- [ ] Docker Compose 통합 (`docker-compose.external.yml`)

#### Phase 2: User Service - SSO 연동 (1주)
- [ ] SSO 로그인 시작: `GET /api/auth/login/`
- [ ] SSO 콜백 처리: `POST /api/auth/callback/` (id_token 검증, 사용자 프로비저닝)
- [ ] 내부 JWT 발급 (simplejwt)
- [ ] 로그아웃: `GET /api/auth/logout/`
- [ ] 환경 변수 기반 SSO 전환 (Mock/Real)

#### Phase 3: User Service - 사용자 관리 (1주)
- [ ] 사용자 목록 조회: `GET /api/users/` (ADMIN only)
- [ ] 사용자 역할 변경: `PATCH /api/users/{username}/role/` (ADMIN only)
- [ ] 사용자 삭제: `DELETE /api/users/{username}/` (ADMIN only)
- [ ] 부서별 필터링, PENDING 사용자 우선 정렬

#### Phase 4: API Key 관리 (1주)
- [ ] API Key 생성: `POST /api/keys/`
- [ ] 활성 API Key 조회: `GET /api/keys/active/`
- [ ] API Key 삭제: `DELETE /api/keys/{key_id}/`
- [ ] API Key 검증 미들웨어 구현 (Tracing Service 연동)

### 5.3 API 의존성

- **Admin Service** (Dev #4): Django User 모델 공유 (Phase 1 호환성)
- **Tracing Service** (Dev #7): API Key 검증 엔드포인트 제공

### 5.4 협업 포인트

- **Dev #1, #2**: Frontend SSO 로그인 플로우 테스트
- **Dev #4**: Django User 모델 마이그레이션 공유
- **전체 팀**: Mock SSO 사용법 온보딩

---

## 6. 🛠️ Developer #4 - Backend (Admin Service)

### 6.1 책임 범위

**핵심 역할**: LLM 모델 관리, 사용량 통계, Django Admin

**담당 모듈**:
- `services/admin-service/` (Django + DRF)
- `backend/platform_admin/` (Phase 1 호환성)
- `backend/core/models.py` (공유 모델: LLMModel, APIKey 등)

### 6.2 주요 작업

#### Phase 1: Django 프로젝트 마이그레이션 (1주)
- [ ] Phase 1 Django 프로젝트를 `services/admin-service/`로 이전
- [ ] DB 마이그레이션 스크립트 작성
- [ ] User, LLMModel, RegisteredAgent 모델 확인
- [ ] Django Admin 사이트 설정

#### Phase 2: LLM 모델 관리 API (1주)
- [ ] LLM 목록 조회: `GET /api/admin/llm-models/`
- [ ] 사용 가능한 LLM 조회: `GET /api/admin/llm-models/available/` (REQ 2)
- [ ] LLM 생성: `POST /api/admin/llm-models/`
- [ ] LLM 수정: `PATCH /api/admin/llm-models/{id}/`
- [ ] LLM 삭제: `DELETE /api/admin/llm-models/{id}/`
- [ ] 헬스 체크 상태 필드 (`health_status`, `last_health_check`)

#### Phase 3: 사용량 통계 API (1주)
- [ ] LLM 사용량 통계: `GET /api/admin/stats/llm-usage/`
  - 날짜 범위 필터 (`start_date`, `end_date`)
  - 그룹화 옵션 (`group_by`: user, department, model)
  - Tracing Service의 LogEntry 데이터 집계
- [ ] 에이전트 통계: `GET /api/admin/stats/agent-usage/` (차후 구현)

#### Phase 4: Django Admin UI 커스터마이징 (1주)
- [ ] User 관리 Admin: 역할 변경, PENDING 승인 UI
- [ ] LLMModel Admin: 헬스 상태 색상 표시, 테스트 버튼
- [ ] RegisteredAgent Admin: 상태 필터 (DEVELOPMENT, PRODUCTION, DISABLED)

### 6.3 API 의존성

- **User Service** (Dev #3): 사용자 목록 조회 (또는 DB 직접 조회)
- **Tracing Service** (Dev #7): LogEntry 데이터 읽기 (통계용)

### 6.4 협업 포인트

- **Dev #3**: User 모델 스키마 공유
- **Dev #8**: Celery Task에서 LLM 헬스 체크 결과 DB 업데이트

---

## 7. 🤖 Developer #5 - Backend (Agent Service)

### 7.1 책임 범위

**핵심 역할**: 에이전트 CRUD, A2A 프로토콜, AI 랭킹

**담당 모듈**:
- `services/agent-service/` (FastAPI)
- `backend/agents/` (Phase 1 호환성)

### 7.2 주요 작업

#### Phase 1: Agent CRUD API (1주)
- [ ] 에이전트 목록 조회: `GET /api/agents/`
- [ ] 내 에이전트 조회: `GET /api/agents/my/`
- [ ] 에이전트 생성: `POST /api/agents/`
- [ ] 에이전트 수정: `PATCH /api/agents/{id}/`
- [ ] 에이전트 삭제: `DELETE /api/agents/{id}/`
- [ ] 소유자 검증 (본인만 수정/삭제 가능)

#### Phase 2: Agent 메타데이터 확장 (REQ 5) (1주)
- [ ] RegisteredAgent 모델 필드 추가:
  - `framework`: Agno, Custom, ADK, Langchain
  - `skill_kr`, `skill_en`: 기능 태그
  - `logo_url`: 로고 이미지 URL
  - `card_color`: 카드 배경 색상
- [ ] DB 마이그레이션 생성 및 적용

#### Phase 3: AI 랭킹 API (REQ 1) (1주)
- [ ] 랭킹된 에이전트 조회: `GET /api/agents/ranked/?query=고객 지원`
- [ ] RAG 파이프라인 구축:
  - OpenAI Embeddings 또는 Sentence Transformers
  - Vector DB (FAISS 또는 Pinecone)
  - 에이전트 description/skill 임베딩 인덱싱
- [ ] 유사도 검색 및 스코어 반환

#### Phase 4: A2A 프로토콜 (REQ 2) (1주)
- [ ] A2A 등록 API: `POST /api/a2a/register/`
- [ ] 외부 프레임워크 (ADK, Langchain) 에이전트 등록 지원
- [ ] Python/JS SDK 초안 작성 (`sdks/python-sdk/`, `sdks/js-sdk/`)
- [ ] A2A 연동 가이드 문서 작성

### 7.3 API 의존성

- **User Service** (Dev #3): 사용자 정보 조회 (owner 정보)
- **Admin Service** (Dev #4): RegisteredAgent 모델 공유

### 7.4 협업 포인트

- **Dev #1, #2**: Frontend Agent 카드 디자인 협의
- **Dev #8**: Worker Service에서 Agent 헬스 체크 호출

---

## 8. 💬 Developer #6 - Backend (Chat Service)

### 8.1 책임 범위

**핵심 역할**: 채팅 세션/메시지 관리, WebSocket 실시간 통신

**담당 모듈**:
- `services/chat-service/` (FastAPI + Channels)
- `backend/chat/` (Phase 1 호환성)

### 8.2 주요 작업

#### Phase 1: Chat Session/Message CRUD (1주)
- [ ] 세션 생성: `POST /api/chat/sessions/` (Trace ID 자동 생성)
- [ ] 세션 목록 조회: `GET /api/chat/sessions/?agent_id=1`
- [ ] 세션 상세 조회: `GET /api/chat/sessions/{id}/` (메시지 포함)
- [ ] 세션 삭제: `DELETE /api/chat/sessions/{id}/`
- [ ] 메시지 생성: `POST /api/chat/messages/`
- [ ] ChatSession, ChatMessage 모델 정의 (`trace_id` 필드 포함)

#### Phase 2: 파일 업로드 (REQ 3) (1주)
- [ ] 파일 업로드 API: `POST /api/chat/files/`
- [ ] 파일 저장소 설정 (S3 또는 로컬 스토리지)
- [ ] 파일 다운로드 API: `GET /api/chat/files/{id}/`
- [ ] 파일 메시지 타입 추가 (`message.attachments` 필드)

#### Phase 3: WebSocket 실시간 Trace (REQ 7) (1주)
- [ ] WebSocket 엔드포인트: `wss://.../ws/trace/{trace_id}/?token=<JWT>`
- [ ] TokenAuthMiddleware 구현 (쿼리 파라미터 JWT 검증)
- [ ] TraceLogConsumer 구현 (Channels Consumer)
- [ ] Redis Pub/Sub 또는 gRPC로 Tracing Service 로그 수신
- [ ] WebSocket 그룹 관리 (`trace:{trace_id}` 그룹)

#### Phase 4: 실시간 로그 브로드캐스팅 (1주)
- [ ] Tracing Service로부터 로그 수신 시 WebSocket으로 전송
- [ ] 로그 포맷: `{"type": "trace_log", "data": {...}}`
- [ ] 연결 끊김 시 재연결 처리 (Frontend 훅과 협력)

### 8.3 API 의존성

- **Tracing Service** (Dev #7): gRPC 또는 Pub/Sub로 로그 수신
- **Agent Service** (Dev #5): 에이전트 정보 조회

### 8.4 협업 포인트

- **Dev #2**: WebSocket 메시지 포맷 확정
- **Dev #7**: Tracing Service → Chat Service 통신 프로토콜 협의

---

## 9. 📊 Developer #7 - Backend (Tracing Service)

### 9.1 책임 범위

**핵심 역할**: LLM 호출 로그 프록시, Trace 데이터 저장/조회, 고성능 처리

**담당 모듈**:
- `services/tracing-service/` (Go 또는 Rust)
- `backend/tracing/` (Phase 1 호환성 - LogEntry 모델)

### 9.2 주요 작업

#### Phase 1: Log Proxy API (REQ 7.4) (1주)
- [ ] LLM 호출 프록시: `POST /api/log-proxy/{trace_id}/chat/completions`
- [ ] Trace ID 검증 (Chat Service의 ChatSession 존재 확인)
- [ ] API Key 검증 (User Service 연동)
- [ ] LLM Endpoint 동적 라우팅 (Admin Service의 LLMModel 조회)
- [ ] 스트리밍 응답 지원 (SSE 또는 JSON Stream)

#### Phase 2: 로그 저장 및 전송 (1주)
- [ ] LogEntry DB 저장:
  - `trace_id`, `log_type` (LLM/Tool), `agent_id`
  - `model`, `prompt`, `completion`, `latency_ms`
  - `timestamp`, `user_id`
- [ ] Chat Service로 실시간 로그 전송:
  - **Option 1**: gRPC (고성능)
  - **Option 2**: Redis Pub/Sub (간편함)

#### Phase 3: Trace History API (1주)
- [ ] Trace 로그 조회: `GET /api/tracing/logs/?trace_id=<uuid>`
- [ ] 소유자 검증 (본인의 Trace만 조회 가능)
- [ ] 페이지네이션 및 정렬 (timestamp 기준)

#### Phase 4: Multi-Agent Tracing (REQ 10) (1주)
- [ ] agent_id 추론 로직 구현 (LLM 요청의 Tool Call 분석)
- [ ] LogEntry에 `agent_id` 필드 추가
- [ ] 로그 아이템별 agent_id 태그 전송

### 9.3 API 의존성

- **User Service** (Dev #3): API Key 검증
- **Admin Service** (Dev #4): LLM Endpoint 조회
- **Chat Service** (Dev #6): 실시간 로그 전송 (gRPC/Pub-Sub)

### 9.4 협업 포인트

- **Dev #6**: 실시간 로그 전송 프로토콜 확정
- **Dev #8**: Celery Task에서 LogEntry 집계 (통계용)

---

## 10. ⚙️ Developer #8 - Backend (Worker Service + Infra)

### 10.1 책임 범위

**핵심 역할**: Celery 비동기 작업, 헬스 체크, 정리 작업, Docker/CI-CD

**담당 모듈**:
- `services/worker-service/` (Celery)
- `infra/docker-compose/` (Docker Compose 파일)
- `.github/workflows/` (CI/CD 파이프라인)

### 10.2 주요 작업

#### Phase 1: Celery 설정 및 헬스 체크 (REQ 12) (1주)
- [ ] Celery 프로젝트 초기화 (`celery.py`, `tasks.py`)
- [ ] Redis 브로커 연동
- [ ] LLM 헬스 체크 Task: `check_all_llm_health` (5분마다)
  - Admin Service API 호출: `GET /api/admin/llm-models/?is_active=true`
  - 각 LLM `/chat/completions` 테스트 요청
  - 결과를 DB 업데이트 (`health_status`, `last_health_check`)
  - 실패 시 사내 메일 API 알림

#### Phase 2: Agent 헬스 체크 (REQ 12) (1주)
- [ ] Agent 헬스 체크 Task: `check_all_agent_health` (10분마다)
  - Agent Service API 호출: `GET /api/agents/?status=PRODUCTION`
  - 각 에이전트 `prod_endpoint` 테스트 요청
  - 실패 시:
    - `agent.status = DISABLED`
    - 원 개발자에게 메일 알림

#### Phase 3: Agent Lifecycle 관리 (REQ 10, 11) (1주)
- [ ] 비활성 에이전트 정리 Task: `cleanup_inactive_agents` (매일 새벽 2시)
  - **운영 에이전트** (status=PRODUCTION):
    - Tracing Service LogEntry 조회, 1달 미사용 → `status = DISABLED`
  - **개발 에이전트** (status=DEVELOPMENT):
    - `updated_at` 조회, 1달 미수정 → 삭제

#### Phase 4: Docker Compose 및 CI/CD (1주)
- [ ] `docker-compose.external.yml` 작성 (Mock SSO, Postgres, Redis)
- [ ] `docker-compose.internal.yml` 작성 (사내망용)
- [ ] Makefile 작성 (`make up`, `make down`, `make logs` 등)
- [ ] GitHub Actions CI/CD:
  - Lint (ESLint, Black, Flake8)
  - Test (pytest, jest)
  - Build (Docker images)
  - Deploy (사내망 서버)

### 10.3 API 의존성

- **Admin Service** (Dev #4): LLM 목록 조회, 헬스 상태 업데이트
- **Agent Service** (Dev #5): 에이전트 목록 조회, 상태 업데이트
- **Tracing Service** (Dev #7): LogEntry 조회 (사용량 통계)

### 10.4 협업 포인트

- **전체 팀**: Docker Compose 사용법 온보딩
- **Dev #3**: Mock SSO Docker 이미지 통합

---

## 11. 📅 개발 일정 및 마일스톤

### 11.1 Sprint 구조 (2주 단위)

**총 개발 기간**: 8주 (4 Sprints)

| Sprint | 기간 | 주요 목표 | 담당 |
|--------|------|----------|------|
| **Sprint 0** | Week 0 | Mock Services 구축, 환경 설정 | Dev #3, #8 |
| **Sprint 1** | Week 1-2 | 인증/레이아웃, Agent CRUD | Dev #1, #3, #5 |
| **Sprint 2** | Week 3-4 | Chat/Trace UI, WebSocket | Dev #2, #6, #7 |
| **Sprint 3** | Week 5-6 | Admin/통계, AI 랭킹 | Dev #4, #5, #8 |
| **Sprint 4** | Week 7-8 | A2A, 통합 테스트, 버그 수정 | 전체 |

---

### 11.2 Sprint 0: 기반 구축 (우선순위 최상)

**목표**: 모든 개발자가 사외망에서 로컬 개발 가능한 환경 구축

#### Week 0 체크리스트

**Dev #3 (User Service Lead)**:
- [ ] Mock SSO 구현 완료 (`infra/mock-sso/`)
- [ ] Docker Compose 테스트 (`docker-compose.external.yml`)
- [ ] SSO_GUIDE.md 업데이트 (Mock SSO 사용법)
- [ ] 팀 온보딩 세션 진행 (Mock SSO 로그인 데모)

**Dev #8 (Infra Lead)**:
- [ ] Docker Compose 전체 통합 (`mock-sso`, `postgres`, `redis`)
- [ ] Makefile 작성
- [ ] DEV_ENVIRONMENT.md 검토 및 테스트
- [ ] GitHub 저장소 브랜치 전략 설정 (`main`, `develop`, `feature/*`)

**전체 팀**:
- [ ] Git 클론 및 로컬 환경 설정 완료
- [ ] Mock Services 실행 확인
- [ ] API_CONTRACTS.md 숙지
- [ ] 담당 모듈 디렉토리 생성 (`services/[service-name]/`)

---

### 11.3 Sprint 1: 핵심 기능 구현

**Week 1-2 목표**:
- Frontend: Layout + 인증 + Agent 카드
- Backend: User Service + Agent Service CRUD

**Dev #1**:
- [ ] Layout, WorkspaceHeader, 공통 컴포넌트
- [ ] SSO 로그인 플로우 연동

**Dev #3**:
- [ ] User Service SSO 콜백 처리
- [ ] JWT 발급 및 검증

**Dev #5**:
- [ ] Agent Service CRUD API 구현
- [ ] RegisteredAgent 모델 확장

**Dev #8**:
- [ ] Celery 초기 설정
- [ ] Redis 연동 테스트

---

### 11.4 Sprint 2: 실시간 통신

**Week 3-4 목표**:
- Chat/Trace UI 완성
- WebSocket 실시간 로그

**Dev #2**:
- [ ] AgentPlayground 전체 구현
- [ ] LiveTrace WebSocket 연동

**Dev #6**:
- [ ] Chat Service WebSocket 엔드포인트
- [ ] TraceLogConsumer 구현

**Dev #7**:
- [ ] Log Proxy API 구현
- [ ] gRPC/Pub-Sub로 Chat Service 연동

---

### 11.5 Sprint 3: 관리 기능

**Week 5-6 목표**:
- Admin 페이지 완성
- AI 랭킹, 통계

**Dev #4**:
- [ ] LLM 관리 API
- [ ] 사용량 통계 API

**Dev #5**:
- [ ] AI 랭킹 API (RAG)

**Dev #8**:
- [ ] LLM/Agent 헬스 체크 Celery Task

---

### 11.6 Sprint 4: 통합 및 배포

**Week 7-8 목표**:
- A2A 프로토콜
- 사내망 통합 테스트
- 버그 수정

**전체 팀**:
- [ ] 사내망 `.env.internal` 설정
- [ ] 통합 테스트 실행
- [ ] API Contract 검증
- [ ] 배포 준비

---

## 12. 🤝 협업 프로세스

### 12.1 일일 스탠드업

**시간**: 매일 오전 10:00 (15분)
**참석**: 전체 개발자 (8명)

**진행 방식**:
1. 각자 어제 완료한 작업 공유
2. 오늘 할 작업 선언
3. 블로커(Blocker) 공유 (API 스펙 변경, 의존성 문제 등)

### 12.2 주간 API Review

**시간**: 매주 금요일 오후 3:00 (1시간)
**참석**: Backend 개발자 (Dev #3-8)

**진행 방식**:
1. API 스펙 변경 사항 발표
2. OpenAPI 문서 업데이트 확인
3. Breaking Changes 협의
4. 다음 주 API 계획 공유

### 12.3 Git 브랜치 전략

**브랜치 구조**:
```
main (운영)
  ├── develop (통합 개발)
  │   ├── feature/TASK-101-frontend-layout (Dev #1)
  │   ├── feature/TASK-102-mock-sso (Dev #3)
  │   ├── feature/TASK-103-agent-crud (Dev #5)
  │   └── ...
```

**Pull Request 규칙**:
1. 브랜치명: `feature/[TASK-ID]-[description]`
2. PR 타겟: `develop` 브랜치
3. 리뷰어: 최소 1명 (Backend는 Dev #3, Frontend는 Dev #1)
4. CI 통과 필수 (Lint, Test)
5. Squash Merge 사용

### 12.4 커밋 메시지 컨벤션

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `style`: 코드 포맷 (기능 변경 없음)
- `refactor`: 리팩토링
- `test`: 테스트 추가
- `chore`: 빌드/설정 변경

**예시**:
```
feat(agent-service): Add AI ranking API endpoint

- Implement RAG pipeline with FAISS
- Add /api/agents/ranked/ endpoint
- Update API_CONTRACTS.md

Closes TASK-150
```

---

## 13. 🐛 트러블슈팅 및 FAQ

### 13.1 API 스펙 충돌

**문제**: Dev #2가 예상한 API 응답 포맷과 Dev #5가 구현한 포맷이 다름
**해결**:
1. API_CONTRACTS.md 확인
2. Slack #a2g-dev 채널에 불일치 내용 공유
3. 주간 API Review에서 협의
4. OpenAPI 스펙 업데이트

### 13.2 DB Migration 충돌

**문제**: Dev #4와 Dev #5가 동일한 모델을 수정하여 마이그레이션 충돌
**해결**:
1. 최신 `develop` 브랜치 pull
2. `python manage.py makemigrations --merge`
3. 충돌 해결 후 커밋

### 13.3 Docker 컨테이너 포트 충돌

**문제**: 로컬에서 이미 5432 포트 사용 중
**해결**:
```bash
# docker-compose.external.yml 수정
services:
  postgres:
    ports:
      - "5433:5432"  # 호스트 포트 변경

# .env.external 수정
DB_HOST=localhost
DB_PORT=5433
```

---

## 14. 📚 참고 자료

- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md): 외부 개발 환경 상세 가이드
- [API_CONTRACTS.md](./API_CONTRACTS.md): 서비스 간 API 계약서
- [MOCK_SERVICES.md](./MOCK_SERVICES.md): Mock 서비스 구현 가이드
- [SSO_GUIDE.md](./SSO_GUIDE.md): SSO 연동 가이드

---

## 15. 📞 문의 및 지원

- **기술 리드**: syngha.han@samsung.com
- **Slack 채널**: #a2g-dev (일반 문의), #a2g-frontend, #a2g-backend
- **이슈 트래킹**: GitHub Issues ([github.com/A2G-Dev-Space/Agent-Platform-Development/issues](https://github.com/A2G-Dev-Space/Agent-Platform-Development/issues))

---

**다음 단계**: 각 개발자는 Sprint 0 체크리스트를 완료하고, 담당 모듈 개발을 시작합니다.
