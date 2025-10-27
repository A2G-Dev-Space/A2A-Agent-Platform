# 📡 API Contracts - 서비스 간 계약 명세서

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일
**목적**: 마이크로서비스 간 API 인터페이스 계약 정의

---

## 1. 📋 개요

### 1.1 목적

이 문서는 A2G Platform의 각 마이크로서비스가 제공하는 **API 계약(Contract)**을 명확히 정의하여:
- **4명의 개발자가 독립적으로 개발**할 수 있도록 합니다.
- **서비스 간 의존성을 최소화**하고, Mock 데이터로 개발을 진행할 수 있습니다.
- **통합 테스트 시 API 호환성**을 보장합니다.

### 1.2 계약 원칙

1. **OpenAPI 3.0 스펙 준수**: 모든 API는 OpenAPI 명세서를 제공해야 합니다.
2. **Versioning**: API URL에 버전 포함 (예: `/api/v1/agents/`)
3. **Error Handling**: 표준화된 에러 응답 포맷 사용
4. **Authentication**: JWT Bearer Token 기반 인증 (`Authorization: Bearer <token>`)
5. **Content-Type**: `application/json` 기본 사용

### 1.3 표준 에러 응답 포맷

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Agent with id 123 does not exist",
    "details": {
      "agent_id": 123,
      "timestamp": "2025-10-27T10:30:00Z"
    }
  }
}
```

**표준 HTTP 상태 코드**:
- `200`: 성공
- `201`: 생성 성공
- `400`: 잘못된 요청
- `401`: 인증 실패
- `403`: 권한 부족
- `404`: 리소스 없음
- `500`: 서버 오류

---

## 2. 🔐 User Service API

**책임**: 사용자 인증, 권한 관리, API Key 관리
**Base URL**: `http://localhost:8001` (개발), `https://a2g.company.com/api/users` (운영)
**개발 담당**: DEV2 (Backend Lead)

### 2.1 Authentication APIs

#### 2.1.1 SSO 로그인 시작

```http
GET /api/auth/login/
```

**응답**: 302 Redirect to SSO IdP

---

#### 2.1.2 SSO 콜백 처리

```http
POST /api/auth/callback/
Content-Type: application/x-www-form-urlencoded

id_token=<JWT_TOKEN>
```

**응답**:
```http
302 Redirect to http://frontend:9060/?token=<ACCESS_TOKEN>
```

---

#### 2.1.3 로그아웃

```http
GET /api/auth/logout/
```

**응답**: 302 Redirect to SSO Logout Page

---

### 2.2 User Management APIs

#### 2.2.1 사용자 목록 조회 (ADMIN only)

```http
GET /api/users/
Authorization: Bearer <token>
```

**쿼리 파라미터**:
- `department` (optional): 부서 필터
- `role` (optional): 역할 필터 (PENDING, USER, ADMIN)

**응답**:
```json
{
  "count": 25,
  "results": [
    {
      "id": 1,
      "username": "syngha.han",
      "username_kr": "한승하",
      "email": "syngha.han@samsung.com",
      "role": "ADMIN",
      "deptname_kr": "AI Platform Team",
      "created_at": "2025-01-15T09:00:00Z"
    }
  ]
}
```

---

#### 2.2.2 사용자 역할 변경 (ADMIN only)

```http
PATCH /api/users/{username}/role/
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "USER"
}
```

**응답**:
```json
{
  "username": "test.user",
  "role": "USER",
  "updated_at": "2025-10-27T10:30:00Z"
}
```

---

### 2.3 API Key Management

#### 2.3.1 API Key 생성

```http
POST /api/keys/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Dev Key"
}
```

