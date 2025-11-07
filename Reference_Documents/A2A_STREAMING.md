# Google ADK `to_a2a` 함수: Streaming 방식 및 Data 스키마 가이드

## 1. `to_a2a` 함수 개요

Google ADK(Agent Development Kit)의 `to_a2a` 함수는 기존 ADK 에이전트를 A2A(Agent-to-Agent) 프로토콜 호환 서버로 변환하는 유틸리티입니다.

### 기본 사용법

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a

# ADK 에이전트를 A2A 호환 Starlette 애플리케이션으로 변환
a2a_app = to_a2a(root_agent, port=8001)
```

### 함수 시그니처

```python
def to_a2a(
    agent: BaseAgent,
    port: int = 8000,
    host: str = "localhost",
    agent_card: Optional[Union[AgentCard, str]] = None,
    # 선택적 서비스 파라미터들 (v1.16.0+)
    session_service: Optional[SessionService] = None,
    artifact_service: Optional[ArtifactService] = None,
    memory_service: Optional[MemoryService] = None,
    credential_service: Optional[CredentialService] = None,
) -> Starlette
```

---

## 2. Streaming 방식: Server-Sent Events (SSE)

`to_a2a`를 통해 노출된 에이전트는 **Server-Sent Events (SSE)** 기반의 streaming을 지원합니다.

### 2.1 Streaming 활성화 조건

Streaming이 지원되려면:

1. **에이전트 카드에서 Capability 선언**:
```python
AgentCapabilities(
    streaming=True,  # 이 플래그 필수
)
```

2. **클라이언트 요청**: `message/stream` RPC 메서드 호출

### 2.2 SSE 연결 흐름

```
클라이언트                           A2A 서버
   |                                  |
   |------ POST /message:stream ------>|
   |                                  |
   |<----- HTTP 200 OK --------|
   |<-- Content-Type: text/event-stream
   |                                  |
   |<-- :data {...response 1...}\n\n
   |<-- :data {...response 2...}\n\n
   |<-- :data {...response N...}\n\n
   |
   |<----- Connection Close
```

### 2.3 HTTP 응답 헤더

```
HTTP/1.1 200 OK
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
Transfer-Encoding: chunked
```

---

## 3. Streaming Response 데이터 스키마

### 3.1 SendStreamingMessageResponse 구조

각 SSE 이벤트의 `data` 필드에는 `SendStreamingMessageResponse` JSON-RPC 2.0 응답 객체가 포함됩니다.

```typescript
interface SendStreamingMessageResponse {
    // JSON-RPC 필드
    jsonrpc: "2.0",
    id: string | number,
    
    // Result 필드 - 다음 중 하나를 포함:
    result?: Task | TaskStatusUpdateEvent | TaskArtifactUpdateEvent | Message,
    
    // 에러 발생 시
    error?: {
        code: number,
        message: string,
        data?: any
    }
}
```

### 3.2 Result 객체 타입별 상세 스키마

#### A. Task 객체

```typescript
interface Task {
    // 고유 식별자
    id: string,
    
    // 선택적: 클라이언트가 관련 Task들을 그룹화하기 위한 ID
    contextId?: string | null,
    
    // Task의 현재 상태
    status: TaskStatus,
    
    // Task 생성/업데이트 타임스탐프 (ISO 8601)
    timestamp?: string,
    
    // Task 실행 중 생성된 결과물 배열
    artifacts?: Artifact[] | null,
    
    // 선택적: 최근 메시지 교환 기록
    history?: Message[] | null,
    
    // 임의의 Key-Value 메타데이터
    metadata?: Record<string, any> | null
}
```

#### B. TaskStatus 객체

```typescript
interface TaskStatus {
    // Task 라이프사이클 상태
    state: TaskState,
    
    // 상태와 관련된 선택적 메시지
    message?: Message | null,
    
    // 서버가 상태를 기록한 UTC 타임스탐프 (ISO 8601)
    timestamp?: string | null
}
```

#### C. TaskState 타입

```typescript
type TaskState = 
    | "submitted"      // 서버가 수신했으나 처리 시작 안 됨
    | "working"        // 에이전트가 적극적으로 처리 중
    | "input-required" // 계속 진행하려면 추가 입력 필요 (Task 일시 중지)
    | "completed"      // Task 성공적으로 완료
    | "failed"         // Task 실패
    | "canceled"       // Task 취소됨
    | "auth-required"  // 추가 인증 필요
```

#### D. Message 객체

```typescript
interface Message {
    // 메시지 역할: "user" 또는 "agent"
    role: "user" | "agent",
    
    // 발신자가 설정한 고유 식별자
    messageId: string,
    
