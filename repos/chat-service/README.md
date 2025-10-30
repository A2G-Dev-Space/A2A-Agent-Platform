# 💬 Chat Service - A2G Platform

**포트**: 8003
**담당자**: DEV2 (이병주)
**기술 스택**: FastAPI, WebSocket, PostgreSQL, Redis Pub/Sub, Socket.IO

---

## 📋 목차

1. [개요](#개요)
2. [주요 기능](#주요-기능)
3. [빠른 시작](#빠른-시작)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 명세](#api-명세)
6. [WebSocket 프로토콜](#websocket-프로토콜)
7. [Redis Pub/Sub](#redis-pubsub)
8. [환경 변수](#환경-변수)
9. [테스트 가이드](#테스트-가이드)
10. [문제 해결](#문제-해결)

---

## 개요

Chat Service는 A2G Platform의 실시간 채팅 및 메시지 스트리밍을 담당하는 서비스입니다. WebSocket을 통한 양방향 통신, Redis Pub/Sub를 이용한 확장 가능한 메시지 브로드캐스팅을 지원합니다.

### 아키텍처에서의 위치
```
Frontend(9060) → WebSocket → API Gateway(9050) → Chat Service(8003)
                                                        ↓
                                                  PostgreSQL (세션/메시지 저장)
                                                        ↓
                                                  Redis Pub/Sub (실시간 브로드캐스트)
```

---

## 주요 기능

### 핵심 기능
- **WebSocket 연결 관리**: 실시간 양방향 통신
- **메시지 스트리밍**: Token 단위 실시간 스트리밍
- **세션 관리**: 채팅 세션 생성/삭제/복원
- **Redis Pub/Sub**: 다중 서버 간 메시지 동기화
- **타이핑 인디케이터**: 실시간 입력 상태 표시
- **메시지 히스토리**: 세션별 메시지 저장 및 조회
- **파일 첨부**: 이미지/문서 업로드 지원

### 메시지 타입
- **user_message**: 사용자가 보낸 메시지
- **agent_message**: 에이전트 응답
- **system_message**: 시스템 알림
- **typing_indicator**: 타이핑 상태
- **file_attachment**: 파일 첨부
- **stream_start**: 스트리밍 시작
- **stream_chunk**: 스트리밍 청크
- **stream_end**: 스트리밍 종료

---

## 빠른 시작

### 방법 1: Docker Compose 사용 (권장)
```bash
# 프로젝트 루트에서
./start-dev.sh setup   # 최초 1회 - DB 초기화
./start-dev.sh full    # 모든 서비스 실행
```

### 방법 2: 로컬 개발 환경
```bash
# 1. Docker에서 이 서비스만 중지
docker stop a2g-chat-service

# 2. 로컬 환경 설정
cd repos/chat-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<EOF
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/chat_service_db
REDIS_URL=redis://localhost:6379/2
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
SERVICE_PORT=8003
EOF

# 4. DB 마이그레이션
alembic upgrade head

# 5. 서비스 실행
uvicorn app.main:app --reload --port 8003
```

---

## 데이터베이스 스키마

### Chat Sessions 테이블
```sql
CREATE TABLE chat_sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE NOT NULL,
    trace_id VARCHAR(100) UNIQUE,           -- 추적용 UUID
    user_id VARCHAR(100) NOT NULL,
    agent_id INTEGER,
    title VARCHAR(200),
    status VARCHAR(20) DEFAULT 'active',     -- active/archived/deleted
    metadata JSONB,                          -- 추가 메타데이터
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP,

    CONSTRAINT check_status CHECK (status IN ('active', 'archived', 'deleted'))
);

CREATE INDEX idx_chat_sessions_user_id ON chat_sessions(user_id);
CREATE INDEX idx_chat_sessions_agent_id ON chat_sessions(agent_id);
CREATE INDEX idx_chat_sessions_trace_id ON chat_sessions(trace_id);
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
```

### Chat Messages 테이블
```sql
CREATE TABLE chat_messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
    message_id VARCHAR(100) UNIQUE NOT NULL,
    sender_type VARCHAR(20) NOT NULL,        -- user/agent/system
    sender_id VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL,       -- text/stream/file/system
    content TEXT,
    metadata JSONB,                          -- 파일 정보, 스트리밍 상태 등
    tokens_used INTEGER,
    latency_ms INTEGER,
    is_edited BOOLEAN DEFAULT FALSE,
    edited_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_sender_type CHECK (sender_type IN ('user', 'agent', 'system')),
    CONSTRAINT check_message_type CHECK (message_type IN ('text', 'stream', 'file', 'system'))
);

CREATE INDEX idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX idx_chat_messages_sender_id ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
```

### Chat Files 테이블
```sql
CREATE TABLE chat_files (
    id SERIAL PRIMARY KEY,
    message_id VARCHAR(100) REFERENCES chat_messages(message_id) ON DELETE CASCADE,
    file_id VARCHAR(100) UNIQUE NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),                  -- image/pdf/text/etc
    file_size INTEGER,                       -- bytes
    file_url VARCHAR(500),
    thumbnail_url VARCHAR(500),
    uploaded_by VARCHAR(100),
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_chat_files_message_id ON chat_files(message_id);
CREATE INDEX idx_chat_files_uploaded_by ON chat_files(uploaded_by);
```

### Active Connections 테이블 (Redis에 저장)
```python
# Redis 키 구조
ws:connections:{user_id} = {
    "connection_id": "conn_123",
    "session_id": "sess_456",
    "connected_at": "2025-10-29T10:30:00Z",
    "last_ping": "2025-10-29T10:35:00Z"
}

ws:sessions:{session_id} = [
    "user_id_1",
    "user_id_2"  # 동일 세션에 여러 사용자
]
```

---

## API 명세

### 1. 세션 관리 엔드포인트

#### POST /api/chat/sessions
새 채팅 세션 생성

**Request:**
```json
{
  "agent_id": 1,
  "title": "Customer Support Chat",
  "metadata": {
    "purpose": "product_inquiry",
    "priority": "high"
  }
}
```

**Response (201):**
```json
{
  "session_id": "sess_abc123",
  "trace_id": "trace_xyz789",
  "user_id": "syngha.han",
  "agent_id": 1,
  "title": "Customer Support Chat",
  "status": "active",
  "created_at": "2025-10-29T10:30:00Z"
}
```

#### GET /api/chat/sessions
사용자의 세션 목록 조회

**Query Parameters:**
- `status`: 상태 필터 (active/archived)
- `agent_id`: 에이전트 필터
- `limit`: 결과 수 제한
- `offset`: 페이징 오프셋

**Response (200):**
```json
{
  "sessions": [
    {
      "session_id": "sess_abc123",
      "title": "Customer Support Chat",
      "agent_id": 1,
      "agent_name": "Support Bot",
      "last_message": "도움이 필요하시면 말씀해주세요.",
      "last_message_at": "2025-10-29T10:35:00Z",
      "unread_count": 2,
      "status": "active"
    }
  ],
  "total": 15,
  "has_more": true
}
```

#### GET /api/chat/sessions/{session_id}
세션 상세정보 조회

**Response (200):**
```json
{
  "session_id": "sess_abc123",
  "trace_id": "trace_xyz789",
  "user_id": "syngha.han",
  "agent_id": 1,
  "agent": {
    "id": 1,
    "name": "Support Bot",
    "avatar_url": "/avatars/support-bot.png"
  },
  "title": "Customer Support Chat",
  "status": "active",
  "metadata": {
    "purpose": "product_inquiry"
  },
  "participants": ["syngha.han"],
  "message_count": 42,
  "created_at": "2025-10-29T10:30:00Z",
  "last_activity": "2025-10-29T11:45:00Z"
}
```

#### DELETE /api/chat/sessions/{session_id}
세션 삭제 (soft delete)

**Response (200):**
```json
{
  "message": "Session archived successfully",
  "session_id": "sess_abc123"
}
```

### 2. 메시지 관리 엔드포인트

#### GET /api/chat/sessions/{session_id}/messages
세션 메시지 조회

**Query Parameters:**
- `limit`: 메시지 수 (기본: 50)
- `before`: 특정 시간 이전 메시지
- `after`: 특정 시간 이후 메시지

**Response (200):**
```json
{
  "messages": [
    {
      "message_id": "msg_001",
      "sender_type": "user",
      "sender_id": "syngha.han",
      "message_type": "text",
      "content": "안녕하세요, 도움이 필요합니다.",
      "created_at": "2025-10-29T10:30:00Z"
    },
    {
      "message_id": "msg_002",
      "sender_type": "agent",
      "sender_id": "1",
      "message_type": "text",
      "content": "안녕하세요! 무엇을 도와드릴까요?",
      "metadata": {
        "tokens_used": 15,
        "latency_ms": 234
      },
      "created_at": "2025-10-29T10:30:05Z"
    }
  ],
  "has_more": true,
  "total": 42
}
```

#### POST /api/chat/sessions/{session_id}/messages
메시지 전송 (HTTP 대안)

**Request:**
```json
{
  "content": "제품 교환 문의입니다.",
  "message_type": "text",
  "metadata": {
    "client_id": "web",
    "device": "desktop"
  }
}
```

**Response (201):**
```json
{
  "message_id": "msg_003",
  "status": "sent",
  "created_at": "2025-10-29T10:31:00Z"
}
```

#### POST /api/chat/sessions/{session_id}/messages/stream
스트리밍 응답 (SSE)

**Request:**
```json
{
  "content": "긴 설명이 필요한 질문입니다.",
  "stream": true
}
```

**Response (SSE):**
```
data: {"type": "stream_start", "message_id": "msg_004"}

data: {"type": "stream_chunk", "content": "답변을 "}

data: {"type": "stream_chunk", "content": "스트리밍으로 "}

data: {"type": "stream_chunk", "content": "전송합니다."}

data: {"type": "stream_end", "tokens_used": 25, "latency_ms": 1523}
```

### 3. 파일 업로드 엔드포인트

#### POST /api/chat/sessions/{session_id}/files
파일 업로드

**Request (multipart/form-data):**
```
file: (binary)
message: "이 이미지를 분석해주세요."
```

**Response (201):**
```json
{
  "file_id": "file_001",
  "file_url": "/files/file_001",
  "thumbnail_url": "/files/file_001/thumb",
  "message_id": "msg_005",
  "file_info": {
    "name": "screenshot.png",
    "type": "image/png",
    "size": 245632
  }
}
```

---

## WebSocket 프로토콜

### WebSocket 연결
```javascript
// 연결 URL
ws://localhost:8003/ws/{session_id}?token={jwt_token}
```

### 메시지 형식

#### 클라이언트 → 서버

**텍스트 메시지:**
```json
{
  "type": "message",
  "content": "안녕하세요",
  "timestamp": "2025-10-29T10:30:00Z"
}
```

**타이핑 인디케이터:**
```json
{
  "type": "typing",
  "is_typing": true
}
```

**파일 첨부:**
```json
{
  "type": "file",
  "file_id": "file_001",
  "message": "이미지를 확인해주세요"
}
```

#### 서버 → 클라이언트

**일반 메시지:**
```json
{
  "type": "message",
  "message_id": "msg_123",
  "sender_type": "agent",
  "sender_id": "1",
  "content": "답변입니다.",
  "timestamp": "2025-10-29T10:30:05Z"
}
```

**스트리밍 시작:**
```json
{
  "type": "stream_start",
  "message_id": "msg_124",
  "sender_type": "agent"
}
```

**스트리밍 청크:**
```json
{
  "type": "stream_chunk",
  "message_id": "msg_124",
  "content": "부분 ",
  "index": 0
}
```

**스트리밍 종료:**
```json
{
  "type": "stream_end",
  "message_id": "msg_124",
  "tokens_used": 150,
  "latency_ms": 2341
}
```

**시스템 메시지:**
```json
{
  "type": "system",
  "event": "user_joined",
  "user_id": "another.user",
  "timestamp": "2025-10-29T10:35:00Z"
}
```

**에러:**
```json
{
  "type": "error",
  "code": "RATE_LIMIT",
  "message": "Too many messages",
  "retry_after": 5000
}
```

### WebSocket 연결 관리

```python
# app/websocket/manager.py
from typing import Dict, List
import asyncio
from fastapi import WebSocket

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.user_sessions: Dict[str, str] = {}

    async def connect(self, websocket: WebSocket, session_id: str, user_id: str):
        await websocket.accept()

        # 세션별 연결 관리
        if session_id not in self.active_connections:
            self.active_connections[session_id] = []
        self.active_connections[session_id].append(websocket)

        # 사용자-세션 매핑
        self.user_sessions[user_id] = session_id

        # Redis에 연결 정보 저장
        await self.redis.setex(
            f"ws:connections:{user_id}",
            300,  # 5분 TTL
            json.dumps({
                "session_id": session_id,
                "connected_at": datetime.utcnow().isoformat()
            })
        )

    async def disconnect(self, websocket: WebSocket, session_id: str):
        if session_id in self.active_connections:
            self.active_connections[session_id].remove(websocket)
            if not self.active_connections[session_id]:
                del self.active_connections[session_id]

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: str, session_id: str):
        if session_id in self.active_connections:
            for connection in self.active_connections[session_id]:
                await connection.send_text(message)
```

---

## Redis Pub/Sub

### Pub/Sub 채널 구조

```python
# 채널 이름 규칙
chat:session:{session_id}     # 세션별 메시지
chat:user:{user_id}           # 사용자별 알림
chat:typing:{session_id}      # 타이핑 인디케이터
chat:presence:{session_id}    # 사용자 입장/퇴장
```

### Redis Pub/Sub 구현

```python
# app/services/pubsub.py
import aioredis
import asyncio
import json

class PubSubService:
    def __init__(self):
        self.redis = None
        self.pubsub = None

    async def connect(self):
        self.redis = await aioredis.create_redis_pool(
            'redis://localhost:6379/2',
            encoding='utf-8'
        )
        self.pubsub = self.redis.pubsub()

    async def publish_message(self, session_id: str, message: dict):
        """세션에 메시지 발행"""
        channel = f"chat:session:{session_id}"
        await self.redis.publish(channel, json.dumps(message))

    async def subscribe_session(self, session_id: str):
        """세션 구독"""
        channel = f"chat:session:{session_id}"
        await self.pubsub.subscribe(channel)

        async for message in self.pubsub.listen():
            if message['type'] == 'message':
                yield json.loads(message['data'])

    async def publish_typing(self, session_id: str, user_id: str, is_typing: bool):
        """타이핑 상태 발행"""
        channel = f"chat:typing:{session_id}"
        await self.redis.publish(channel, json.dumps({
            "user_id": user_id,
            "is_typing": is_typing,
            "timestamp": datetime.utcnow().isoformat()
        }))
```

---

## 환경 변수

### 개발 환경 (.env.local)
```bash
# Service Settings
SERVICE_NAME=chat-service
SERVICE_PORT=8003
DEBUG=true
LOG_LEVEL=DEBUG

# Database
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/chat_service_db
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Redis
REDIS_URL=redis://localhost:6379/2
REDIS_MAX_CONNECTIONS=50
REDIS_POOL_SIZE=10

# JWT (same as user-service)
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
JWT_ALGORITHM=HS256

# WebSocket Settings
WS_MAX_CONNECTIONS=1000
WS_HEARTBEAT_INTERVAL=30  # seconds
WS_CONNECTION_TIMEOUT=300  # seconds
WS_MESSAGE_SIZE_LIMIT=65536  # 64KB

# Streaming Settings
STREAM_CHUNK_SIZE=10  # characters
STREAM_DELAY_MS=50    # milliseconds between chunks

# File Upload
MAX_FILE_SIZE=10485760  # 10MB
ALLOWED_FILE_TYPES=["image/jpeg", "image/png", "application/pdf", "text/plain"]
FILE_STORAGE_PATH=/tmp/chat-files

# Rate Limiting
RATE_LIMIT_ENABLED=false
RATE_LIMIT_MESSAGES_PER_MINUTE=60

# CORS
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
```

### 운영 환경 (.env.production)
```bash
# Database (회사 DB)
DATABASE_URL=postgresql://prod_user:${VAULT_DB_PASSWORD}@prod-db.company.com:5432/chat_service_db

# Redis (회사 Redis)
REDIS_URL=redis://:${VAULT_REDIS_PASSWORD}@prod-redis.company.com:6379/2

# WebSocket Settings
WS_MAX_CONNECTIONS=10000
WS_USE_SSL=true

# File Storage (S3)
FILE_STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=${VAULT_AWS_KEY}
AWS_SECRET_ACCESS_KEY=${VAULT_AWS_SECRET}
S3_BUCKET_NAME=a2g-chat-files

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MESSAGES_PER_MINUTE=100
```

---

## 테스트 가이드

### 1. 브라우저 콘솔 WebSocket 테스트

Frontend (http://localhost:9060)에서 F12를 눌러 콘솔을 열고:

```javascript
// 1. WebSocket 연결 테스트
const testWebSocket = () => {
  const token = localStorage.getItem('accessToken');
  const sessionId = 'test-session-' + Date.now();
  const ws = new WebSocket(`ws://localhost:8003/ws/${sessionId}?token=${token}`);

  ws.onopen = () => {
    console.log('✅ WebSocket 연결됨');

    // 메시지 전송
    ws.send(JSON.stringify({
      type: 'message',
      content: '안녕하세요! 테스트 메시지입니다.',
      timestamp: new Date().toISOString()
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📨 메시지 수신:', data);

    // 메시지 타입별 처리
    switch(data.type) {
      case 'message':
        console.log(`[${data.sender_type}]: ${data.content}`);
        break;
      case 'stream_chunk':
        process.stdout.write(data.content);
        break;
      case 'stream_end':
        console.log('\n스트리밍 완료. 토큰:', data.tokens_used);
        break;
    }
  };

  ws.onerror = (error) => {
    console.error('❌ WebSocket 오류:', error);
  };

  ws.onclose = (event) => {
    console.log(`🔌 연결 종료. 코드: ${event.code}, 이유: ${event.reason}`);
  };

  return ws;
};

const ws = testWebSocket();

// 2. 타이핑 인디케이터 테스트
const sendTyping = (isTyping) => {
  ws.send(JSON.stringify({
    type: 'typing',
    is_typing: isTyping
  }));
};

// 3. 연속 메시지 테스트
const sendMultipleMessages = () => {
  const messages = [
    '첫 번째 메시지',
    '두 번째 메시지',
    '세 번째 메시지'
  ];

  messages.forEach((msg, index) => {
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'message',
        content: msg,
        timestamp: new Date().toISOString()
      }));
    }, index * 1000);
  });
};

// 4. 스트리밍 시뮬레이션
const simulateStreaming = () => {
  const text = "이것은 스트리밍 테스트입니다. 한 글자씩 전송됩니다.";
  const chunks = text.split('');

  ws.send(JSON.stringify({
    type: 'stream_start',
    message_id: 'stream_' + Date.now()
  }));

  chunks.forEach((chunk, index) => {
    setTimeout(() => {
      ws.send(JSON.stringify({
        type: 'stream_chunk',
        content: chunk,
        index: index
      }));
    }, index * 100);
  });

  setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'stream_end',
      tokens_used: text.length,
      latency_ms: text.length * 100
    }));
  }, chunks.length * 100);
};

// 실행
sendTyping(true);
setTimeout(() => sendTyping(false), 3000);
sendMultipleMessages();
setTimeout(simulateStreaming, 5000);
```

### 2. 세션 API 테스트

```javascript
// 세션 생성 및 메시지 전송
const testChatSession = async () => {
  const token = localStorage.getItem('accessToken');

  // 1. 세션 생성
  const sessionRes = await fetch('/api/chat/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      agent_id: 1,
      title: 'Test Chat Session'
    })
  });
  const session = await sessionRes.json();
  console.log('Created Session:', session);

  // 2. 메시지 전송
  const msgRes = await fetch(`/api/chat/sessions/${session.session_id}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      content: 'HTTP를 통한 메시지 전송 테스트',
      message_type: 'text'
    })
  });
  console.log('Message Sent:', await msgRes.json());

  // 3. 메시지 조회
  const historyRes = await fetch(`/api/chat/sessions/${session.session_id}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Message History:', await historyRes.json());

  // 4. 세션 목록 조회
  const sessionsRes = await fetch('/api/chat/sessions', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('My Sessions:', await sessionsRes.json());

  return session.session_id;
};

testChatSession();
```

### 3. 파일 업로드 테스트

```javascript
// 파일 업로드 테스트
const testFileUpload = async (sessionId) => {
  const token = localStorage.getItem('accessToken');

  // 테스트 파일 생성
  const blob = new Blob(['Hello, World!'], { type: 'text/plain' });
  const file = new File([blob], 'test.txt', { type: 'text/plain' });

  const formData = new FormData();
  formData.append('file', file);
  formData.append('message', '파일을 업로드합니다.');

  const res = await fetch(`/api/chat/sessions/${sessionId}/files`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });

  console.log('File Upload Result:', await res.json());
};
```

### 4. Python WebSocket 클라이언트 테스트

```python
# tests/test_websocket.py
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8003/ws/test-session?token=your-jwt-token"

    async with websockets.connect(uri) as websocket:
        # 메시지 전송
        await websocket.send(json.dumps({
            "type": "message",
            "content": "Python 클라이언트 테스트",
            "timestamp": "2025-10-29T10:30:00Z"
        }))

        # 메시지 수신
        response = await websocket.recv()
        print(f"Received: {response}")

        # 타이핑 인디케이터
        await websocket.send(json.dumps({
            "type": "typing",
            "is_typing": True
        }))

        # 계속 수신
        async for message in websocket:
            data = json.loads(message)
            print(f"Message type: {data['type']}")
            if data['type'] == 'stream_end':
                break

