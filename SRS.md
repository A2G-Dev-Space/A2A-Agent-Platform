# 📝 AGENT PLATFORM 요구사항 명세서 (SRS)

**문서 버전**: 2.0
**최종 수정일**: 2025년 10월 27일

---

## 1. 개요 (Introduction)

본 문서는 **A2G Agent Platform** 프로젝트의 소프트웨어 요구사항 명세서(Software Requirements Specification)입니다. 플랫폼의 목적, 범위, 기능, 인터페이스, 성능, 제약 조건 등을 명확히 정의하여 개발팀과 이해관계자 간의 공통된 이해를 확보합니다.

### 1.1. 플랫폼 목적

A2G Platform은 다음 두 가지 핵심 목표를 달성합니다:

1. **통합 Tracing 제공**: 개발자가 LLM Agent를 개발/디버깅할 때, LLM 호출 로그를 실시간으로 수집하고 시각화하여 디버깅을 용이하게 합니다.
2. **Chat Frontend 제공**: Agent를 사용자에게 공개하여 Chat 인터페이스로 상호작용할 수 있는 환경을 제공합니다.

### 1.2. 세 가지 운영 모드

플랫폼은 다음 세 가지 모드를 제공합니다:

1. **개인 공간 (Development Mode)**: Agent 개발 및 디버깅
   - Session별 Chat History + Tracing History
   - Live Trace (WebSocket 실시간 로그)
   - History 재생 (WebSocket 자동 재연결)

2. **운영 공간 (Production Mode)**: 공개된 Agent 사용
   - 공개 범위 설정 (전체 공개/팀 공개)
   - Trace 없는 Chat Playground
   - Chat History만 제공

3. **통합 Playground (Unified Playground)**: 복수 Agent 조합 실행 ⭐ 신규
   - 수동 Agent 선택: 사용자가 복수 Agent 선택
   - 자동 Agent 선택: AI Orchestration으로 적합한 Agent 자동 선택
   - 순차/병렬 실행 전략

---

## 2. 전체 설명 (Overall Description)

### 2.1. 제품 관점

본 플랫폼은 **마이크로서비스 아키텍처(MSA)** 기반의 Docker 컨테이너화된 웹 서비스입니다.

**아키텍처 구성**:
- **7개의 독립 서비스**: User, Agent, Chat, Tracing, Admin, Worker, Infra
- **API Gateway**: Nginx (포트 9050)
- **Database**: PostgreSQL
- **Cache/Broker**: Redis
- **Frontend**: React 19 + TypeScript + Vite + Zustand

**인증 방식**:
- 사내 SSO 연동 (OIDC)
- 역할 기반 접근 제어 (RBAC: PENDING, USER, ADMIN)

**상세 내용**: [ARCHITECTURE.md](./ARCHITECTURE.md) 참조

### 2.2. 외부 개발 환경

본 프로젝트는 **4명의 개발자가 사외망에서 개발**하고, **사내망에서 통합 테스트**하는 하이브리드 개발 전략을 채택합니다.

**핵심 전략**:
- **Mock Services**: 사외망에서 사내 DB/Redis/SSO를 대체하는 경량 Mock 서비스 제공
- **API-First Development**: 명확한 API 계약(OpenAPI Spec)을 기반으로 독립 개발
- **환경 변수 기반 전환**: `.env.external` ↔ `.env.internal` 파일만 교체하면 환경 전환

**상세 내용**: [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md), [MOCK_SERVICES.md](./MOCK_SERVICES.md), [API_CONTRACTS.md](./API_CONTRACTS.md) 참조

### 2.3. 사용자 인터페이스

플랫폼 UI는 **Google Gemini 디자인**을 레퍼런스로 합니다.

**핵심 UI 구성**:

1. **Workspace Header (상단 고정)**
   - 좌측: A2G 플랫폼 로고 및 이름
   - 중앙: 운영 ↔ 워크스페이스 모드 전환 토글
   - 우측: 사용자 프로필 드롭다운 (Key 생성, 설정, 로그아웃)

2. **모드별 색상 테마**
   - 운영 모드: 파스텔 블루 계열
   - 개발 모드: 파스텔 레드 계열

