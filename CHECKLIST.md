Phase 0: 🏛️ 프로젝트 기반 및 외부 개발 환경 설정 (Foundation) - **최우선**
 * [ ] 0.0. **Mock Services 구축 (사외망 개발 필수)**
   * [ ] **Mock SSO 구현** (infra/mock-sso/): FastAPI, 로그인 페이지, JWT 발급 (Dev #3 담당)
   * [ ] docker-compose.external.yml 작성: Mock SSO, PostgreSQL, Redis 통합 (Dev #8 담당)
   * [ ] 환경 변수 템플릿 생성: .env.external.example (모든 서비스)
   * [ ] Mock Services 테스트: Mock SSO 로그인 → JWT 발급 → Frontend 리디렉션
   * [ ] **팀 온보딩 세션**: Mock Services 사용법 공유 (Dev #3, #8 진행)
   * [ ] 상세 가이드: [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md), [MOCK_SERVICES.md](./MOCK_SERVICES.md)
 * [ ] 0.1. (REQ 0) Monorepo 구조 설정
   * [ ] Git 저장소 생성 (A2G Agent Platform).
   * [ ] Lerna, Nx 또는 Turborepo 등 Monorepo 관리 도구 도입.
   * [ ] services/, frontend/, infra/, sdks/, docs/ 폴더 구조 생성 (README 4.1 참조).
 * [ ] 0.2. Git 전략 및 품질 설정
   * [ ] main (운영), develop (개발 통합), feature/{TASK-ID} (기능) 브랜칭 전략 확정.
   * [ ] main, develop 브랜치 보호 규칙 (PR 필수, 1인 승인) 설정.
   * [ ] 커밋 컨벤션 (type(scope): message) 정의.
   * [ ] husky 및 .lintstagedrc.js 설정 (Root Pre-commit Hook).
   * [ ] ESLint, Prettier (Frontend) 및 Black, Flake8 (Backend) 설정.
 * [ ] 0.3. (REQ 0) 인프라 및 CI/CD (개발 환경)
   * [ ] infra/docker-compose/docker-compose.external.yml 작성 (Mock SSO, Postgres, Redis).
   * [ ] infra/docker-compose/docker-compose.internal.yml 작성 (사내망용, Real SSO/DB/Redis).
   * [ ] infra/certs/에 로컬 HTTPS용 자체 서명 인증서 배치.
   * [ ] Makefile 스크립트 작성 (up, down, logs, build, shell 등).
   * [ ] GitHub Actions CI/CD 파이프라인 초안 작성 (테스트, 린트, 빌드 자동화).
 * [ ] 0.4. API 계약 정의 및 공유
   * [ ] **API_CONTRACTS.md 검토 및 팀 공유** (모든 개발자)
   * [ ] OpenAPI 스펙 생성 (각 서비스): FastAPI 자동 생성, Django drf-spectacular
   * [ ] Postman Collection 작성 (선택 사항): 각 서비스별 API 테스트 컬렉션
Phase 1: 🔐 Core Services - 인증, 관리, 작업자 (Backend MSA)
 * [ ] 1.1. user-service (인증/권한)
   * [ ] (REQ 0) Go(Gin) 또는 FastAPI 기반 서비스 뼈대 구축.
   * [ ] DB 스키마 정의 (User 모델 - role 필드 포함, APIKey 모델). (기존 core, users 모델 마이그레이션)
   * [ ] SSO 연동 (/api/auth/login, /callback, /logout) 로직 구현.
   * [ ] INITIAL_ADMIN_IDS 환경 변수를 읽어 최초 관리자 자동 승급 로직 구현.
   * [ ] JWT 발급 (/api/auth/token) 및 검증 미들웨어 구현 (Gateway 또는 서비스 자체).
   * [ ] API Key CRUD (/api/keys/) API 구현.
   * [ ] 활성 API Key 조회 (/api/keys/active/) API 구현.
 * [ ] 1.2. admin-service (관리자)
   * [ ] (REQ 0) Django 프로젝트 뼈대 구축 (관리자 UI용).
   * [ ] INSTALLED_APPS에 core, users, agents 등 모델 앱 연동.
   * [ ] Django Admin 사이트에 User, LLMModel, RegisteredAgent 모델 등록.
   * [ ] (REQ-ADM-06~11) User 관리 기능 구현 (목록, 필터, 역할 변경(PENDING->USER), 삭제 UI).
   * [ ] (REQ-ADM-01~03) LLMModel CRUD UI 구현.
 * [ ] 1.3. worker-service (비동기)
   * [ ] (REQ 0) Celery 뼈대 구축 (celery.py, tasks.py).
   * [ ] settings.py에 Celery Beat 스케줄 등록 (CELERY_BEAT_SCHEDULE).
   * [ ] (REQ-ADM-05) check_all_llm_health Task 구현 (DB 상태 업데이트).
 * [ ] 1.4. api-gateway (Nginx)
   * [ ] (REQ 0) Nginx 설정 (nginx.conf 또는 dev.conf) 작성.
   * [ ] /api/users/, /api/agents/ 등 서비스별 라우팅 규칙 정의.
   * [ ] HTTPS (SSL) 설정 및 certs/ 볼륨 마운트.
Phase 2: 🎨 Frontend 구현 (UI/UX Foundation)
 * [ ] 2.1. (REQ 4) Gemini UI/UX 및 브랜딩
   * [ ] React/Vite/TS 프로젝트 뼈대 구축.
   * [ ] (REQ 4) MUI (Material-UI) 또는 Chakra UI 등 Gemini 디자인 시스템에 적합한 라이브러리 설치 및 theme 설정.
   * [ ] (REQ 4) 전역 폰트('Pretendard') 및 index.css 설정.
   * [ ] (REQ 2, 4) index.html에 favicon 및 title (A2G Platform) 적용.
   * [ ] (REQ 2, 4) Layout.tsx 및 WorkspaceHeader.tsx에 플랫폼 로고 적용.
 * [ ] 2.2. (REQ 1) 모드별 테마
   * [ ] Zustand (useWorkspaceStore) activeMode 상태 생성.
   * [ ] App.tsx 또는 최상위 컴포넌트에서 activeMode에 따라 동적으로 data-theme="dev" 또는 data-theme="prod" 속성 바인딩.
   * [ ] tailwind.config.js 또는 CSS 변수를 사용하여 모드별 파스텔 블루/레드 색상 테마 정의.
 * [ ] 2.3. 레이아웃 및 라우팅
   * [ ] main.tsx에 React Router DOM (createBrowserRouter) 설정.
   * [ ] Layout.tsx (헤더 + Outlet), WorkspaceHeader.tsx (로고, 모드 토글, 프로필) 컴포넌트 구현.
   * [ ] SettingsLayout.tsx (좌측 탭 + Outlet) 컴포넌트 구현.
 * [ ] 2.4. 인증 흐름 (UI)
   * [ ] useAuthStore (Zustand) 생성 (isAuthenticated, userProfile, role 등).
   * [ ] Layout.tsx에서 SSO 콜백 토큰 처리, localStorage 저장, useAuthStore 상태 업데이트.
   * [ ] WorkspaceHeader가 useAuthStore를 구독하여 '로그인' 버튼 / '프로필' 드롭다운 조건부 렌더링.
   * [ ] (REQ-UI-05) Layout.tsx에서 role='PENDING'일 경우 PendingApprovalPage 렌더링.
   * [ ] useActiveApiKey 훅 및 useApiKeyStore 생성/연동 (Layout.tsx에서 로그인 시 키 pre-fetch).
 * [ ] 2.5. 설정 페이지 UI (Shells)
   * [ ] /settings/general: SettingsPage.tsx (테마/언어) UI 구현.
   * [ ] /settings/users: AdminUserManagementPage.tsx (관리자 전용) 뼈대 구현.
   * [ ] /settings/models: AdminLLMManagementPage.tsx (관리자 전용) 뼈대 구현.
   * [ ] /settings/stats-usage: AdminStatsUsagePage.tsx (관리자 전용) 뼈대 구현.
   * [ ] SettingsLayout.tsx에서 role='ADMIN'일 때만 관리자 탭 렌더링.
Phase 3: ⚙️ Core Feature - Agent Workbench & Mgmt (REQ 5, 7, 9)
 * [ ] 3.1. agent-service 및 admin-service 연동 (LLM/User)
   * [ ] admin-service (Django Admin)에서 User 역할 (PENDING -> USER) 변경 기능 구현.
   * [ ] admin-service (Django Admin)에서 LLMModel CRUD 기능 및 platform_admin/views.py LLMModelViewSet (API) 구현.
   * [ ] frontend (AdminUserManagementPage, AdminLLMManagementPage)와 API 연동 완료.
 * [ ] 3.2. (REQ 5, 9) Agent CRUD 및 카드 디자인
   * [ ] core/models.py: RegisteredAgent 모델에 framework, skill_kr/en, logo_url, card_color 필드 추가 및 마이그레이션.
   * [ ] agent-service: MyAgentViewSet (CRUD) API 구현 (소유자 필터, perform_create 오버라이드).
   * [ ] frontend (AddAgentModal): framework 드롭다운(Agno, Custom), 메타데이터 입력 UI 및 POST/PATCH API 연동.
   * [ ] frontend (AgentCard.tsx): (REQ 5) 상세 디자인 구현 (로고, 색상, 스킬, 소유자/팀, 수정/삭제 버튼).
   * [ ] frontend (App.tsx): GET /api/my-agents 호출 및 AgentCard 렌더링, 모달 연동.
 * [ ] 3.3. (REQ 6, 7, 8) Chat History & Session
   * [ ] core/models.py: ChatSession (대화별 trace_id 포함), ChatMessage 모델 추가 및 마이그레이션.
   * [ ] chat-service: Chat History API 구현 (ChatSessionViewSet, ChatMessageViewSet - 세션 생성/목록/조회/삭제, 메시지 생성/목록).
   * [ ] frontend (PlaygroundSidebar): '새 대화', '세션 목록', '세션 삭제' UI 및 API 연동.
 * [ ] 3.4. (REQ 3, 7.7) Framework Strategy Pattern (Frontend)
   * [ ] frontend (services/agent-frameworks): framework.interface.ts (IAgentFrameworkService) 정의.
   * [ ] frontend (store/useFrameworkStateStore): Agno/Custom UI 상태 저장소 생성.
   * [ ] frontend (services/agent-frameworks): custom.service.tsx 및 agno.service.tsx (UI 패널 SettingsPanel 및 sendMessage 로직) 구현.
   * [ ] frontend (services/agent-frameworks): agnoApiService.ts (fetchAgnoAgents/fetchAgnoTeams) 구현.
   * [ ] frontend (services/agent-frameworks): framework.registry.ts (중개소) 구현.
 * [ ] 3.5. (REQ 3, 7.7) AgentPlayground UI/Logic 통합
   * [ ] frontend (AgentPlayground.tsx): agent 로드 시 framework에 따라 useFrameworkStateStore 초기화/로드.
   * [ ] frontend (TraceCapturePanel.tsx): agent.framework에 따라 FrameworkSettingsPanel 동적 렌더링.
   * [ ] frontend (TraceCapturePanel.tsx): (REQ 2-신규) GET /api/llm-models/available/ API (admin-service) 호출 및 LLM 목록 표시.
   * [ ] frontend (ChatPlayground.tsx): handleSendMessage가 AgentPlayground (부모)의 handleSendMessageAndGetResponse 호출.
   * [ ] frontend (AgentPlayground.tsx): handleSendMessageAndGetResponse가 framework.registry를 통해 적절한 sendMessage (Agno/Custom) 호출, streamCallback 전달.
Phase 4: 📡 Core Feature - Tracing & Agent Comms (REQ 7, 10)
 * [ ] 4.1. tracing-service (Log Proxy) 구현
   * [ ] (REQ 0) tracing-service (Go/Rust) 뼈대 구축.
   * [ ] POST /api/log-proxy/{trace_id}/{...path} 엔드포인트 구현.
   * [ ] (REQ 7.4) trace_id (ChatSession 검증), Authorization (API Key 검증), model (LLMModel 검증) 로직 구현.
   * [ ] LLM 동적 프록시 로직 구현 (스트리밍 지원).
   * [ ] LogEntry DB 저장 로직 (상세 필드 포함).
 * [ ] 4.2. (REQ 7, 10) WebSocket 실시간 Tracing
   * [ ] chat-service: GET /ws/trace/{trace_id}/ WebSocket 엔드포인트 및 TraceLogConsumer 구현.
   * [ ] chat-service: TokenAuthMiddleware (JWT 쿼리 파라미터)를 통한 WebSocket 인증.
   * [ ] tracing-service -> chat-service: gRPC 또는 Redis Pub/Sub 연동 (로그 메시지 실시간 전송).
   * [ ] chat-service (TraceLogConsumer): 수신된 로그를 trace_id 그룹으로 브로드캐스트.
   * [ ] frontend (useTraceLogSocket): WebSocket 연결 (JWT 토큰 포함), 메시지 수신, 재연결 로직 구현.
   * [ ] frontend (LiveTrace / TraceLogItem): (REQ 8) 로그 타입(LLM/Tool)별 아이콘/색상, (REQ 10) agent_id별 배경색/태그 렌더링.
 * [ ] 4.3. (REQ 7.6) Trace History 연동
   * [ ] tracing-service: GET /api/logs/?trace_id={uuid} API 구현 (소유자 검증 포함).
   * [ ] frontend (AgentPlayground): loadSessionDetails가 위 API 호출하여 historicalLogs 상태 업데이트.
   * [ ] frontend (LiveTrace): initialLogs prop을 받아 과거 로그 렌더링.
Phase 5: 🌟 High-Level Features (REQ 1, 2, 3, 10, 11, 12)
 * [ ] 5.1. (REQ 3) 리치 플레이그라운드 (Markdown/Files)
   * [ ] frontend (ChatMessageList): react-markdown 및 react-syntax-highlighter 적용.
   * [ ] frontend (ChatInput): 파일/이미지 업로드 UI.
   * [ ] chat-service: 파일 업로드 API (S3 또는 로컬 스토리지) 및 다운로드 API 구현.
   * [ ] frontend (ChatMessageList): 파일/이미지 메시지 렌더링 (다운로드/미리보기).
 * [ ] 5.2. (REQ 2) A2A 프로토콜 및 SDK
   * [ ] agent-service: POST /api/a2a/register API 스펙 확정 및 구현.
   * [ ] sdks: Python/JS SDK 초안 개발 (에이전트 등록 함수).
   * [ ] docs/: A2A 연동 가이드 및 SDK 사용법 문서 작성.
 * [ ] 5.3. (REQ 1) 지능형 에이전트 랭킹
   * [ ] agent-service: RegisteredAgent description/skill 기반 임베딩/인덱싱 파이프라인 구축 (RAG).
   * [ ] agent-service: GET /api/agents/ranked API 구현 (유사도 검색).
   * [ ] frontend (AgentCardProduction): ranked API 호출 및 결과 정렬.
 * [ ] 5.4. (REQ 10, 11, 12) Agent Lifecycle 및 알림
   * [ ] worker-service: disable_unused_prod_agents Celery Task 구현 (1달 미사용 LogEntry 체크).
   * [ ] worker-service: cleanup_inactive_dev_agents Celery Task 구현 (1달 미수정 updated_at 체크).
   * [ ] worker-service: check_all_agent_health Celery Task 구현 (운영 에이전트 prod_endpoint 호출).
   * [ ] worker-service: (REQ 12) 헬스 체크 실패 시 status=DISABLED 변경 및 사내 메일 API 연동 알림 발송.
   * [ ] frontend (AgentCard.tsx): status='DISABLED' 시각화 (grayscale 등).