asyncio.run(test_websocket())
```

### 5. 부하 테스트

```python
# tests/load_test.py
import asyncio
import websockets
import json
import time

async def client_session(client_id):
    uri = f"ws://localhost:8003/ws/load-test-{client_id}?token=test-token"

    async with websockets.connect(uri) as websocket:
        for i in range(10):
            await websocket.send(json.dumps({
                "type": "message",
                "content": f"Client {client_id} - Message {i}",
                "timestamp": time.time()
            }))
            await asyncio.sleep(1)

async def load_test(num_clients=100):
    """동시 접속 부하 테스트"""
    tasks = []
    for i in range(num_clients):
        tasks.append(client_session(i))

    start_time = time.time()
    await asyncio.gather(*tasks)
    end_time = time.time()

    print(f"Completed {num_clients} clients in {end_time - start_time:.2f} seconds")

asyncio.run(load_test(50))
```

### 6. 단위 테스트

```bash
# 테스트 실행
cd repos/chat-service
uv venv && source .venv/bin/activate
uv sync --dev

# 전체 테스트
pytest

# WebSocket 테스트만
pytest tests/test_websocket.py -v

# 세션 관리 테스트
pytest tests/test_sessions.py -v

# 커버리지
pytest --cov=app --cov-report=html
```

---

## 문제 해결

### 1. WebSocket 연결 실패

**증상**: "WebSocket connection failed"
```bash
# 해결 1: CORS 설정 확인
CORS_ORIGINS=["http://localhost:9060", "ws://localhost:9060"]

