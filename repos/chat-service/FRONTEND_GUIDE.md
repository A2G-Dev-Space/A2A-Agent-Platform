# Chat Service - Frontend 연동 가이드

## 📋 개요

Chat Service는 Chat 세션/메시지 관리 및 스트리밍 응답 기능을 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. Chat Session 관리

#### 1.1 Session 생성
```
POST /api/chat/sessions/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "agent_id": 1,
  "mode": "DEVELOPMENT"
}
```

**Response:**
```json
{
  "id": 1,
  "agent_id": 1,
  "user_id": 1,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "New Chat",
  "mode": "DEVELOPMENT",
  "created_at": "2025-10-27T12:00:00Z"
}
```

#### 1.2 Session 목록 조회
```
GET /api/chat/sessions?agent_id={agent_id}
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": 1,
    "agent_id": 1,
    "trace_id": "550e8400-e29b-41d4-a716-446655440000",
    "title": "고객 문의 대화",
    "mode": "DEVELOPMENT",
    "message_count": 12,
    "created_at": "2025-10-27T12:00:00Z"
  }
]
```

#### 1.3 Session 상세 조회 (메시지 포함)
```
GET /api/chat/sessions/{id}/
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "id": 1,
  "agent_id": 1,
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "고객 문의 대화",
  "mode": "DEVELOPMENT",
  "messages": [
    {
      "id": 1,
      "session_id": 1,
      "role": "user",
      "content": "안녕하세요",
      "content_type": "text",
      "created_at": "2025-10-27T12:00:00Z"
    },
    {
      "id": 2,
      "session_id": 1,
      "role": "assistant",
      "content": "안녕하세요! 무엇을 도와드릴까요?",
      "content_type": "text",
      "created_at": "2025-10-27T12:00:01Z"
    }
  ],
  "created_at": "2025-10-27T12:00:00Z"
}
```

#### 1.4 Session 삭제
```
DELETE /api/chat/sessions/{id}/
Authorization: Bearer {accessToken}
```

### 2. Chat Message 전송

#### 2.1 메시지 전송 (스트리밍)
```
POST /api/chat/messages/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "session_id": 1,
  "content": "제품 반품 방법을 알려주세요",
  "content_type": "text"
}
```

**Response (Server-Sent Events):**
```
data: {"type": "start", "message_id": 3}

data: {"type": "content", "content": "제품"}

data: {"type": "content", "content": " 반품은"}

data: {"type": "content", "content": " 다음과 같이"}

data: {"type": "done", "message_id": 3, "full_content": "제품 반품은 다음과 같이..."}
```

**Frontend 구현:**
```typescript
const eventSource = new EventSource(
  `/api/chat/messages/stream/${messageId}?token=${token}`
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === 'content') {
    setStreamingContent(prev => prev + data.content);
  } else if (data.type === 'done') {
    setIsStreaming(false);
    eventSource.close();
  }
};
```

#### 2.2 파일 업로드
```
POST /api/chat/upload/
Authorization: Bearer {accessToken}
Content-Type: multipart/form-data

file: [File]
```

**Response:**
```json
{
  "filename": "document.pdf",
  "url": "https://storage.company.com/uploads/abc123.pdf",
  "size": 1024000
}
```

## 🧪 테스트 시나리오

### 시나리오 1: 새 대화 시작
1. Playground Sidebar에서 "+ 새 대화" 버튼 클릭
2. POST `/api/chat/sessions/` 호출
3. 새 Session 생성 (trace_id 자동 생성)
4. ChatPlayground UI 초기화
5. TraceCapturePanel에 trace_id 표시

### 시나리오 2: 메시지 전송 (스트리밍)
1. ChatInput에 메시지 입력: "제품 반품 방법을 알려주세요"
2. POST `/api/chat/messages/` 호출
3. 스트리밍 시작 (커서 애니메이션 표시)
4. 메시지가 실시간으로 렌더링됨
5. 스트리밍 완료 후 메시지 목록에 추가

### 시나리오 3: History 복구
1. Playground Sidebar에서 과거 Session 클릭
2. GET `/api/chat/sessions/{id}/` 호출
3. ChatPlayground에 메시지 목록 표시
4. TraceCapturePanel에 Trace History 로드

## 📁 초기 폴더 구조

```
chat-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py           # ChatSession, ChatMessage
│   ├── schemas.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── sessions.py     # Session CRUD
│   │   ├── messages.py     # Message 전송
│   │   └── upload.py       # 파일 업로드
│   ├── services/
│   │   ├── __init__.py
│   │   ├── agent_client.py # Agent 호출
│   │   └── streaming.py    # SSE 스트리밍
│   └── dependencies.py
├── tests/
├── requirements.txt        # FastAPI, sse-starlette
├── Dockerfile
└── README.md
```

## 🔑 환경 변수

```bash
DB_HOST=localhost
DB_NAME=agent_dev_platform_local
DB_USER=dev_user
DB_PASSWORD=dev_password

# File Storage
STORAGE_BACKEND="local"  # or "s3"
STORAGE_LOCAL_PATH="./uploads"
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] 새 Session 생성이 정상적으로 작동하는가?
- [ ] Session 목록이 최신순으로 정렬되는가?
- [ ] 메시지 전송 시 스트리밍이 작동하는가?
- [ ] 스트리밍 중 커서 애니메이션이 표시되는가?
- [ ] 과거 Session 클릭 시 History가 복구되는가?
- [ ] 파일 업로드가 정상적으로 작동하는가?
- [ ] Session 삭제가 정상적으로 작동하는가?
- [ ] Markdown/Code 렌더링이 올바르게 작동하는가?
