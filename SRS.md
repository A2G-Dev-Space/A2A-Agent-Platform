📝 AGENT PLATFORM 요구사항 명세서 (SRS) (v1.6)
문서 버전: 1.6 최종 수정일: 2025년 10월 27일
1. 개요 (Introduction)
본 문서는 Agent Platform (코드명: A2G) 프로젝트의 소프트웨어 요구사항 명세서(SRS)입니다. 플랫폼의 목적, 범위, 기능, 인터페이스, 성능, 제약 조건 등을 기술하여 개발팀과 이해 관계자 간의 명확한 이해를 돕는 것을 목표로 합니다.
2. 전체 설명 (Overall Description)
2.1. 제품 관점
본 플랫폼은 Docker 기반의 웹 서비스입니다. 현재(Phase 1)는 Django(Backend)와 React(Frontend)로 구성된 모놀리식 아키텍처로 운영되며, 비동기 작업 처리를 위해 Celery와 Redis를 사용합니다.
**향후 목표(Phase 2)**는 백엔드를 **마이크로서비스 아키텍처(MSA)**로 전환하여(REQ 0), user-service(Go/FastAPI), agent-service(FastAPI), chat-service(FastAPI/WebSocket), tracing-service(Go/Rust), admin-service(Django), worker-service(Celery) 등으로 기능을 분리하고 확장성을 확보하는 것입니다.
UI는 헤더와 메인 컨텐츠 영역으로 구성된 2단 구조의 SPA(Single Page Application)이며, 인증은 사내 SSO 및 **내부 역할 기반 접근 제어(RBAC: PENDING, USER, ADMIN)**를 사용합니다. 플랫폼은 운영 모드와 개발(워크스페이스) 모드를 제공합니다.

2.1.1. 외부 개발 환경 (신규 - Phase 2)
본 프로젝트는 **8명의 개발자가 사외망에서 병렬 개발**하고, **사내망에서 통합 테스트**하는 하이브리드 개발 전략을 채택합니다.
 * Mock Services: 사외망에서 사내 DB/Redis/SSO를 대체하는 경량 Mock 서비스 제공 (Mock SSO, Local PostgreSQL, Local Redis)
 * API-First Development: 명확한 API 계약(OpenAPI Spec)을 기반으로 각 서비스가 독립적으로 개발됨
 * 환경 변수 기반 전환: `.env.external` (사외망) ↔ `.env.internal` (사내망) 파일만 교체하면 코드 수정 없이 환경 전환 가능
 * 상세 내용: [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md), [MOCK_SERVICES.md](./MOCK_SERVICES.md), [API_CONTRACTS.md](./API_CONTRACTS.md), [TEAM_ASSIGNMENT.md](./TEAM_ASSIGNMENT.md) 참조