# 해결 2: JWT 토큰 확인
const token = localStorage.getItem('accessToken');
console.log('Token exists:', !!token);

# 해결 3: 방화벽/프록시 확인
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" \
  http://localhost:8003/ws/test
```

### 2. 메시지 유실

**증상**: 일부 메시지가 전달되지 않음
```python
# 해결: Redis Pub/Sub 재연결
async def ensure_redis_connection(self):
    if not self.redis.ping():
        await self.redis = await aioredis.create_redis_pool(...)
```

### 3. 연결 끊김

**증상**: "Connection lost" 에러
```javascript
// 해결: 재연결 로직 구현
let reconnectInterval = null;

ws.onclose = () => {
  reconnectInterval = setInterval(() => {
    console.log('Attempting to reconnect...');
    ws = new WebSocket(wsUrl);
    if (ws.readyState === WebSocket.OPEN) {
      clearInterval(reconnectInterval);
    }
  }, 5000);
};
```

### 4. 메모리 누수

**증상**: 서버 메모리 사용량 증가
```python
# 해결: 연결 정리
async def cleanup_inactive_connections(self):
    for session_id, connections in list(self.active_connections.items()):
        for ws in connections[:]:
            if ws.client_state != WebSocketState.CONNECTED:
                connections.remove(ws)