**응답**:
```json
{
  "id": 5,
  "name": "My Dev Key",
  "key": "a2g_1234567890abcdef",
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

#### 2.3.2 활성 API Key 조회

```http
GET /api/keys/active/
Authorization: Bearer <token>
```

**응답**:
```json
{
  "id": 5,
  "name": "My Dev Key",
  "key": "a2g_12***def",  // 마스킹됨
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

## 3. 🤖 Agent Service API

**책임**: 에이전트 CRUD, A2A 프로토콜, AI 랭킹
**Base URL**: `http://localhost:8002` (개발), `https://a2g.company.com/api/agents` (운영)
**개발 담당**: DEV1 (SPRINT Lead)

### 3.1 Agent CRUD APIs

#### 3.1.1 에이전트 목록 조회

```http
GET /api/agents/
Authorization: Bearer <token>
```

**쿼리 파라미터**:
- `status` (optional): DEVELOPMENT, PRODUCTION, DISABLED
- `framework` (optional): Agno, Custom, ADK, Langchain
- `owner` (optional): 소유자 username

**응답**:
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "name": "Customer Support Agent",
      "description": "고객 문의 처리 에이전트",
      "framework": "Agno",
      "status": "PRODUCTION",
      "visibility": "TEAM",
      "skill_kr": "고객지원, 챗봇",
      "skill_en": "Customer Support, Chatbot",
      "logo_url": "https://cdn.example.com/logo.png",
      "card_color": "#E3F2FD",
      "owner_username": "syngha.han",
      "owner_deptname_kr": "AI Platform Team",
      "prod_endpoint": "https://agent.example.com/run",
      "health_status": "healthy",
      "created_at": "2025-10-01T09:00:00Z",
      "updated_at": "2025-10-27T10:00:00Z"
    }
  ]
}
```

---

#### 3.1.2 내 에이전트 목록 조회

```http
GET /api/agents/my/
Authorization: Bearer <token>
```

**응답**: 위와 동일하지만, 현재 사용자가 소유한 에이전트만 반환

---

#### 3.1.3 에이전트 생성

```http
POST /api/agents/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "New Agent",
  "description": "설명",
  "framework": "Agno",
  "skill_kr": "테스트",
  "skill_en": "Test",
  "logo_url": "https://cdn.example.com/logo.png",
  "card_color": "#FFEBEE"
}
```

**응답**: 201 Created + 생성된 에이전트 객체

---

#### 3.1.4 에이전트 수정

```http
PATCH /api/agents/{agent_id}/
Authorization: Bearer <token>
Content-Type: application/json

{
  "description": "업데이트된 설명",
  "card_color": "#E8F5E9"
}
```

**응답**: 200 OK + 수정된 에이전트 객체

---

#### 3.1.5 에이전트 삭제

```http
DELETE /api/agents/{agent_id}/
Authorization: Bearer <token>
```

**응답**: 204 No Content

---

### 3.2 AI Ranking API (REQ 1)

#### 3.2.1 랭킹된 에이전트 조회

```http
GET /api/agents/ranked/
Authorization: Bearer <token>
```

**쿼리 파라미터**:
- `query` (optional): 사용자 검색 쿼리 (RAG 기반 유사도 검색)

**응답**:
```json
{
  "query": "고객 지원",
  "results": [
    {
      "agent": { /* 에이전트 객체 */ },
      "similarity_score": 0.92
    },
    {
      "agent": { /* 에이전트 객체 */ },
      "similarity_score": 0.87
    }
  ]
}
```

---

### 3.3 A2A Protocol API (REQ 2)

#### 3.3.1 에이전트 등록 (A2A)

```http
POST /api/a2a/register/
Content-Type: application/json

{
  "name": "Langchain Agent",
  "framework": "Langchain",
  "endpoint": "https://my-agent.com/run",
  "capabilities": ["qa", "summarization"],
  "api_key": "a2g_external_key"
}
```

**응답**: 201 Created + Agent ID

---

## 4. 💬 Chat Service API

**책임**: 채팅 세션/메시지 관리, WebSocket 실시간 통신
**Base URL**: `http://localhost:8003` (개발), `https://a2g.company.com/api/chat` (운영)
**개발 담당**: DEV3 (Frontend + Chat Service)

### 4.1 Chat Session APIs

#### 4.1.1 세션 생성

```http
POST /api/chat/sessions/
Authorization: Bearer <token>
Content-Type: application/json

{
  "agent_id": 1,
  "title": "New Conversation"
}
```

**응답**:
```json
{
  "id": 123,
  "agent_id": 1,
  "title": "New Conversation",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "mode": "DEVELOPMENT",
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

#### 4.1.2 세션 목록 조회

```http
GET /api/chat/sessions/?agent_id=1
Authorization: Bearer <token>
```

**응답**:
```json
{
  "count": 5,
  "results": [
    {
      "id": 123,
      "agent_id": 1,
      "title": "New Conversation",
      "created_at": "2025-10-27T10:30:00Z",
      "message_count": 12
    }
  ]
}
```

---

#### 4.1.3 세션 상세 조회

```http
GET /api/chat/sessions/{session_id}/
Authorization: Bearer <token>
```

**응답**:
```json
{
  "id": 123,
  "agent_id": 1,
  "title": "New Conversation",
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "messages": [
    {
      "id": 1,
      "role": "user",
      "content": "Hello",
      "created_at": "2025-10-27T10:31:00Z"
    },
    {
      "id": 2,
      "role": "assistant",
      "content": "Hi! How can I help?",
      "created_at": "2025-10-27T10:31:05Z"
    }
  ]
}
```

---

### 4.2 Chat Message APIs

#### 4.2.1 메시지 생성

```http
POST /api/chat/messages/
Authorization: Bearer <token>
Content-Type: application/json

