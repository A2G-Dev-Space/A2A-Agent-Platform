🎨 AGENT PLATFORM (A2G) 디자인 명세서 (UI/UX Blueprint) (v2.7)
문서 버전: 2.7 (Phase 2 - Microservice & External Dev Environment)
최종 수정일: 2025년 10월 27일
1. 개요 (Introduction)
본 문서는 A2G Agent Platform의 사용자 인터페이스(UI) 및 사용자 경험(UX) 설계 명세서입니다. Phase 2 마이크로서비스 아키텍처 전환 및 신규 기능 요구사항(Gemini UI, A2A, 리치 플레이그라운드 등)을 반영하여, 플랫폼의 레이아웃, 컴포넌트, 핵심 사용자 흐름을 정의합니다.

1.1. 외부 개발 환경 고려사항 (신규)
본 프로젝트는 **8명의 개발자가 사외망에서 병렬 개발**하는 환경을 지원합니다. Frontend 개발자(Dev #1, #2)는 Backend API가 완성되기 전까지 **MSW (Mock Service Worker)** 또는 **json-server**를 사용하여 Mock 데이터로 UI를 개발할 수 있습니다.
 * Mock 데이터 경로: `frontend/src/mocks/data/` (agents.json, sessions.json 등)
 * API Contracts 준수: [API_CONTRACTS.md](./API_CONTRACTS.md)에 정의된 응답 포맷과 정확히 일치해야 함
 * 상세 내용: [TEAM_ASSIGNMENT.md](./TEAM_ASSIGNMENT.md) 참조
2. 전역 스타일 (Global Styles)
2.1. (REQ 4) 디자인 레퍼런스
 * Gemini UI: Google의 Gemini UI를 최우선 디자인 레퍼런스로 삼습니다. 간결함, 정보 중심적 레이아웃, 세련된 아이코노그래피, 명확한 상호작용을 목표로 합니다.
 * 컴포넌트 라이브러리: MUI (Material-UI) 또는 그에 준하는 검증된 React 컴포넌트 라이브러리 도입을 검토하여 Gemini 스타일을 일관되게 구현합니다.
2.2. (REQ 1-신규) 색상 팔레트
 * 기본 테마 (Light/Dark): Tailwind CSS의 slate 계열을 기반으로 Light/Dark 모드를 완벽하게 지원합니다 (dark: Variant 사용).
 * 모드별 강조 색상: 플랫폼의 현재 모드(운영/개발)를 시각적으로 명확히 구분하기 위해 useWorkspaceStore의 activeMode 상태와 연동된 동적 테마를 적용합니다.
   * 운영 모드: 파스텔 블루 계열 (예: bg-sky-100, text-sky-700, border-sky-300). 헤더, 활성 탭, 카드 하이라이트 등 주요 상호작용 요소에 적용됩니다.
   * 개발(워크스페이스) 모드: 파스텔 레드/핑크 계열 (예: bg-rose-100, text-rose-700, border-rose-300). 동일한 요소에 적용됩니다.
2.3. 타이포그래피 (Typography)
 * 기본 글꼴: 'Pretendard' 웹 폰트를 플랫폼 전체의 기본 글꼴로 사용합니다.
 * 코드 표시: API 키, 엔드포인트 URL, 코드 블록 등은 모노스페이스 글꼴 (font-mono)을 사용합니다.
2.4. (REQ 2, 4-신규) 브랜딩
 * 플랫폼 로고: 확정된 A2G 플랫폼 로고 이미지를 frontend/public/ 또는 src/assets/에 배치하고 헤더 좌측 상단에 표시합니다.
 * 브라우저 탭:
   * 아이콘(Favicon): 플랫폼 로고 아이콘 버전을 index.html에 설정합니다.
   * 제목: A2G Platform (또는 최종 확정된 이름)으로 index.html <title> 태그에 설정합니다.
3. 전체 레이아웃 (Overall Layout)
플랫폼의 핵심 UI는 헤더(Header)와 컨텐츠(Main Content)로 구성된 2단 구조를 채택합니다.
 * WorkspaceHeader (상단 고정): 플랫폼 전역 컨트롤 패널. 현재 activeMode에 따라 강조 색상(블루/레드)이 동적으로 변경됩니다.
 * Main Content Area (중앙): react-router-dom의 <Outlet>을 통해 동적으로 렌더링되는 영역. 사용자의 역할(role)에 따라 접근이 제어됩니다.
3.1. WorkspaceHeader (상단 헤더)
 * 좌측 영역 (REQ 2, 4):
   * A2G 플랫폼 로고 및 이름.
   * 클릭 시 메인 대시보드(/)로 이동합니다.
 * 중앙 영역:
   * 모드 전환 토글: 운영(Production) ↔ 워크스페이스(Workspace) 모드를 전환하는 스위치.
 * 우측 영역:
   * 사용자 프로필 드롭다운:
     * 로그인 시 사용자 ID(username)가 표시되는 버튼.
     * 클릭 시 드롭다운 메뉴 표시:
       * 상단: 이름 (역할), 이메일, 팀(부서) 정보 표시.
       * 메뉴: 'Key 생성' (/my-keys), '설정' (/settings/general) 링크.
       * 하단: '로그아웃' 버튼.
   * 로그아웃 상태: '로그인' 버튼 표시.
3.2. 메인 대시보드 (/ 경로, App.tsx)
activeMode에 따라 뷰를 조건부 렌더링합니다 (role='PENDING' 사용자는 접근 불가).
 * AgentCardProduction (운영 모드 뷰):
   * 타이틀 (파스텔 블루 계열).
   * (REQ 1) AI 랭킹 기반으로 정렬된 '운영 에이전트 카드' 목록을 grid 레이아웃으로 표시합니다.
 * AgentCardWorkspace (워크스페이스 모드 뷰):
   * 타이틀 (파스텔 레드 계열).
   * '새 에이전트 만들기' (+) 카드 (REQ 9): 클릭 시 AddAgentModal 표시.
   * 사용자가 생성한 '개발 에이전트 카드' 목록.
 * AgentCard 컴포넌트 디자인 (REQ 5):
   * 카드 배경: 사용자가 설정한 카드 색상(card_color) 또는 모드별 기본 파스텔 색상 (인라인 스타일 적용).
   * 카드 상단:
     * 좌측: 사용자 설정 로고(logo_url) (없을 시 기본 아이콘) - 원형 또는 사각형.
     * 중앙: 에이전트 제목(title) (굵게, 2줄 제한).
     * 우측 (워크스페이스): 호버 시 '수정'/'삭제' 아이콘 버튼 표시 (REQ 9).
     * 우측 (운영): 헬스 상태(🟢/🔴/⚪️) 아이콘 및 텍스트 표시 (REQ 12).
   * 카드 본문:
     * 설명(description) (3-4줄 제한).
     * 기능(capabilities / skill_kr/skill_en): #태그 형식으로 최대 2줄까지 표시.
   * 카드 하단 (경계선 위):
     * 좌측: 생성자 ID (owner_username).
     * 우측: 팀(부서)명 (owner_deptname_kr 등).
   * (신규) 비활성 상태 (REQ 10, 11, 12): status='DISABLED'일 경우, 카드 전체에 opacity-60 grayscale을 적용하여 비활성화되었음을 명확히 표시.
 * AddAgentModal 컴포넌트 (REQ 5, 9):
   * '새 에이전트' 또는 '에이전트 수정' 모달.
   * 입력 필드: 이름(name), 설명(description), 프레임워크(Framework) 드롭다운 (Agno, Langchain, ADK, Custom - REQ 2), 스킬(ko/en), 로고 URL, 카드 색상(Hex 입력 또는 팔레트 선택).
   * '생성' / '저장' 버튼 (클릭 시 MyAgentViewSet API 호출).
3.3. Agent Playground (상세 페이지, /workspace/:id 등)
2~3단 레이아웃 구조.
 * PlaygroundSidebar (좌측) (REQ 6, 7, 8):
   * '새 대화' 버튼 (REQ 8): 클릭 시 새 ChatSession 생성 API 호출, ChatPlayground 및 LiveTrace 초기화.
   * '대화 히스토리' 목록 (REQ 6, 7): 사용자/에이전트별 세션 목록 표시. 클릭 시 loadSessionDetails를 호출하여 해당 세션의 메시지와 Trace 로그를 모두 복구.
   * '세션 삭제' 버튼 (신규): 각 세션 항목 호버 시 '삭제' 아이콘 표시.
 * TraceCapturePanel (중앙 - 워크스페이스 모드 전용):
   * 패널 스크롤 (REQ 1-신규): 설정 영역이 길어질 경우, 패널 전체가 스크롤됩니다.
   * 설정 영역 (접기 가능):
     * 프레임워크 설정 (REQ 1, 7.7): agent.framework 값에 따라 동적 UI 렌더링.
       * Agno: 'Agno Base URL' 입력, '불러오기' 버튼, '채팅 대상' (Agent/Team) 선택 드롭다운, 'CORS 가이드' 표시.
       * Custom: 'Agent Endpoint (실행 주소)' 입력 필드 표시.
       * (향후) Langchain, ADK: A2A 프로토콜(REQ 2) 연동 상태 또는 수동 설정 UI 표시.
     * Trace/LLM 설정:
       * 'Trace Endpoint' (읽기 전용, 복사 버튼) - (REQ 3)
       * 'Platform API Key' (읽기 전용, 복사 버튼) - (REQ 3)
       * 사용 가능 LLM 목록 (REQ 2-신규): 현재 활성화/Healthy 상태인 LLM 모델 이름들을 태그 형태로 표시.
     * 가이드: 환경 변수(AGENT_LLM_ENDPOINT 등) 설정 가이드 표시.
   * Live Trace 로그 (REQ 7, 9, 10):
     * LiveTrace 컴포넌트: WebSocket을 통해 실시간 로그 수신 및 렌더링.
     * TraceLogItem 컴포넌트:
       * (REQ 8) 로그 타입(LLM, Tool)별 아이콘/색상 구분.
       * (REQ 10) Multi-Agent 추적을 위한 agent_id 태그 및 배경색 구분.
     * 상단: '로그 지우기' (DB 영구 삭제), '재연결' 버튼.
     * 스크롤 (REQ 9): 로그 영역 내부에 독립적인 스크롤 적용.
 * ChatPlayground (우측) (REQ 3):
   * ChatMessageList:
     * Markdown 렌더링 (테이블, 목록 등).
     * 코드 블록 하이라이팅 및 복사 버튼.
     * 파일/이미지 메시지 표시 (미리보기, 다운로드 링크).
   * ChatInput:
     * 메시지 입력 (textarea).
     * 파일/이미지 업로드 버튼 (클릭 시 chat-service로 업로드).
     * 전송 버튼 (아이콘 디자인 개선, isWaitingForResponse 시 비활성화).
3.4. 설정 페이지 (/settings/* 경로, SettingsLayout.tsx + 각 탭 컴포넌트)
 * 좌측 (SettingsLayout):
   * 탭 네비게이션: 역할(role)에 따라 동적 표시. (일반, 사용자 관리, LLM 모델 관리, 사용량 통계 등)
 * 우측 (Outlet):
   * /settings/general: 테마, 언어 설정.
   * /settings/users: 사용자 목록, 필터, 역할 변경, 삭제.
   * /settings/models: LLM 목록, 등록/수정, 헬스 상태(🟢/🔴/⚪️), 활성 토글, 삭제.
   * /settings/stats-usage: LLM 통계 (날짜/그룹 필터, 누적 막대 차트, 테이블).
3.5. 승인 대기 페이지 (PendingApprovalPage.tsx, 조건부 렌더링)
 * role이 PENDING인 사용자가 로그인 시 Layout.tsx에 의해 전체 화면으로 렌더링된다.
 * 중앙 정렬 카드 UI (로고, 제목, 설명, 사용자 정보, 로그아웃 버튼).
4. 핵심 사용자 흐름 (Key User Flow)
 * 신규 사용자 진입: 로그인 -> PendingApprovalPage 표시.
 * 관리자 승인: /settings/users -> '승인'.
 * 일반 사용자 진입: 로그인 -> 메인 앱 (App.tsx 대시보드).
 * 에이전트 생성 (Agno):
   * / (워크스페이스) -> '+' 카드 클릭 -> AddAgentModal.
   * 정보 입력 (Name, Desc, Framework: Agno 등) -> '생성'.
   * App.tsx에 카드 생성됨.
 * 에이전트 개발 및 테스트 (Agno):
   * Agno 카드 클릭 -> /workspace/:id 진입.
   * TraceCapturePanel: 'Agno Base URL' (http://localhost:9080) 입력 -> '불러오기' -> '채팅 대상' 드롭다운에서 (예: main-agent) 선택.
   * 'Trace Endpoint'와 'Platform API Key' 복사 -> 로컬 Agno 에이전트 환경변수(AGENT_LLM_ENDPOINT, AGENT_LLM_API_KEY)로 설정.
   * 'CORS 가이드' 확인 및 로컬 Agno main.py에 적용 후 재시작.
   * ChatPlayground: 메시지 입력 ("테스트") -> '전송'.
   * AgentPlayground가 agno.service 호출 -> http://localhost:9080/agents/main-agent/runs로 FormData POST 요청.
   * Agno 에이전트가 요청 수신 -> 내부 LLM 호출 (플랫폼 LogProxyView 경유).
   * LiveTrace: WebSocket으로 LLM 호출 로그(Input/Output) 실시간 수신 및 렌더링.
   * ChatPlayground: Agno 에이전트의 최종 응답(스트리밍) 수신 및 표시.
 * 히스토리 복구:
   * PlaygroundSidebar: 과거 세션 클릭.
   * ChatPlayground에 해당 세션의 메시지(ChatMessage) 복구됨.
   * LiveTrace에 해당 세션의 Trace 로그(LogEntry) 복구됨.
 * 운영 에이전트 조회:
   * 헤더 토글 -> '운영' 모드.
   * App.tsx에 **AI 랭킹(REQ 1)**으로 정렬된 운영 에이전트 카드 목록 표시.

