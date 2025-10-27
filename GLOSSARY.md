# 📚 A2G Platform - 용어 사전 (Glossary)

**Version**: 2.0
**Last Updated**: 2025년 10월 27일

---

## 🎯 핵심 용어

### A2A (Agent-to-Agent) 프로토콜

**정의**: AI Agent 간 표준화된 HTTP 기반 통신 프로토콜

**핵심 구성요소**:
1. **Agent Card** (`/.well-known/agent-card.json`)
   - Agent의 메타데이터, 기능(skills), 입출력 모드 등을 정의
   - 다른 Agent가 자동으로 발견(discovery)할 수 있도록 함

2. **JSON-RPC 2.0** 기반 메시지 프로토콜
   - `message/send`: 동기 메시지 전송
   - `message/stream`: 스트리밍 메시지 전송
   - `tasks/get`: 작업 상태 조회

**프레임워크별 지원 현황**:
- **Langchain (LangGraph)**: ✅ 완전 지원 (JSON-RPC 2.0)
- **ADK (Agent Development Kit)**: ✅ 완전 지원 (`to_a2a()` 함수)
- **Agno**: ⚠️ 미지원 (자체 REST API 사용, 차후 A2A 전환 예정)

**참고**:
- [A2A 공식 스펙](https://google-a2a.github.io/A2A/latest/specification/)
- [Langchain A2A 가이드](./docs/langchain-a2a-guide.md)
- [ADK A2A 가이드](./docs/adk-a2a-guide.md)

---

## 🏗️ 플랫폼 구조

### Agent Framework

**정의**: LLM 기반 Agent를 개발하기 위한 프레임워크

**지원 프레임워크**:
1. **Agno**
   - Samsung 사내 Agent 프레임워크
   - API: `/agents/{agent_id}/runs`, `/teams/{team_id}/runs`
   - **등록 정보**: Base URL, Agent ID

2. **ADK (Agent Development Kit)**
   - Google 공식 Agent 개발 도구
   - A2A 완전 지원 (`to_a2a()`)
   - **등록 정보**: A2A Endpoint (Agent Card URL)

3. **Langchain (LangGraph)**
   - LangChain 기반 Agent 프레임워크
   - JSON-RPC 2.0 완전 지원
   - **등록 정보**: A2A Endpoint (JSON-RPC URL)

---

## 🎨 3가지 모드 ⭐ 업데이트

### 1. Workbench (워크벤치 - 개발 모드)

**이전 이름**: 개인 공간, Development Mode, 워크스페이스

**목적**: Agent 개발 및 디버깅

**주요 기능**:
- **Agent 등록**: '+' 버튼 → Framework 선택 + A2A 정보 입력
- **개인 디버깅 Space**:
  - Session별 **Chat History**
  - Session별 **Tracing History** (LLM 호출 로그)
  - **Live Trace**: WebSocket 실시간 로그 표시
  - **History 재생**: 과거 Session 선택 → Chat + Trace 자동 재연결

**Trace 연결 방식**:
- **개인 API Key**: Platform에서 발급
- **Session Endpoint**: `/api/log-proxy/{trace_id}/chat/completions`
- **Healthy LLM**: Platform에 등록된 활성 LLM

**UI 구성**:
- 좌측 Sidebar: 모드 전환 메뉴 (Workbench 활성)
- 좌측 패널: Session 목록 (새 대화 버튼)
- 중앙 패널: **TraceCapturePanel** (설정 + Live Trace)
- 우측 패널: **ChatPlayground** (메시지 입출력, 스트리밍)

**색상 테마**: 퍼플/바이올렛 계열

**URL**: `/workbench/:id`

---

### 2. Hub (허브 - 운영 모드)

**이전 이름**: 운영 공간, Production Mode, 공개 공간

**목적**: 공개된 Agent를 탐색하고 사용

**운영 전환 프로세스**:
1. 개발자가 Agent 개발 완료 (Workbench)
2. **공개 범위 선택**:
   - **전체 공개** (All): 모든 사용자
   - **팀 공개** (Team): 같은 부서/팀만
3. Platform이 Agent 상태를 `PRODUCTION`으로 변경
4. 공개 대상 사용자에게 Agent 카드 표시 (Hub)

**주요 기능**:
- **Agent 카드 목록**: 공개된 Agent들의 정보 카드 (AI 랭킹 정렬)
- **Trace 없는 Playground**: 디버깅 정보 없이 순수 Chat만 제공
- **Chat History**: Session별 대화 기록 저장

**차이점** (vs Workbench):
- ❌ TraceCapturePanel 없음
- ❌ Live Trace 없음
- ✅ Chat만 제공 (스트리밍)

**색상 테마**: 블루 계열

**URL**: `/hub/:id`

---

### 3. Flow (플로우 - 통합 모드) ⭐ 신규

**이전 이름**: 통합 Playground, Unified Playground

**별칭**: Multi-Agent Mode, Orchestration Mode

**목적**: 여러 Agent를 조합하여 복잡한 작업 수행

**주요 기능**:

1. **수동 Agent 선택**:
   - 사용자가 공개된 Agent 중 **복수 선택**
   - 선택된 Agent들을 순차/병렬 실행
   - 각 Agent의 결과를 통합하여 반환

2. **자동 Agent 선택** (AI Orchestration):
   - 사용자가 Agent 선택 안 함
   - **사용자 Request 분석** (LLM)
   - 적합한 Agent들을 자동 선택
   - 실행 순서 결정 (순차/병렬)
   - 결과 통합 및 반환

**예시**:
```
사용자: "고객 문의 데이터를 분석해서 보고서 만들어줘"

→ Platform이 자동 선택:
  1. "Customer Data Agent" (데이터 추출)
  2. "Analysis Agent" (데이터 분석)
  3. "Report Generator Agent" (보고서 생성)

→ 순차 실행 및 결과 통합
```

**기술 구현**:
- **Orchestration Service** (신규 서비스)
- Agent 선택 알고리즘: RAG + LLM 분석
- 실행 전략: Sequential / Parallel / Auto

**UI 구성** ⭐ 신규:
- Claude 스타일 미니멀 인터페이스
- 중앙에 입력창과 전송 버튼만 표시
- Agent 선택은 dropdown으로 펼쳐짐
- 각 Agent 결과는 구분되어 스트리밍 표시

**색상 테마**: 그린/틸 계열

**URL**: `/flow`

---

## 📊 데이터 모델

### Agent

**필드**:
```python
{
  "id": int,
  "name": str,                          # Agent 이름
  "description": str,                   # Agent 설명
  "framework": str,                     # "Agno" | "ADK" | "Langchain"
  "status": str,                        # "DEVELOPMENT" | "PRODUCTION" | "DISABLED"
  "visibility": str,                    # "PRIVATE" | "TEAM" | "ALL" (신규)

  # Framework별 연결 정보
  "agno_base_url": str | None,          # Agno: Base URL
  "agno_agent_id": str | None,          # Agno: Agent ID
  "a2a_endpoint": str | None,           # ADK/Langchain: A2A Endpoint

  # 메타데이터
  "capabilities": List[str],            # ["customer support", "Q&A", ...]
  "embedding_vector": List[float],      # RAG용 임베딩

  # 소유자 정보
  "owner_id": int,
  "owner_username": str,
  "owner_deptname": str,

  # 상태
  "health_status": str,                 # "healthy" | "unhealthy" | "unknown"
  "created_at": datetime,
  "updated_at": datetime
}
```

---

### ChatSession

**필드**:
```python
{
  "id": int,
  "agent_id": int,
  "user_id": int,
  "trace_id": str,                      # UUID (Tracing 연결용)
  "title": str,                         # Session 제목 (자동 생성 또는 사용자 지정)
  "mode": str,                          # "DEVELOPMENT" | "PRODUCTION" | "UNIFIED"
  "created_at": datetime
}
```

---

### ChatMessage

**필드**:
```python
{
  "id": int,
  "session_id": int,
  "role": str,                          # "user" | "assistant"
  "content": str,                       # 텍스트 내용
  "content_type": str,                  # "text" | "markdown" | "code" | "image" | "file"

  # Multi-modal 지원
  "attachments": List[Dict],            # 파일/이미지 첨부

  "created_at": datetime
}
```

**content_type별 렌더링**:
- `text`: 일반 텍스트
- `markdown`: Markdown 렌더링 (react-markdown)
- `code`: 코드 블록 + Syntax Highlighting
- `image`: 이미지 표시 (미리보기)
- `file`: 파일 다운로드 링크

---

### LogEntry (Trace)

**필드**:
```python
{
  "id": int,
  "trace_id": str,                      # ChatSession.trace_id 연결
  "log_type": str,                      # "LLM" | "TOOL"
  "agent_id": str | None,               # Multi-Agent 추적용

  # LLM 호출 정보
  "model": str,                         # "gpt-4o", "claude-3-opus", ...
  "prompt": str,                        # 입력 프롬프트
  "completion": str,                    # LLM 응답
  "latency_ms": int,                    # 응답 시간 (ms)
  "tokens_used": int,                   # 토큰 사용량

  # Tool 호출 정보
  "tool_name": str | None,
  "tool_input": Dict | None,
  "tool_output": str | None,

  "timestamp": datetime
}
```

---

## 🔧 API Endpoints 요약

### Agent Service

```
# Agent CRUD
GET    /api/agents                      - Agent 목록
POST   /api/agents                      - Agent 생성 (Framework 선택)
PATCH  /api/agents/{id}                 - Agent 수정
DELETE /api/agents/{id}                 - Agent 삭제

# 운영 전환
POST   /api/agents/{id}/deploy          - 운영 전환 (공개 범위 설정)
  Body: { "visibility": "ALL" | "TEAM" }

# 통합 Playground
POST   /api/agents/orchestrate          - 복수 Agent 실행
  Body: {
    "query": str,
    "agent_ids": List[int] | None,      # None = 자동 선택
    "execution_mode": "sequential" | "parallel"
  }
```

---

### Chat Service

```
# Session
POST   /api/chat/sessions               - Session 생성 (trace_id 자동 생성)
GET    /api/chat/sessions               - Session 목록
GET    /api/chat/sessions/{id}          - Session 상세 (메시지 포함)

# Message
POST   /api/chat/messages               - 메시지 전송
  Body: {
    "session_id": int,
    "content": str,
    "content_type": "text" | "markdown" | "code" | "image" | "file",
    "attachments": List[File]
  }

# WebSocket
WS     /ws/trace/{trace_id}             - 실시간 Trace
```

---

### Tracing Service

```
# Log Proxy (Agent가 호출)
POST   /api/log-proxy/{trace_id}/chat/completions
  Headers: { "Authorization": "Bearer {API_KEY}" }
  Body: OpenAI 호환 형식

# Trace History
GET    /api/tracing/logs?trace_id={uuid}
```

---

## 📖 Workflow 예시

### 1. 개인 공간에서 Agent 개발

```
1. 사용자 로그인
2. 개인 공간(개발 모드) 진입
3. '+' 버튼 클릭
4. Framework 선택: Agno
5. 등록 정보 입력:
   - Base URL: http://localhost:9080
   - Agent ID: customer-support-agent
6. Agent 생성 완료
7. 개인 디버깅 Space 진입:
   - '새 대화' 클릭 → Session 생성 (trace_id 자동 생성)
   - TraceCapturePanel에 표시:
     * Trace Endpoint: /api/log-proxy/{trace_id}/...
     * API Key: a2g_abc123...
   - Agno Agent 코드에 설정:
     * AGENT_LLM_ENDPOINT={Trace Endpoint}
     * AGENT_LLM_API_KEY={API Key}
8. Chat 메시지 전송: "안녕하세요"
9. Live Trace에 실시간 로그 표시:
   - LLM 호출 (gpt-4o)
   - Prompt: "..."
   - Completion: "안녕하세요! 무엇을 도와드릴까요?"
   - Latency: 850ms
10. 과거 Session 클릭:
    - Chat History 로드
    - Trace History 로드
    - WebSocket 자동 재연결 (이미 저장된 로그 표시)
```

---

### 2. 운영 전환 및 공개

```
1. Agent 개발 완료
2. '운영 전환' 버튼 클릭
3. 공개 범위 선택:
   - [ ] 전체 공개 (ALL)
   - [x] 팀 공개 (TEAM)
4. Platform 검증:
   - Agno Agent 엔드포인트 Health Check
   - 통과 시 status → PRODUCTION
5. 팀 멤버들에게 Agent 카드 표시됨
6. 팀 멤버가 운영 공간 진입:
   - Agent 카드 클릭
   - Trace 없는 Chat Playground
   - 메시지 전송 및 응답 수신
   - History 자동 저장
```

---

### 3. 통합 Playground 사용

```
1. 사용자가 통합 Playground 진입
2. 옵션 1: 수동 선택
   - "Customer Data Agent" 선택
   - "Analysis Agent" 선택
   - "Report Generator Agent" 선택
   - 실행 모드: 순차 (Sequential)
   - "데이터 분석 보고서 생성" 전송
   → Agent1 실행 → Agent2 실행 → Agent3 실행 → 최종 결과

3. 옵션 2: 자동 선택
   - Agent 선택 안 함
   - "고객 만족도 분석 보고서 만들어줘" 전송
   → Platform이 적합한 Agent들 자동 선택
   → 순차/병렬 실행 전략 결정
   → 결과 통합 및 반환
```

---

## 🔑 핵심 차이점 정리

| 항목 | 개인 공간 | 운영 공간 | 통합 Playground |
|------|----------|----------|-----------------|
| **목적** | 개발/디버깅 | Agent 사용 | 복수 Agent 조합 |
| **Trace** | ✅ Live Trace | ❌ 없음 | ⚠️ 선택적 (구현 논의) |
| **History** | Chat + Trace | Chat만 | Chat만 |
| **WebSocket** | ✅ 자동 재연결 | ❌ 없음 | ❌ 없음 |
| **Agent 수** | 1개 | 1개 | **복수** |
| **공개 범위** | 본인만 | 전체/팀 | 전체/팀 (공개된 것만) |

---

## 📞 Contact

**문의**: syngha.han@samsung.com