{
  "session_id": 123,
  "role": "user",
  "content": "What is AI?",
  "content_type": "text",
  "attachments": []
}
```

**응답**: 201 Created + 메시지 객체

---

#### 4.2.2 파일 업로드

```http
POST /api/chat/files/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<binary>
session_id=123
```

**응답**:
```json
{
  "id": 5,
  "filename": "document.pdf",
  "url": "https://cdn.example.com/files/5/document.pdf",
  "size": 1024000,
  "created_at": "2025-10-27T10:32:00Z"
}
```

---

### 4.3 WebSocket API (REQ 7)

#### 4.3.1 실시간 Trace Log 수신

```
wss://a2g.company.com/ws/trace/{trace_id}/?token=<JWT_TOKEN>
```

**메시지 포맷** (Server → Client):
```json
{
  "type": "trace_log",
  "data": {
    "id": 101,
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "log_type": "LLM",
    "agent_id": "main-agent",
    "model": "gpt-4",
    "prompt": "What is AI?",
    "completion": "AI stands for...",
    "latency_ms": 1234,
    "timestamp": "2025-10-27T10:33:00Z"
  }
}
```

---

## 5. 📊 Tracing Service API

**책임**: LLM 호출 로그 프록시, Trace 데이터 저장/조회
**Base URL**: `http://localhost:8004` (개발), `https://a2g.company.com/api/tracing` (운영)
**개발 담당**: DEV1 (SPRINT Lead)

### 5.1 Log Proxy API

#### 5.1.1 LLM 호출 프록시 (REQ 7.4)

```http
POST /api/log-proxy/{trace_id}/chat/completions
Authorization: Bearer a2g_1234567890abcdef
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "Hello"}
  ],
  "stream": true
}
```

**동작**:
1. Trace ID 및 API Key 검증
2. 실제 LLM Endpoint로 프록시
3. 요청/응답을 DB에 저장
4. WebSocket으로 실시간 로그 전송 (Chat Service로 gRPC/Pub-Sub)

**응답**: LLM 응답 스트리밍 (SSE 또는 JSON Stream)

---

### 5.2 Trace History API

#### 5.2.1 Trace 로그 조회

```http
GET /api/tracing/logs/?trace_id=550e8400-e29b-41d4-a716-446655440000
Authorization: Bearer <token>
```

**응답**:
```json
{
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "logs": [
    {
      "id": 101,
      "log_type": "LLM",
      "agent_id": "main-agent",
      "model": "gpt-4",
      "prompt": "What is AI?",
      "completion": "AI stands for Artificial Intelligence...",
      "latency_ms": 1234,
      "timestamp": "2025-10-27T10:33:00Z"
    },
    {
      "id": 102,
      "log_type": "AGENT_TRANSFER",
      "from_agent_id": "main-agent",
      "to_agent_id": "analysis-agent",
      "tool_name": "transfer_to_agent",
      "transfer_reason": "데이터 분석 필요",
      "timestamp": "2025-10-27T10:33:05Z"
    },
    {
      "id": 103,
      "log_type": "TOOL",
      "agent_id": "analysis-agent",
      "tool_name": "search_db",
      "tool_input": {"query": "customer data"},
      "tool_output": "[...]",
      "timestamp": "2025-10-27T10:33:06Z"
    }
  ]
}
```

---

### 5.3 Agent 전환 감지 (Tool 기반) ⭐ 신규

Tracing Service는 Tool 호출 로그를 분석하여 Agent 전환을 자동으로 감지하고 `AGENT_TRANSFER` 타입의 로그를 생성합니다.

#### 5.3.1 Agent 전환 감지 로직

**Framework별 감지 조건**:

**1) ADK (Agent Development Kit)**:
```python
def detect_agent_transfer_adk(tool_log: dict) -> dict | None:
    """
    ADK의 transfer_to_agent tool 사용 시 Agent 전환 감지
    """
    if tool_log.get("tool_name") == "transfer_to_agent":
        tool_input = tool_log.get("tool_input", {})

        return {
            "log_type": "AGENT_TRANSFER",
            "from_agent_id": tool_log.get("agent_id"),
            "to_agent_id": tool_input.get("target_agent"),  # ADK에서 제공
            "tool_name": "transfer_to_agent",
            "transfer_reason": tool_input.get("reason", "No reason provided"),
            "timestamp": tool_log.get("timestamp")
        }
    return None
```