3. **메인 대시보드 (/)**
   - 운영 모드: AI 랭킹(Top-K RAG)으로 정렬된 운영 Agent 카드 목록
   - 개발 모드: '새 Agent 만들기' + 개발 Agent 카드 목록

4. **Agent Playground (/workspace/:id, /production/:id)**
   - 좌측: PlaygroundSidebar (새 대화, 대화 히스토리)
   - 중앙 (워크스페이스만): TraceCapturePanel (설정 + Live Trace)
   - 우측: ChatPlayground (Markdown, 코드, 파일/이미지 지원)

5. **통합 Playground (/unified)** ⭐ 신규
   - Agent 선택 UI (복수 선택 가능)
   - 실행 모드 선택 (순차/병렬)
   - Chat 인터페이스

**상세 내용**: [BLUEPRINT.md](./BLUEPRINT.md) 참조

### 2.4. 개발자 정보

- **책임 개발자**: 한승하 (syngha.han@samsung.com)
- **팀 구성**: 4명 (DEV1: SPRINT Lead, DEV2-4: Backend/Frontend/Infra)
- **개발 기간**: 6주 (Sprint 0-4)

**상세 내용**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 참조

---

## 3. 시스템 기능 요구사항 (System Features)

### 3.1. 사용자 인증 및 권한 관리

#### REQ-AUTH-01: SSO 인증
- 시스템은 사내 SSO(OIDC)를 통한 로그인을 지원해야 한다.
- 로그인 성공 시 JWT Access Token을 발급해야 한다.

#### REQ-AUTH-02: 역할 기반 접근 제어 (RBAC)
- 시스템은 PENDING, USER, ADMIN 세 가지 역할을 지원해야 한다.
- PENDING 사용자는 승인 대기 페이지만 접근 가능해야 한다.
- ADMIN 사용자만 사용자 관리 및 LLM 모델 관리 기능에 접근 가능해야 한다.

#### REQ-AUTH-03: API Key 관리
- 사용자는 개인 API Key를 생성/삭제할 수 있어야 한다.
- API Key는 Agent 개발 시 Trace Endpoint 인증에 사용된다.
- API Key는 `a2g_` 접두사를 가진 32자 랜덤 문자열이어야 한다.

---

### 3.2. UI 및 테마

#### REQ-UI-01: 모드별 색상 테마
- 플랫폼 UI는 헤더의 모드 토글 상태에 따라 전체 색상 테마가 변경되어야 한다.
  - 운영 모드: 파스텔 블루 계열
  - 개발 모드: 파스텔 레드 계열

#### REQ-UI-02: 라이트/다크 모드
- 플랫폼은 라이트/다크 모드를 완벽하게 지원해야 한다.
- 사용자는 /settings/general에서 테마를 변경할 수 있어야 한다.

#### REQ-UI-03: 다국어 지원
- 플랫폼의 모든 UI 텍스트는 한국어/영어를 지원해야 한다.
- 사용자는 /settings/general에서 언어를 변경할 수 있어야 한다.

#### REQ-UI-04: 브랜딩
- 플랫폼 헤더 좌측 상단 및 브라우저 탭에 A2G 로고와 제목이 표시되어야 한다.
- 로고 클릭 시 메인 대시보드(/)로 이동해야 한다.

#### REQ-UI-05: 승인 대기 페이지
- role이 PENDING인 사용자는 로그인 시 승인 대기 페이지만 표시되어야 한다.
- 페이지에는 사용자 정보, 안내 메시지, 로그아웃 버튼이 표시되어야 한다.

---

### 3.3. Agent 등록 및 관리

#### REQ-AGENT-01: Agent 생성
- 개발자는 개발 모드에서 '+' 카드를 클릭하여 새 Agent를 생성할 수 있어야 한다.
- 생성 시 다음 정보를 입력받아야 한다:
  - **Name**: Agent 이름 (필수)
  - **Description**: Agent 설명 (필수)
  - **Framework**: Agno, ADK, Langchain, Custom (필수)
  - **Skill (ko/en)**: Agent 기능 설명
  - **Logo URL**: Agent 로고 이미지 URL
  - **Card Color**: Agent 카드 배경색 (Hex)

