<h1 align="center">🚀 A2G Agent Platform</h1>
<p align="center">
<strong>종합 기술 문서 및 아키텍처 가이드 (Phase 2: Microservice Transition)</strong>
</p>
🚨 필독: 프로젝트 상태 (Phase 1 → Phase 2)
안녕하세요. A2G Agent Platform 프로젝트에 오신 것을 환영합니다.
본 프로젝트는 초기 개발 속도를 위해 **Phase 1 (기능별로 분리된 Django 모놀리식 아키텍처)**로 시작되었습니다. 현재 main 브랜치의 코드베이스는 이 Phase 1 구조를 따르고 있습니다.
우리는 이제 플랫폼의 확장성, 성능, 유지보수성을 극대화하기 위해 **Phase 2 (마이크로서비스 아키텍처)**로의 전면적인 전환을 시작합니다. (REQ 0)
이 문서는 우리의 최종 목표인 Phase 2 아키텍처를 정의하는 "설계도" 역할을 합니다.
 * 신규 입사자: 먼저 부록 A: Phase 1 레거시 가이드 (현재 코드베이스)를 읽고 현재 코드베이스의 구조와 환경 설정을 파악하십시오.
 * 모든 개발자: 이 문서의 1~7 섹션을 기준으로 모든 신규 기능 개발 및 리팩토링을 진행합니다.
