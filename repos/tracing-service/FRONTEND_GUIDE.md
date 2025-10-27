# Tracing Service - Frontend 연동 가이드

## 📋 개요

Tracing Service는 LLM 로그 프록시 및 Trace 데이터 저장/조회를 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. Trace History 조회

#### 1.1 Trace 로그 목록 조회
```
GET /api/tracing/logs?trace_id={trace_id}
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": 1,
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "log_type": "LLM",
    "agent_id": "main-agent",
    "model": "gpt-4",
    "prompt": "안녕하세요",
    "completion": "안녕하세요! 무엇을 도와드릴까요?",
    "latency_ms": 850,
    "tokens_used": 120,
    "timestamp": "2025-10-27T12:00:01Z"
  },
  {
    "id": 2,
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "log_type": "TOOL",
    "agent_id": "main-agent",
    "tool_name": "search_db",
    "tool_input": {"query": "customer data"},
    "tool_output": "[{...}]",
    "latency_ms": 120,
    "timestamp": "2025-10-27T12:00:02Z"
  },
  {
    "id": 3,
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "log_type": "AGENT_TRANSFER",
    "from_agent_id": "main-agent",
    "to_agent_id": "analysis-agent",
    "transfer_reason": "데이터 분석 필요",
    "tool_name": "transfer_to_agent",
    "timestamp": "2025-10-27T12:00:03Z"
  }
]
```

### 2. WebSocket 실시간 Trace

#### 2.1 WebSocket 연결
```
wss://localhost:9050/ws/trace/{trace_id}/?token={accessToken}
```

**Message Format:**
```json
{
  "type": "log",
  "log_type": "LLM",
  "agent_id": "main-agent",
  "model": "gpt-4",
  "prompt": "안녕하세요",
  "completion": "안녕하세요! 무엇을 도와드릴까요?",
  "latency_ms": 850,
  "tokens_used": 120,
  "timestamp": "2025-10-27T12:00:01Z"
}
```

**Frontend 구현:**
```typescript
const ws = new WebSocket(
  `wss://localhost:9050/ws/trace/${traceId}/?token=${token}`
);

ws.onmessage = (event) => {
  const log = JSON.parse(event.data);
  setTraceLogs(prev => [...prev, log]);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### 3. Log Proxy (Agent가 호출)

**이 엔드포인트는 Frontend가 직접 호출하지 않습니다. Agent가 LLM 호출 시 사용합니다.**

```
POST /api/log-proxy/{trace_id}/chat/completions
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "model": "gpt-4",
  "messages": [
    {"role": "user", "content": "안녕하세요"}
  ]
}
```

## 🧪 테스트 시나리오

### 시나리오 1: Live Trace WebSocket
1. Workbench Playground로 이동
2. 새 대화 시작 (Session 생성, trace_id 발급)
3. WebSocket 자동 연결: `wss://.../ws/trace/{trace_id}/`
4. 메시지 전송: "안녕하세요"
5. Agent가 LLM 호출 시 WebSocket으로 로그 수신
6. TraceCapturePanel의 Live Trace에 실시간 표시
   - LLM Call (파란색)
   - Tool Call (초록색)
   - Agent Transfer (주황색)

### 시나리오 2: Trace History 로드
1. Playground Sidebar에서 과거 Session 클릭
2. GET `/api/tracing/logs?trace_id={trace_id}` 호출
3. TraceCapturePanel에 과거 Trace 로그 표시
4. 각 로그 타입별로 색상과 아이콘 구분
5. LLM Call 클릭 시 상세 정보 (Prompt, Completion) 확인

### 시나리오 3: Agent Transfer 표시
1. Multi-Agent가 실행되는 대화 진행
2. Agent Transfer 로그 수신:
   - `main-agent` → `analysis-agent`
   - Transfer Reason: "데이터 분석 필요"
3. TraceCapturePanel에 강조된 UI로 표시:
   - 화살표 애니메이션
   - From/To Agent 명시
   - Transfer Tool 표시

## 📁 초기 폴더 구조

```
tracing-service/
├── main.go                 # Go 메인 (또는 Rust)
├── handlers/
│   ├── log_proxy.go        # LLM 프록시
│   ├── websocket.go        # WebSocket
│   └── history.go          # Trace History
├── models/
│   └── log_entry.go
├── middleware/
│   └── auth.go
├── database/
│   └── postgres.go
├── go.mod
├── Dockerfile
└── README.md
```

## 🔑 환경 변수

```bash
DB_HOST=localhost
DB_NAME=agent_dev_platform_local
DB_USER=dev_user
DB_PASSWORD=dev_password

# LLM Endpoints
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] WebSocket 연결이 정상적으로 작동하는가?
- [ ] Live Trace에 실시간 로그가 표시되는가?
- [ ] LLM/Tool/Agent Transfer 로그가 색상으로 구분되는가?
- [ ] Agent Transfer가 강조된 UI로 표시되는가?
- [ ] Trace History 로드가 정상적으로 작동하는가?
- [ ] 과거 Session 선택 시 WebSocket이 재연결되는가?
- [ ] Reset 버튼으로 UI 초기화가 작동하는가?
- [ ] Latency와 Token 사용량이 올바르게 표시되는가?
