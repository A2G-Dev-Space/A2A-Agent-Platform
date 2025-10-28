# 🏗️ A2G Platform - 기술 아키텍처 및 API 명세

**문서 버전**: 2.0 (통합본)
**최종 수정일**: 2025년 10월 28일
**대상**: 개발팀 전체

---

## 📌 목차

1. [시스템 아키텍처](#1-시스템-아키텍처)
2. [마이크로서비스 구성](#2-마이크로서비스-구성)
3. [A2A Protocol 명세](#3-a2a-protocol-명세)
4. [API 명세 - Core Services](#4-api-명세---core-services)
5. [API 명세 - Framework Services](#5-api-명세---framework-services)
6. [Top-K 추천 시스템](#6-top-k-추천-시스템)
7. [Agent Registry 통합](#7-agent-registry-통합)
8. [WebSocket 실시간 통신](#8-websocket-실시간-통신)
9. [에러 처리 표준](#9-에러-처리-표준)

---

## 1. 시스템 아키텍처

### 1.1 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Frontend (React 19)                             │
│                               Port: 9060                                     │
└──────────────────────────────────┬──────────────────────────────────────────┘
                                   │ HTTPS/WSS
                    ┌──────────────▼──────────────┐
                    │   API Gateway (Nginx)       │
                    │   Port: 9050 (SSL)          │
                    └──────────┬──────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼─────┐ ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│User Service │ │Agent Service│ │Chat Service │ │Admin Service│
│  Port:8001  │ │  Port:8002  │ │  Port:8003  │ │  Port:8005  │
└─────┬───────┘ └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
      │                │                │                │
┌─────▼───────────────▼────────────────▼────────────────▼─────┐
│                     PostgreSQL (Port: 5432)                  │
│  ┌────────────┬───────────┬───────────┬──────────────────┐  │
│  │user_service│agent_svc  │chat_svc   │admin_service     │  │
│  └────────────┴───────────┴───────────┴──────────────────┘  │
└───────────────────────────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────┐
│                              │                              │
│        ┌─────────────────────▼─────────────────────┐        │
│        │         Redis (Port: 6379)                │        │
│        │  - Celery Broker                          │        │
│        │  - Session Cache                          │        │
│        │  - WebSocket Pub/Sub                      │        │
│        └────────────────────────────────────────────┘        │
│                              │                              │
│        ┌─────────────────────▼─────────────────────┐        │
│        │    Worker Service (Celery)                │        │
│        │  - Health Checks                          │        │
│        │  - Async Tasks                            │        │
│        └────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 네트워크 흐름

```
사용자 → Frontend → Nginx → Backend Services → Database/Cache
                      ↓
                  WebSocket → Chat Service → Redis Pub/Sub
```

### 1.3 포트 할당

| 서비스 | 내부 포트 | 외부 포트 | 프로토콜 |
|--------|-----------|-----------|----------|
| Frontend | 9060 | 9060 | HTTP |
| API Gateway | - | 9050 | HTTPS/WSS |
| User Service | 8001 | - | HTTP |
| Agent Service | 8002 | - | HTTP |
| Chat Service | 8003 | - | HTTP/WS |
| Tracing Service | 8004 | - | HTTP |
| Admin Service | 8005 | - | HTTP |
| PostgreSQL | 5432 | 5432 | TCP |
| Redis | 6379 | 6379 | TCP |
| Mock SSO | 9999 | 9999 | HTTP |

---

## 2. 마이크로서비스 구성

### 2.1 User Service (인증/권한)
**담당**: DEV1 (한승하)
**기술**: FastAPI + PostgreSQL + JWT

**핵심 기능**:
- SSO 연동 로그인/로그아웃
- JWT 토큰 발급/검증
- 사용자 프로비저닝
- API Key 관리
- RBAC 권한 관리

### 2.2 Agent Service (에이전트 관리)
**담당**: DEV4 (안준형)
**기술**: FastAPI + PostgreSQL + LangChain + pgvector

**핵심 기능**:
- 에이전트 CRUD
- A2A Protocol 구현
- Top-K 추천 시스템
- Agent Registry 통합
- 상태 관리 (DEVELOPMENT/STAGING/PRODUCTION)

### 2.3 Chat Service (채팅/세션)
**담당**: DEV3 (김영섭)
**기술**: FastAPI + PostgreSQL + WebSocket + Redis

**핵심 기능**:
- 채팅 세션 관리
- WebSocket 실시간 통신
- 메시지 스트리밍
- 세션 히스토리

### 2.4 Tracing Service (로그 추적)
**담당**: DEV3 (김영섭)
**기술**: FastAPI + PostgreSQL

**핵심 기능**:
- 로그 프록시
- 실시간 추적
- Agent Transfer 감지
- 로그 저장/조회

### 2.5 Admin Service (관리/통계)
**담당**: DEV2 (이병주)
**기술**: FastAPI + PostgreSQL

**핵심 기능**:
- LLM 모델 관리
- 플랫폼 통계
- 사용량 모니터링
- 시스템 설정

### 2.6 Worker Service (백그라운드 작업)
**담당**: DEV2 (이병주)
**기술**: Celery + Redis

**핵심 기능**:
- 주기적 헬스 체크
- 비동기 작업 처리
- 스케줄링
- 알림 발송

---

## 3. A2A Protocol 명세

### 3.1 표준 요청 형식

```json
{
  "jsonrpc": "2.0",
  "method": "agent.{action}",
  "params": {
    "agent_id": "agent-uuid",
    "task": "작업 설명",
    "context": {
      "user_id": "user.id",
      "session_id": "session-uuid",
      "trace_id": "trace-uuid"
    },
    "parameters": {}
  },
  "id": "request-uuid"
}
```

### 3.2 표준 응답 형식

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "data": {},
    "metadata": {
      "execution_time": 1234,
      "tokens_used": 500
    }
  },
  "id": "request-uuid"
}
```

### 3.3 에러 응답 형식

```json
{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "Invalid params",
    "data": {
      "details": "Missing required field: task"
    }
  },
  "id": "request-uuid"
}
```

### 3.4 A2A 메서드 목록

| 메서드 | 설명 | 필수 파라미터 |
|--------|------|---------------|
| `agent.register` | 에이전트 등록 | name, framework, endpoint |
| `agent.execute` | 작업 실행 | agent_id, task |
| `agent.status` | 상태 확인 | agent_id |
| `agent.capabilities` | 기능 조회 | agent_id |
| `agent.transfer` | 에이전트 전환 | from_agent, to_agent |

---

## 4. API 명세 - Core Services

### 4.1 User Service API

#### 인증 엔드포인트

**POST /api/auth/login/**
```json
// Request
{
  "redirect_uri": "https://localhost:9050/callback"
}

// Response
{
  "sso_login_url": "https://sso.company.com/login?redirect=..."
}
```

**POST /api/auth/callback/**
```json
// Request
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "user": {
    "username": "test.user",
    "username_kr": "테스트",
    "email": "test@example.com",
    "role": "USER"
  }
}
```

**POST /api/auth/logout/**
```json
// Request
Headers: Authorization: Bearer {token}

// Response
{
  "message": "Successfully logged out"
}
```

#### API Key 관리

**POST /api/users/me/api-keys/**
```json
// Request
{
  "name": "개발용 API Key"
}

// Response
{
  "id": 1,
  "name": "개발용 API Key",
  "key": "ak_live_xxxxxxxxxxxxxxxxxxx",
  "created_at": "2025-01-01T00:00:00Z"
}
```

### 4.2 Agent Service API

#### 에이전트 CRUD

**GET /api/agents/**
```json
// Query Parameters
?status=PRODUCTION&framework=Langchain&department=AI팀

// Response
{
  "agents": [
    {
      "id": 1,
      "name": "Customer Support Agent",
      "framework": "Langchain-agent",
      "status": "PRODUCTION",
      "capabilities": {
        "skills": ["chat", "search", "analyze"]
      },
      "owner_id": "test.user",
      "department": "AI팀",
      "is_public": true,
      "health_status": "healthy",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

**POST /api/agents/**
```json
// Request
{
  "name": "New Agent",
  "framework": "Langchain-agent",
  "a2a_endpoint": "http://localhost:8100/a2a",
  "capabilities": {
    "skills": ["chat", "analyze"],
    "description": "고객 지원 전문 에이전트"
  },
  "is_public": true
}

// Response
{
  "id": 2,
  "name": "New Agent",
  "status": "DEVELOPMENT",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### A2A Registration

**POST /api/agents/a2a/register**
```json
// Request
{
  "name": "A2A Compatible Agent",
  "framework": "Agno",
  "endpoint": "http://agno.samsung.net/my-agent/agent",
  "capabilities": {
    "version": "1.0.0",
    "skills": ["nlp", "search"],
    "languages": ["ko", "en"]
  }
}

// Response
{
  "agent_id": "agent-uuid-123",
  "a2a_endpoint": "/api/agents/a2a/execute/agent-uuid-123",
  "status": "registered"
}
```

#### Top-K 추천

**POST /api/agents/recommend**
```json
// Request
{
  "query": "고객 불만 처리를 도와줄 에이전트가 필요해",
  "k": 5,
  "filters": {
    "status": "PRODUCTION",
    "department": "CS팀"
  }
}

// Response
{
  "recommendations": [
    {
      "agent_id": 1,
      "name": "CS Helper Agent",
      "similarity_score": 0.95,
      "match_reason": "고객 지원 전문, 불만 처리 경험 다수"
    },
    {
      "agent_id": 3,
      "name": "Complaint Analyzer",
      "similarity_score": 0.87,
      "match_reason": "감정 분석 및 불만 분류 특화"
    }
  ]
}
```

### 4.3 Chat Service API

#### 세션 관리

**POST /api/chat/sessions/**
```json
// Request
{
  "agent_id": 1,
  "title": "고객 문의 세션"
}

// Response
{
  "session_id": "session-uuid-456",
  "trace_id": "trace-uuid-789",
  "websocket_url": "wss://localhost:9050/ws/session-uuid-456",
  "created_at": "2025-01-01T00:00:00Z"
}
```

**POST /api/chat/sessions/{session_id}/messages/**
```json
// Request
{
  "role": "user",
  "content": "주문 취소는 어떻게 하나요?"
}

// Response (Streaming)
data: {"type": "start", "timestamp": "2025-01-01T00:00:00Z"}
data: {"type": "token", "content": "주문"}
data: {"type": "token", "content": " 취소는"}
data: {"type": "token", "content": " 다음과"}
data: {"type": "token", "content": " 같이"}
data: {"type": "end", "total_tokens": 150}
```

### 4.4 Tracing Service API

#### 로그 프록시

**POST /api/tracing/logs**
```json
// Request
{
  "trace_id": "trace-uuid-789",
  "service_name": "agent-service",
  "agent_id": 1,
  "level": "INFO",
  "message": "에이전트 실행 시작",
  "metadata": {
    "user_id": "test.user",
    "action": "execute"
  }
}

// Response
{
  "log_id": 12345,
  "timestamp": "2025-01-01T00:00:00Z"
}
```

**GET /api/tracing/logs/{trace_id}**
```json
// Response
{
  "trace_id": "trace-uuid-789",
  "logs": [
    {
      "timestamp": "2025-01-01T00:00:00Z",
      "service": "agent-service",
      "agent_id": 1,
      "level": "INFO",
      "message": "에이전트 실행 시작"
    },
    {
      "timestamp": "2025-01-01T00:00:01Z",
      "service": "agent-service",
      "agent_id": 1,
      "level": "INFO",
      "message": "[Agent Transfer] agent-1 → agent-2",
      "is_transfer": true
    }
  ],
  "total_logs": 25
}
```

### 4.5 Admin Service API

#### LLM 모델 관리

**GET /api/admin/llm-models/**
```json
// Response
{
  "models": [
    {
      "id": 1,
      "name": "GPT-4",
      "provider": "OpenAI",
      "endpoint": "https://api.openai.com/v1",
      "is_active": true,
      "health_status": "healthy",
      "last_health_check": "2025-01-01T00:00:00Z"
    },
    {
      "id": 2,
      "name": "Claude-3",
      "provider": "Anthropic",
      "endpoint": "https://api.anthropic.com/v1",
      "is_active": true,
      "health_status": "healthy"
    }
  ]
}
```

**POST /api/admin/llm-models/**
```json
// Request
{
  "name": "Custom LLM",
  "provider": "Custom",
  "endpoint": "http://custom-llm.local/api",
  "api_key": "encrypted-key"
}

// Response
{
  "id": 3,
  "name": "Custom LLM",
  "is_active": false,
  "health_status": "unknown"
}
```

#### 통계 조회

**GET /api/admin/statistics/**
```json
// Query Parameters
?start_date=2025-01-01&end_date=2025-01-31&group_by=day

// Response
{
  "period": "2025-01-01 to 2025-01-31",
  "statistics": {
    "total_users": 150,
    "active_users": 89,
    "total_agents": 45,
    "production_agents": 12,
    "total_sessions": 3456,
    "total_api_calls": 98765,
    "llm_usage": {
      "gpt-4": 45000,
      "claude-3": 32000,
      "custom": 21765
    }
  },
  "daily_breakdown": [
    {
      "date": "2025-01-01",
      "sessions": 112,
      "api_calls": 3200
    }
  ]
}
```

---

## 5. API 명세 - Framework Services

### 5.1 Agno Framework API

**엔드포인트 패턴**: `http://agno.samsung.net/{agent-name}/agent`

**POST /agent**
```json
// Request
{
  "version": "1.0",
  "session_id": "agno-session-123",
  "request": {
    "type": "execute",
    "payload": {
      "command": "analyze",
      "data": "고객 불만 내용..."
    }
  }
}

// Response
{
  "version": "1.0",
  "session_id": "agno-session-123",
  "response": {
    "type": "result",
    "payload": {
      "analysis": "감정 분석 결과...",
      "sentiment": "negative",
      "confidence": 0.89
    }
  }
}
```

### 5.2 ADK Framework API

**엔드포인트 패턴**: `http://adk.samsung.net/{agent-name}`

**POST /execute**
```json
// Request
{
  "task": "search",
  "parameters": {
    "query": "최근 주문 내역",
    "user_id": "customer-123"
  },
  "context": {
    "session": "adk-session-456"
  }
}

// Response
{
  "status": "success",
  "result": {
    "items": [
      {
        "order_id": "ORD-001",
        "date": "2025-01-01",
        "status": "delivered"
      }
    ]
  }
}
```

### 5.3 Langchain Agent API

**엔드포인트 패턴**: `http://{agent-name}.langchain.com/execute`

**POST /execute**
```json
// Request
{
  "input": "2023년 매출 보고서를 요약해줘",
  "config": {
    "temperature": 0.7,
    "max_tokens": 1000,
    "tools": ["search", "summarize"]
  }
}

// Response (Streaming)
data: {"type": "thought", "content": "보고서를 검색하고 있습니다..."}
data: {"type": "action", "tool": "search", "input": "2023 매출 보고서"}
data: {"type": "observation", "content": "3개의 문서를 찾았습니다"}
data: {"type": "result", "content": "2023년 총 매출은..."}
```

### 5.4 Custom Agent API

**엔드포인트**: 사용자 정의

**예시 구현**:
```json
// Custom Request
{
  "custom_field": "value",
  "action": "process",
  "data": {}
}

// Custom Response
{
  "custom_response": "processed",
  "results": {}
}
```

---

## 6. Top-K 추천 시스템

### 6.1 알고리즘 플로우

```
1. 사용자 쿼리 수신
   ↓
2. OpenAI Embedding API로 벡터 생성 (1536차원)
   ↓
3. PostgreSQL pgvector로 유사도 검색
   ↓
4. 코사인 유사도 계산
   ↓
5. 필터링 적용 (status, department 등)
   ↓
6. 상위 K개 선택 및 정렬
   ↓
7. 매칭 이유 생성 (LLM)
   ↓
8. 결과 반환
```

### 6.2 벡터 유사도 계산

```python
# PostgreSQL pgvector 쿼리
SELECT
    id,
    name,
    1 - (embedding_vector <=> query_vector) as similarity
FROM agents
WHERE
    status = 'PRODUCTION'
    AND is_public = true
ORDER BY embedding_vector <=> query_vector
LIMIT k;
```

### 6.3 성능 최적화

- **인덱싱**: IVFFlat 인덱스 사용
- **캐싱**: Redis에 자주 요청되는 쿼리 캐시 (TTL: 5분)
- **배치 처리**: 여러 쿼리를 한 번에 처리

---

## 7. Agent Registry 통합

### 7.1 ExtendedAgentCard Schema (Pydantic)

```python
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

class AccessLevel(str, Enum):
    PUBLIC = "public"
    PRIVATE = "private"
    TEAM = "team"
    USER_SPECIFIC = "user_specific"

class ExtendedAgentCard(BaseAgentCard):
    # 기존 필드 상속
    name: str
    framework: str
    endpoint: str
    capabilities: dict

    # 추가 필드 (Optional)
    access_level: Optional[AccessLevel] = AccessLevel.PUBLIC
    allowed_users: Optional[List[str]] = []
    allowed_teams: Optional[List[str]] = []
    owner_id: Optional[str] = None
    department: Optional[str] = None
    is_archived: Optional[bool] = False

    class Config:
        schema_extra = {
            "example": {
                "name": "Private Agent",
                "framework": "Langchain",
                "endpoint": "http://private-agent.com",
                "access_level": "team",
                "allowed_teams": ["AI팀", "데이터팀"],
                "owner_id": "john.doe"
            }
        }
```

### 7.2 AgentRegistryClient 구현

```python
class AgentRegistryClient:
    def __init__(self, registry_url: str):
        self.registry_url = registry_url
        self.cache = Redis()

    async def register_agent(
        self,
        agent: ExtendedAgentCard,
        user: User
    ) -> dict:
        # 접근 권한 검증
        if agent.access_level == AccessLevel.PRIVATE:
            agent.allowed_users = [user.username]
            agent.owner_id = user.username

        # Registry에 등록
        response = await httpx.post(
            f"{self.registry_url}/agents",
            json=agent.dict(exclude_none=True)
        )

        # 캐시 무효화
        self.cache.delete("agents:*")

        return response.json()

    async def get_available_agents(
        self,
        user: User,
        filters: dict = None
    ) -> List[ExtendedAgentCard]:
        # 캐시 확인
        cache_key = f"agents:{user.username}:{hash(str(filters))}"
        cached = self.cache.get(cache_key)
        if cached:
            return json.loads(cached)

        # Registry에서 조회
        agents = await self._fetch_all_agents()

        # 접근 권한 필터링
        filtered = []
        for agent in agents:
            if self._has_access(agent, user):
                filtered.append(agent)

        # 추가 필터 적용
        if filters:
            filtered = self._apply_filters(filtered, filters)

        # 캐시 저장 (5분)
        self.cache.setex(
            cache_key,
            300,
            json.dumps([a.dict() for a in filtered])
        )

        return filtered

    def _has_access(
        self,
        agent: ExtendedAgentCard,
        user: User
    ) -> bool:
        # PUBLIC: 모두 접근 가능
        if agent.access_level == AccessLevel.PUBLIC:
            return True

        # PRIVATE: 소유자만
        if agent.access_level == AccessLevel.PRIVATE:
            return agent.owner_id == user.username

        # TEAM: 팀 멤버만
        if agent.access_level == AccessLevel.TEAM:
            return user.department in agent.allowed_teams

        # USER_SPECIFIC: 허용된 사용자만
        if agent.access_level == AccessLevel.USER_SPECIFIC:
            return user.username in agent.allowed_users

        return False
```

### 7.3 마이그레이션 전략

```python
# 기존 에이전트 마이그레이션 스크립트
async def migrate_existing_agents():
    # 1. 기존 에이전트 조회
    existing_agents = await db.query(Agent).all()

    for agent in existing_agents:
        # 2. ExtendedAgentCard로 변환
        extended = ExtendedAgentCard(
            name=agent.name,
            framework=agent.framework,
            endpoint=agent.a2a_endpoint,
            capabilities=agent.capabilities,
            access_level=AccessLevel.PUBLIC if agent.is_public else AccessLevel.PRIVATE,
            owner_id=agent.owner_id,
            department=agent.department
        )

        # 3. Registry에 등록
        await registry_client.register_agent(extended, system_user)

        print(f"Migrated: {agent.name}")
```

---

## 8. WebSocket 실시간 통신

### 8.1 WebSocket 연결 플로우

```
1. 클라이언트 연결 요청
   ws://localhost:8003/ws/{session_id}?token={jwt_token}
   ↓
2. JWT 토큰 검증
   ↓
3. 세션 검증 및 권한 확인
   ↓
4. WebSocket 연결 수립
   ↓
5. Redis Pub/Sub 구독
   ↓
6. 실시간 메시지 스트리밍
```

### 8.2 WebSocket 메시지 형식

#### 클라이언트 → 서버

```json
{
  "type": "message",
  "content": "사용자 입력 메시지",
  "metadata": {
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

#### 서버 → 클라이언트 (스트리밍)

```json
// 시작
{
  "type": "stream_start",
  "session_id": "session-123",
  "agent_id": 1
}

// 토큰 스트리밍
{
  "type": "token",
  "content": "안녕",
  "index": 0
}

// Agent Transfer 알림
{
  "type": "agent_transfer",
  "from_agent": 1,
  "to_agent": 2,
  "reason": "전문 분야 전환"
}

// 종료
{
  "type": "stream_end",
  "total_tokens": 150,
  "execution_time": 2.34
}
```

### 8.3 WebSocket 에러 처리

```json
{
  "type": "error",
  "code": "WS_ERROR_001",
  "message": "Connection lost",
  "reconnect": true,
  "retry_after": 5
}
```

---

## 9. 에러 처리 표준

### 9.1 표준 에러 응답 형식

```json
{
  "error": {
    "code": "ERR_001",
    "message": "사용자 친화적 메시지",
    "details": {
      "field": "email",
      "reason": "Invalid format"
    },
    "timestamp": "2025-01-01T00:00:00Z",
    "trace_id": "trace-uuid-123"
  }
}
```

### 9.2 HTTP 상태 코드

| 상태 코드 | 의미 | 사용 예시 |
|-----------|------|-----------|
| 200 | 성공 | 정상 조회/수정 |
| 201 | 생성됨 | 리소스 생성 성공 |
| 204 | 내용 없음 | 삭제 성공 |
| 400 | 잘못된 요청 | 유효성 검증 실패 |
| 401 | 인증 필요 | 토큰 없음/만료 |
| 403 | 권한 없음 | 접근 권한 부족 |
| 404 | 찾을 수 없음 | 리소스 없음 |
| 409 | 충돌 | 중복된 리소스 |
| 422 | 처리 불가 | 비즈니스 로직 오류 |
| 429 | 요청 과다 | Rate Limit 초과 |
| 500 | 서버 오류 | 내부 서버 오류 |
| 502 | 게이트웨이 오류 | 업스트림 서버 오류 |
| 503 | 서비스 불가 | 유지보수/과부하 |

### 9.3 에러 코드 체계

```
SERVICE_CATEGORY_NUMBER

예시:
- USR_AUTH_001: User Service 인증 오류
- AGT_REG_002: Agent Service 등록 오류
- CHT_WS_003: Chat Service WebSocket 오류
- TRC_LOG_004: Tracing Service 로그 오류
- ADM_LLM_005: Admin Service LLM 오류
```

### 9.4 에러 로깅

```python
import logging
from fastapi import Request

logger = logging.getLogger(__name__)

async def log_error(
    request: Request,
    error: Exception,
    trace_id: str
):
    logger.error(
        f"Error in {request.url.path}",
        extra={
            "trace_id": trace_id,
            "user_id": request.state.user_id,
            "error_type": type(error).__name__,
            "error_message": str(error),
            "request_id": request.headers.get("X-Request-ID")
        },
        exc_info=True
    )
```

---

## 📊 성능 요구사항

### API 응답 시간 목표

| 작업 유형 | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| 단순 조회 | 50ms | 200ms | 500ms |
| 복잡 조회 | 200ms | 500ms | 1s |
| 생성/수정 | 100ms | 300ms | 800ms |
| Top-K 추천 | 500ms | 1s | 2s |
| LLM 호출 | 2s | 5s | 10s |

### 동시 처리 목표

- 동시 사용자: 1,000명
- 초당 요청: 500 RPS
- WebSocket 연결: 5,000개
- DB 연결 풀: 100개

---

## 🔒 보안 고려사항

### API 보안

1. **인증**: 모든 API는 JWT Bearer 토큰 필요
2. **Rate Limiting**: IP당 분당 100회 제한
3. **입력 검증**: Pydantic 스키마 필수
4. **SQL Injection 방지**: ORM 사용 필수
5. **XSS 방지**: 모든 출력 이스케이프
6. **CORS 설정**: 허용된 도메인만

### 데이터 보안

1. **암호화**: 민감 데이터 AES-256 암호화
2. **API Key**: 해시 저장 (bcrypt)
3. **로그**: PII 정보 마스킹
4. **백업**: 일일 자동 백업, 30일 보관

---

## 📚 참고 문서

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [JSON-RPC 2.0 Specification](https://www.jsonrpc.org/specification)
- [pgvector 문서](https://github.com/pgvector/pgvector)
- [WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)

---

**© 2025 A2G Platform Development Team**