# 🚀 A2G Platform - Development Checklist

**Version**: 2.0
**Architecture**: Microservice (Multi-Repository)
**Team**: 4 Developers

---

## 📋 목차

1. [개발자별 체크리스트](#1-개발자별-체크리스트)
   - [DEV1 (한승하) - Frontend + Infra + User Service](#dev1-한승하---frontend--infra--user-service)
   - [DEV2 (이병주) - Admin Service + Worker Service](#dev2-이병주---admin-service--worker-service)
   - [DEV3 (김영섭) - Chat Service + Tracing Service](#dev3-김영섭---chat-service--tracing-service)
   - [DEV4 (안준형) - Agent Service](#dev4-안준형---agent-service)
2. [Python 의존성 관리 (uv)](#2-python-의존성-관리-uv)
3. [참고 문서](#3-참고-문서)

---

## 1. 개발자별 체크리스트

### DEV1 (한승하) - Frontend + Infra + User Service

<details>
<summary><b>📦 Sprint 0: 기반 구축</b></summary>

#### Frontend Repository 생성
- [x] React + Vite + TypeScript 프로젝트 초기화
- [x] Tailwind CSS 설정 (3.4+ selector strategy dark mode)
- [x] MUI (Material-UI) 설치 및 테마 설정
- [x] Zustand 스토어 생성 (`useAuthStore`, `useThemeStore`, `useApiKeyStore`)
- [x] React Router 설정 (모든 라우트 구성)
- [x] Layout 컴포넌트 완성 (Sidebar + Header + SSO 콜백 처리)

📚 **참고**: [BLUEPRINT.md](./BLUEPRINT.md) - UI/UX 디자인 가이드

#### Infra Repository 생성
- [ ] `docker-compose/docker-compose.external.yml` 작성
- [ ] `docker-compose/docker-compose.internal.yml` 작성
- [ ] Mock SSO 구현 (FastAPI):
  - [ ] `mock-sso/main.py` (로그인, JWT 발급)
  - [ ] `mock-sso/templates/login.html` (로그인 UI)
  - [ ] `mock-sso/Dockerfile`
- [ ] Nginx 설정 (`nginx/nginx.conf`)
- [ ] PostgreSQL, Redis Docker 설정
- [ ] Mock Services 테스트 및 팀 공유

📚 **참고**:
- [MOCK_SERVICES.md](./MOCK_SERVICES.md) - Mock SSO 구현 가이드
- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md) - 외부 개발 환경 설정
- [repos/infra-service/FRONTEND_GUIDE.md](./repos/infra-service/FRONTEND_GUIDE.md) - Infra 서비스 가이드

#### User Service Repository 생성
- [ ] FastAPI 프로젝트 초기화
- [ ] User 모델 정의 (username, email, role, 부서 정보)
- [ ] APIKey 모델 정의
- [ ] SSO 콜백 처리 로직 스텁 (`/api/auth/callback`)
- [ ] JWT 발급 로직 스텁

📚 **참고**:
- [SSO_GUIDE.md](./SSO_GUIDE.md) - SSO 인증 플로우
- [repos/user-service/FRONTEND_GUIDE.md](./repos/user-service/FRONTEND_GUIDE.md) - User Service API 가이드

</details>

<details>
<summary><b>🔧 Sprint 1: Core APIs</b></summary>

#### User Service - SSO 및 인증
- [ ] SSO 콜백 처리 완성 (`/api/auth/callback`)
- [ ] JWT 발급 (`simplejwt`)
- [ ] API Key 생성 (`POST /api/auth/api-keys`)
- [ ] 활성 API Key 조회 (`GET /api/auth/api-keys/active`)
- [ ] User CRUD API 완성

📚 **참고**:
- [SSO_GUIDE.md](./SSO_GUIDE.md) - SSO 상세 구현
- [API_CONTRACTS.md](./API_CONTRACTS.md) - User Service API 스펙
- [repos/user-service/FRONTEND_GUIDE.md](./repos/user-service/FRONTEND_GUIDE.md) - Frontend 연동 가이드

</details>

<details>
<summary><b>🎨 Sprint 2: Frontend Core + Backend 연동</b></summary>

#### Frontend - Layout 및 인증
- [x] Sidebar 컴포넌트 (모드 전환, 모드별 색상 표시)
- [x] Header 컴포넌트 (로고, 프로필 드롭다운, 테마 토글)
- [x] Layout 컴포넌트 (SSO 콜백 처리, 인증 상태 관리)
- [x] PendingApprovalPage 컴포넌트
- [x] 공통 컴포넌트 (Button, Modal, Input, Card)

#### Frontend - 메인 대시보드
- [x] AgentCard 컴포넌트 (Gemini 스타일)
- [x] AddAgentModal 컴포넌트
- [x] Dashboard 페이지 (Hub/Workbench 모드 분기)
- [x] Agent Service API 연동 (`GET /api/agents`, `POST /api/agents`)

#### User Service Backend 연동 테스트
- [ ] SSO 로그인 플로우 테스트
- [ ] JWT 토큰 발급 확인
- [ ] Frontend 오류 수정

📚 **참고**:
- [BLUEPRINT.md](./BLUEPRINT.md) - UI/UX 가이드
- [GLOSSARY.md](./GLOSSARY.md) - 3가지 모드(Workbench/Hub/Flow) 용어 정의

</details>

<details>
<summary><b>⚡ Sprint 3: Frontend 고급 기능</b></summary>

#### Frontend - Agent Playground
- [x] AgentPlayground 컴포넌트
- [x] PlaygroundSidebar (세션 목록, '새 대화' 버튼)
- [x] ChatPlayground (메시지 목록, 입력창)
- [x] TraceCapturePanel (Workbench 모드 전용)
- [x] LiveTrace 컴포넌트 (실시간 로그 표시)

#### Frontend - Flow 페이지
- [x] FlowPage 컴포넌트 (Claude 스타일 미니멀)
- [x] Agent 선택 Dropdown
- [x] 통합 실행 UI

#### Frontend - Settings 페이지
- [x] SettingsLayout (탭 메뉴)
- [x] GeneralSettings (테마, 언어)
- [x] APIKeys 페이지
- [x] Admin 페이지 (사용자 관리, 통계)

#### 전체 Backend 연동 테스트
- [ ] 모든 페이지에서 Backend API 정상 동작 확인
- [ ] Frontend 오류 수정 및 UX 개선

📚 **참고**:
- [BLUEPRINT.md](./BLUEPRINT.md) - 전체 UI/UX 가이드
- [repos/chat-service/FRONTEND_GUIDE.md](./repos/chat-service/FRONTEND_GUIDE.md) - Chat Service 연동
- [repos/tracing-service/FRONTEND_GUIDE.md](./repos/tracing-service/FRONTEND_GUIDE.md) - Tracing Service 연동

</details>

<details>
<summary><b>🚀 Sprint 4: 통합 테스트 & 배포</b></summary>

#### 통합 테스트
- [ ] E2E 테스트 (Playwright)
- [ ] API Contract 테스트 (Postman/Newman)
- [ ] Load 테스트 (Locust)

#### 사내망 전환
- [ ] 모든 서비스 `.env.internal` 설정
- [ ] Real SSO 연동 테스트
- [ ] Production DB 마이그레이션
- [ ] Nginx SSL 인증서 교체

#### 배포
- [ ] Docker 이미지 빌드 (모든 서비스)
- [ ] Docker Registry 푸시
- [ ] 사내망 서버 배포
- [ ] Health Check 확인

#### 문서화
- [ ] API 문서 업데이트 (OpenAPI)
- [ ] 운영 매뉴얼 작성
- [ ] 트러블슈팅 가이드

📚 **참고**:
- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md) - 환경 설정 가이드
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 전체 아키텍처

</details>

---

### DEV2 (이병주) - Admin Service + Worker Service

<details>
<summary><b>📦 Sprint 0: 기반 구축</b></summary>

#### Admin Service Repository 생성
- [ ] FastAPI 프로젝트 초기화
- [ ] LLMModel 모델 정의
- [ ] `/api/admin/llm-models` CRUD 엔드포인트 스텁
- [ ] `/api/admin/stats/llm-usage` 엔드포인트 스텁

#### Worker Service Repository 생성
- [ ] Celery 프로젝트 초기화
- [ ] Redis 연결 설정
- [ ] `check_llm_health` Task 스텁
- [ ] `check_agent_health` Task 스텁

📚 **참고**:
- [repos/admin-service/FRONTEND_GUIDE.md](./repos/admin-service/FRONTEND_GUIDE.md) - Admin Service 가이드
- [repos/worker-service/FRONTEND_GUIDE.md](./repos/worker-service/FRONTEND_GUIDE.md) - Worker Service 가이드

</details>

<details>
<summary><b>🔧 Sprint 1: Core APIs</b></summary>

#### Admin Service - LLM 관리
- [ ] LLM CRUD API 완성
- [ ] LLM 헬스 체크 필드 추가 (`health_status`, `last_health_check`)
- [ ] 통계 API 기본 구조 구현

#### Worker Service - Health Check
- [ ] `check_llm_health` Task 구현
- [ ] Celery Beat 스케줄 설정
- [ ] `check_agent_health` Task 구현

📚 **참고**:
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Admin Service API 스펙
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Worker Service 아키텍처

</details>

<details>
<summary><b>🎨 Sprint 2: Backend 연동</b></summary>

#### Admin Service - 통계 API
- [ ] LogEntry 읽기 권한 설정 (Tracing Service와 협의)
- [ ] 통계 집계 로직 구현
- [ ] Frontend 연동 테스트: Admin 페이지에서 통계 표시 확인

📚 **참고**:
- [repos/admin-service/FRONTEND_GUIDE.md](./repos/admin-service/FRONTEND_GUIDE.md) - Frontend 연동 방법

</details>

<details>
<summary><b>⚡ Sprint 3: 고도화</b></summary>

#### Admin Service - 통계 API 완성
- [ ] `GET /api/admin/stats/llm-usage` 완성
- [ ] 날짜 범위 필터, 그룹화 (user, department, model)
- [ ] Agent 사용량 통계 API 추가
- [ ] Frontend 연동 테스트: 통계 페이지 동작 확인

#### Worker Service - Agent Health Check
- [ ] `check_agent_health` Task 완성 (A2A 엔드포인트 호출)
- [ ] 실패 시 status=DISABLED 변경
- [ ] 알림 발송 기능

📚 **참고**:
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Admin Service 전체 API

</details>

<details>
<summary><b>🚀 Sprint 4: 통합 테스트 & 배포</b></summary>

- [ ] 통합 테스트 참여
- [ ] 사내망 전환 설정
- [ ] 배포 및 Health Check
- [ ] 문서화

</details>

---

### DEV3 (김영섭) - Chat Service + Tracing Service

<details>
<summary><b>📦 Sprint 0: 기반 구축</b></summary>

#### Chat Service Repository 생성
- [ ] FastAPI 프로젝트 초기화
- [ ] ChatSession 모델 정의 (trace_id 필드 포함)
- [ ] ChatMessage 모델 정의
- [ ] `/api/chat/sessions` CRUD 엔드포인트 스텁
- [ ] `/ws/trace/{trace_id}` WebSocket 엔드포인트 스텁

#### Tracing Service Repository 생성
- [ ] FastAPI 프로젝트 초기화
- [ ] LogEntry 모델 정의
- [ ] `/api/log-proxy/{trace_id}/chat/completions` 엔드포인트 스텁

📚 **참고**:
- [repos/chat-service/FRONTEND_GUIDE.md](./repos/chat-service/FRONTEND_GUIDE.md) - Chat Service 가이드
- [repos/tracing-service/FRONTEND_GUIDE.md](./repos/tracing-service/FRONTEND_GUIDE.md) - Tracing Service 가이드

</details>

<details>
<summary><b>🔧 Sprint 1: Core APIs</b></summary>

#### Chat Service - Session/Message
- [ ] Session CRUD API 완성
- [ ] Message 생성 API
- [ ] trace_id 자동 생성 로직
- [ ] 파일 업로드 API 기본 구현

#### Tracing Service - Log Proxy
- [ ] `POST /api/log-proxy/{trace_id}/chat/completions` 완성
- [ ] LLM Endpoint로 프록시 로직
- [ ] LogEntry DB 저장

📚 **참고**:
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Chat/Tracing Service API 스펙

</details>

<details>
<summary><b>🎨 Sprint 2: Backend 연동</b></summary>

#### Chat Service - 파일 업로드
- [ ] `POST /api/chat/files` API
- [ ] S3 또는 로컬 스토리지 설정
- [ ] Frontend 연동 테스트: ChatInput에서 파일 업로드 확인

#### Tracing Service - Multi-Agent 추적
- [ ] agent_id 추론 로직 (Tool Call 분석)
- [ ] LogEntry에 agent_id 필드 저장
- [ ] Frontend 연동 테스트: LiveTrace에서 로그 표시 확인

📚 **참고**:
- [repos/chat-service/FRONTEND_GUIDE.md](./repos/chat-service/FRONTEND_GUIDE.md) - 파일 업로드 구현

</details>

<details>
<summary><b>⚡ Sprint 3: 고도화 - WebSocket 실시간 Trace</b></summary>

#### Chat Service - WebSocket 실시간 Trace
- [ ] `WS /ws/trace/{trace_id}` 완성
- [ ] TokenAuthMiddleware (JWT 쿼리 파라미터 검증)
- [ ] TraceLogConsumer (Redis Pub/Sub 수신)
- [ ] 실시간 로그 브로드캐스트
- [ ] Frontend 연동 테스트: LiveTrace 실시간 동작 확인

#### Tracing Service - 실시간 로그 전송
- [ ] Redis Pub/Sub으로 Chat Service에 로그 전송
- [ ] Log Proxy 시 실시간 전송
- [ ] Frontend 연동 테스트: TraceCapturePanel 동작 확인

📚 **참고**:
- [repos/chat-service/FRONTEND_GUIDE.md](./repos/chat-service/FRONTEND_GUIDE.md) - WebSocket 구현
- [repos/tracing-service/FRONTEND_GUIDE.md](./repos/tracing-service/FRONTEND_GUIDE.md) - 실시간 로그 전송

</details>

<details>
<summary><b>🚀 Sprint 4: 통합 테스트 & 배포</b></summary>

- [ ] 통합 테스트 참여
- [ ] 사내망 전환 설정
- [ ] 배포 및 Health Check
- [ ] 문서화

</details>

---

### DEV4 (안준형) - Agent Service

<details>
<summary><b>📦 Sprint 0: 기반 구축</b></summary>

#### Agent Service Repository 생성
- [ ] FastAPI 프로젝트 초기화
- [ ] Agent 모델 정의 (중요: `a2a_endpoint`, `capabilities`, `embedding_vector` 필드 포함)
- [ ] `/api/agents` CRUD 엔드포인트 스텁
- [ ] `/api/agents/a2a/register` 엔드포인트 스텁
- [ ] `/api/agents/recommend` 엔드포인트 스텁

📚 **참고**:
- [repos/agent-service/FRONTEND_GUIDE.md](./repos/agent-service/FRONTEND_GUIDE.md) - Agent Service 가이드

</details>

<details>
<summary><b>🔧 Sprint 1: Core APIs - CRUD</b></summary>

#### Agent Service - CRUD API
- [ ] `GET /api/agents` - Agent 목록
- [ ] `POST /api/agents` - Agent 생성
- [ ] `PATCH /api/agents/{id}` - Agent 수정
- [ ] `DELETE /api/agents/{id}` - Agent 삭제
- [ ] 소유자 검증 로직
- [ ] A2A 엔드포인트 기본 구조 구현

📚 **참고**:
- [API_CONTRACTS.md](./API_CONTRACTS.md) - Agent Service API 스펙

</details>

<details>
<summary><b>🎨 Sprint 2: A2A 프로토콜</b></summary>

#### Agent Service - A2A 프로토콜
- [ ] `POST /api/agents/a2a/register` 완성
  - Agno, ADK, Langchain-agent 지원
  - A2A 엔드포인트 검증 로직
  - capabilities 파싱 및 저장
- [ ] `POST /api/agents/{id}/deploy` 완성
  - 운영 A2A 엔드포인트 검증
  - status → PRODUCTION 변경
- [ ] Frontend 연동 테스트: Agent 등록 및 배포 플로우 확인

📚 **참고**:
- [API_CONTRACTS.md](./API_CONTRACTS.md) - A2A 프로토콜 스펙
- [repos/agent-service/FRONTEND_GUIDE.md](./repos/agent-service/FRONTEND_GUIDE.md) - A2A 구현 가이드

</details>

<details>
<summary><b>⚡ Sprint 3: Top-K Agent 추천 (RAG)</b></summary>

#### Agent Service - Top-K Agent 추천
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
- [ ] Frontend 연동 테스트: Hub 페이지 Top-K 추천 동작 확인

📚 **참고**:
- [repos/agent-service/FRONTEND_GUIDE.md](./repos/agent-service/FRONTEND_GUIDE.md) - RAG 구현 가이드

</details>

<details>
<summary><b>🚀 Sprint 4: 통합 테스트 & 배포</b></summary>

- [ ] 통합 테스트 참여
- [ ] 사내망 전환 설정
- [ ] 배포 및 Health Check
- [ ] 문서화

</details>

---

## 2. Python 의존성 관리 (uv)

**모든 Python 프로젝트는 `uv`를 사용하여 의존성을 관리합니다.**

### 2.1 uv 설치

```bash
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"

# 설치 확인
uv --version
```

### 2.2 프로젝트 초기화

```bash
# 새 프로젝트 시작 시
cd agent-platform-user-service
uv init  # pyproject.toml 생성

# 의존성 설치
uv sync  # pyproject.toml 또는 requirements.txt 기반으로 설치
```

### 2.3 패키지 추가/제거

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

### 2.4 애플리케이션 실행

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

### 2.5 uv 사용 이유

- **속도**: pip보다 10-100배 빠른 패키지 설치
- **일관성**: lockfile을 통한 정확한 의존성 재현
- **간편함**: 가상환경 자동 관리
- **호환성**: pip/requirements.txt와 호환

---

## 3. 참고 문서

### 아키텍처 & 설계
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Microservice 구조, 시스템 설계
- [API_CONTRACTS.md](./API_CONTRACTS.md) - 전체 API 계약서
- [SRS.md](./SRS.md) - 요구사항 명세서

### 개발 가이드
- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md) - 외부/사내망 개발 환경 설정
- [SSO_GUIDE.md](./SSO_GUIDE.md) - SSO 인증 플로우 상세 가이드
- [MOCK_SERVICES.md](./MOCK_SERVICES.md) - Mock SSO, PostgreSQL, Redis 구현

### UI/UX & 용어
- [BLUEPRINT.md](./BLUEPRINT.md) - 전체 UI/UX 디자인 가이드
- [GLOSSARY.md](./GLOSSARY.md) - 3가지 모드(Workbench/Hub/Flow) 용어 정의

### 서비스별 Frontend 연동 가이드
각 서비스별로 Frontend에서 호출하는 API, 실제 구현 코드, 테스트 시나리오가 포함되어 있습니다.

- [repos/user-service/FRONTEND_GUIDE.md](./repos/user-service/FRONTEND_GUIDE.md) - User Service 연동
- [repos/agent-service/FRONTEND_GUIDE.md](./repos/agent-service/FRONTEND_GUIDE.md) - Agent Service 연동
- [repos/chat-service/FRONTEND_GUIDE.md](./repos/chat-service/FRONTEND_GUIDE.md) - Chat Service 연동
- [repos/tracing-service/FRONTEND_GUIDE.md](./repos/tracing-service/FRONTEND_GUIDE.md) - Tracing Service 연동
- [repos/admin-service/FRONTEND_GUIDE.md](./repos/admin-service/FRONTEND_GUIDE.md) - Admin Service 연동
- [repos/worker-service/FRONTEND_GUIDE.md](./repos/worker-service/FRONTEND_GUIDE.md) - Worker Service 연동
- [repos/infra-service/FRONTEND_GUIDE.md](./repos/infra-service/FRONTEND_GUIDE.md) - Infra Service 가이드

### 기타
- [README.md](./README.md) - 프로젝트 전체 개요

---

**Contact**: syngha.han@samsung.com