**ADK Tool Input 예시**:
```json
{
  "tool_name": "transfer_to_agent",
  "tool_input": {
    "target_agent": "analysis-agent",
    "reason": "사용자 요청이 데이터 분석을 필요로 합니다",
    "context": {
      "user_query": "고객 만족도 분석해줘"
    }
  }
}
```

**2) Agno Framework**:
```python
def detect_agent_transfer_agno(tool_log: dict) -> dict | None:
    """
    Agno의 delegate_task_to_members tool 사용 시 Agent 전환 감지
    """
    if tool_log.get("tool_name") == "delegate_task_to_members":
        tool_input = tool_log.get("tool_input", {})

        return {
            "log_type": "AGENT_TRANSFER",
            "from_agent_id": tool_log.get("agent_id"),
            "to_agent_id": tool_input.get("member_id"),  # Agno에서 제공
            "tool_name": "delegate_task_to_members",
            "transfer_reason": tool_input.get("task_description", "Task delegation"),
            "timestamp": tool_log.get("timestamp")
        }
    return None
```

**Agno Tool Input 예시**:
```json
{
  "tool_name": "delegate_task_to_members",
  "tool_input": {
    "member_id": "data-analyst",
    "task_description": "고객 데이터 분석 수행",
    "priority": "high",
    "context": {
      "data_source": "customer_feedback"
    }
  }
}
```

---

#### 5.3.2 Agent 전환 로그 생성 프로세스

**Tracing Service 내부 로직**:

1. **Tool 로그 수신**:
   - LLM이 Tool을 호출하면, Tracing Service가 Tool 호출 로그를 기록

2. **Agent 전환 감지**:
   ```python
   def process_tool_log(tool_log: dict, framework: str):
       # 일반 Tool 로그 저장
       save_log(tool_log)

       # Agent 전환 감지
       transfer_log = None
       if framework == "ADK":
           transfer_log = detect_agent_transfer_adk(tool_log)
       elif framework == "Agno":
           transfer_log = detect_agent_transfer_agno(tool_log)

       # Agent 전환 로그가 감지되면 별도로 저장
       if transfer_log:
           save_log(transfer_log)
           # WebSocket으로 실시간 전송
           publish_to_websocket(transfer_log)
   ```

3. **WebSocket으로 실시간 전송**:
   - Tool 로그와 Agent Transfer 로그를 모두 WebSocket으로 전송
   - Frontend는 `log_type`에 따라 다른 UI로 렌더링

---

#### 5.3.3 Agent 전환 로그 포맷

**LogEntry (AGENT_TRANSFER)**:
```json
{
  "id": 102,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "log_type": "AGENT_TRANSFER",
  "from_agent_id": "main-agent",
  "to_agent_id": "analysis-agent",
  "tool_name": "transfer_to_agent",
  "tool_input": {
    "target_agent": "analysis-agent",
    "reason": "데이터 분석 필요"
  },
  "transfer_reason": "데이터 분석 필요",
  "timestamp": "2025-10-27T10:33:05Z"
}
```

**WebSocket 메시지 포맷**:
```json
{
  "type": "agent_transfer",
  "data": {
    "id": 102,
    "log_type": "AGENT_TRANSFER",
    "from_agent_id": "main-agent",
    "to_agent_id": "analysis-agent",
    "tool_name": "transfer_to_agent",
    "transfer_reason": "데이터 분석 필요",
    "timestamp": "2025-10-27T10:33:05Z"
  }
}
```

---

## 6. 🛠️ Admin Service API

**책임**: LLM 모델 관리, 사용자 통계, Django Admin
**Base URL**: `http://localhost:8005` (개발), `https://a2g.company.com/api/admin` (운영)
**개발 담당**: DEV2 (Backend Lead)

### 6.1 LLM Model Management

#### 6.1.1 LLM 모델 목록 조회

```http
GET /api/admin/llm-models/
Authorization: Bearer <token>
```

**쿼리 파라미터**:
- `is_active` (optional): true/false
- `health_status` (optional): healthy, unhealthy, unknown

**응답**:
```json
{
  "count": 3,
  "results": [
    {
      "id": 1,
      "name": "GPT-4",
      "endpoint": "https://api.openai.com/v1",
      "api_key": "sk-***abc",  // 마스킹됨
      "is_active": true,
      "health_status": "healthy",
      "last_health_check": "2025-10-27T10:00:00Z",
      "created_at": "2025-09-01T09:00:00Z"
    }
  ]
}
```