```

### 5. 스트리밍 지연

**증상**: 스트리밍 메시지가 늦게 도착
```python
# 해결: 버퍼 크기 조정
await websocket.send_text(chunk, encode=False)  # 즉시 전송
```

---

## Sprint 체크리스트

### Sprint 1 (2주차) - DEV2 담당
- [x] 프로젝트 초기화 및 구조 설정
- [x] 데이터베이스 모델 생성
- [x] 기본 WebSocket 연결 구현
- [x] 세션 CRUD API

### Sprint 2 (3주차)
- [ ] 메시지 저장 및 조회
- [ ] Redis Pub/Sub 통합
- [ ] 타이핑 인디케이터
- [ ] 파일 업로드

### Sprint 3 (4-5주차)
- [ ] 메시지 스트리밍 구현
- [ ] 다중 서버 지원 (Redis)
- [ ] 재연결 로직
- [ ] 메시지 검색 API

### Sprint 4 (6주차)
- [ ] 성능 최적화
- [ ] 부하 테스트
- [ ] 모니터링 메트릭
- [ ] 통합 테스트

---

## 아키텍처 다이어그램

```
┌─────────────┐      WebSocket      ┌─────────────┐
│   Frontend  │◄──────────────────►│Chat Service │
│   (React)   │                     │  (FastAPI)  │
└─────────────┘                     └──────┬──────┘
                                           │
                                    ┌──────▼──────┐
                                    │    Redis    │
                                    │  Pub/Sub    │
                                    └──────┬──────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                              │
            ┌───────▼───────┐                        ┌────────────▼──┐
            │Chat Service   │                        │Chat Service    │
            │Instance 2     │                        │Instance 3      │
            └───────────────┘                        └────────────────┘