#### REQ-AGENT-02: Agent 수정/삭제
- 개발자는 자신이 생성한 Agent의 정보를 수정할 수 있어야 한다.
- 개발자는 자신이 생성한 Agent를 삭제할 수 있어야 한다.

#### REQ-AGENT-03: Agent 공개 범위 설정
- Agent 생성 시 공개 범위(visibility)를 설정할 수 있어야 한다:
  - **PRIVATE**: 본인만 접근 (기본값)
  - **TEAM**: 같은 부서/팀만 접근
  - **ALL**: 모든 사용자 접근

#### REQ-AGENT-04: Agent 운영 전환
- 개발자는 Agent Playground에서 '운영 배포' 기능을 시작할 수 있어야 한다.
- 운영 배포 시 운영용 Endpoint URL을 입력해야 한다.
- 시스템은 해당 URL 동작을 검증하고, 성공 시 status를 PRODUCTION으로 변경해야 한다.

#### REQ-AGENT-05: Agent 헬스 체크
- 시스템(Celery)은 주기적으로 운영 Agent의 헬스 체크를 수행해야 한다.
- 헬스 체크 실패 시 status를 DISABLED로 변경하고, 원 개발자에게 메일로 알림을 발송해야 한다.

---

### 3.4. A2A 프로토콜 지원

#### REQ-A2A-01: Framework별 A2A 지원
- 시스템은 다음 Framework의 Agent 통신을 지원해야 한다:

**1) Langchain (LangGraph)**
- **프로토콜**: JSON-RPC 2.0 완전 지원
- **Endpoint**: `/rpc` 또는 사용자 정의
- **메서드**:
  - `message/send`: 동기 메시지 전송
  - `message/stream`: 스트리밍 메시지 전송
  - `tasks/get`: 작업 상태 조회

**2) ADK (Agent Development Kit)**
- **프로토콜**: A2A 완전 지원 (`to_a2a()` 함수)
- **Agent Card**: `/.well-known/agent-card.json`
- **실행 명령**: `adk api_server --a2a`

**3) Agno**
- **프로토콜**: 자체 REST API (A2A 미지원)
- **Endpoint**:
  - `/agents/{agent_id}/runs`: Agent 실행
  - `/teams/{team_id}/runs`: Team 실행
- **향후**: A2A 전환 예정이므로, 코드 구조는 A2A 호환 가능하게 작성

**4) Custom**
- **프로토콜**: 사용자 정의 HTTP Endpoint
- **입력**: JSON 포맷 자유 정의

#### REQ-A2A-02: A2A Agent Card Discovery
- ADK 및 Langchain Agent는 `/.well-known/agent-card.json`을 통해 자동 발견되어야 한다.
- Agent Card에는 다음 정보가 포함되어야 한다:
  - `name`, `description`, `skills`, `input_modes`, `output_modes`

#### REQ-A2A-03: A2A 개발 가이드 제공
- Platform은 Langchain A2A 구현 가이드를 제공해야 한다.
- Platform은 ADK A2A 구현 가이드를 제공해야 한다.

**상세 내용**: [GLOSSARY.md](./GLOSSARY.md) - A2A 프로토콜 섹션 참조

---

### 3.5. 개인 공간 (Development Mode)

#### REQ-DEV-01: Agent Endpoint 설정
- Agent Playground(워크스페이스)는 Framework별 Endpoint 설정 UI를 제공해야 한다:
  - **Agno**: Base URL 입력 + Agent/Team 선택 드롭다운
  - **ADK/Langchain**: A2A Endpoint URL 입력
  - **Custom**: Endpoint URL 입력

#### REQ-DEV-02: Trace Endpoint 생성
- '새 대화' 시작 시, 시스템은 고유한 Trace ID(UUID)를 생성해야 한다.
- TraceCapturePanel에 다음 정보를 표시해야 한다:
  - **Trace Endpoint**: `/api/log-proxy/{trace_id}/chat/completions`
  - **Platform API Key**: 사용자의 활성 API Key