2.2. 사용자 인터페이스 (User Interface)
플랫폼의 UI는 Google Gemini 디자인을 레퍼런스로 하여 세련되게 개선되는 것을 목표로 합니다(REQ 4). UI는 크게 3개의 핵심 영역으로 구성됩니다.
 * Workspace Header (상단 고정):
   * 좌측 (REQ 2, 4): 플랫폼 로고 및 이름 (A2G Platform) 표시. 로고 클릭 시 메인 대시보드(/)로 이동합니다.
   * 중앙: 운영 ↔ 워크스페이스 모드 전환 토글. 선택된 모드에 따라 플랫폼 UI의 강조 색상이 변경됩니다. (REQ 1-신규: 운영-파스텔 블루, 개발-파스텔 레드 계열)
   * 우측: 사용자 프로필 드롭다운. 로그인 시 사용자 ID 표시, 클릭 시 상세 정보(이름 (역할), 이메일, 부서) 및 'Key 생성' / '설정' 메뉴 제공. 로그아웃 상태에서는 '로그인' 버튼 표시.
 * Main Content Area (중앙):
   * URL 경로에 따라 동적으로 컨텐츠가 변경되는 메인 작업 공간입니다.
   * 메인 대시보드 (/):
     * activeMode 상태에 따라 '워크스페이스 뷰' 또는 '운영 뷰'를 표시합니다.
     * 워크스페이스 뷰 (개발 모드):
       * '새 에이전트 만들기'(+) 카드 (REQ 9): 클릭 시 에이전트 생성 모달 표시.
       * 사용자가 생성한 '개발 에이전트 카드 목록' 표시.
     * 운영 뷰 (운영 모드):
       * (REQ 1) AI 랭킹을 통해 사용자에게 가장 적합한 순서로 '운영 에이전트 카드 목록'을 표시합니다.
     * 에이전트 카드 디자인 (REQ 5):
       * 카드 상단: 사용자 설정 로고(URL), 에이전트 제목(title).
       * 카드 본문: 설명(description), 기능(capabilities) 태그 목록.
       * 카드 하단: 생성자 ID 및 팀(부서) 정보, (운영 카드) 헬스 상태(🟢/🔴/⚪️).
       * 카드 배경색: 사용자가 설정 가능.
       * (워크스페이스 카드) 수정/삭제 버튼 제공 (REQ 9).
   * Agent Playground (/workspace/:id 또는 /production/:id):
     * 에이전트 카드 클릭 시 진입하는 상세 실행/디버깅 페이지.
     * 내부 사이드바 (PlaygroundSidebar): '새 대화' 버튼(REQ 8) 및 '대화 히스토리' 목록 (REQ 6, 7).
     * 워크스페이스 모드:
       * (중앙) TraceCapturePanel: (REQ 1) Agent Endpoint(Agno Base URL 등) 입력/검색 UI, (REQ 2) LLM 목록, (REQ 3) 개발 가이드(Agno CORS 등), (REQ 4) Live Trace 세션 정보(Trace ID, Trace Endpoint), (REQ 5) 파싱된 타임라인 로그 표시. (REQ 1-신규) 패널 영역 스크롤 지원.
       * (우측) ChatPlayground: (REQ 3) Markdown, 코드 블록, 파일/이미지를 지원하는 에이전트 대화창.
     * 운영 모드: ChatPlayground만 표시.
   * API Key 관리 (/my-keys): 사용자가 개인 API Key를 생성/삭제하는 페이지.
   * 설정 (/settings/*):
     * 좌측 탭 (SettingsLayout): 역할(role)에 따라 동적 탭 메뉴 표시 (일반, 사용자 관리, LLM 모델 관리, 사용량 통계 등).
     * 우측 컨텐츠 (Outlet): 선택된 탭 UI 표시 (테마/언어 설정, 사용자 목록/관리, LLM 목록/관리(헬스 상태 포함), LLM 통계(그래프/테이블) 등).
 * 승인 대기 페이지 (PendingApprovalPage, 조건부 표시):
   * role이 PENDING인 사용자가 로그인 시, 메인 앱 대신 표시되는 전체 화면 페이지.
   * 사용자 본인 정보, 안내 메시지, 로그아웃 버튼 표시.
 * 브라우저 탭 (REQ 2, 4):
   * 아이콘(Favicon): 플랫폼 로고 사용.
   * 제목: A2G Platform (또는 최종 확정된 이름).
2.3. 개발자 정보 및 연락처 (REQ 3)
 * 책임 개발자: 한승하 (syngha.han@samsung.com)
 * 문의 채널: (사내 메신저 채널 또는 이메일 그룹 주소 - 추후 명시)
 * 버그 리포트 / 기능 제안: (Jira, Git Issues 등 링크 - 추후 명시)
3. 시스템 기능 요구사항 (System Features)
3.1. 사용자 인증 및 UI
 * REQ-UI-01: 플랫폼 헤더는 로그인 상태(isAuthenticated)에 따라 UI를 동적으로 변경해야 한다.
 * REQ-UI-02: 헤더의 모드 토글(운영↔워크스페이스) 상태는 전역(useWorkspaceStore)으로 관리되어야 한다.
 * REQ-UI-03: Agent Playground에서 헤더 모드 토글 시, 메인 대시보드(/)로 이동되어야 한다.
 * REQ-UI-04: 사용자는 /settings/general 탭에서 언어(ko/en)와 테마(light/dark)를 변경할 수 있어야 한다.
 * REQ-UI-05: role이 PENDING인 사용자는 로그인 시 '승인 대기' 페이지만 표시되어야 한다.
 * REQ-UI-06: 설정 페이지(/settings/*)는 사용자의 role에 따라 접근 가능한 탭 메뉴를 동적으로 표시해야 한다.
 * (신규) REQ-UI-07: 플랫폼 UI는 헤더의 모드 토글 상태에 따라 전체적인 색상 테마가 변경되어야 한다. (운영: 파스텔 블루, 개발: 파스텔 레드 계열)
 * (신규) REQ-UI-08: 플랫폼 헤더 좌측 상단 및 브라우저 탭에 플랫폼 로고와 제목이 표시되어야 한다.
3.2. 통합 Agent 개발 환경 (Workbench)
 * REQ-DEV-01: 개발자는 '워크스페이스 뷰'에서 '새 에이전트 만들기'(+) 카드를 클릭하여 새 에이전트를 등록할 수 있어야 한다. (REQ 9)
   * 등록 시 최소한 **이름(Name), 설명(Description), 프레임워크(Framework - Agno, Custom 등), 스킬(Skill - ko/en)**을 입력받아야 한다. (REQ 2, 5)
 * REQ-DEV-02: 개발자는 생성된 개발 에이전트 카드의 정보(로고 URL, 카드 색상, 메타데이터)를 수정할 수 있어야 한다. (REQ 5)
 * REQ-DEV-03: 개발자는 생성된 개발 에이전트를 삭제할 수 있어야 한다. (REQ 9)
 * REQ-DEV-04: Agent Playground(워크스페이스)는 선택된 framework에 따라 적절한 Agent Endpoint 입력 UI를 제공해야 한다. (REQ 1)
   * Agno: Base URL 입력, /agents, /teams API 호출을 통한 에이전트/팀 검색 및 선택 드롭다운.
   * Custom: 단일 Endpoint URL 입력.
 * REQ-DEV-05: Agent Playground는 사용 가능한 (Healthy) LLM 모델 목록을 표시해야 한다. (REQ 2-신규)
 * REQ-DEV-06: Agent Playground는 framework별 개발 가이드를 표시해야 한다 (Agno CORS 설정 가이드 등). (REQ 1)
 * REQ-DEV-07: Agent Playground는 '새 대화'(REQ 8) 시작 시, 해당 대화 세션 전용 고유 Trace ID 및 Trace Endpoint URL을 생성하여 표시해야 한다. (REQ 3)
 * REQ-DEV-08: Agent Playground는 Trace Endpoint로 전송된 LLM 호출 로그를 실시간으로 타임라인 UI에 표시해야 한다. (REQ 7 - WebSocket)
 * REQ-DEV-09: Agent Playground(워크스페이스)의 채팅 히스토리는 사용자 기준으로 자동 저장되고, 페이지 재진입 시 마지막 상태가 복구되어야 한다. (REQ 6)
3.3. LLM 관리 (Admin)
 * REQ-ADM-01: 관리자는 /settings/models 탭에서 LLM 모델을 등록(이름, 엔드포인트, API Key)할 수 있어야 한다.
 * REQ-ADM-02: 관리자는 등록된 LLM 모델 정보 수정 및 활성/비활성 상태를 토글할 수 있어야 한다.
 * REQ-ADM-03: 관리자는 등록된 LLM 모델을 삭제할 수 있어야 한다.
 * REQ-ADM-04: LLM 등록/수정 시, 시스템은 /chat/completions 테스트 요청을 통해 엔드포인트 유효성을 검증해야 한다.
 * REQ-ADM-05: 시스템(Celery)은 주기적으로 활성 LLM의 헬스 체크를 수행하고 결과를 DB에 기록해야 하며, UI에 헬스 상태(🟢/🔴/⚪️)를 표시해야 한다.
3.4. 사용자 관리 (Admin)
 * REQ-ADM-06: 관리자는 /settings/users 탭에서 모든 사용자 목록을 조회할 수 있어야 한다.
 * REQ-ADM-07: 관리자는 사용자의 role을 변경(승인/강등)할 수 있어야 한다.
 * REQ-ADM-08: 관리자는 사용자를 삭제(본인 제외)할 수 있어야 한다.
 * REQ-ADM-09: 관리자는 사용자 목록을 부서별로 필터링할 수 있어야 한다.
 * REQ-ADM-10: 사용자 목록은 PENDING > ADMIN > USER 순, 가입일 순으로 정렬되어야 한다.
 * REQ-ADM-11: /settings/users 탭 UI는 PENDING 사용자에게 '승인'/'거절'(삭제) 버튼을, 그 외에는 역할 변경 드롭다운/삭제 버튼을 표시해야 한다. (REQ 4-신규)
3.5. Agent 운영 전환 및 관리
 * REQ-AGENT-01: 개발자는 Agent Playground에서 '운영 배포' 기능을 시작할 수 있어야 한다.
 * REQ-AGENT-02: 운영 배포 시 운영용 LLM Endpoint를 안내해야 한다.
 * REQ-AGENT-03: 개발자는 운영 에이전트 Endpoint URL을 입력해야 하며, 시스템은 해당 URL 동작을 검증해야 한다.
 * REQ-AGENT-04: 검증 성공 시 에이전트 status를 PRODUCTION으로 변경하고 prod_endpoint를 저장해야 한다.
 * REQ-AGENT-05: 시스템(Celery)은 주기적으로 운영 에이전트 헬스 체크를 수행하고 결과를 DB에 기록해야 한다. (REQ 4-신규)
 * REQ-AGENT-06: Agent Playground(운영 모드)의 채팅 히스토리는 사용자별 + 에이전트별로 분리되어 저장/복구되어야 한다. (REQ 7)
 * REQ-AGENT-07: Agent Playground(운영 모드)의 '새 대화' 버튼이 활성화되어야 한다. (REQ 8)
 * (신규) REQ-AGENT-08: 운영 모드 대시보드는 **AI 랭킹(REQ 1)**에 따라 "사용자 요구사항에 가장 적합한" 에이전트를 순서대로 표시해야 한다.
3.6. 통계 및 모니터링 (Admin)
 * REQ-STATS-01: 관리자는 통계 페이지(/settings/stats-usage 예정)에서 사용자별 또는 팀/부서별 LLM 모델 토큰 사용량을 기간별로 그래프와 테이블로 조회할 수 있어야 한다.
 * REQ-STATS-02: 관리자는 통계 페이지(/settings/stats-agents 예정)에서 팀/부서별 에이전트 토큰 사용량을 기간별로 그래프와 테이블로 조회할 수 있어야 한다. (차후 과제)
3.7. Agent Lifecycle 관리 (자동화) (신규)
 * REQ-AUTO-01: 시스템(Celery)은 1달 이상 사용되지 않은 **운영 에이전트(status=PRODUCTION)**를 자동으로 DISABLED 상태로 변경해야 한다. (REQ 10)
 * REQ-AUTO-02: 시스템(Celery)은 1달 이상 수정되지 않은 **개발 에이전트(status=DEVELOPMENT)**를 자동으로 삭제해야 한다. (REQ 11)
 * REQ-AUTO-03: Agent 헬스 체크 실패 시, 시스템(Celery)은 해당 에이전트 status를 DISABLED로 변경하고, 사내 메일 API를 통해 원 개발자에게 알림을 발송해야 한다. (REQ 12)
3.8. A2A 프로토콜 (신규)
 * REQ-A2A-01: 시스템(agent-service)은 A2A 프로토콜 표준에 맞는 POST /api/a2a/register API 엔드포인트를 제공해야 한다. (REQ 2)
 * REQ-A2A-02: 개발자가 ADK, Langchain Agents 등을 사용할 수 있도록 Python/JS SDK 및 가이드를 제공해야 한다. (REQ 2)
3.9. 리치 플레이그라운드 (신규)
 * REQ-RICH-01: ChatPlayground는 사용자/에이전트 메시지의 Markdown 렌더링(테이블, 목록, 인용 등)을 지원해야 한다. (REQ 3)
 * REQ-RICH-02: ChatPlayground는 코드 블록 구문 강조(Syntax Highlighting) 및 '복사' 버튼을 지원해야 한다. (REQ 3)
 * REQ-RICH-03: ChatInput은 파일/이미지 업로드 기능을 제공해야 한다. (REQ 3)
 * REQ-RICH-04: ChatMessageList는 파일/이미지 메시지를 표시하고 다운로드/미리보기 할 수 있도록 지원해야 한다. (REQ 3)
3.10. Multi-Agent Tracing (신규)
 * REQ-TRACE-01: tracing-service는 LLM 호출 로그(LogEntry) 저장 시 **호출 주체 에이전트 식별자(agent_id)**를 추론(예: Tool Call 분석)하여 함께 기록해야 한다. (REQ 10)
 * REQ-TRACE-02: LiveTrace UI (TraceLogItem)는 log.agent_id에 따라 로그 항목의 배경색을 구분하고, 우상단에 에이전트 태그를 표시해야 한다. (REQ 10)
4. 비기능적 요구사항 (Non-Functional Requirements)
 * NFR-UI-01 (테마): 플랫폼은 라이트/다크 모드를 완벽하게 지원해야 한다.
 * NFR-UI-02 (모드별 색상): 플랫폼 UI는 운영 모드(파스텔 블루)와 개발 모드(파스텔 레드)에 따라 다른 색상 테마를 적용해야 한다.
 * NFR-I18N-01 (다국어): 플랫폼의 모든 UI 텍스트는 다국어(한국어, 영어)를 지원해야 한다.
 * NFR-HEALTH-01 (LLM 헬스체크): 시스템은 등록된 LLM의 상태를 주기적으로 검사하고 관리자에게 시각적으로 알려줘야 한다.
 * NFR-HEALTH-02 (Agent 헬스체크): 시스템은 운영 중인 에이전트의 상태를 주기적으로 검사하고 사용자/관리자에게 시각적으로 알려줘야 한다.
 * NFR-SEC-01 (보안): 사용자 API Key, LLM API Key 등 민감 정보는 안전하게 저장 및 전송되어야 하며, API 응답 시 마스킹 처리되어야 한다.
 * NFR-PERF-01 (성능): 통계 API 등 데이터 집계 기능은 대량의 로그 데이터에서도 합리적인 시간 내에 응답해야 한다.
 * NG-DATA-01 (데이터 보존): Chat History 데이터는 사용자의 명시적인 삭제 요청 전까지 보존되어야 한다.
 * NFR-NOTIF-01 (알림): Agent 비활성화 등 주요 이벤트 발생 시 관련 사용자에게 사내 메일 API를 통해 알림을 발송해야 한다.
 * (신규) NFR-ARCH-01 (확장성): 시스템은 마이크로서비스 아키텍처(Phase 2)를 기반으로, 특정 서비스(예: tracing-service)의 부하 증가 시 해당 서비스만 독립적으로 확장(scale-out) 가능해야 한다.
 * (신규) NFR-ARCH-02 (유지보수성): 각 서비스는 명확히 정의된 책임(SRP)을 가지며, 독립적으로 개발/테스트/배포가 가능해야 한다.
 * (신규) NFR-DEV-01 (외부 개발 환경): 사외망에서 Mock Services를 통해 사내 인프라 없이도 완전한 기능 개발 및 테스트가 가능해야 한다.
 * (신규) NFR-DEV-02 (API 계약 준수): 모든 마이크로서비스는 OpenAPI 3.0 스펙을 제공하고, API 계약 테스트(Contract Testing)를 통과해야 한다.
 * (신규) NFR-DEV-03 (환경 전환): 환경 변수 파일 교체만으로 사외망↔사내망 환경 전환이 가능해야 하며, 코드 수정이 필요하지 않아야 한다.