    // 선택적: 이 메시지가 속한 Task ID
    taskId?: string,
    
    // 선택적: 이 메시지가 속한 Context ID
    contextId?: string,
    
    // 메시지 내용의 기본 단위들의 배열
    parts: Part[],
    
    // 최종 메시지를 나타내는 플래그 (Streaming 시 중요)
    final?: boolean,
    
    // 타임스탐프
    timestamp?: string
}
```

#### E. Part 객체 (Union Type)

**TextPart**:
```typescript
interface TextPart {
    kind: "text",
    text: string,           // 텍스트 콘텐츠
    metadata?: Record<string, any>
}
```

**FilePart**:
```typescript
interface FilePart {
    kind: "file",
    file: {
        bytes?: string,     // Base64 인코딩된 파일 데이터
        uri?: string,       // 또는 파일을 가리키는 URL
        name?: string,      // 파일명
        mimeType?: string   // MIME 타입 (e.g., "application/pdf")
    },
    metadata?: Record<string, any>
}
```

**DataPart**:
```typescript
interface DataPart {
    kind: "data",
    data: { [key: string]: any },  // 구조화된 JSON 데이터
    mimeType?: string,              // MIME 타입
    metadata?: Record<string, any>
}
```

#### F. TaskStatusUpdateEvent 객체

```typescript
interface TaskStatusUpdateEvent {
    kind: "status-update",
    
    // Task 및 Context ID
    taskId: string,
    contextId?: string,
    
    // 업데이트된 상태 정보
    status: TaskStatus,
    
    // Task 스트리밍 종료를 나타내는 플래그
    final?: boolean,
    
    // 타임스탐프
    timestamp?: string
}
```

#### G. TaskArtifactUpdateEvent 객체

```typescript
interface TaskArtifactUpdateEvent {
    kind: "artifact-update",
    
    // Task 및 Context ID
    taskId: string,
    contextId?: string,
    
    // 생성되었거나 업데이트된 결과물
    artifact: Artifact,
    
    // 플래그: 기존 artifact에 추가할지 여부
    append?: boolean,
    
    // 플래그: 이것이 마지막 chunk인지 여부
    lastChunk?: boolean,
    
    // 타임스탐프
    timestamp?: string
}
```

#### H. Artifact 객체

```typescript
interface Artifact {
    // 고유 식별자
    artifactId: string,
    
    // 선택적: Artifact 이름
    name?: string,
    
    // Artifact의 콘텐츠 (Part 배열)
    parts: Part[],
    
    // 메타데이터
    metadata?: Record<string, any>,
    
    // MIME 타입
    mimeType?: string
}
```

---

## 4. Streaming 데이터 흐름 예시

### 4.1 기본 Streaming Interaction

```
=== SSE Event 1 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "id": "task-123",
    "contextId": "ctx-001",
    "status": {
      "state": "submitted",
      "timestamp": "2025-11-07T12:03:00Z"
    },
    "timestamp": "2025-11-07T12:03:00Z"
  }
}

=== SSE Event 2 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "status-update",
    "taskId": "task-123",
    "contextId": "ctx-001",
    "status": {
      "state": "working",
      "message": {
        "role": "agent",
        "messageId": "msg-001",
        "parts": [{
          "kind": "text",
          "text": "Processing your request..."
        }]
      },
      "timestamp": "2025-11-07T12:03:01Z"
    },
    "final": false
  }
}

=== SSE Event 3 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "artifact-update",
    "taskId": "task-123",
    "contextId": "ctx-001",
    "artifact": {
      "artifactId": "art-001",
      "parts": [{
        "kind": "text",
        "text": "Here's your answer..."
      }],
      "mimeType": "text/plain"
    },
    "lastChunk": false
  }
}

=== SSE Event 4 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "status-update",
    "taskId": "task-123",
    "contextId": "ctx-001",
    "status": {
      "state": "completed",
      "timestamp": "2025-11-07T12:03:02Z"
    },
    "final": true
  }
}
```

### 4.2 Multi-Part Artifact Streaming

큰 결과물은 여러 chunk로 나뉘어 streaming될 수 있습니다:

```
=== SSE Event N ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "artifact-update",
    "taskId": "task-123",
    "artifact": {
      "artifactId": "report-001",
      "parts": [{
        "kind": "text",
        "text": "[첫 번째 청크 - 보고서 시작...]"
      }],
      "mimeType": "text/plain"
    },
    "append": true,
    "lastChunk": false
  }
}

=== SSE Event N+1 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "artifact-update",
    "taskId": "task-123",
    "artifact": {
      "artifactId": "report-001",
      "parts": [{
        "kind": "text",
        "text": "[두 번째 청크...]"
      }],
      "mimeType": "text/plain"
    },
    "append": true,
    "lastChunk": false
  }
}