---

#### 6.1.2 사용 가능한 LLM 목록 조회 (REQ 2)

```http
GET /api/admin/llm-models/available/
Authorization: Bearer <token>
```

**응답**:
```json
{
  "models": [
    {
      "id": 1,
      "name": "GPT-4",
      "endpoint": "https://api.openai.com/v1"
    },
    {
      "id": 2,
      "name": "Claude-3",
      "endpoint": "https://api.anthropic.com/v1"
    }
  ]
}
```

---

#### 6.1.3 LLM 모델 생성

```http
POST /api/admin/llm-models/
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "GPT-4",
  "endpoint": "https://api.openai.com/v1",
  "api_key": "sk-1234567890abcdef",
  "is_active": true
}
```

**응답**: 201 Created + LLM 모델 객체

---

### 6.2 Statistics API

#### 6.2.1 LLM 사용량 통계

```http
GET /api/admin/stats/llm-usage/
Authorization: Bearer <token>
```

**쿼리 파라미터**:
- `start_date`: 시작 날짜 (YYYY-MM-DD)
- `end_date`: 종료 날짜
- `group_by`: user, department, model

**응답**:
```json
{
  "period": {
    "start": "2025-10-01",
    "end": "2025-10-27"
  },
  "data": [
    {
      "group": "syngha.han",
      "model": "GPT-4",
      "total_requests": 120,
      "total_tokens": 45000,
      "total_cost_usd": 2.5
    }
  ]
}
```

---

## 7. ⚙️ Worker Service (Celery Tasks)

**책임**: 비동기 작업 (헬스 체크, 정리 작업, 알림)
**실행 방식**: Celery Beat + Worker
**개발 담당**: DEV4 (Infra Lead)

### 7.1 주기적 작업 (Celery Beat)

#### 7.1.1 LLM 헬스 체크 (REQ 12)

**Task**: `check_all_llm_health`
**스케줄**: 5분마다
**동작**:
1. `admin-service` API 호출: `GET /api/admin/llm-models/?is_active=true`
2. 각 LLM의 `/chat/completions` 엔드포인트로 테스트 요청
3. 결과를 DB에 업데이트: `health_status`, `last_health_check`
4. 실패 시 사내 메일 API로 알림 발송

---

#### 7.1.2 에이전트 헬스 체크 (REQ 12)

**Task**: `check_all_agent_health`
**스케줄**: 10분마다
**동작**:
1. `agent-service` API 호출: `GET /api/agents/?status=PRODUCTION`
2. 각 에이전트의 `prod_endpoint`로 테스트 요청
3. 실패 시:
   - `agent.status = DISABLED`
   - 사내 메일 API로 원 개발자에게 알림

---

#### 7.1.3 비활성 에이전트 정리 (REQ 10, 11)

**Task**: `cleanup_inactive_agents`
**스케줄**: 매일 새벽 2시
**동작**:
1. **운영 에이전트** (status=PRODUCTION):
   - 1달 이상 사용되지 않음 (LogEntry 조회) → `status = DISABLED`
2. **개발 에이전트** (status=DEVELOPMENT):
   - 1달 이상 수정되지 않음 (updated_at 조회) → 삭제

---

## 8. 🎯 Orchestration Service API (신규 - 통합 Playground)

**책임**: 복수 Agent 조합 실행, AI 기반 Agent 자동 선택
**Base URL**: `http://localhost:8006` (개발), `https://a2g.company.com/api/orchestrate` (운영)
**개발 담당**: DEV1 (SPRINT Lead)

### 8.1 Orchestration APIs

#### 8.1.1 복수 Agent 실행 (수동 선택)

```http
POST /api/orchestrate/
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "고객 만족도 분석 보고서 만들어줘",
  "agent_ids": [1, 2, 3],
  "execution_mode": "sequential",
  "session_id": 123
}
```

**쿼리 파라미터**:
- `query` (required): 사용자 요청
- `agent_ids` (optional): 수동으로 선택한 Agent ID 목록 (없을 경우 자동 선택)
- `execution_mode` (required): `sequential` | `parallel` | `hybrid`
- `session_id` (required): Chat Session ID