#### REQ-DEV-03: Live Trace (실시간)
- **WebSocket**을 통해 실시간 LLM 호출 로그를 수신하고 표시해야 한다.
- 로그는 **시간순서대로** 표시되어야 한다.
- 로그 항목은 다음 정보를 포함해야 한다:
  - Log Type (LLM, Tool, Agent Transfer)
  - Agent ID (Multi-Agent 추적)
  - Model, Prompt, Completion
  - Latency (ms), Tokens Used
  - Timestamp (ISO 8601)

#### REQ-DEV-04: Trace Log Reset
- 사용자는 Live Trace 로그를 **초기화(Reset)**할 수 있어야 한다.
- Reset 버튼 클릭 시 **현재 세션의 모든 로그를 UI에서 제거**해야 한다.
- DB에 저장된 로그는 유지되어야 한다 (History 재생 시 복구 가능).

#### REQ-DEV-05: Agent 전환 감지 (Tool 기반)
- 시스템은 특정 Tool 사용 시 Agent 전환을 감지하고 **별도 UI**로 표시해야 한다:
  - **ADK**: `transfer_to_agent` tool 사용 시 Agent 전환으로 인식
  - **Agno**: `delegate_task_to_members` tool 사용 시 Agent 전환으로 인식
- Agent 전환 로그는 다음 정보를 포함해야 한다:
  - `log_type`: "AGENT_TRANSFER"
  - `from_agent_id`: 이전 Agent ID
  - `to_agent_id`: 다음 Agent ID
  - `tool_name`: "transfer_to_agent" 또는 "delegate_task_to_members"
  - `tool_input`: Tool 입력 파라미터 (전환 사유 등)

#### REQ-DEV-06: Trace History 재생
- 사용자가 과거 Session을 클릭하면:
  - Chat History를 로드해야 한다.
  - Trace History를 로드해야 한다 (시간순서대로).
  - WebSocket을 자동 재연결해야 한다 (이미 저장된 로그 표시).

#### REQ-DEV-07: 개발 가이드 표시
- TraceCapturePanel은 Framework별 개발 가이드를 표시해야 한다:
  - Agno: CORS 설정 가이드
  - ADK/Langchain: A2A 연동 가이드
  - 환경 변수 설정 예시

#### REQ-DEV-08: LLM 모델 목록 표시
- TraceCapturePanel은 현재 활성화/Healthy 상태인 LLM 모델 목록을 표시해야 한다.

---

### 3.6. 운영 공간 (Production Mode)

#### REQ-PROD-01: AI 랭킹 기반 Agent 정렬
- 운영 모드 대시보드는 **Top-K RAG 기반 AI 랭킹**에 따라 Agent를 정렬해야 한다.
- 사용자의 검색 쿼리(선택 사항)와 Agent의 임베딩 벡터를 비교하여 유사도 점수를 계산해야 한다.

#### REQ-PROD-02: Agent 카드 표시
- 운영 모드 대시보드는 status=PRODUCTION인 Agent 카드를 표시해야 한다.
- 카드에는 다음 정보가 포함되어야 한다:
  - 로고, 제목, 설명, 기능 태그
  - 생성자 ID, 팀(부서)명
  - 헬스 상태 (🟢/🔴/⚪️)

#### REQ-PROD-03: Trace 없는 Chat Playground
- 운영 모드 Agent Playground는 TraceCapturePanel 없이 ChatPlayground만 표시해야 한다.
- Chat History는 저장되어야 한다.

#### REQ-PROD-04: 공개 범위 필터링
- 사용자는 visibility 설정에 따라 접근 가능한 Agent만 볼 수 있어야 한다:
  - **ALL**: 모든 사용자가 접근 가능
  - **TEAM**: 같은 부서/팀 사용자만 접근 가능

---

### 3.7. 통합 Playground (Unified Playground) ⭐ 신규

#### REQ-UNIFIED-01: 복수 Agent 선택
- 사용자는 공개된 Agent 중 복수 개를 선택할 수 있어야 한다.
- 선택된 Agent는 순차 또는 병렬로 실행되어야 한다.

