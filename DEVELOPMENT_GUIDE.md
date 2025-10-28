# 🚀 A2G Platform - Development Guide

**Version**: 2.0
**Team**: 4 Developers (DEV1: Senior, SPRINT Lead)
**Duration**: 6 Weeks (Sprint 0~4)
**Architecture**: Microservice (Multi-Repository)

---

## 📋 목차

1. [4명 팀 구성](#1-4명-팀-구성)
2. [6주 Sprint 계획](#2-6주-sprint-계획)
3. [Sprint별 체크리스트](#3-sprint별-체크리스트)
4. [개발 워크플로우](#4-개발-워크플로우)
5. [Git 전략](#5-git-전략)
6. [협업 가이드](#6-협업-가이드)

---

## 1. 4명 팀 구성

### 1.1 역할 분담

| Developer | Repository | 주요 책임 | 기술 스택 |
|-----------|-----------|----------|----------|
| **DEV1 (한승하)** 🔥 | `agent-platform-frontend`<br>`agent-platform-infra`<br>`agent-platform-user-service` | **Frontend 전체 개발**<br>Infra 구축<br>SSO 연동/인증 | React, TypeScript<br>Docker, Nginx<br>FastAPI |
| **DEV2 (이병주)** | `agent-platform-admin-service`<br>`agent-platform-worker-service` | LLM 관리<br>통계 API<br>Celery Tasks<br>Health Check | FastAPI<br>PostgreSQL<br>Celery, Redis |
| **DEV3 (김영섭)** | `agent-platform-chat-service`<br>`agent-platform-tracing-service` | WebSocket<br>Session/Message<br>Log Proxy | FastAPI<br>WebSocket<br>Redis Pub/Sub |
| **DEV4 (안준형)** | `agent-platform-agent-service`<br>(agent subrepo) | A2A 프로토콜<br>Top-K 추천 (RAG)<br>Agent CRUD | FastAPI<br>LangChain<br>FAISS |

### 1.2 개발 방식

**Frontend 개발**:
- **DEV1 (한승하)**가 Frontend의 모든 기능을 단독 개발
- Layout, 공통 컴포넌트, 상태 관리, 모든 페이지 구현
- 완성된 Frontend를 다른 팀원들에게 제공

**Backend 개발 및 테스트**:
- **DEV1~DEV4 모두** 각자 담당한 Backend 서비스를 구현
- 각 개발자는 DEV1이 제공한 Frontend와 자신의 Backend 연동 테스트 수행
- Frontend 기능에 이상이 없는지, 오류 동작은 없는지 확인

**Repository 관리**:
- **Agent subrepo**: DEV4 (안준형) 전담
- **Infra repo**: DEV1 (한승하) 전담

---

## 2. 6주 Sprint 계획

| Sprint | 기간 | 주요 목표 | 주도 | 마일스톤 |
|--------|------|----------|------|----------|
| **Sprint 0** | Week 1 | 기반 구축 | DEV1 (Infra), 전체 (Repo) | Mock Services, 7개 Repository 생성 |
| **Sprint 1** | Week 2 | Core APIs | 전체 (각 Backend) | User/Agent/Chat Service 기본 API |
| **Sprint 2** | Week 3 | Frontend Core | DEV1 (Frontend), 전체 (테스트) | Frontend Core 개발, Backend 연동 |
| **Sprint 3** | Week 4-5 | Frontend 완성 + Backend 고도화 | DEV1 (Frontend), 전체 (Backend) | Frontend 모든 기능, Top-K 추천, WebSocket |
| **Sprint 4** | Week 6 | 통합 & 배포 | 전체 | 통합 테스트, 사내망 배포 |

---

## 3. Sprint별 체크리스트

### Sprint 0: 기반 구축 (Week 1) ⚡ 최우선

#### DEV1 (한승하) - Frontend + Infra + User Service

- [x] **`agent-platform-frontend` Repository 생성** ✅
  - [x] React + Vite + TypeScript 프로젝트 초기화
  - [x] Tailwind CSS 설정 (3.4+ selector strategy dark mode)
  - [x] MUI (Material-UI) 설치 및 테마 설정
  - [x] Zustand 스토어 생성 (`useAuthStore`, `useThemeStore`, `useApiKeyStore`)
  - [x] React Router 설정 (모든 라우트 구성)
  - [x] Layout 컴포넌트 완성 (Sidebar + Header + SSO 콜백 처리)

- [ ] **`agent-platform-infra` Repository 생성**
  - [ ] `docker-compose/docker-compose.external.yml` 작성
  - [ ] `docker-compose/docker-compose.internal.yml` 작성
  - [ ] Mock SSO 구현 (FastAPI):
    - [ ] `mock-sso/main.py` (로그인, JWT 발급)
    - [ ] `mock-sso/templates/login.html` (로그인 UI)
    - [ ] `mock-sso/Dockerfile`
  - [ ] Nginx 설정 (`nginx/nginx.conf`)
  - [ ] PostgreSQL, Redis Docker 설정
  - [ ] Mock Services 테스트 및 팀 공유

- [ ] **`agent-platform-user-service` Repository 생성**
  - [ ] FastAPI 프로젝트 초기화
  - [ ] User 모델 정의 (username, email, role, 부서 정보)
  - [ ] APIKey 모델 정의
  - [ ] SSO 콜백 처리 로직 스텁 (`/api/auth/callback`)
  - [ ] JWT 발급 로직 스텁

#### DEV2 (이병주) - Admin Service + Worker Service

- [ ] **`agent-platform-admin-service` Repository 생성**
  - [ ] FastAPI 프로젝트 초기화
  - [ ] LLMModel 모델 정의
  - [ ] `/api/admin/llm-models` CRUD 엔드포인트 스텁
  - [ ] `/api/admin/stats/llm-usage` 엔드포인트 스텁

- [ ] **`agent-platform-worker-service` Repository 생성**
  - [ ] Celery 프로젝트 초기화
  - [ ] Redis 연결 설정
  - [ ] `check_llm_health` Task 스텁
  - [ ] `check_agent_health` Task 스텁

#### DEV3 (김영섭) - Chat Service + Tracing Service

- [ ] **`agent-platform-chat-service` Repository 생성**
  - [ ] FastAPI 프로젝트 초기화
  - [ ] ChatSession 모델 정의 (trace_id 필드 포함)
  - [ ] ChatMessage 모델 정의
  - [ ] `/api/chat/sessions` CRUD 엔드포인트 스텁
  - [ ] `/ws/trace/{trace_id}` WebSocket 엔드포인트 스텁

- [ ] **`agent-platform-tracing-service` Repository 생성**
  - [ ] FastAPI 프로젝트 초기화
  - [ ] LogEntry 모델 정의
  - [ ] `/api/log-proxy/{trace_id}/chat/completions` 엔드포인트 스텁

#### DEV4 (안준형) - Agent Service (agent subrepo)

- [ ] **`agent-platform-agent-service` Repository 생성**
  - [ ] FastAPI 프로젝트 초기화
  - [ ] Agent 모델 정의 (중요: `a2a_endpoint`, `capabilities`, `embedding_vector` 필드 포함)
  - [ ] `/api/agents` CRUD 엔드포인트 스텁
  - [ ] `/api/agents/a2a/register` 엔드포인트 스텁
  - [ ] `/api/agents/recommend` 엔드포인트 스텁

#### Sprint 0 완료 조건

- [ ] 모든 7개 Repository가 생성되고 GitHub에 Push됨
- [ ] Mock Services (SSO, PostgreSQL, Redis)가 Docker Compose로 실행됨
- [ ] 각 서비스가 로컬에서 실행 가능 (스텁 상태)
- [ ] 팀 온보딩 세션 완료 (Mock SSO 사용법 공유)

---

### Sprint 1: Core APIs (Week 2)

#### DEV1 (한승하) - User Service Backend

- [ ] **User Service - SSO 및 인증**
  - [ ] SSO 콜백 처리 완성 (`/api/auth/callback`)
  - [ ] JWT 발급 (`simplejwt`)
  - [ ] API Key 생성 (`POST /api/keys`)
  - [ ] 활성 API Key 조회 (`GET /api/keys/active`)
  - [ ] User CRUD API 완성

#### DEV2 (이병주) - Admin Service + Worker Service Backend

- [ ] **Admin Service - LLM 관리**
  - [ ] LLM CRUD API 완성
  - [ ] LLM 헬스 체크 필드 추가 (`health_status`, `last_health_check`)
  - [ ] 통계 API 기본 구조 구현

- [ ] **Worker Service - Health Check**
  - [ ] `check_llm_health` Task 구현
  - [ ] Celery Beat 스케줄 설정
  - [ ] `check_agent_health` Task 구현

#### DEV3 (김영섭) - Chat Service + Tracing Service Backend

- [ ] **Chat Service - Session/Message**
  - [ ] Session CRUD API 완성
  - [ ] Message 생성 API
  - [ ] trace_id 자동 생성 로직
  - [ ] 파일 업로드 API 기본 구현

- [ ] **Tracing Service - Log Proxy**
  - [ ] `POST /api/log-proxy/{trace_id}/chat/completions` 완성
  - [ ] LLM Endpoint로 프록시 로직
  - [ ] LogEntry DB 저장

#### DEV4 (안준형) - Agent Service Backend

- [ ] **Agent Service - CRUD API**
  - [ ] `GET /api/agents` - Agent 목록
  - [ ] `POST /api/agents` - Agent 생성
  - [ ] `PATCH /api/agents/{id}` - Agent 수정
  - [ ] `DELETE /api/agents/{id}` - Agent 삭제
  - [ ] 소유자 검증 로직
  - [ ] A2A 엔드포인트 기본 구조 구현

#### Sprint 1 완료 조건

- [ ] SSO 로그인 → JWT 발급 → Frontend 로그인 플로우 동작
- [ ] Agent CRUD API 완전 동작 (Frontend 연동 가능)
- [ ] Chat Session 생성 시 trace_id 자동 생성
- [ ] Tracing Service가 LLM 호출 프록시 가능

---

### Sprint 2: Frontend Core + Backend 연동 (Week 3)

#### DEV1 (한승하) - Frontend Core 개발

- [x] **Frontend - Layout 및 인증** ✅
  - [x] Sidebar 컴포넌트 (모드 전환, 모드별 색상 표시)
  - [x] Header 컴포넌트 (로고, 프로필 드롭다운, 테마 토글)
  - [x] Layout 컴포넌트 (SSO 콜백 처리, 인증 상태 관리)
  - [x] PendingApprovalPage 컴포넌트
  - [x] 공통 컴포넌트 (Button, Modal, Input, Card) - **진행 중**

- [x] **Frontend - 메인 대시보드** ✅
  - [x] AgentCard 컴포넌트 (Gemini 스타일) - **진행 중**
  - [x] AddAgentModal 컴포넌트 - **진행 중**
  - [x] Dashboard 페이지 (Hub/Workbench 모드 분기) - 기본 구조 완료
  - [x] Agent Service API 연동 (`GET /api/agents`, `POST /api/agents`) - 준비 완료

- [ ] **User Service Backend 연동 테스트**
  - [ ] SSO 로그인 플로우 테스트
  - [ ] JWT 토큰 발급 확인
  - [ ] Frontend 오류 수정

#### DEV2 (이병주) - Admin Service Backend

- [ ] **Admin Service - 통계 API**
  - [ ] LogEntry 읽기 권한 설정 (Tracing Service와 협의)
  - [ ] 통계 집계 로직 구현
  - [ ] **Frontend 연동 테스트**: Admin 페이지에서 통계 표시 확인

#### DEV3 (김영섭) - Chat + Tracing Service Backend

- [ ] **Chat Service - 파일 업로드**
  - [ ] `POST /api/chat/files` API
  - [ ] S3 또는 로컬 스토리지 설정
  - [ ] **Frontend 연동 테스트**: ChatInput에서 파일 업로드 확인

- [ ] **Tracing Service - Multi-Agent 추적**
  - [ ] agent_id 추론 로직 (Tool Call 분석)
  - [ ] LogEntry에 agent_id 필드 저장
  - [ ] **Frontend 연동 테스트**: LiveTrace에서 로그 표시 확인

#### DEV4 (안준형) - Agent Service Backend

- [ ] **Agent Service - A2A 프로토콜** ⭐
  - [ ] `POST /api/agents/a2a/register` 완성
    - Agno, ADK, Langchain-agent 지원
    - A2A 엔드포인트 검증 로직
    - capabilities 파싱 및 저장
  - [ ] `POST /api/agents/{id}/deploy` 완성
    - 운영 A2A 엔드포인트 검증
    - status → PRODUCTION 변경
  - [ ] **Frontend 연동 테스트**: Agent 등록 및 배포 플로우 확인

#### Sprint 2 완료 조건

- [ ] Frontend 메인 대시보드 완성 (Agent 카드 목록 표시)
- [ ] A2A 프로토콜로 Agent 등록 가능 (Agno, Langchain 테스트)
- [ ] Agent 운영 전환 플로우 동작

---

### Sprint 3: Frontend 고급 기능 + Backend 고도화 (Week 4-5)

#### DEV1 (한승하) - Frontend 고급 기능 개발

- [x] **Frontend - Agent Playground** - **진행 중** ⚡
  - [x] AgentPlayground 컴포넌트 - 기본 구조 완료
  - [x] PlaygroundSidebar (세션 목록, '새 대화' 버튼) - 스텁 완료
  - [x] ChatPlayground (메시지 목록, 입력창) - 스텁 완료, **상세 구현 중**
  - [x] TraceCapturePanel (Workbench 모드 전용) - **구현 중**
  - [x] LiveTrace 컴포넌트 (실시간 로그 표시) - **구현 중**

- [x] **Frontend - Flow 페이지** ✅
  - [x] FlowPage 컴포넌트 (Claude 스타일 미니멀) - 기본 구조 완료
  - [x] Agent 선택 Dropdown - 스텁 완료
  - [x] 통합 실행 UI - 기본 구조 완료

- [x] **Frontend - Settings 페이지** ✅
  - [x] SettingsLayout (탭 메뉴) - 완료
  - [x] GeneralSettings (테마, 언어) - 완료
  - [x] APIKeys 페이지 - 기본 구조 완료
  - [x] Admin 페이지 (사용자 관리, 통계) - 기본 구조 완료

- [ ] **전체 Backend 연동 테스트**
  - [ ] 모든 페이지에서 Backend API 정상 동작 확인
  - [ ] Frontend 오류 수정 및 UX 개선

#### DEV2 (이병주) - Admin + Worker Service 고도화

- [ ] **Admin Service - 통계 API 완성**
  - [ ] `GET /api/admin/stats/llm-usage` 완성
  - [ ] 날짜 범위 필터, 그룹화 (user, department, model)
  - [ ] Agent 사용량 통계 API 추가
  - [ ] **Frontend 연동 테스트**: 통계 페이지 동작 확인

- [ ] **Worker Service - Agent Health Check**
  - [ ] `check_agent_health` Task 완성 (A2A 엔드포인트 호출)
  - [ ] 실패 시 status=DISABLED 변경
  - [ ] 알림 발송 기능

#### DEV3 (김영섭) - Chat + Tracing Service 고도화

- [ ] **Chat Service - WebSocket 실시간 Trace** ⭐
  - [ ] `WS /ws/trace/{trace_id}` 완성
  - [ ] TokenAuthMiddleware (JWT 쿼리 파라미터 검증)
  - [ ] TraceLogConsumer (Redis Pub/Sub 수신)
  - [ ] 실시간 로그 브로드캐스트
  - [ ] **Frontend 연동 테스트**: LiveTrace 실시간 동작 확인

- [ ] **Tracing Service - 실시간 로그 전송**
  - [ ] Redis Pub/Sub으로 Chat Service에 로그 전송
  - [ ] Log Proxy 시 실시간 전송
  - [ ] **Frontend 연동 테스트**: TraceCapturePanel 동작 확인

#### DEV4 (안준형) - Agent Service 고도화

- [ ] **Agent Service - Top-K Agent 추천** ⭐⭐
  - [ ] RAG 파이프라인 구축:
    - OpenAI Embeddings 설정
    - FAISS Vector DB 초기화
    - Agent.capabilities + description 임베딩 생성
  - [ ] `POST /api/agents/recommend` 완성:
    - 사용자 쿼리 임베딩
    - 유사도 검색 (FAISS)
    - 활성 Agent 필터링 (status=PRODUCTION, health=healthy)
    - Top-K 반환
  - [ ] 임베딩 자동 업데이트 (Agent 생성/수정 시)
  - [ ] **Frontend 연동 테스트**: Hub 페이지 Top-K 추천 동작 확인

#### Sprint 3 완료 조건

- [ ] Top-K Agent 추천 시스템 완전 동작 (RAG)
- [ ] Frontend에서 쿼리 입력 → Top-5 Agent 표시
- [ ] WebSocket 실시간 Trace 동작 (Multi-Agent 추적 포함)
- [ ] Agent Playground 완성 (Chat + Live Trace)

---

### Sprint 4: 통합 테스트 & 배포 (Week 6)

#### 전체 팀

- [ ] **통합 테스트**
  - [ ] E2E 테스트 (Playwright)
  - [ ] API Contract 테스트 (Postman/Newman)
  - [ ] Load 테스트 (Locust)

- [ ] **사내망 전환**
  - [ ] 모든 서비스 `.env.internal` 설정
  - [ ] Real SSO 연동 테스트
  - [ ] Production DB 마이그레이션
  - [ ] Nginx SSL 인증서 교체

- [ ] **배포**
  - [ ] Docker 이미지 빌드 (모든 서비스)
  - [ ] Docker Registry 푸시
  - [ ] 사내망 서버 배포
  - [ ] Health Check 확인

- [ ] **문서화**
  - [ ] API 문서 업데이트 (OpenAPI)
  - [ ] 운영 매뉴얼 작성
  - [ ] 트러블슈팅 가이드

#### Sprint 4 완료 조건

- [ ] 모든 기능이 사내망에서 정상 동작
- [ ] E2E 테스트 통과
- [ ] 운영 문서 완성

---

## 4. 개발 워크플로우

### 4.1 Python 의존성 관리 (중요)

**모든 Python 프로젝트는 `uv`를 사용하여 의존성을 관리합니다.**

#### 4.1.1 uv 설치

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 설치 확인
uv --version
```

#### 4.1.2 프로젝트 초기화

```bash
# 새 프로젝트 시작 시
cd agent-platform-user-service
uv init  # pyproject.toml 생성

# 의존성 설치
uv sync  # pyproject.toml 또는 requirements.txt 기반으로 설치
```

#### 4.1.3 패키지 추가/제거

```bash
# 패키지 추가
uv add fastapi uvicorn sqlalchemy

# 개발 의존성 추가
uv add --dev pytest black ruff

# 패키지 제거
uv remove package-name

# 의존성 동기화 (lockfile 기반)
uv sync
```

#### 4.1.4 애플리케이션 실행

```bash
# uv run으로 실행 (가상환경 자동 활성화)
uv run uvicorn app.main:app --reload --port 8001
uv run celery -A app.worker worker --loglevel=info
uv run python manage.py migrate

# 또는 가상환경 활성화 후 실행
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
python -m uvicorn app.main:app --reload
```

#### 4.1.5 uv 사용 이유

- **속도**: pip보다 10-100배 빠른 패키지 설치
- **일관성**: lockfile을 통한 정확한 의존성 재현
- **간편함**: 가상환경 자동 관리
- **호환성**: pip/requirements.txt와 호환

### 4.2 일일 루틴

**09:00 - 10:00**: 개인 작업 시작
**10:00 - 10:15**: Daily Standup (DEV1 주도)
  - 어제 완료한 작업
  - 오늘 할 작업
  - 블로커 공유

**10:15 - 12:00**: 집중 개발
**12:00 - 13:00**: 점심
**13:00 - 18:00**: 집중 개발
**17:30 - 18:00**: 코드 리뷰 (DEV1)

### 4.3 주간 루틴

**월요일 09:00**: Sprint Planning (Sprint 시작 주)
**금요일 15:00**: Sprint Review & Retrospective (Sprint 종료 주)

---

## 5. Git 전략

### 5.1 브랜치 전략

```
main (운영)
  └── develop (개발 통합)
        ├── feature/TASK-101-frontend-layout (DEV1)
        ├── feature/TASK-102-a2a-protocol (DEV1)
        ├── feature/TASK-103-sso-integration (DEV2)
        └── feature/TASK-104-websocket-trace (DEV3)
```

### 5.2 커밋 컨벤션

```
type(scope): subject

body (optional)

footer (optional)
```

**Types**:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `refactor`: 리팩토링
- `test`: 테스트 추가

**예시**:
```
feat(agent-service): Implement A2A protocol registration

- Add POST /api/agents/a2a/register endpoint
- Support Agno, ADK, Langchain frameworks
- Validate A2A endpoint health

Closes TASK-102
```

### 5.3 Pull Request 규칙

1. 브랜치명: `feature/[TASK-ID]-[description]`
2. PR 타겟: `develop` 브랜치
3. 리뷰어: DEV1 (SPRINT Lead) 필수
4. CI 통과 필수 (Lint, Test)
5. Squash Merge 사용

---

## 6. 협업 가이드

### 6.1 Daily Standup (매일 10:00, 15분)

**진행**: DEV1
**형식**: 각자 3가지 공유
1. 어제 완료한 작업
2. 오늘 할 작업
3. 블로커 (막힌 부분)

**예시**:
```
DEV2:
- 어제: User Service SSO 콜백 구현 완료
- 오늘: JWT 발급 로직 구현
- 블로커: Mock SSO 테스트 데이터 필요 (DEV4에게 요청)
```

### 6.2 Sprint Planning (Sprint 시작 월요일, 1시간)

**진행**: DEV1
**내용**:
1. Sprint 목표 확인
2. Task 분배
3. 예상 공수 추정
4. 의존성 확인

### 6.3 Sprint Review & Retrospective (Sprint 종료 금요일, 1시간)

**진행**: DEV1
**내용**:
1. **Review** (30분): 완성된 기능 데모
2. **Retrospective** (30분):
   - 잘된 점 (Keep)
   - 개선할 점 (Improve)
   - 시도할 점 (Try)

### 6.4 코드 리뷰 가이드

**리뷰어**: DEV1 (필수), 다른 팀원 (선택)

**체크리스트**:
- [ ] API 계약 준수 (API_CONTRACTS.md)
- [ ] 테스트 코드 포함
- [ ] Lint 통과
- [ ] 주석 적절
- [ ] 보안 이슈 없음

---

## 📚 참고 문서

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Microservice 구조
- [API_CONTRACTS.md](./API_CONTRACTS.md) - API 계약서
- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md) - 외부 개발 환경
- [README.md](./README.md) - 프로젝트 개요

---

**Contact**: syngha.han@samsung.com