**응답**:
```json
{
  "orchestration_id": "orch_abc123",
  "status": "in_progress",
  "agents": [
    {
      "agent_id": 1,
      "agent_name": "Customer Data Agent",
      "status": "completed",
      "result": "고객 문의 데이터를 추출했습니다. 총 1,234건의 문의가 발견되었습니다.",
      "latency_ms": 2500
    },
    {
      "agent_id": 2,
      "agent_name": "Analysis Agent",
      "status": "in_progress",
      "result": null,
      "latency_ms": null
    },
    {
      "agent_id": 3,
      "agent_name": "Report Generator Agent",
      "status": "pending",
      "result": null,
      "latency_ms": null
    }
  ],
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

#### 8.1.2 복수 Agent 실행 (자동 선택)

```http
POST /api/orchestrate/auto/
Authorization: Bearer <token>
Content-Type: application/json

{
  "query": "고객 문의 데이터를 분석해서 보고서 만들어줘",
  "session_id": 123
}
```

**동작**:
1. 사용자 `query`를 임베딩으로 변환
2. Agent 목록에서 Top-K RAG 기반 유사도 검색
3. LLM을 사용하여 적합한 Agent 선택 및 실행 전략 결정
4. 선택된 Agent들을 순차/병렬 실행

**응답**:
```json
{
  "orchestration_id": "orch_xyz789",
  "status": "completed",
  "selected_agents": [
    {
      "agent_id": 1,
      "agent_name": "Customer Data Agent",
      "similarity_score": 0.92,
      "reason": "고객 데이터 추출 기능이 요청과 일치"
    },
    {
      "agent_id": 2,
      "agent_name": "Analysis Agent",
      "similarity_score": 0.88,
      "reason": "데이터 분석 전문 Agent"
    },
    {
      "agent_id": 3,
      "agent_name": "Report Generator Agent",
      "similarity_score": 0.85,
      "reason": "보고서 생성 전문 Agent"
    }
  ],
  "execution_mode": "sequential",
  "final_result": "## 고객 만족도 분석 보고서\n\n### 요약\n- 전체 만족도: 87%\n...",
  "total_latency_ms": 8500,
  "created_at": "2025-10-27T10:30:00Z"
}
```

---

#### 8.1.3 Orchestration 상태 조회

```http
GET /api/orchestrate/{orchestration_id}/
Authorization: Bearer <token>
```

**응답**: 위와 동일한 포맷

---

### 8.2 Agent 선택 알고리즘

**자동 선택 프로세스**:

1. **임베딩 생성**:
   ```python
   from openai import OpenAI

   client = OpenAI()
   query_embedding = client.embeddings.create(
       input=user_query,
       model="text-embedding-ada-002"
   ).data[0].embedding
   ```

2. **Top-K RAG 검색**:
   ```python
   # FAISS 또는 Pinecone을 사용한 유사도 검색
   import faiss

   index = faiss.IndexFlatL2(1536)  # OpenAI embedding dimension
   top_k_agents = index.search(query_embedding, k=5)
   ```

3. **LLM 기반 Agent 선택**:
   ```python
   prompt = f"""
   사용자 요청: {user_query}

   사용 가능한 Agent:
   {agent_list}

   다음 작업을 수행하세요:
   1. 사용자 요청에 가장 적합한 Agent 3-5개를 선택하세요.
   2. 실행 순서를 결정하세요 (순차/병렬).
   3. 각 Agent의 역할을 설명하세요.

   JSON 형식으로 응답하세요.
   """

   response = llm.chat.completions.create(
       model="gpt-4",
       messages=[{"role": "user", "content": prompt}]
   )
   ```

4. **실행 전략 결정**:
   - **Sequential**: Agent들이 순차적으로 실행되어야 할 때 (이전 결과가 다음 Agent에 필요)
   - **Parallel**: Agent들이 독립적으로 실행 가능할 때
   - **Hybrid**: 일부는 병렬, 일부는 순차 실행

---

## 9. 🔌 Framework별 Agent 실행 API

### 9.1 Agno Framework

**Endpoint**: Agent가 제공하는 REST API

#### 9.1.1 Agent 목록 조회

```http
GET {agno_base_url}/agents
```

**응답**:
```json
{
  "agents": [
    {
      "id": "main-agent",
      "name": "Main Agent",
      "description": "Main customer support agent"
    },
    {
      "id": "analysis-agent",
      "name": "Analysis Agent",
      "description": "Data analysis agent"
    }
  ]
}
```

---

#### 9.1.2 Agent 실행

```http
POST {agno_base_url}/agents/{agent_id}/runs
Content-Type: multipart/form-data