#### REQ-UNIFIED-02: 자동 Agent 선택 (AI Orchestration)
- 사용자가 Agent를 선택하지 않으면, 시스템이 사용자 요청을 분석하여 적합한 Agent를 자동 선택해야 한다.
- Agent 선택 알고리즘은 **RAG + LLM 분석**을 사용해야 한다.

#### REQ-UNIFIED-03: 실행 전략 선택
- 사용자는 다음 실행 모드를 선택할 수 있어야 한다:
  - **Sequential (순차)**: Agent를 순차적으로 실행, 이전 결과를 다음 Agent에 전달
  - **Parallel (병렬)**: Agent를 동시에 실행, 결과를 통합
  - **Hybrid (하이브리드)**: 자동 최적화된 실행 전략

#### REQ-UNIFIED-04: 결과 통합
- 복수 Agent의 실행 결과를 하나의 응답으로 통합하여 반환해야 한다.

#### REQ-UNIFIED-05: Orchestration Service
- 시스템은 Unified Playground를 위한 독립적인 Orchestration Service를 제공해야 한다.
- Orchestration Service는 다음 API를 제공해야 한다:
  - `POST /api/orchestrate`: 복수 Agent 실행 요청

**예시 워크플로우**:
```
사용자: "고객 문의 데이터를 분석해서 보고서 만들어줘"

→ Platform이 자동 선택:
  1. "Customer Data Agent" (데이터 추출)
  2. "Analysis Agent" (데이터 분석)
  3. "Report Generator Agent" (보고서 생성)

→ 순차 실행 및 결과 통합
```

---

### 3.8. Chat 및 Content Type 지원

#### REQ-CHAT-01: Session 관리
- 시스템은 사용자별 + Agent별 Chat Session을 관리해야 한다.
- Session은 다음 정보를 포함해야 한다:
  - `id`, `agent_id`, `user_id`, `trace_id`, `title`, `mode`, `created_at`
- `mode` 필드는 다음 값을 가질 수 있다: DEVELOPMENT, PRODUCTION, UNIFIED

#### REQ-CHAT-02: Message 관리
- 시스템은 Session별 Chat Message를 저장해야 한다.
- Message는 다음 필드를 포함해야 한다:
  - `id`, `session_id`, `role`, `content`, `content_type`, `attachments`, `created_at`

#### REQ-CHAT-03: Content Type 지원
- 시스템은 다음 Content Type을 지원해야 한다:

| Content Type | 렌더링 방식 | 예시 |
|-------------|------------|------|
| `text` | 일반 텍스트 | "Hello, how are you?" |
| `markdown` | Markdown 렌더링 (react-markdown) | "# Title\n\n- List item" |
| `code` | 코드 블록 + Syntax Highlighting | "```python\nprint('hi')\n```" |
| `image` | 이미지 표시 (미리보기) | Base64 또는 URL |
| `file` | 파일 다운로드 링크 | "document.pdf" |

#### REQ-CHAT-04: File/Image 업로드
- ChatInput은 파일/이미지 업로드 버튼을 제공해야 한다.
- 업로드된 파일은 Chat Service에 저장되고, URL이 반환되어야 한다.

#### REQ-CHAT-05: Markdown 렌더링
- ChatMessageList는 Markdown 문법을 렌더링해야 한다:
  - 표, 목록, 인용구, 링크, 강조 등

#### REQ-CHAT-06: 코드 블록 하이라이팅
- ChatMessageList는 코드 블록에 Syntax Highlighting을 적용해야 한다.
- 코드 블록에는 '복사' 버튼이 표시되어야 한다.

---

### 3.9. LLM 관리 (Admin)

#### REQ-LLM-01: LLM 모델 등록
- 관리자는 /settings/models에서 LLM 모델을 등록할 수 있어야 한다.
- 등록 시 다음 정보를 입력받아야 한다:
  - Name, Endpoint, API Key, is_active

#### REQ-LLM-02: LLM 모델 헬스 체크
- 시스템(Celery)은 주기적으로 활성 LLM의 헬스 체크를 수행해야 한다.
- 헬스 체크는 `/chat/completions` 테스트 요청을 통해 수행되어야 한다.
- 헬스 상태는 UI에 표시되어야 한다 (🟢/🔴/⚪️).