=== SSE Event N+2 ===
data: {
  "jsonrpc": "2.0",
  "id": "req-001",
  "result": {
    "kind": "artifact-update",
    "taskId": "task-123",
    "artifact": {
      "artifactId": "report-001",
      "parts": [{
        "kind": "text",
        "text": "[마지막 청크]"
      }],
      "mimeType": "text/plain"
    },
    "append": true,
    "lastChunk": true
  }
}
```

---

## 5. ADK에서의 Streaming 구현 (v1.16.0+)

### 5.1 에이전트 카드에서 Streaming 활성화

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from a2a.types import AgentCapabilities, AgentCard

# 방법 1: AgentCapabilities 객체 사용
card = AgentCard(
    name="my_agent",
    url="http://localhost:8001",
    capabilities=AgentCapabilities(
        streaming=True,
    ),
    # ... 기타 필드
)

a2a_app = to_a2a(root_agent, port=8001, agent_card=card)
```

### 5.2 Streaming 이벤트 처리 (클라이언트)

```python
from a2a.client.client import Client
from a2a.types import MessageSendParams, Message, TextPart, Part

# A2A 클라이언트 설정
client = Client(base_url="http://localhost:8001")

# Streaming 메시지 전송
message_params = MessageSendParams(
    message=Message(
        role="user",
        parts=[Part(root=TextPart(text="안녕하세요"))],
        messageId="msg-123"
    )
)

# Streaming 구독
async for response in client.send_message_streaming(message_params):
    if response.result:
        if hasattr(response.result, 'kind'):  # 이벤트 객체
            if response.result.kind == "status-update":
                print(f"상태: {response.result.status.state}")
            elif response.result.kind == "artifact-update":
                print(f"Artifact: {response.result.artifact.parts}")
        else:  # Task 객체
            print(f"Task ID: {response.result.id}")
```

---

## 6. Streaming vs Non-Streaming 비교

| 항목 | Streaming | Non-Streaming |
|------|-----------|---------------|
| 메서드 | `message/stream` | `message/send` |
| HTTP 응답 | SSE (지속 연결) | 단일 JSON 응답 |
| 데이터 방식 | 증분 업데이트 | 최종 결과만 |
| 사용 사례 | 긴 작업, 실시간 피드백 | 빠른 응답 |
| 응답 헤더 | `text/event-stream` | `application/json` |
| 연결 지속성 | 작업 완료까지 유지 | 즉시 종료 |

---

## 7. 주요 주의사항

### 7.1 ADK 버전 호환성

- **Streaming 지원**: v1.14.0 이상
- **Optional Services 지원**: v1.16.0 이상 (session, artifact, memory, credential services)
- **이벤트 중복 버그**: v1.16.0에서 보고됨 (향후 수정 예정)

### 7.2 Streaming 모드에서의 알려진 이슈

**v1.16.0 이슈**:
- A2A 요청 메시지가 중복으로 수신될 수 있음
- 원격 에이전트의 마지막 이벤트가 두 번 반환됨 (ADK 이벤트 + TaskArtifactUpdateEvent)

### 7.3 설계 고려사항

1. **Context ID 사용**: 관련 Task들을 그룹화하려면 `contextId` 활용
2. **Artifact 청킹**: 큰 파일은 `append`와 `lastChunk` 플래그로 재조립
3. **Error Handling**: SSE 연결 끊김 시 `tasks/resubscribe`로 재연결
4. **Timeout 관리**: 장시간 Task에 대해 적절한 timeout 설정

---

## 참고 자료