prompt=안녕하세요
```

**응답**: SSE (Server-Sent Events) 스트리밍

```
data: {"type": "chunk", "content": "안녕하세요"}
data: {"type": "chunk", "content": "! 무엇을"}
data: {"type": "chunk", "content": " 도와드릴까요?"}
data: {"type": "done"}
```

---

#### 9.1.3 Team 목록 조회

```http
GET {agno_base_url}/teams
```

**응답**:
```json
{
  "teams": [
    {
      "id": "support-team",
      "name": "Customer Support Team",
      "agents": ["main-agent", "escalation-agent"]
    }
  ]
}
```

---

#### 9.1.4 Team 실행

```http
POST {agno_base_url}/teams/{team_id}/runs
Content-Type: multipart/form-data

prompt=고객 문의 처리해주세요
```

**응답**: SSE 스트리밍 (Agent 실행과 동일)

---

### 9.2 Langchain (LangGraph) Framework - A2A 프로토콜

**Endpoint**: Agent가 제공하는 JSON-RPC 2.0 Endpoint

#### 9.2.1 Agent Card 조회

```http
GET {a2a_endpoint}/.well-known/agent-card.json
```

**응답**:
```json
{
  "name": "My Langchain Agent",
  "description": "Q&A and summarization agent",
  "skills": ["qa", "summarization"],
  "input_modes": ["text"],
  "output_modes": ["text", "markdown"],
  "rpc_endpoint": "/rpc"
}
```

---

#### 9.2.2 동기 메시지 전송 (message/send)

```http
POST {a2a_endpoint}/rpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "content": "What is AI?"
    }
  },
  "id": 1
}
```

**응답**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "message": {
      "role": "assistant",
      "content": "AI stands for Artificial Intelligence..."
    }
  },
  "id": 1
}
```

---

#### 9.2.3 스트리밍 메시지 전송 (message/stream)

```http
POST {a2a_endpoint}/rpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "role": "user",
      "content": "Explain quantum computing"
    }
  },
  "id": 2
}
```

**응답**: SSE 스트리밍

```
data: {"jsonrpc": "2.0", "result": {"chunk": "Quantum"}, "id": 2}
data: {"jsonrpc": "2.0", "result": {"chunk": " computing"}, "id": 2}
data: {"jsonrpc": "2.0", "result": {"chunk": " is..."}, "id": 2}
data: {"jsonrpc": "2.0", "result": {"done": true}, "id": 2}
```

---

#### 9.2.4 작업 상태 조회 (tasks/get)

```http
POST {a2a_endpoint}/rpc
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "tasks/get",
  "params": {
    "task_id": "task_abc123"
  },
  "id": 3
}
```

**응답**:
```json
{
  "jsonrpc": "2.0",
  "result": {
    "task_id": "task_abc123",
    "status": "completed",
    "result": "..."
  },
  "id": 3
}
```

---

### 9.3 ADK (Agent Development Kit) Framework - A2A 프로토콜

**Endpoint**: ADK가 제공하는 A2A Endpoint

#### 9.3.1 Agent Card 조회

```http
GET {a2a_endpoint}/.well-known/agent-card.json
```

**응답**:
```json
{
  "name": "My ADK Agent",
  "description": "Customer support agent built with ADK",
  "skills": ["customer_support", "faq"],
  "input_modes": ["text"],
  "output_modes": ["text"],
  "rpc_endpoint": "/"
}
```

---

#### 9.3.2 메시지 전송

ADK Agent는 Langchain과 동일한 JSON-RPC 2.0 프로토콜을 사용합니다.

**동기 메시지**:
```http
POST {a2a_endpoint}/
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "message/send",
  "params": {
    "message": {
      "role": "user",
      "content": "Help me with my order"
    }
  },
  "id": 1
}
```

**스트리밍 메시지**:
```http
POST {a2a_endpoint}/
Content-Type: application/json

{
  "jsonrpc": "2.0",
  "method": "message/stream",
  "params": {
    "message": {
      "role": "user",
      "content": "Track my order #12345"
    }
  },
  "id": 2
}
```

**응답**: Langchain과 동일한 포맷

---

### 9.4 Custom Framework

**Endpoint**: 사용자가 정의한 HTTP Endpoint

Custom Framework는 표준화된 API가 없으므로, Platform은 다음과 같은 간단한 규칙을 따릅니다:

#### 9.4.1 메시지 전송

```http
POST {custom_endpoint}
Content-Type: application/json

{
  "message": "사용자 메시지",
  "context": {
    "session_id": 123,
    "user_id": 456
  }
}
```

**응답**:
```json
{
  "response": "Agent 응답"
}
```

또는 SSE 스트리밍:
```
data: {"chunk": "응답"}
data: {"chunk": " 텍스트"}
data: {"done": true}
```

---

## 10. 🔄 서비스 간 통신 패턴

### 10.1 Frontend → Backend

**패턴**: REST API (Axios)
**인증**: `Authorization: Bearer <JWT_TOKEN>`