1. 🏛️ Phase 2: 목표 아키텍처 (Microservice) - (REQ 0)
Phase 2의 목표는 기존 backend 서비스를 기능별로 분리된 고성능 마이크로서비스로 전환하는 것입니다. 각 서비스는 독립적으로 배포 및 확장되며, API Gateway를 통해 통신합니다.
 * api-gateway (Nginx 또는 Kong)
   * 역할: 모든 외부 요청(HTTP, WebSocket)의 단일 진입점.
   * 기술: Nginx (현재) 또는 Kong/Tyk (향후 확장).
   * 기능: 요청 라우팅 (예: /api/users/* -> user-service), SSL 종료, 인증(JWT 검증), 속도 제한, 전역 로깅. (기존 Nginx 역할 확장)
 * frontend (React/Vite)
   * 역할: 사용자 인터페이스. (기존과 동일)
   * 기술: React, Vite, TypeScript, Zustand, Tailwind CSS.
   * (신규) MUI (Material-UI) 또는 유사 컴포넌트 라이브러리를 도입하여 Gemini 수준의 UI/UX 구현. (REQ 4)
 * user-service (Go / Gin 또는 FastAPI/Python)
   * 역할: 사용자 인증, 권한, API Key 관리.
   * 기술: (신규) Go (Gin) - 고성능 인증 처리에 유리. 또는 Python (FastAPI) - 기존 로직 재활용.
   * 기능: SSO 연동, JWT 발급/검증, 사용자 프로비저닝(DB 저장), 역할(RBAC) 관리, API Key CRUD. (기존 users 앱 로직 분리)
 * agent-service (FastAPI / Python)
   * 역할: 에이전트 등록, 관리, 검색.
   * 기술: (신규) FastAPI - Python 에이전트 생태계와 호환성 높음.
   * 기능:
     * RegisteredAgent 모델 CRUD (이름, 설명, 로고, 색상, 프레임워크 등). (REQ 5)
     * (REQ 2) A2A (Agent-to-Agent) 프로토콜 기반 등록/검증 API 제공 (ADK, Langchain Agents 연동).
     * (REQ 1) AI 기반 에이전트 추천/랭킹 로직 수행 API (운영 모드용).
 * chat-service (FastAPI / Python)
   * 역할: 채팅 세션 및 실시간 통신.
   * 기술: (신규) FastAPI (WebSocket 지원).
   * 기능:
     * ChatSession, ChatMessage 관리 (CRUD). (REQ 6, 7)
     * (REQ 7) 실시간 WebSocket 연결 관리 (/ws/trace/{trace_id}/). (기존 tracing 앱 Consumer 로직)
     * (REQ 3) 파일 업로드/다운로드 API 제공.
 * tracing-service (Go / Fiber 또는 Rust/Actix-web)
   * 역할: 고성능 로그 수집 및 저장 (LLM 프록시).
   * 기술: (신규) Go (Fiber) 또는 Rust (Actix-web) - 초고성능, 저지연 I/O 처리.
   * 기능:
     * /api/log-proxy/ 엔드포인트 운영.
     * 수신된 LLM 호출 검증 (API Key, Model), LogEntry DB 저장.
     * WebSocket(chat-service)으로 로그 실시간 전송 (gRPC 또는 Redis Pub/Sub 이용). (기존 tracing 앱 View 로직)
 * admin-service (Django / Python)
   * 역할: 플랫폼 관리자 UI 및 통계 API.
   * 기술: Django (기존 Admin UI 재활용), FastAPI (통계 API용, Django 내 마운트 가능).
   * 기능:
     * Django Admin: 관리자용 UI (사용자 역할 변경, LLM 등록/헬스체크 확인 등).
     * FastAPI: 통계 API (/api/admin/stats/...) 제공. (기존 platform_admin 앱 로직)
 * worker-service (Celery / Python)
   * 역할: 비동기 백그라운드 작업. (기존과 동일)
   * 기술: Celery, Redis.
   * 기능:
     * LLM/Agent 헬스 체크. (REQ 12)
     * (REQ 10, 11) 비활성 에이전트 자동 정리.
     * (REQ 12) 헬스 체크 실패 시 사내 API 연동을 통한 메일 알림.
 * database (PostgreSQL) / message-broker (Redis)
   * 역할: 공유 인프라. (기존과 동일)
2. 🎯 Phase 2: 핵심 요구사항 및 목표 (New Requirements)
 * (REQ 0) 아키텍처 재구축 (최우선): 모놀리식 백엔드를 기능별 마이크로서비스(MSA)로 분리하여 서비스 안정성, 확장성, 유지보수성을 확보한다.
 * (REQ 4) UI/UX 혁신 (Gemini): Google Gemini 수준의 세련되고 직관적인 UI/UX를 제공한다. (MUI 등 컴포넌트 라이브러리 도입)
 * (REQ 2) A2A 프로토콜 연동: ADK, Langchain Agents 사용자가 SDK를 통해 플랫폼에 에이전트를 프로그래매틱하게 등록할 수 있는 A2A 표준 API를 제공한다.
 * (REQ 1) 지능형 에이전트 랭킹: 운영 모드 진입 시, 사용자의 과거 사용 이력이나 현재 요구사항(미입력)을 기반으로 Agent Description을 분석하여 가장 적합한 에이전트를 추천/정렬한다.
 * (REQ 3) 리치 플레이그라운드: 채팅창에서 Markdown 렌더링, 코드 블록(복사 기능 포함), 이미지/영상/파일 첨부 및 다운로드를 지원한다.
 * (REQ 6, 7, 8) 강력한 디버깅 및 히스토리: 개발/운영 모드 모두 '새 대화' 기능을 지원하고, 사용자별/세션별 채팅 히스토리를 저장/복구한다.
 * (REQ 10, 11, 12) 자동화된 에이전트 라이프사이클: 1달 이상 미사용 에이전트(개발/운영)를 자동 삭제/비활성화하고, 헬스 체크 실패 시 개발자에게 사내 API로 메일을 발송한다.
 * (REQ 5) 에이전트 커스터마이징: 사용자가 에이전트 카드에 표시될 로고(URL), 카드 색상(Hex), 메타데이터(Title, Desc, Capabilities/Skills)를 직접 설정하고 수정할 수 있게 한다.
 * (REQ 1-신규) 모드별 테마: 운영 모드(파스텔 블루 계열)와 개발 모드(파스텔 레드 계열)의 시각적 구분을 명확히 한다.
 * (REQ 2, 4-신규) 브랜딩: A2G 플랫폼 로고 및 탭 제목을 일관되게 적용한다.
3. 🛠️ Phase 2: 목표 기술 스택 (Target Tech Stack)
| 구분 | 기술 스택 | 상세 설명 |
|---|---|---|
| Frontend | React 19+ (Vite), TypeScript | 현대적인 UI 개발 (기존 유지) |
|  | Zustand | 경량 전역 상태 관리 (기존 유지) |
|  | Tailwind CSS + MUI (Base UI) | (REQ 4) Gemini 디자인 시스템 구현 |
|  | React Router DOM, Recharts | 라우팅 및 통계 시각화 (기존 유지) |
|  | React Markdown, Socket.IO Client | (REQ 3, 7) 리치 채팅 및 실시간 로그 |
| API Gateway | Nginx 또는 Kong | MSA 진입점, 라우팅, SSL 종료, 인증 (REQ 0) |
| Backend | Go (Gin / Fiber) | (REQ 0) user-service, tracing-service (고성능) |
|  | FastAPI (Python) | (REQ 0) agent-service, chat-service (Python 생태계 호환) |
|  | Django (Python) | (REQ 0) admin-service (Admin UI 및 통계 API) |
|  | Celery & Redis | (REQ 0) worker-service (비동기 작업) |
| Database | PostgreSQL, Redis | 데이터 영속성 및 메시지 브로커 (기존 유지) |
| Comms | gRPC (선호) / REST API | (REQ 0) 서비스 간 내부 통신 |
| Dev Tools | Git, Husky, lint-staged, Makefile | 버전 관리 및 개발 자동화 (기존 유지) |
4. 📂 Phase 2: 목표 프로젝트 구조 (Monorepo)
서비스 간의 연동 및 버전 관리를 용이하게 하기 위해 Monorepo 구조를 지향합니다.
agent-platform/
├── services/                 # (신규) 백엔드 마이크로서비스
│   ├── user-service/ (Go)
│   ├── agent-service/ (FastAPI)
│   ├── chat-service/ (FastAPI)
│   ├── tracing-service/ (Go)
│   ├── admin-service/ (Django)
│   └── worker-service/ (Celery)
├── frontend/                 # 프론트엔드 (React)
│   ├── public/
│   ├── src/
│   │   ├── components/       # (REQ 0) 역할별 분리 (예: chat, trace, admin)
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/         # (신규) 프레임워크별 로직 (agno.service.tsx 등)
│   │   ├── store/
│   │   ├── types/
│   │   └── ...
│   └── ...
├── infra/                    # 인프라 설정 (Docker Compose, Nginx Gateway)
│   ├── docker-compose/       # (신규) 서비스별 Docker Compose 파일
│   ├── nginx/
│   └── certs/
├── sdks/                     # (신규) A2A 프로토콜 SDK (REQ 2)
│   ├── python-sdk/
│   └── js-sdk/
├── docs/                     # 공통 문서 (본 README 등)
└── legacy/                   # (신규) Phase 1 모놀리식 코드 보관
    ├── backend/
    ├── frontend/
    └── docker-compose.yml

5. 🚀 Phase 2: 핵심 기능 명세 (상세)
5.1. UI/UX (REQ 1, 3, 4)
 * Gemini 디자인 (REQ 4): MUI 또는 그에 준하는 컴포넌트 라이브러리를 도입하여 전체 UI를 재설계한다. 반응형 디자인, 일관된 스페이싱, 아이코노그래피, 폰트 시스템을 적용한다.
 * 모드별 테마 (REQ 1): useWorkspaceStore의 activeMode 상태에 따라 CSS 변수 또는 Tailwind 테마를 동적으로 변경하여, 운영(블루)/개발(레드) 모드 간 시각적 구분을 명확히 한다.
 * 리치 플레이그라운드 (REQ 3): ChatMessageList 컴포넌트에서 react-markdown을 사용하여 Markdown(테이블, 목록, 인용 등)을 렌더링한다. react-syntax-highlighter를 사용하여 코드 블록을 하이라이팅하고 복사 버튼을 추가한다. ChatInput에 파일/이미지 업로드 버튼을 추가하고, ChatMessage에 파일/이미지 URL을 표시 및 다운로드/미리보기를 지원한다.
5.2. 에이전트 등록 (REQ 2, 5, 9)
 * A2A 프로토콜 (REQ 2): agent-service가 /api/a2a/register 엔드포인트를 제공한다. Python/JS SDK는 이 엔드포인트로 에이전트 정보(이름, 설명, 엔드포인트, 프레임워크, 메타데이터 등)를 전송하여 자동으로 에이전트를 등록/업데이트한다.
 * 수동 등록/수정 (REQ 5, 9): App.tsx의 '+' 버튼 또는 AgentCard의 '수정' 버튼이 AddAgentModal을 연다. 이 모달은 framework (Agno, Langchain 등) 드롭다운을 제공하며, 로고 URL, 카드 색상, 스킬 태그(capabilities) 등을 입력받아 agent-service (POST 또는 PATCH /api/my-agents/{id})로 전송한다.
5.3. Workbench (REQ 3, 10-신규)
 * 에이전트 통신 (Agno/Custom): AgentPlayground의 handleSendMessageAndGetResponse 함수는 framework.registry를 통해 agent.framework에 맞는 서비스(예: agno.service.tsx)를 동적으로 선택한다. Agno의 경우, Base URL 입력, /agents, /teams 스캔, 대상 선택 UI를 제공한다.
 * 실시간 Tracing (REQ 7):
   * chat-service는 wss://.../ws/trace/{trace_id}/ 경로로 WebSocket 연결을 관리한다.
   * tracing-service는 /api/log-proxy/로 수신된 로그를 처리한 후, gRPC/Redis PubSub 등을 통해 chat-service로 전달한다.
   * chat-service는 해당 trace_id를 구독 중인 클라이언트에게 로그를 브로드캐스트한다.
   * LiveTrace 컴포넌트는 WebSocket을 통해 로그를 실시간 수신 및 렌더링한다.
 * (신규) Multi-Agent Log Tracing (REQ 10):
   * tracing-service는 LogProxyView에서 수신된 요청/응답을 분석하여 agent_id (호출 주체 식별자)를 추론한다. (예: transfer_ Tool Call 감지)
   * WebSocket 페이로드에 agent_id를 포함하여 LiveTrace로 전송한다.
   * TraceLogItem 컴포넌트는 log.agent_id에 따라 배경색과 태그를 다르게 렌더링한다.
5.4. Chat History (REQ 6, 7, 8)
 * API: chat-service가 POST /api/agents/{id}/sessions (새 대화) 및 POST /api/sessions/{id}/messages (메시지 저장, role='user'/role='assistant' 모두 지원) API를 제공한다.
 * 로직:
   * 개발 (REQ 6): AgentPlayground (워크스페이스) 진입 시, 해당 user와 agent의 가장 최근 세션을 자동 로드.
   * 운영 (REQ 7): AgentPlayground (운영) 진입 시, user와 agent별 세션 목록 또는 최근 세션 로드.
   * 공통 (REQ 8): '새 대화' 버튼 클릭 시 새 ChatSession 생성 및 UI 초기화. 히스토리 목록/삭제 기능 제공.
5.5. 운영 및 자동화 (REQ 1, 10, 11, 12)
 * AI 랭킹 (REQ 1): admin-service가 GET /api/agents/ranked API를 제공한다. AgentCardProduction은 이 API를 호출하여 에이전트 Description 기반으로 최적화된 순서로 카드를 정렬한다.
 * 자동 정리 (REQ 10, 11): worker-service(Celery Beat)가 주기적으로 1달 이상 미사용 운영 에이전트(Disabled) 및 미수정 개발 에이전트(Delete)를 자동 정리한다.
 * 헬스 체크 및 알림 (REQ 12):
   * worker-service는 Agent 헬스 체크 실패 시, 해당 에이전트 status를 DISABLED로 변경한다.
   * INTERNAL_MAIL_API_ENDPOINT (환경변수)를 사용하여 agent.owner에게 사내 메일 API로 알림을 발송한다.
5.6. 기존 기능 (마이그레이션 대상)
 * SSO & RBAC: user-service로 마이그레이션.
 * API Key: user-service로 마이그레이션.
 * LLM 관리: admin-service로 마이그레이션.
 * 통계: admin-service로 마이그레이션.
6. 📞 개발자 정보 및 Contact Point (REQ 3)
 * 책임 개발자: 한승하 (syngha.han@samsung.com)
 * 문의 채널 (임시): (A2G 플랫폼 개발팀 사내 메신저 채널)
 * 버그 리포트 / 기능 제안: (프로젝트 Jira 또는 Git Issues 링크)
부록 A: Phase 1 레거시 가이드 (현재 코드베이스)
(신규 개발자가 현재 모놀리식 코드를 실행하고 이해하기 위한 기존 README 내용)
A.1. Phase 1 아키텍처 (Monolithic - 분리된 로직)
현재 개발 환경은 docker-compose.yml을 통해 아래 6가지 핵심 서비스로 구성되어 있습니다.
 * frontend (React/Vite): 사용자 인터페이스. (접속: http://localhost:9060)
 * backend (Django/Uvicorn): 핵심 비즈니스 로직 및 API 서버. (ASGI 서버로 실행)
 * nginx (Reverse Proxy): 로컬 HTTPS 지원 및 WebSocket 프록시. (접속: https://localhost:9050)
 * redis (Broker/Cache): Celery 메시지 브로커 및 Django 캐시.
 * celery_worker (Celery): 백그라운드 작업 실행 (헬스 체크 등).
 * celery_beat (Celery): 주기적 작업 스케줄러.
 * (External) DB (PostgreSQL): 데이터 저장.
A.2. Phase 1 기술 스택 (현재)
| 구분 | 기술 스택 | 상세 설명 |
|---|---|---|
| Backend | Django & DRF | Python 기반, ORM 및 REST API 제공. |
|  | Python 3.13 | 최신 파이썬 환경. |
|  | uv | 초고속 Python 패키지 매니저. |
|  | Uvicorn | ASGI 서버 (WebSocket 지원). |
|  | Django Channels | WebSocket 연결 관리 (asgi.py, tracing/consumers.py). |
|  | Celery & Redis | LLM Health Check 등 주기적인 백그라운드 작업. |
|  | django-celery-beat | DB 기반의 주기적 작업 스케줄러. |
|  | django-celery-results | Celery 작업 결과를 DB에 저장. |
| Frontend | React 19.2+ | 컴포넌트 기반 UI. |
|  | TypeScript | 코드 안정성. |
|  | Vite | 빠르고 효율적인 프론트엔드 빌드/개발 서버. |
|  | Tailwind CSS 4.1+ | 유틸리티 퍼스트 CSS. |
|  | React Compiler | 자동 최적화. |
|  | Zustand | 경량 전역 상태 관리. |
|  | i18next | 다국어 지원 (한국어/영어). |
|  | React Router DOM | SPA 라우팅 및 중첩 레이아웃(탭 구조). |
|  | Recharts | (구현 중) 통계 데이터 시각화. |
| Infra | Docker & Compose | 개발/운영 환경 표준화. |
|  | Nginx | 리버스 프록시 (HTTPS, WebSocket 프록시). |
|  | Redis (Container) | Celery 브로커 및 Django 캐시 (로컬 Docker). |
| Dev Tools | Git (Enterprise) | 표준 소스 코드 관리. |
|  | ESLint & Prettier | (Frontend) 코드 품질 검사. |
|  | Black & Flake8 | (Backend) 코드 품질 검사. |
|  | Husky & lint-staged | Git Pre-commit Hook (.lintstagedrc.js). |
|  | Makefile | Docker 명령어 자동화. |
| APIs/Auth | drf-spectacular | OpenAPI 3.0 (Swagger/ReDoc). |
|  | SimpleJWT, PyJWT | SSO id_token 검증 및 내부 JWT 발급. |
|  | Custom Permission | users/permissions.py (IsAdminRoleUser). |
|  | Custom Middleware | users/middleware.py (TokenAuthMiddleware). |
A.3. Phase 1 환경 구축 가이드 (현재)
모든 개발 환경은 docker-compose를 기반으로 하며, Makefile을 통해 쉽게 관리할 수 있습니다.
A.3.1. 사전 준비
 * Git 설치 및 Enterprise Git 접근 권한 확인.
 * Docker 및 Docker Compose 설치.
 * make 유틸리티 설치.
A.3.2. 저장소 복제
git clone <repository-url> agent-platform
cd agent-platform

A.3.3. 보안 인증서 설정 (필수)
 * 사내 CA 및 SSO 인증서 (위치: backend/certs/):
   * certificate.crt (사내망 패키지 설치용)
   * *.cer (SSO 토큰 검증용)
 * 로컬 HTTPS 인증서 (위치: certs/):
   * localhost.crt, localhost.key (로컬 HTTPS용)
A.3.4. 환경 변수 설정
backend/.env 파일을 생성하고 아래 내용을 입력합니다. (실제 값은 팀 내 공유된 정보 사용)
# backend/.env

DJANGO_SECRET_KEY='<your-generated-secret-key>'
DEBUG=True

# --- PostgreSQL (External) ---
DB_HOST=a2g-db.com
DB_NAME=agent_development_platform
DB_USER=adp
DB_PASSWORD=a2g-passwd

# --- Redis (Local Docker) ---
REDIS_HOST=redis
REDIS_PASSWORD=a2g-passwd

# --- SSO ---
SP_REDIRECT_URL=https://localhost:9050/api/auth/callback/
# (IDP_ENTITY_ID, IDP_CLIENT_ID, IDP_SIGNOUT_URL 등 필요)

# --- Frontend ---
FRONTEND_BASE_URL="http://localhost:9060"

# --- Admin ---
INITIAL_ADMIN_IDS="syngha.han,biend.i"

A.3.5. 프로젝트 초기 설정 및 실행
# 1. 초기 설정 (Docker 빌드, 개발 도구 설치 등)
make setup

# 2. 개발 서버 실행 (Live Reload/HMR, Celery 포함)
make up

A.3.6. 데이터베이스 마이그레이션
docker-compose exec backend python manage.py migrate

A.3.7. 접속 정보
 * Frontend: http://localhost:9060 (Vite HMR)
 * Backend (HTTPS): https://localhost:9050 (Nginx Proxy)
 * API Docs: https://localhost:9050/api/docs/
 * Django Admin: https://localhost:9050/admin/
A.3.8. 기타 유용한 명령어
make down         # 모든 컨테이너 중지
make logs         # 실시간 로그 보기
make backend-shell # 백엔드 컨테이너 접속 (sh)
make frontend-shell# 프론트엔드 컨테이너 접속 (sh)

A.4. Phase 1 프로젝트 구조 (현재)
현재 코드베이스는 리팩토링이 된 상태입니다. core 앱은 models.py와 migrations/만 관리하며, 로직은 기능별 앱(users, agents, chat, tracing, platform_admin)으로 분리되어 있습니다.
agent-platform/
├── backend/                  # Django 프로젝트
│   ├── config/               # 메인 설정 (settings, urls, celery, asgi)
│   ├── core/                 # [수정] 모델/마이그레이션 전용
│   ├── users/                # (신규) 사용자/인증/APIKey 로직
│   ├── agents/               # (신규) 에이전트 관리 로직
│   ├── chat/                 # (신규) 채팅/세션 로직
│   ├── tracing/              # (신규) 로그/프록시/WebSocket 로직
│   ├── platform_admin/       # (신규) 관리자/통계/헬스체크 로직
│   ├── Dockerfile            # Backend/Celery 공용 (Uvicorn 사용)
│   ├── manage.py
│   └── pyproject.toml
├── frontend/                 # React/Vite/TypeScript 프로젝트
│   ├── public/
│   ├── src/
│   │   ├── components/       # 재사용 UI (Layout, Admin, AgentCard, Chat)
│   │   ├── hooks/            # (useActiveApiKey, useTraceLogSocket)
│   │   ├── pages/            # 라우팅 페이지 (AgentPlayground, Settings)
│   │   ├── services/         # (신규) 프레임워크별 로직 (agno.service.tsx 등)
│   │   ├── store/            # Zustand 스토어
│   │   ├── types/            # (agent.ts, chat.ts)
│   │   └── ...
│   └── ...
├── certs/                    # 로컬 개발용 SSL 인증서
├── nginx/                    # 개발용 Nginx 리버스 프록시 설정 (WebSocket 지원)
├── docker-compose.yml        # 6개 서비스 (nginx, backend, frontend, redis, worker, beat)
├── Makefile                  # 자동화 스크립트
├── .lintstagedrc.js          # Lint-Staged 설정
└── package.json              # Root Dev Tools 관리

A.5. Phase 1 협업 워크플로우 (현재)
 * Git 브랜칭: main (보호), feature/{기능명} 사용. MR 승인 필수.
 * 코드 품질: Git Pre-commit Hook (.lintstagedrc.js)을 통해 Frontend(ESLint, Prettier) 및 Backend(Black, Flake8) 자동 검사/수정.
 * UI/UX 표준: Light/Dark 모드 지원, i18next 다국어 지원.
 * 프레임워크 연동: services/agent-frameworks/ (전략 패턴) 구조로 Agno/Custom 로직 분리.
A.6. Phase 1 핵심 기능 명세 (현재 구현 상태)
 * SSO & RBAC: OIDC SSO 연동, PENDING/USER/ADMIN 역할 기반 인증/인가 . TokenAuthMiddleware로 WebSocket 인증 . PendingApprovalPage 및 UserManagement 탭 .
 * API Key: 개인 API Key CRUD 및 ActiveAPIKeyView .
 * LLM 관리: 관리자용 LLM CRUD, 유효성 검증, Celery/Redis 기반 주기적 헬스 체크 및 상태 표시.
 * Workbench (Agno/Custom):
   * Agent 모델 framework 필드 추가, 마이그레이션 .
   * AddAgentModal에 framework 선택(Agno/Custom) UI 및 API 연동 .
   * AgentCard 컴포넌트 분리 및 상세 디자인(로고, 색상, 메타데이터, 수정/삭제 버튼) 구현.
   * ChatSession (대화별 trace_id 포함) 및 ChatMessage 모델/API (CRUD).
   * PlaygroundSidebar (새 대화, 목록, 삭제) 기능 및 API 연동 .
   * LogProxyView (Trace Endpoint)가 API Key/Model/TraceID 검증 및 Agno/Custom LLM 호출 프록시, 로그 DB 저장, WebSocket 실시간 발송.
   * TraceCapturePanel이 framework에 따라 동적 UI (Agno Base URL/대상 선택, Custom Endpoint) 렌더링, 가이드 텍스트/LLM 목록 표시, 접기 기능.
   * ChatPlayground가 세션/메시지 로드, framework별(Agno) 스트리밍 응답 호출 (sendMessage) 및 실시간 UI 업데이트.
   * LiveTrace가 WebSocket 실시간 로그 및 과거 로그(GET /api/logs/) 표시, 로그 지우기/재연동 기능 (버그 수정 포함).
 * 통계 (구현 중): UsageStatsView (팀별 그룹화 포함) API . 프론트엔드 통계 탭(AdminStatsUsagePage - 차트/테이블) 구현.
<!-- end list -->