- [A2A Protocol Official Specification](https://a2a-protocol.org/latest/specification/)
- [Google ADK A2A Quickstart](https://google.github.io/adk-docs/a2a/quickstart-exposing/)
- [A2A Streaming & Async Operations](https://a2a-protocol.org/latest/topics/streaming-and-async/)
- [ADK Python Repository](https://github.com/google/adk-python)


이제 충분한 정보를 모았습니다. ADK의 `to_a2a()` 메서드의 응답 데이터 형식과 스트리밍에 대해 정리해서 답변하겠습니다.

## Google ADK `to_a2a()` 요청 응답 데이터 형식 및 스트리밍

### 응답 데이터 형식

`to_a2a()`로 래핑된 에이전트에 요청을 보내면 **JSON-RPC 2.0 기반**의 응답이 반환됩니다. 응답의 `result` 필드는 세 가지 유형의 이벤트를 포함할 수 있습니다.[1][2]

#### 응답 이벤트 유형

**1. Task (초기 응답 / 최종 응답)**

```
{
  "jsonrpc": "2.0",
  "result": {
    "taskId": "task-123abc",
    "contextId": "context-456def",
    "status": {
      "state": "completed|working|failed|canceled|input-required",
      "message": {
        "role": "agent",
        "parts": [
          {
            "text": "응답 텍스트 내용"
          }
        ]
      }
    },
    "artifacts": [...],
    "final": true  // 최종 응답 여부
  },
  "id": "request-id"
}
```

**2. TaskStatusUpdateEvent (중간 상태 업데이트)**

작업의 상태 변화를 알립니다. `task-update` kind를 가집니다.[2]

```
{
  "kind": "status-update",
  "taskId": "task-123abc",
  "contextId": "context-456def",
  "status": {
    "state": "working",
    "message": {
      "role": "agent",
      "parts": [{"text": "중간 진행 상황"}]
    }
  },
  "final": false  // 작업 완료 여부
}
```

**3. TaskArtifactUpdateEvent (결과물 스트리밍)**

생성된 아티팩트(파일, 데이터, 텍스트 등)를 청크 단위로 전송합니다.[2]

```
{
  "kind": "artifact-update",
  "taskId": "task-123abc",
  "contextId": "context-456def",
  "artifact": {
    "artifactId": "artifact-789xyz",
    "name": "생성된 파일명",
    "parts": [
      {
        "text": "아티팩트 내용 일부"
      }
    ]
  },
  "append": true,      // 이전 내용에 추가할지 여부
  "lastChunk": false   // 마지막 청크 여부
}
```

### 스트리밍 지원

**스트리밍은 완벽하게 지원됩니다**.[3]

#### 스트리밍 메커니즘

A2A 프로토콜은 **Server-Sent Events (SSE)** 기반 스트리밍을 사용합니다.[3]

- **메서드**: `message/stream` RPC 메서드로 요청하면 `Content-Type: text/event-stream` 응답을 받습니다
- **연결**: 클라이언트가 HTTP 연결을 열어두면, 서버가 계속해서 이벤트를 푸시합니다
- **이벤트 흐름**: 각 SSE 이벤트의 `data` 필드에 완전한 JSON-RPC 2.0 응답 객체가 포함됩니다[2]

#### 스트리밍 처리 워크플로우[2]

1. 클라이언트가 `message/stream` 요청 발송
2. 서버가 초기 `Task` 객체 반환
3. 서버가 작업 중 `TaskStatusUpdateEvent` 전송 (상태 업데이트)
4. 서버가 `TaskArtifactUpdateEvent` 전송 (결과물 청크 - `append`/`lastChunk` 플래그 활용)
5. 작업 완료 시 `final: true` 플래그가 설정된 이벤트 전송
6. SSE 연결 종료

### ADK Agent 구현에서의 스트리밍

ADK의 `invoke()` 메서드는 비동기 제너레이터로 구현되어 있습니다.[4]

```python
from google.adk.a2a.utils.agent_to_a2a import to_a2a

root_agent = Agent(
    model='gemini-2.0-flash',
    name='my_agent',
    # 에이전트 정의...
)

a2a_app = to_a2a(root_agent, port=8001)
```

에이전트의 `invoke()` 메서드는 이벤트를 `yield`로 반환하므로, 자동으로 스트리밍 응답으로 변환됩니다.[4]

### 실제 스트리밍 데이터 예시

```
data: {"jsonrpc":"2.0","result":{"taskId":"task-123","contextId":"ctx-456","status":{"state":"working"},"final":false},"id":"1"}

data: {"jsonrpc":"2.0","result":{"kind":"artifact-update","taskId":"task-123","artifact":{"parts":[{"text":"첫번째 청크"}]},"append":false,"lastChunk":false},"id":"1"}

data: {"jsonrpc":"2.0","result":{"kind":"artifact-update","taskId":"task-123","artifact":{"parts":[{"text":"두번째 청크"}]},"append":true,"lastChunk":true},"id":"1"}

data: {"jsonrpc":"2.0","result":{"taskId":"task-123","status":{"state":"completed"},"final":true},"id":"1"}
```

### 요약

- **데이터 형식**: JSON-RPC 2.0 기반, `Task` / `TaskStatusUpdateEvent` / `TaskArtifactUpdateEvent`의 세 가지 이벤트 타입
- **중간 응답**: `TaskStatusUpdateEvent`로 상태 변화와 중간 메시지 전달
- **최종 응답**: `final: true` 플래그가 설정된 Task 객체
- **스트리밍**: SSE 기반으로 완전히 지원되며, 큰 결과물은 `append`/`lastChunk` 플래그를 활용해 청크 단위로 전송