#### REQ-LLM-03: LLM 모델 활성/비활성
- 관리자는 LLM 모델의 활성/비활성 상태를 토글할 수 있어야 한다.
- 비활성 LLM은 사용자에게 표시되지 않아야 한다.

---

### 3.10. 사용자 관리 (Admin)

#### REQ-USER-01: 사용자 목록 조회
- 관리자는 /settings/users에서 모든 사용자 목록을 조회할 수 있어야 한다.
- 목록은 PENDING > ADMIN > USER 순, 가입일 순으로 정렬되어야 한다.

#### REQ-USER-02: 사용자 역할 변경
- 관리자는 사용자의 role을 변경(승인/강등)할 수 있어야 한다.
- PENDING 사용자에게는 '승인'/'거절' 버튼이 표시되어야 한다.

#### REQ-USER-03: 사용자 삭제
- 관리자는 사용자를 삭제할 수 있어야 한다 (본인 제외).

#### REQ-USER-04: 부서별 필터링
- 관리자는 사용자 목록을 부서별로 필터링할 수 있어야 한다.

---

### 3.11. Tracing 및 Log Proxy

#### REQ-TRACE-01: Log Proxy
- Tracing Service는 `/api/log-proxy/{trace_id}/chat/completions` API를 제공해야 한다.
- Agent가 이 Endpoint를 통해 LLM을 호출하면:
  1. Trace ID 및 API Key를 검증
  2. 실제 LLM Endpoint로 프록시
  3. 요청/응답을 DB에 저장
  4. WebSocket으로 실시간 로그 전송

#### REQ-TRACE-02: Multi-Agent Tracing
- LogEntry는 `agent_id` 필드를 포함하여, 복수 Agent의 로그를 구분해야 한다.
- LiveTrace UI는 `agent_id`에 따라 로그 항목의 배경색을 구분해야 한다.

#### REQ-TRACE-03: WebSocket 실시간 로그
- Chat Service는 WebSocket을 통해 실시간 Trace 로그를 전송해야 한다.
- WebSocket URL: `wss://a2g.company.com/ws/trace/{trace_id}/?token=<JWT_TOKEN>`

#### REQ-TRACE-04: Trace History 조회
- 시스템은 `GET /api/tracing/logs/?trace_id={uuid}` API를 제공해야 한다.
- 과거 Session의 모든 LogEntry를 반환해야 한다.

---

### 3.12. Agent Lifecycle 자동화

#### REQ-LIFECYCLE-01: 비활성 운영 Agent 정리
- 시스템(Celery)은 1달 이상 사용되지 않은 운영 Agent(status=PRODUCTION)를 자동으로 DISABLED 상태로 변경해야 한다.

#### REQ-LIFECYCLE-02: 비활성 개발 Agent 삭제
- 시스템(Celery)은 1달 이상 수정되지 않은 개발 Agent(status=DEVELOPMENT)를 자동으로 삭제해야 한다.

#### REQ-LIFECYCLE-03: 헬스 체크 실패 알림
- Agent 헬스 체크 실패 시, 시스템은 사내 메일 API를 통해 원 개발자에게 알림을 발송해야 한다.

---

### 3.13. 통계 및 모니터링 (Admin)

#### REQ-STATS-01: LLM 사용량 통계
- 관리자는 /settings/stats-usage에서 사용자별 또는 팀/부서별 LLM 모델 토큰 사용량을 조회할 수 있어야 한다.
- 기간별 그래프와 테이블로 표시되어야 한다.

#### REQ-STATS-02: Agent 사용량 통계
- 관리자는 /settings/stats-agents에서 팀/부서별 Agent 토큰 사용량을 조회할 수 있어야 한다 (차후 과제).

---

## 4. 비기능적 요구사항 (Non-Functional Requirements)

### 4.1. 성능 (Performance)

#### NFR-PERF-01: API 응답 시간
- 모든 API는 평균 200ms 이내에 응답해야 한다 (LLM 호출 제외).

#### NFR-PERF-02: WebSocket 지연 시간
- WebSocket 실시간 로그 전송은 100ms 이내 지연 시간을 가져야 한다.