```

---

## 참고 자료

- [FastAPI WebSocket](https://fastapi.tiangolo.com/advanced/websockets/)
- [Redis Pub/Sub](https://redis.io/topics/pubsub)
- [Socket.IO Protocol](https://socket.io/docs/v4/)
- [Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)

---


---

## 📦 데이터베이스 관리

### Alembic 마이그레이션 시스템

이 서비스는 **Alembic**을 사용하여 데이터베이스 스키마를 관리합니다. 모든 스키마 변경은 마이그레이션 파일로 추적됩니다.

### 기본 규칙

1. **절대 수동으로 테이블을 생성/수정하지 마세요** ❌
   - ~~CREATE TABLE~~
   - ~~ALTER TABLE~~
   - ~~DROP TABLE~~

2. **모든 스키마 변경은 Alembic 마이그레이션으로만 수행합니다** ✅
   ```bash
   # 모델 변경 후 마이그레이션 생성
   uv run alembic revision --autogenerate -m "Add new field"

   # 마이그레이션 적용
   uv run alembic upgrade head
   ```

3. **팀원과 동기화**
   ```bash
   # 코드 받은 후
   git pull origin main

   # 루트 디렉토리에서 한 번에 모든 서비스 DB 동기화!
   ./start-dev.sh update
   ```

### 워크플로우

#### 스키마 변경이 필요한 개발자 (코드 작성자)

```bash
# 1. 모델 변경
vim app/core/database.py  # 모델에 필드 추가