**예시**:
```typescript
// frontend/src/api/agentApi.ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL;  // http://localhost:8002

export const fetchAgents = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await axios.get(`${API_BASE}/api/agents/`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.data;
};
```

---

### 10.2 Tracing Service → Chat Service (실시간 로그)

**패턴**: gRPC 또는 Redis Pub/Sub

**Option 1: gRPC**
```protobuf
// tracing.proto
service TraceLogService {
  rpc SendLog(TraceLogRequest) returns (TraceLogResponse);
}

message TraceLogRequest {
  string trace_id = 1;
  string log_type = 2;
  string data = 3;  // JSON
}
```

**Option 2: Redis Pub/Sub**
```python
# tracing-service
redis_client.publish(f"trace:{trace_id}", json.dumps(log_data))

# chat-service (TraceLogConsumer)
pubsub = redis_client.pubsub()
pubsub.subscribe(f"trace:{trace_id}")
for message in pubsub.listen():
    await self.channel_layer.group_send(...)
```

---

### 10.3 Worker Service → Other Services

**패턴**: HTTP REST API (requests/httpx)

**예시** (LLM 헬스 체크):
```python
# worker-service/tasks.py
import httpx

@celery_app.task
def check_all_llm_health():
    response = httpx.get(
        "http://admin-service:8005/api/admin/llm-models/?is_active=true",
        headers={"Authorization": f"Bearer {SERVICE_TOKEN}"}
    )
    llm_models = response.json()["results"]

    for llm in llm_models:
        # 헬스 체크 로직
        pass
```

---

## 11. 🧪 Contract Testing 가이드

### 9.1 Pact (Consumer-Driven Contracts)

**Frontend** (Consumer)와 **Agent Service** (Provider) 간 계약 테스트:

```typescript
// frontend/tests/contract/agentService.pact.test.ts
import { Pact } from '@pact-foundation/pact';

const provider = new Pact({
  consumer: 'Frontend',
  provider: 'AgentService',
  port: 8002,
});

describe('Agent Service Contract', () => {
  it('should return agent list', async () => {
    await provider.addInteraction({
      state: 'agents exist',
      uponReceiving: 'a request for agents',
      withRequest: {
        method: 'GET',
        path: '/api/agents/',
        headers: { Authorization: 'Bearer valid-token' },
      },
      willRespondWith: {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: {
          count: 1,
          results: [{ id: 1, name: 'Test Agent' }],
        },
      },
    });

    const response = await fetchAgents();
    expect(response.results).toHaveLength(1);
  });
});
```

---

### 9.2 Postman Collection

각 서비스는 Postman Collection을 제공하여 API 테스트를 간편하게 할 수 있습니다.

```bash
# Agent Service Postman Collection
services/agent-service/tests/postman/agent-service.postman_collection.json
```

**Newman으로 자동 테스트**:
```bash
newman run agent-service.postman_collection.json \
  --environment dev.postman_environment.json
```

---

## 12. 📚 OpenAPI 스펙 생성

각 서비스는 자동으로 OpenAPI 스펙을 생성해야 합니다.

**FastAPI 예시**:
```python
# services/agent-service/main.py
from fastapi import FastAPI

app = FastAPI(
    title="Agent Service API",
    version="1.0.0",
    openapi_url="/api/openapi.json",
    docs_url="/api/docs",
)

# OpenAPI 스펙 다운로드
# http://localhost:8002/api/openapi.json
```

**Django REST Framework 예시**:
```python
# services/admin-service/config/settings.py
INSTALLED_APPS = [
    'drf_spectacular',
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
}

# OpenAPI 스펙 다운로드
# http://localhost:8005/api/schema/
```

---

## 13. ⚠️ 주의사항

1. **API 변경 시 사전 공지**: API 스펙 변경 시 Slack/Email로 팀에 알립니다.
2. **하위 호환성 유지**: 기존 클라이언트가 동작하도록 Deprecation 정책을 사용합니다.
3. **Mock 데이터 일관성**: 테스트용 Mock 데이터는 `tests/fixtures/` 폴더에 JSON으로 관리합니다.
4. **Rate Limiting**: API Gateway에서 속도 제한을 설정합니다 (1000 req/min/user).

---

## 14. 📞 문의

- **API 변경 제안**: GitHub Issues에 `[API Contract]` 태그로 등록
- **계약 테스트 실패**: Slack #a2g-dev 채널에 문의
- **책임자**: syngha.han@samsung.com

---

**다음 단계**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)에서 개발자별 작업 분할 계획 확인