#### NFR-PERF-03: 통계 API 성능
- 통계 API는 대량의 로그 데이터에서도 5초 이내에 응답해야 한다.

### 4.2. 확장성 (Scalability)

#### NFR-SCALE-01: 마이크로서비스 독립 확장
- 특정 서비스(예: Tracing Service)의 부하 증가 시, 해당 서비스만 독립적으로 확장(scale-out) 가능해야 한다.

#### NFR-SCALE-02: 수평 확장
- 모든 서비스는 Stateless 설계를 따라, 수평 확장이 가능해야 한다.

### 4.3. 보안 (Security)

#### NFR-SEC-01: 민감 정보 보호
- 사용자 API Key, LLM API Key 등 민감 정보는 안전하게 저장되어야 한다.
- API 응답 시 민감 정보는 마스킹 처리되어야 한다 (예: `sk-***abc`).

#### NFR-SEC-02: JWT 토큰 만료
- JWT Access Token은 1시간 후 만료되어야 한다.
- Refresh Token을 통해 재발급이 가능해야 한다.

#### NFR-SEC-03: Rate Limiting
- API Gateway는 1000 req/min/user의 속도 제한을 적용해야 한다.

### 4.4. 유지보수성 (Maintainability)

#### NFR-MAINT-01: 서비스별 책임 분리
- 각 서비스는 명확히 정의된 책임(SRP)을 가지며, 독립적으로 개발/테스트/배포가 가능해야 한다.

#### NFR-MAINT-02: OpenAPI 스펙 제공
- 모든 서비스는 OpenAPI 3.0 스펙을 제공해야 한다.

#### NFR-MAINT-03: API 계약 테스트
- 모든 서비스는 API 계약 테스트(Contract Testing)를 통과해야 한다.

### 4.5. 가용성 (Availability)

#### NFR-AVAIL-01: 서비스 가동률
- 플랫폼은 99.9% 이상의 가동률을 유지해야 한다.

#### NFR-AVAIL-02: 헬스 체크
- 모든 서비스는 `/health` Endpoint를 제공하여 헬스 체크를 지원해야 한다.

### 4.6. 개발 환경 (Development)

#### NFR-DEV-01: 외부 개발 환경
- 사외망에서 Mock Services를 통해 사내 인프라 없이도 완전한 기능 개발 및 테스트가 가능해야 한다.

#### NFR-DEV-02: 환경 전환
- 환경 변수 파일 교체만으로 사외망↔사내망 환경 전환이 가능해야 하며, 코드 수정이 필요하지 않아야 한다.

#### NFR-DEV-03: API-First 개발
- 명확한 API 계약(OpenAPI Spec)을 기반으로 각 서비스가 독립적으로 개발되어야 한다.

#### NFR-DEV-04: Sub-repository 구조
- 플랫폼은 **Main Repository**와 **7개의 Sub-repositories**로 구성되어야 한다.
- Git Submodules를 사용하여 Main Repository에 Sub-repositories를 포함해야 한다.
- 각 Sub-repository는 독립적으로 개발/배포 가능해야 한다.
- **상세 내용**: [GIT_SUBMODULES.md](./GIT_SUBMODULES.md) 참조

### 4.7. 다국어 및 접근성 (I18N & Accessibility)

#### NFR-I18N-01: 다국어 지원
- 플랫폼의 모든 UI 텍스트는 한국어/영어를 지원해야 한다.

#### NFR-I18N-02: 다크 모드
- 플랫폼은 라이트/다크 모드를 완벽하게 지원해야 한다.

### 4.8. 데이터 보존 (Data Retention)

#### NFR-DATA-01: Chat History 보존
- Chat History 데이터는 사용자의 명시적인 삭제 요청 전까지 보존되어야 한다.

#### NFR-DATA-02: Trace Log 보존
- Trace Log는 6개월간 보존되어야 한다.

---

## 5. 제약 조건 (Constraints)

### 5.1. 기술 제약
- **Backend**: Python (FastAPI, Celery) - 모든 서비스 통일
- **Frontend**: React 19, TypeScript, Vite, Zustand
- **Database**: PostgreSQL
- **Cache/Broker**: Redis
- **Container**: Docker, Docker Compose