# 2. 마이그레이션 파일 생성
docker exec a2g-chat-service uv run alembic revision --autogenerate -m "Add new field"

# 3. 생성된 파일 확인 및 검토
ls alembic/versions/  # 새로 생성된 파일 확인
vim alembic/versions/00X_*.py  # 내용 검토

# 4. 로컬에서 테스트
docker exec a2g-chat-service uv run alembic upgrade head

# 5. 정상 작동 확인 후 커밋
git add app/core/database.py
git add alembic/versions/00X_*.py
git commit -m "Add new field to model"
git push
```

#### 스키마 변경을 받는 팀원 (코드 받는 사람)

```bash
# 1. 코드 받기
git pull origin main

# 2. 단 한 줄로 모든 서비스 DB 동기화!
./start-dev.sh update
```

### 자주 사용하는 명령어

```bash
# 현재 마이그레이션 상태 확인
docker exec a2g-chat-service uv run alembic current

# 마이그레이션 히스토리 확인
docker exec a2g-chat-service uv run alembic history

# 특정 버전으로 롤백 (신중하게!)
docker exec a2g-chat-service uv run alembic downgrade <revision>

# 최신 상태로 업그레이드
docker exec a2g-chat-service uv run alembic upgrade head
```

### 주의사항

⚠️ **운영(Production) 환경에서는**:
1. 마이그레이션 전 반드시 데이터 백업
2. Down-time이 필요한 변경인지 확인
3. 롤백 계획 수립
4. 테스트 환경에서 먼저 검증

⚠️ **충돌 발생 시**:
- 여러 명이 동시에 마이그레이션 생성 시 충돌 가능
- 해결: revision 파일의 down_revision을 올바르게 수정

### 문제 해결

```bash
# Q: "Target database is not up to date" 에러
# A: 현재 버전 확인 후 upgrade
docker exec a2g-chat-service uv run alembic current
docker exec a2g-chat-service uv run alembic upgrade head

# Q: "Table already exists" 에러
# A: 마이그레이션 stamp (이미 테이블이 있는 경우)
docker exec a2g-chat-service uv run alembic stamp head

# Q: 모든 서비스를 한 번에 업데이트하고 싶어요
# A: 루트 디렉토리에서
./start-dev.sh update
```

**© 2025 A2G Platform Development Team**