### 5.2. 환경 제약
- **개발 환경**: 사외망에서 Mock Services 사용
- **테스트 환경**: 사내망에서 실제 인프라 사용
- **운영 환경**: 사내망에서 배포

### 5.3. 인력 제약
- **개발 인원**: 4명
- **개발 기간**: 6주 (Sprint 0-4)

---

## 6. 데이터 모델 요약

### 6.1. Agent

```python
{
  "id": int,
  "name": str,
  "description": str,
  "framework": str,  # "Agno" | "ADK" | "Langchain" | "Custom"
  "status": str,  # "DEVELOPMENT" | "PRODUCTION" | "DISABLED"
  "visibility": str,  # "PRIVATE" | "TEAM" | "ALL"

  # Framework별 연결 정보
  "agno_base_url": str | None,
  "agno_agent_id": str | None,
  "a2a_endpoint": str | None,

  # 메타데이터
  "capabilities": List[str],
  "embedding_vector": List[float],  # RAG용 임베딩

  # 소유자 정보
  "owner_id": int,
  "owner_username": str,
  "owner_deptname": str,

  # 상태
  "health_status": str,  # "healthy" | "unhealthy" | "unknown"
  "created_at": datetime,
  "updated_at": datetime
}
```

### 6.2. ChatSession

```python
{
  "id": int,
  "agent_id": int,
  "user_id": int,
  "trace_id": str,  # UUID
  "title": str,
  "mode": str,  # "DEVELOPMENT" | "PRODUCTION" | "UNIFIED"
  "created_at": datetime
}
```

### 6.3. ChatMessage

```python
{
  "id": int,
  "session_id": int,
  "role": str,  # "user" | "assistant"
  "content": str,
  "content_type": str,  # "text" | "markdown" | "code" | "image" | "file"
  "attachments": List[Dict],  # 파일/이미지 첨부
  "created_at": datetime
}
```

### 6.4. LogEntry (Trace)

```python
{
  "id": int,
  "trace_id": str,
  "log_type": str,  # "LLM" | "TOOL" | "AGENT_TRANSFER"
  "agent_id": str | None,  # Multi-Agent 추적용

  # LLM 호출 정보
  "model": str | None,
  "prompt": str | None,
  "completion": str | None,
  "latency_ms": int | None,
  "tokens_used": int | None,

  # Tool 호출 정보
  "tool_name": str | None,
  "tool_input": Dict | None,
  "tool_output": str | None,

  # Agent 전환 정보 (log_type="AGENT_TRANSFER")
  "from_agent_id": str | None,
  "to_agent_id": str | None,
  "transfer_reason": str | None,

  "timestamp": datetime
}
```

**Note**: `log_type`에 따라 필드가 다르게 사용됩니다:
- **LLM**: `model`, `prompt`, `completion`, `latency_ms`, `tokens_used` 필수
- **TOOL**: `tool_name`, `tool_input`, `tool_output` 필수
- **AGENT_TRANSFER**: `from_agent_id`, `to_agent_id`, `transfer_reason` 필수

---

## 7. 참고 문서

- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: 마이크로서비스 아키텍처 상세 설계
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**: 4인 팀 Sprint 계획 및 작업 분할
- **[GLOSSARY.md](./GLOSSARY.md)**: 용어 사전 (A2A, 3가지 모드, 데이터 모델)
- **[BLUEPRINT.md](./BLUEPRINT.md)**: UI/UX 디자인 명세서
- **[API_CONTRACTS.md](./API_CONTRACTS.md)**: 서비스 간 API 계약 명세서
- **[DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md)**: 외부 개발 환경 가이드
- **[MOCK_SERVICES.md](./MOCK_SERVICES.md)**: Mock SSO/DB/Redis 구현 가이드

---

## 8. 문의

- **책임 개발자**: 한승하 (syngha.han@samsung.com)
- **버그 리포트**: GitHub Issues
- **기능 제안**: GitHub Issues 또는 이메일

---

**문서 작성일**: 2025년 10월 27일
**다음 검토 예정일**: Sprint 0 종료 시
