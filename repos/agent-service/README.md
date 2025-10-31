# 🤖 Agent Service

**담당자**: DEV4 (안준형)
**포트**: 8002
**설명**: 에이전트 레지스트리 및 Access Control 관리

## 🚀 빠른 시작

```bash
# 1. 환경 설정
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync

# 2. 설정 파일 작성
cp .env.example .env.local
# .env.local을 설정에 맞게 편집하세요

# 3. 데이터베이스 설정
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db

# 4. 마이그레이션 실행
# Alembic 설정은 이미 완료되어 있습니다

# 4-1. 최초 설정 시 또는 git pull 후 새 마이그레이션이 있을 때
alembic upgrade head  # 최신 마이그레이션 적용

# 4-2. 현재 마이그레이션 상태 확인
alembic current  # 현재 적용된 마이그레이션 버전 확인
alembic history  # 마이그레이션 히스토리 보기

# 4-3. 새 마이그레이션 생성 (스키마 변경 시만)
alembic revision --autogenerate -m "Migration description"

# 4-4. 마이그레이션 롤백 (필요시)
alembic downgrade -1  # 한 단계 롤백
alembic downgrade base  # 모든 마이그레이션 롤백

# 5. 서비스 실행
uvicorn app.main:app --reload --port 8002

# 6. 헬스 체크
curl http://localhost:8002/health
```

## 📚 API 문서

> **Base URL**: `http://localhost:8002` (개발) | `https://api.company.com/agents` (운영)

### 목차
1. [에이전트 Registry API](#1-에이전트-registry-api) - A2A 에이전트 등록/조회/검색
2. [Extensions API](#2-extensions-api) - A2A 확장 기능 관리
3. [A2A Universal Proxy API](#3-a2a-universal-proxy-api) - 범용 A2A 프록시 서버 (신규)

**Interactive API Docs**: http://localhost:8002/docs

---

### 1. 에이전트 Registry API

#### `POST /api/agents`
**A2A 에이전트 등록 (AgentCard 형식)**

**Permission**: Authenticated

**Request:**
```json
{
  "agent_card": {
    "name": "Customer Support Bot",
    "description": "AI agent for customer support",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {
      "skills": ["customer-support", "chat", "ticketing"]
    },
    "visibility": "public",
    "preferred_transport": "JSONRPC"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "agent_id": "Customer Support Bot",
  "message": "Agent registered successfully",
  "extensions_processed": 0
}
```

**Error (400 - Missing required fields):**
```json
{
  "detail": "Missing required field: version"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
curl -X POST http://localhost:8002/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "My Test Agent",
      "description": "A test agent",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "visibility": "public"
    }
  }'
```

**AgentCard Required Fields:**
- `name`: Unique agent name
- `description`: Agent description
- `url`: Agent A2A endpoint URL
- `version`: Agent version (semantic versioning)
- `protocol_version`: A2A protocol version (currently "1.0")

**AgentCard Optional Fields:**
- `capabilities`: Agent capabilities including skills
- `preferred_transport`: Transport protocol (default: "JSONRPC")
- `visibility`: "public", "private", or "team" (default: "public")
- `provider`: Provider information
- `documentation_url`: Link to agent documentation

---

#### `GET /api/agents`
**에이전트 목록 조회 (Access Control 필터링)**

**Permission**: Authenticated

**Query Parameters:**
- `visibility` (선택): public | private | team
- `department` (선택): 부서명
- `only_mine` (선택): true | false (내 에이전트만)

**Default Behavior (no filters):**
- All public agents
- User's own agents (any visibility)
- Team agents from user's department

**Response (200):**
```json
{
  "agents": [
    {
      "name": "Customer Support Bot",
      "description": "AI agent for customer support",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["customer-support", "chat"]
      },
      "visibility": "public",
      "owner_id": "syngha.han",
      "department": "AI Platform Team"
    },
    {
      "name": "Data Analysis Agent",
      "description": "Analyzes data and creates visualizations",
      "url": "http://localhost:8101/agent",
      "version": "1.2.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["data-analysis", "visualization", "python"]
      },
      "visibility": "team",
      "owner_id": "byungju.lee",
      "department": "AI Platform Team"
    }
  ],
  "count": 2
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"

# 전체 접근 가능한 에이전트 조회
curl http://localhost:8002/api/agents \
  -H "Authorization: Bearer $TOKEN"

# public 에이전트만 조회
curl "http://localhost:8002/api/agents?visibility=public" \
  -H "Authorization: Bearer $TOKEN"

# 내 에이전트만 조회
curl "http://localhost:8002/api/agents?only_mine=true" \
  -H "Authorization: Bearer $TOKEN"

# 특정 부서의 team 에이전트 조회
curl "http://localhost:8002/api/agents?visibility=team&department=AI%20Platform%20Team" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `GET /api/agents/{agent_id}`
**에이전트 상세 조회**

**Permission**: Authenticated (Access Control 적용)

**Response (200):**
```json
{
  "agent_card": {
    "name": "Customer Support Bot",
    "description": "AI agent for customer support",
    "url": "http://localhost:8100/agent",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {
      "skills": ["customer-support", "chat", "ticketing"],
      "extensions": [
        {
          "uri": "urn:a2a:extension:langchain",
          "description": "Langchain integration",
          "required": false
        }
      ]
    },
    "visibility": "public",
    "owner_id": "syngha.han",
    "department": "AI Platform Team",
    "created_at": "2025-10-15T09:00:00Z",
    "updated_at": "2025-10-30T10:00:00Z"
  }
}
```

**Error (404):**
```json
{
  "detail": "Agent not found or access denied"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
AGENT_ID="Customer Support Bot"

curl "http://localhost:8002/api/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `DELETE /api/agents/{agent_id}`
**에이전트 등록 해제**

**Permission**: Owner only

**Response (200):**
```json
{
  "success": true,
  "message": "Agent unregistered successfully",
  "extensions_cleaned": 2
}
```

**Error (404 - Not found or no permission):**
```json
{
  "detail": "Agent not found or access denied"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
AGENT_ID="My Test Agent"

curl -X DELETE "http://localhost:8002/api/agents/$AGENT_ID" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### `POST /api/agents/search`
**에이전트 검색 (이름, 설명, 스킬)**

**Permission**: Authenticated

**Request:**
```json
{
  "query": "python data analysis"
}
```

**Response (200):**
```json
{
  "agents": [
    {
      "name": "Python Coding Agent",
      "description": "Helps with Python programming",
      "url": "http://localhost:8102/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["python", "coding", "debugging"]
      },
      "visibility": "public",
      "owner_id": "youngsub.kim"
    },
    {
      "name": "Data Analysis Agent",
      "description": "Analyzes data and creates visualizations",
      "url": "http://localhost:8101/agent",
      "version": "1.2.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["data-analysis", "visualization", "python"]
      },
      "visibility": "public",
      "owner_id": "byungju.lee"
    }
  ],
  "count": 2,
  "query": "python data analysis"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"

curl -X POST http://localhost:8002/api/agents/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "customer support chat"}'
```

**Access Control:**
- Public agents: Visible to all
- Private agents: Only visible to owner
- Team agents: Only visible to department members

---

### 2. Extensions API

#### `GET /api/extensions`
**등록된 Extension 목록 조회**

**Permission**: None (Public)

**Query Parameters:**
- `uri_pattern` (선택): URI 패턴 필터
- `declaring_agents` (선택): 선언한 에이전트 필터
- `trust_levels` (선택): 신뢰 수준 필터
- `page_size` (선택): 페이지당 항목 수 (기본: 100, 최대: 1000)
- `page_token` (선택): 페이지네이션 토큰

**Response (200):**
```json
{
  "extensions": [
    {
      "uri": "urn:a2a:extension:langchain",
      "description": "Langchain framework integration",
      "required": false,
      "params": {
        "version": "0.1.0"
      },
      "declaring_agents": ["Customer Support Bot", "Data Analysis Agent"],
      "trust_level": "verified"
    },
    {
      "uri": "urn:a2a:extension:custom-search",
      "description": "Custom search capability",
      "required": true,
      "params": {},
      "declaring_agents": ["Search Agent"],
      "trust_level": "unverified"
    }
  ],
  "count": 2,
  "total_count": 2,
  "next_page_token": null
}
```

**cURL 예제:**
```bash
# 전체 Extension 조회
curl http://localhost:8002/api/extensions

# URI 패턴으로 필터링
curl "http://localhost:8002/api/extensions?uri_pattern=langchain"

# 페이지네이션
curl "http://localhost:8002/api/extensions?page_size=50&page_token=abc123"
```

---

#### `GET /api/extensions/{uri:path}`
**특정 Extension 정보 조회**

**Permission**: None (Public)

**Response (200):**
```json
{
  "extension_info": {
    "uri": "urn:a2a:extension:langchain",
    "description": "Langchain framework integration",
    "required": false,
    "params": {
      "version": "0.1.0",
      "features": ["chains", "agents", "memory"]
    },
    "declaring_agents": [
      "Customer Support Bot",
      "Data Analysis Agent",
      "Python Coding Agent"
    ],
    "trust_level": "verified",
    "usage_count": 3
  },
  "found": true
}
```

**Error (404):**
```json
{
  "detail": "Extension not found"
}
```

**cURL 예제:**
```bash
# URI는 URL 인코딩 필요
URI="urn:a2a:extension:langchain"
ENCODED_URI=$(python3 -c "import urllib.parse; print(urllib.parse.quote('$URI', safe=''))")

curl "http://localhost:8002/api/extensions/$ENCODED_URI"
```

---

#### `GET /api/agents/{agent_id}/extensions`
**에이전트가 사용하는 Extension 목록**

**Permission**: Authenticated (Access Control 적용)

**Response (200):**
```json
{
  "agent_id": "Customer Support Bot",
  "extensions": [
    {
      "uri": "urn:a2a:extension:langchain",
      "description": "Langchain integration",
      "required": false,
      "params": {
        "version": "0.1.0"
      }
    },
    {
      "uri": "urn:a2a:extension:vector-store",
      "description": "Vector database for RAG",
      "required": true,
      "params": {
        "provider": "pinecone"
      }
    }
  ],
  "count": 2
}
```

**Error (404):**
```json
{
  "detail": "Agent not found or access denied"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
AGENT_ID="Customer Support Bot"

curl "http://localhost:8002/api/agents/$AGENT_ID/extensions" \
  -H "Authorization: Bearer $TOKEN"
```

---

### 3. A2A Universal Proxy API

#### 🎯 개요

**Universal A2A Proxy**는 다양한 LLM 프레임워크로 구축된 에이전트들을 단일 A2A Protocol 인터페이스로 통합하는 프록시 서버입니다.

**주요 기능:**
- 🔄 프레임워크 간 프로토콜 변환 (Agno, ADK, Langchain, Custom)
- 🛡️ 통합 Access Control (public/private/team visibility)
- 📋 A2A Agent Card Discovery 표준 지원
- 🔌 A2A JS SDK 완벽 호환

**지원 프레임워크 (3가지 유형):**

**1. A2A Native Frameworks (Direct A2A Call - Proxy 불필요) ⭐**
- **Google ADK**: A2A 프로토콜을 네이티브로 지원. **Proxy를 거치지 않고** 직접 A2A endpoint 호출
  - Agent Card Discovery: `{base_url}/.well-known/agent-card.json`
  - 플랫폼은 메타데이터 및 검색용으로만 등록 정보 저장
- **Agno OS** (미래): A2A 지원 완료 시 Google ADK와 동일한 방식으로 전환 예정

**2. Well-known Non-A2A Frameworks (Proxy 필요) 🔄**
- **Agno OS** (현재): 표준 endpoint 패턴 보유, Proxy를 통한 프로토콜 변환 필요
  - Endpoint 패턴: `{base_url}/agents/{agent_id}/runs`
  - A2A Protocol ←→ Agno Protocol 변환

**3. Custom Frameworks (Proxy 필요) 🔄**
- **Langchain**: LangChain 기반 에이전트, Proxy를 통한 프로토콜 변환 필요
- **Custom**: 사용자 정의 A2A 구현 에이전트, Proxy를 통한 프로토콜 변환 필요

---

#### 🏗️ Framework Template System

**3가지 Framework 유형 구분**

에이전트 등록 시 Framework 종류에 따라 **3가지 방식**으로 처리됩니다:

**1. A2A Native Frameworks (Direct A2A Call - Proxy 불필요) ⭐**

A2A Protocol을 네이티브로 지원하는 프레임워크입니다. **Proxy를 거치지 않고** 직접 A2A endpoint를 호출할 수 있습니다.

| Framework | Base URL 예시 | A2A Endpoint 패턴 | Proxy 필요? | 필수 입력 |
|-----------|---------------|------------------|------------|----------|
| **Google ADK** | `http://localhost:8080` | `{base_url}/.well-known/agent-card.json` | ❌ 불필요 | `base_url` |
| **Agno OS** (미래) | `http://localhost:7777` | `{base_url}/.well-known/agent-card.json` | ❌ 불필요 | `base_url` |

**예시: Google ADK 에이전트 등록**
```python
# 사용자 입력
{
  "framework": "Google ADK",
  "base_url": "http://localhost:8080",
  "agent_id": "my-adk-agent"  # Optional: Agent Card에서 자동 발견 가능
}

# 시스템 동작
# 1. Agent Card Discovery: http://localhost:8080/.well-known/agent-card.json
# 2. 플랫폼 등록: 메타데이터 및 검색용으로만 저장
# 3. Frontend → Direct A2A Call (Proxy 불필요!)
```

**⚠️ 중요**: Google ADK는 A2A를 네이티브로 지원하므로 **플랫폼 proxy를 거치지 않습니다**. 플랫폼은 Agent Card 메타데이터와 검색 기능만 제공합니다.

**2. Well-known Non-A2A Frameworks (Proxy 필요) 🔄**

표준 endpoint 패턴을 가지지만 A2A를 네이티브로 지원하지 않는 프레임워크입니다. **Proxy를 통한 프로토콜 변환**이 필요합니다.

| Framework | Base URL 예시 | 원본 Endpoint 패턴 | Proxy 필요? | 필수 입력 |
|-----------|---------------|-------------------|------------|----------|
| **Agno OS** (현재) | `http://localhost:7777` | `{base_url}/agents/{agent_id}/runs` | ✅ 필요 | `base_url`, `agent_id` |

**예시: Agno OS 에이전트 등록**
```python
# 사용자 입력
{
  "framework": "Agno OS",
  "base_url": "http://localhost:7777",
  "agent_id": "my-agent-123"
}

# 시스템 동작
# 1. 원본 endpoint 생성: http://localhost:7777/agents/my-agent-123/runs
# 2. Proxy endpoint 생성: /api/a2a/proxy/{db_agent_id}/tasks/send
# 3. Frontend → A2A Proxy → Agno Adapter → Agno Endpoint
#    (A2A Protocol ←→ Agno Protocol 변환)
```

**📝 참고**: Agno OS가 향후 A2A를 네이티브로 지원하면 **Google ADK와 동일한 방식**으로 직접 호출할 수 있게 됩니다.

**3. Custom Frameworks (Proxy 필요) 🔄**

표준 패턴이 없는 프레임워크입니다. 사용자는 **전체 endpoint URL**을 입력하고, **Proxy를 통한 변환**이 필요합니다.

| Framework | Endpoint 입력 방식 | Proxy 필요? |
|-----------|------------------|------------|
| **Langchain** | 전체 URL (예: `http://my-server.com/langchain/invoke`) | ✅ 필요 |
| **Custom** | 전체 URL (예: `http://my-custom-agent.com/api/v1/chat`) | ✅ 필요 |

**예시: Custom 에이전트 등록**
```python
# 사용자 입력
{
  "framework": "Custom",
  "original_endpoint": "http://my-server.com/api/v1/chat"  # 전체 URL
}

# 시스템 동작
# 1. Proxy endpoint 생성: /api/a2a/proxy/{db_agent_id}/tasks/send
# 2. Frontend → A2A Proxy → Custom Adapter → Custom Endpoint
```

**템플릿 구조:**
```python
WELL_KNOWN_FRAMEWORKS = {
    "Agno": {
        "display_name": "Agno OS",
        "endpoint_pattern": "{base_url}/agents/{agent_id}/runs",
        "capabilities_template": {
            "streaming": True,
            "tools": True,
            "memory": True
        },
        "required_fields": [
            {"name": "base_url", "label": "Base URL", "placeholder": "http://localhost:7777"},
            {"name": "agent_id", "label": "Agent ID", "placeholder": "my-agent-123"}
        ]
    },
    "ADK": {
        "display_name": "Google ADK",
        "endpoint_pattern": "{base_url}/adk/v1/agents/{agent_id}",
        "capabilities_template": {
            "streaming": True,
            "tools": True,
            "a2a_native": True
        },
        "required_fields": [
            {"name": "base_url", "label": "Base URL", "placeholder": "http://localhost:8080"},
            {"name": "agent_id", "label": "Agent ID", "placeholder": "my-adk-agent"}
        ]
    }
}

CUSTOM_FRAMEWORKS = {
    "Langchain": {
        "display_name": "Langchain",
        "requires_full_url": True,
        "capabilities_template": {
            "streaming": True,
            "tools": False
        }
    },
    "Custom": {
        "display_name": "Custom (A2A-compliant)",
        "requires_full_url": True,
        "capabilities_template": {
            "streaming": True,
            "tools": True
        }
    }
}
```

**사용 예시 (Frontend):**

**Well-known Framework 등록:**
1. 사용자가 Framework 드롭다운에서 "Agno OS" 선택
2. 템플릿이 로드되어 필수 필드 표시: `base_url`, `agent_id`
3. 사용자가 입력:
   - Base URL: `http://localhost:7777`
   - Agent ID: `my-agent-123`
4. 시스템이 자동으로 endpoint 생성:
   - `http://localhost:7777/agents/my-agent-123/runs`
5. Capabilities가 자동으로 병합됨
6. Proxy Endpoint 생성: `/api/a2a/proxy/{db_agent_id}/tasks/send`

**Custom Framework 등록:**
1. 사용자가 Framework 드롭다운에서 "Custom" 선택
2. 전체 endpoint URL 입력 필드 표시
3. 사용자가 입력:
   - Endpoint URL: `http://my-server.com/api/v1/chat`
4. 시스템이 해당 URL을 그대로 저장
5. Proxy Endpoint 생성: `/api/a2a/proxy/{db_agent_id}/tasks/send`

---

#### `GET /a2a/proxy/{agent_id}/.well-known/agent-card.json`
**A2A Agent Card Discovery Endpoint**

**Permission**: None (Public endpoint)

**설명**:
A2A JS SDK 클라이언트가 에이전트 정보를 자동으로 발견할 수 있는 표준 엔드포인트입니다.
Agent Card는 에이전트의 capabilities, protocols, skills를 설명합니다.

**URL Format:**
```
GET http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json
```

**Response (200):**
```json
{
  "name": "Customer Support Bot",
  "description": "AI agent for customer support",
  "url": "http://localhost:9050/api/a2a/proxy/1",
  "version": "1.0.0",
  "protocol_version": "1.0",
  "capabilities": {
    "streaming": true,
    "tools": true,
    "skills": ["customer-support", "chat", "ticketing"]
  },
  "provider": {
    "organization": "A2G Platform",
    "url": "http://localhost:9050"
  }
}
```

**Error (404):**
```json
{
  "detail": "Agent 1 not found"
}
```

**A2A JS SDK 사용 예시:**
```typescript
// Frontend (Hub)에서 A2A JS SDK로 에이전트 연결
import { A2AClient } from '@google/a2a';

const client = await A2AClient.fromCardUrl(
  "http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json"
);

// 이제 A2A Protocol로 통신 가능
const response = await client.sendMessage({
  role: "user",
  parts: [{ kind: "text", text: "Hello, I need help" }]
});
```

**cURL 예제:**
```bash
# Agent Card 조회 (인증 불필요)
curl http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json
```

---

#### `POST /a2a/proxy/{agent_id}/tasks/send`
**Universal A2A Proxy - 메시지 전송**

**Permission**: Authenticated (JWT Bearer token)

**설명**:
A2A Protocol 요청을 받아 에이전트의 실제 프레임워크 형식으로 변환하고, 원본 엔드포인트를 호출한 후 응답을 다시 A2A 형식으로 변환합니다.

**처리 흐름:**
1. 데이터베이스에서 에이전트 정보 로드
2. Access Control 검증 (visibility, ownership)
3. 프레임워크 어댑터 선택
4. A2A 요청 → 프레임워크 형식 변환
5. 원본 엔드포인트 호출 (사용자 에이전트 서버)
6. 프레임워크 응답 → A2A 형식 변환
7. A2A 응답 반환

**Request Format (A2A Protocol - JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "method": "sendMessage",
  "params": {
    "message": {
      "messageId": "msg-123",
      "role": "user",
      "parts": [
        {
          "kind": "text",
          "text": "Hello, I need help with my order"
        }
      ],
      "kind": "message"
    },
    "configuration": {
      "blocking": true,
      "acceptedOutputModes": ["text/plain"]
    }
  },
  "id": "request-123"
}
```

**Response Format (A2A Protocol - JSON-RPC 2.0):**
```json
{
  "jsonrpc": "2.0",
  "result": {
    "kind": "message",
    "messageId": "response-msg-123",
    "role": "agent",
    "parts": [
      {
        "kind": "text",
        "text": "I'd be happy to help you with your order. Could you provide your order number?"
      }
    ]
  },
  "id": "request-123"
}
```

**프레임워크별 변환 예시:**

**Agno 프레임워크:**
```json
// A2A → Agno 변환
{
  "input": "Hello, I need help with my order",
  "session_id": "msg-123",
  "stream": false
}

// Agno → A2A 변환
{
  "jsonrpc": "2.0",
  "result": {
    "kind": "message",
    "messageId": "response-msg-123",
    "role": "agent",
    "parts": [{"kind": "text", "text": "..."}]
  },
  "id": "request-123"
}
```

**Langchain 프레임워크:**
```json
// A2A → Langchain 변환
{
  "input": {
    "question": "Hello, I need help with my order"
  },
  "config": {
    "metadata": {
      "message_id": "msg-123"
    }
  }
}

// Langchain → A2A 변환
{
  "jsonrpc": "2.0",
  "result": {
    "kind": "message",
    "messageId": "response-msg-123",
    "role": "agent",
    "parts": [{"kind": "text", "text": "..."}]
  },
  "id": "request-123"
}
```

**Error Responses:**

**404 - Agent not found:**
```json
{
  "detail": "Agent 999 not found"
}
```

**403 - Access denied:**
```json
{
  "detail": "Access denied: This is a private agent"
}
```

**502 - Agent endpoint error:**
```json
{
  "detail": "Failed to call agent endpoint: Connection refused"
}
```

**504 - Timeout:**
```json
{
  "detail": "Agent endpoint timeout"
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
AGENT_ID=1

curl -X POST "http://localhost:9050/api/a2a/proxy/$AGENT_ID/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello"}],
        "kind": "message"
      },
      "configuration": {
        "blocking": true,
        "acceptedOutputModes": ["text/plain"]
      }
    },
    "id": "req-001"
  }'
```

**Access Control 규칙:**
- **Public agents**: 모든 인증된 사용자 접근 가능
- **Private agents**: 소유자만 접근 가능
- **Team agents**: 같은 부서 멤버만 접근 가능

**Streaming 지원:**

A2A Proxy는 Server-Sent Events (SSE)를 통한 streaming을 완벽 지원합니다.

**Streaming 활성화:**
```json
{
  "jsonrpc": "2.0",
  "method": "sendMessage",
  "params": {
    "message": {...},
    "configuration": {
      "blocking": false,  // false로 설정하면 streaming 모드
      "acceptedOutputModes": ["text/plain"]
    }
  },
  "id": "request-123"
}
```

**Streaming Response 형식:**
```
data: {"jsonrpc":"2.0","result":{"kind":"message","messageId":"response-msg-123-chunk-0","role":"agent","parts":[{"kind":"text","text":"Hello"}],"metadata":{"streaming":true,"done":false}},"id":"request-123"}

data: {"jsonrpc":"2.0","result":{"kind":"message","messageId":"response-msg-123-chunk-1","role":"agent","parts":[{"kind":"text","text":" world"}],"metadata":{"streaming":true,"done":false}},"id":"request-123"}

data: {"jsonrpc":"2.0","result":{"kind":"message","messageId":"response-msg-123-chunk-2","role":"agent","parts":[{"kind":"text","text":"!"}],"metadata":{"streaming":true,"done":true}},"id":"request-123"}

data: [DONE]
```

**각 프레임워크별 Streaming 지원:**
- **Agno**: SSE streaming, `stream: true` 옵션
- **Langchain**: Callback-based streaming
- **ADK**: A2A 네이티브 streaming
- **Custom**: A2A 표준 streaming

**Frontend에서 Streaming 수신 (JavaScript):**
```javascript
const eventSource = new EventSource(
  `http://localhost:9050/api/a2a/proxy/1/tasks/send`,
  {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
);

eventSource.onmessage = (event) => {
  if (event.data === '[DONE]') {
    eventSource.close();
    return;
  }

  const chunk = JSON.parse(event.data);
  const text = chunk.result.parts[0].text;
  console.log('Chunk:', text);
};

eventSource.onerror = (error) => {
  console.error('Stream error:', error);
  eventSource.close();
};
```

**cURL로 Streaming 테스트:**
```bash
TOKEN="user-jwt-token"
AGENT_ID=1

curl -N -X POST "http://localhost:9050/api/a2a/proxy/$AGENT_ID/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "user",
        "parts": [{"kind": "text", "text": "Tell me a story"}],
        "kind": "message"
      },
      "configuration": {"blocking": false}
    },
    "id": "req-001"
  }'

# -N 옵션: disable buffering (streaming 확인 가능)
```

---

#### `GET /a2a/proxy/{agent_id}/tasks/{task_id}`
**Task Status 조회 (Long-running 작업용)**

**Permission**: Authenticated

**상태**: 현재 미구현 (501 Not Implemented)

**설명**:
매우 긴 비동기 작업(예: 대규모 배치 처리)을 위한 task polling 엔드포인트입니다.
**일반적인 streaming 작업은 위의 `blocking: false` 옵션으로 충분합니다.**

이 엔드포인트는 다음과 같은 특수한 경우에만 필요합니다:
- 수 시간 걸리는 작업 (예: 대용량 데이터 처리)
- 재시작 가능한 작업 (task_id로 상태 확인)
- 백그라운드 배치 작업

**향후 구현 계획:**
- Redis에 long-running task 상태 저장
- Celery worker로 백그라운드 실행
- Task ID로 진행률 조회

**Response (501):**
```json
{
  "detail": "Task status tracking not implemented yet. Use streaming mode (blocking: false) for real-time responses."
}
```

**cURL 예제:**
```bash
TOKEN="user-jwt-token"
curl "http://localhost:9050/api/a2a/proxy/1/tasks/task-123" \
  -H "Authorization: Bearer $TOKEN"
```

---

#### 🔧 Enhanced Agent Model

A2A Proxy를 위해 Agent 모델이 확장되었습니다:

```python
class Agent(Base):
    __tablename__ = "agents"

    # 기존 필드
    id: int
    name: str
    description: str
    status: AgentStatus

    # 새로운 A2A 필드
    framework: AgentFramework  # Agno, ADK, Langchain, Custom
    agent_card: Dict[str, Any]  # 전체 A2A Agent Card (JSON)
    original_endpoint: str  # 원본 프레임워크 엔드포인트

    # Access Control
    owner_id: str
    department: str
    visibility: str  # public, private, team
```

**Framework Enum:**
```python
class AgentFramework(str, Enum):
    AGNO = "Agno"
    ADK = "ADK"
    LANGCHAIN = "Langchain"
    CUSTOM = "Custom"
```

---

#### 📱 Frontend Integration Guide

**1. Agent Card 생성 UI (Workbench) - Well-known vs Custom Framework 구분:**

```typescript
// components/AgentCardForm.tsx
import { useState, useEffect } from 'react';

type Framework = 'Agno' | 'ADK' | 'Langchain' | 'Custom';

interface WellKnownFramework {
  name: Framework;
  label: string;
  endpointPattern: string;
  requiresAgentId: boolean;
}

const WELL_KNOWN_FRAMEWORKS: WellKnownFramework[] = [
  {
    name: 'Agno',
    label: 'Agno OS',
    endpointPattern: '{base_url}/agents/{agent_id}/runs',
    requiresAgentId: true
  },
  {
    name: 'ADK',
    label: 'Google ADK',
    endpointPattern: '{base_url}/adk/v1/agents/{agent_id}',
    requiresAgentId: true
  }
];

const CUSTOM_FRAMEWORKS: Framework[] = ['Langchain', 'Custom'];

function AgentCardForm() {
  const [framework, setFramework] = useState<Framework>('Agno');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    // Well-known framework fields
    base_url: '',
    agent_id: '',
    // Custom framework fields
    original_endpoint: ''
  });

  const isWellKnown = WELL_KNOWN_FRAMEWORKS.some(f => f.name === framework);
  const wellKnownInfo = WELL_KNOWN_FRAMEWORKS.find(f => f.name === framework);

  const handleSubmit = async () => {
    let requestData: any = {
      title: formData.title,
      description: formData.description,
      framework: framework
    };

    if (isWellKnown && wellKnownInfo) {
      // Well-known framework: 자동 endpoint 생성
      const generatedEndpoint = wellKnownInfo.endpointPattern
        .replace('{base_url}', formData.base_url)
        .replace('{agent_id}', formData.agent_id);

      requestData.original_endpoint = generatedEndpoint;
      requestData.base_url = formData.base_url;
      requestData.agent_id = formData.agent_id;
    } else {
      // Custom framework: 사용자가 입력한 endpoint 사용
      requestData.original_endpoint = formData.original_endpoint;
    }

    // Agent 등록 API 호출
    const response = await fetch('/api/agents/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData)
    });

    if (response.ok) {
      console.log('Agent registered successfully');
    }
  };

  return (
    <form onSubmit={e => { e.preventDefault(); handleSubmit(); }}>
      {/* 기본 정보 */}
      <input
        placeholder="Agent 이름"
        value={formData.title}
        onChange={e => setFormData({ ...formData, title: e.target.value })}
      />
      <textarea
        placeholder="설명"
        value={formData.description}
        onChange={e => setFormData({ ...formData, description: e.target.value })}
      />

      {/* Framework 선택 */}
      <label>Framework</label>
      <select
        value={framework}
        onChange={e => setFramework(e.target.value as Framework)}
      >
        <optgroup label="Well-known Frameworks (자동 endpoint 생성)">
          {WELL_KNOWN_FRAMEWORKS.map(f => (
            <option key={f.name} value={f.name}>
              {f.label}
            </option>
          ))}
        </optgroup>
        <optgroup label="Custom Frameworks (수동 endpoint 입력)">
          {CUSTOM_FRAMEWORKS.map(f => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Well-known Framework 입력 필드 */}
      {isWellKnown && wellKnownInfo && (
        <div className="well-known-fields">
          <label>Base URL</label>
          <input
            placeholder="http://localhost:7777"
            value={formData.base_url}
            onChange={e => setFormData({ ...formData, base_url: e.target.value })}
          />

          <label>Agent ID</label>
          <input
            placeholder="my-agent-123"
            value={formData.agent_id}
            onChange={e => setFormData({ ...formData, agent_id: e.target.value })}
          />

          {/* 자동 생성 endpoint 미리보기 */}
          {formData.base_url && formData.agent_id && (
            <div className="endpoint-preview">
              <label>생성될 Endpoint (자동)</label>
              <code>
                {wellKnownInfo.endpointPattern
                  .replace('{base_url}', formData.base_url)
                  .replace('{agent_id}', formData.agent_id)}
              </code>
            </div>
          )}
        </div>
      )}

      {/* Custom Framework 입력 필드 */}
      {!isWellKnown && (
        <div className="custom-fields">
          <label>Endpoint URL</label>
          <input
            placeholder="http://my-server.com/api/v1/chat"
            value={formData.original_endpoint}
            onChange={e => setFormData({ ...formData, original_endpoint: e.target.value })}
          />
          <p className="text-sm text-gray-500">
            전체 endpoint URL을 입력하세요
          </p>
        </div>
      )}

      <button type="submit">에이전트 등록</button>
    </form>
  );
}
```

**2. Workbench Playground - Endpoint 선택 및 Streaming:**

Workbench에서 에이전트를 테스트할 때, 사용자는 다음 두 가지 방식으로 테스트할 수 있어야 합니다:
- **A2A Proxy Endpoint**: 플랫폼의 통합 프록시를 통한 테스트
- **Direct Endpoint**: 사용자가 등록한 원본 엔드포인트 직접 테스트

```typescript
// pages/Workbench/PlaygroundPage.tsx
import { useState, useEffect } from 'react';

type EndpointMode = 'proxy' | 'direct';

function PlaygroundPage({ agentId }: { agentId: number }) {
  const [mode, setMode] = useState<EndpointMode>('proxy');
  const [agent, setAgent] = useState(null);
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Agent 정보 로드
  useEffect(() => {
    fetch(`/api/agents/${agentId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    })
      .then(r => r.json())
      .then(data => setAgent(data.agent_card));
  }, [agentId]);

  // Streaming 메시지 전송
  const sendStreamingMessage = async () => {
    setIsStreaming(true);
    setResponse('');

    const token = localStorage.getItem('accessToken');
    const endpoint = mode === 'proxy'
      ? `/api/a2a/proxy/${agentId}/tasks/send`
      : agent.original_endpoint;

    const requestBody = {
      jsonrpc: "2.0",
      method: "sendMessage",
      params: {
        message: {
          messageId: `msg-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text: message }],
          kind: "message"
        },
        configuration: {
          blocking: false,  // Streaming 모드
          acceptedOutputModes: ["text/plain"]
        }
      },
      id: `req-${Date.now()}`
    };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // SSE Streaming 수신
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              setIsStreaming(false);
              return;
            }

            try {
              const json = JSON.parse(data);
              const text = json.result?.parts?.[0]?.text || '';
              setResponse(prev => prev + text);
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Streaming error:', error);
      setResponse(`Error: ${error.message}`);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="playground">
      <div className="endpoint-selector">
        <label>Endpoint Mode:</label>
        <select value={mode} onChange={e => setMode(e.target.value as EndpointMode)}>
          <option value="proxy">A2A Proxy (Unified)</option>
          <option value="direct">Direct Endpoint (Original)</option>
        </select>

        {mode === 'direct' && agent && (
          <div className="endpoint-info">
            <small>Direct: {agent.url}</small>
          </div>
        )}
      </div>

      <div className="chat-area">
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Enter your message..."
        />
        <button onClick={sendStreamingMessage} disabled={isStreaming}>
          {isStreaming ? 'Streaming...' : 'Send (Streaming)'}
        </button>
      </div>

      <div className="response-area">
        <h3>Response:</h3>
        <pre>{response}</pre>
      </div>
    </div>
  );
}
```

**Endpoint 선택 UI 구현 방법:**

**Option 1: Dropdown (권장)**
```tsx
<select value={endpointMode} onChange={handleModeChange}>
  <option value="proxy">🔄 A2A Proxy (플랫폼 통합)</option>
  <option value="direct">🎯 Direct Endpoint (원본)</option>
</select>
```

**Option 2: Tab UI**
```tsx
<div className="tabs">
  <button
    className={mode === 'proxy' ? 'active' : ''}
    onClick={() => setMode('proxy')}
  >
    A2A Proxy
  </button>
  <button
    className={mode === 'direct' ? 'active' : ''}
    onClick={() => setMode('direct')}
  >
    Direct Endpoint
  </button>
</div>
```

**3. Hub A2A JS SDK 통합:**

```typescript
// pages/Hub/ChatPage.tsx
import { A2AClient } from '@google/a2a';

async function initializeAgent(agentId: number) {
  const cardUrl = `http://localhost:9050/api/a2a/proxy/${agentId}/.well-known/agent-card.json`;
  const client = await A2AClient.fromCardUrl(cardUrl);

  // JWT 토큰 추가
  const token = localStorage.getItem('accessToken');
  client.setHeaders({ 'Authorization': `Bearer ${token}` });

  return client;
}

// Streaming with A2A JS SDK
async function streamMessage(client: A2AClient, message: string, onChunk: (text: string) => void) {
  const stream = await client.sendMessageStream({
    role: "user",
    parts: [{ kind: "text", text: message }]
  });

  for await (const chunk of stream) {
    const text = chunk.parts[0].text;
    onChunk(text);
  }
}
```

**4. Chat Service와 A2A Proxy 통합:**

Chat Service는 WebSocket을 통해 실시간 메시지를 전달합니다. A2A Proxy의 streaming endpoint를 호출하려면:

```python
# repos/chat-service/app/services/chat_service.py
async def send_message_to_agent(agent_id: int, message: str, session_id: str):
    """
    Send message to agent via A2A Proxy and stream response to WebSocket
    """
    agent_service_url = os.getenv("AGENT_SERVICE_URL", "http://agent-service:8002")
    endpoint = f"{agent_service_url}/a2a/proxy/{agent_id}/tasks/send"

    request_body = {
        "jsonrpc": "2.0",
        "method": "sendMessage",
        "params": {
            "message": {
                "messageId": f"msg-{session_id}-{int(time.time())}",
                "role": "user",
                "parts": [{"kind": "text", "text": message}],
                "kind": "message"
            },
            "configuration": {"blocking": False}  # Streaming mode
        },
        "id": f"req-{session_id}"
    }

    async with httpx.AsyncClient() as client:
        async with client.stream(
            "POST",
            endpoint,
            json=request_body,
            headers={"Content-Type": "application/json"},
            timeout=300.0
        ) as response:
            async for line in response.aiter_lines():
                if line.startswith("data: "):
                    data = line[6:]
                    if data == "[DONE]":
                        break

                    # Parse chunk and send to WebSocket
                    chunk = json.loads(data)
                    text = chunk["result"]["parts"][0]["text"]

                    # Send to WebSocket
                    await send_to_websocket(session_id, {
                        "type": "agent_chunk",
                        "text": text
                    })
```

**5. Flow Multi-Agent 지원 (미래 구현):**

```typescript
// pages/Flow/FlowCanvas.tsx
function FlowCanvas() {
  const [agents, setAgents] = useState([]);

  async function addAgentToFlow(agentId: number) {
    // A2A JS SDK가 RemoteA2aAgent 지원 시 구현 예정
    alert("이 기능은 A2A JS SDK의 RemoteA2aAgent가 지원되면 사용 가능합니다.");
  }

  return (
    <div>
      {/* Agent 선택 UI */}
      {/* 연결선 그리기 UI */}
    </div>
  );
}
```

---

#### 🧪 A2A Proxy 테스트 시나리오

**시나리오 1: Agno 에이전트 등록 및 호출**

```bash
TOKEN="user-jwt-token"

# 1. Agno 에이전트 등록
curl -X POST http://localhost:9050/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "Agno Customer Bot",
      "description": "Customer support agent built with Agno",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "framework": "Agno",
      "visibility": "public"
    },
    "original_endpoint": "http://localhost:8100/agent"
  }'

# 2. Agent Card 조회 (인증 불필요)
curl http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json

# 3. A2A Protocol로 메시지 전송
curl -X POST "http://localhost:9050/api/a2a/proxy/1/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "msg-001",
        "role": "user",
        "parts": [{"kind": "text", "text": "I need help"}],
        "kind": "message"
      },
      "configuration": {"blocking": true}
    },
    "id": "req-001"
  }'
```

**시나리오 2: Frontend에서 A2A JS SDK 사용**

```javascript
// 브라우저 콘솔 (http://localhost:9060)
import { A2AClient } from '@google/a2a';

// 1. Agent Card URL로 클라이언트 초기화
const client = await A2AClient.fromCardUrl(
  "http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json"
);

// 2. JWT 토큰 설정
const token = localStorage.getItem('accessToken');
client.setHeaders({ 'Authorization': `Bearer ${token}` });

// 3. 메시지 전송
const response = await client.sendMessage({
  role: "user",
  parts: [{ kind: "text", text: "Hello, I need help" }]
});

console.log(response.parts[0].text);
```

**시나리오 3: 다양한 프레임워크 에이전트 호출**

```bash
TOKEN="user-jwt-token"

# ADK 에이전트 (A2A 네이티브)
curl -X POST "http://localhost:9050/api/a2a/proxy/2/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "sendMessage", ...}'

# Langchain 에이전트
curl -X POST "http://localhost:9050/api/a2a/proxy/3/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "sendMessage", ...}'

# Custom A2A 에이전트
curl -X POST "http://localhost:9050/api/a2a/proxy/4/tasks/send" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "method": "sendMessage", ...}'

# 모두 동일한 A2A Protocol로 통신 가능!
```

---

## 🧪 API 테스트 시나리오

### 시나리오 1: 에이전트 라이프사이클 관리

```bash
TOKEN="user-jwt-token"

# 1. 새 에이전트 등록
curl -X POST http://localhost:8002/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "My New Agent",
      "description": "Test agent for development",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "skills": ["chat", "search"],
        "extensions": [
          {
            "uri": "urn:a2a:extension:langchain",
            "description": "Langchain support",
            "required": false
          }
        ]
      },
      "visibility": "private"
    }
  }'

# 2. 내 에이전트 확인
curl "http://localhost:8002/api/agents?only_mine=true" \
  -H "Authorization: Bearer $TOKEN"

# 3. 에이전트 상세 조회
curl "http://localhost:8002/api/agents/My%20New%20Agent" \
  -H "Authorization: Bearer $TOKEN"

# 4. 에이전트가 사용하는 Extension 확인
curl "http://localhost:8002/api/agents/My%20New%20Agent/extensions" \
  -H "Authorization: Bearer $TOKEN"

# 5. 테스트 완료 후 삭제
curl -X DELETE "http://localhost:8002/api/agents/My%20New%20Agent" \
  -H "Authorization: Bearer $TOKEN"
```

### 시나리오 2: 에이전트 검색 및 발견

```bash
TOKEN="user-jwt-token"

# 1. 전체 public 에이전트 조회
curl "http://localhost:8002/api/agents?visibility=public" \
  -H "Authorization: Bearer $TOKEN"

# 2. 키워드로 에이전트 검색
curl -X POST http://localhost:8002/api/agents/search \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "customer support chat"}'

# 3. 팀 에이전트 확인 (같은 부서)
curl "http://localhost:8002/api/agents?visibility=team" \
  -H "Authorization: Bearer $TOKEN"

# 4. Extension 생태계 탐색
curl http://localhost:8002/api/extensions

# 5. 특정 Extension 사용하는 에이전트 찾기
curl "http://localhost:8002/api/extensions?uri_pattern=langchain"
```

### 시나리오 3: Access Control 테스트

```bash
USER1_TOKEN="user1-jwt-token"
USER2_TOKEN="user2-jwt-token"

# USER1: private 에이전트 생성
curl -X POST http://localhost:8002/api/agents \
  -H "Authorization: Bearer $USER1_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "Private Agent",
      "description": "Only I can see this",
      "url": "http://localhost:8100/agent",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "visibility": "private"
    }
  }'

# USER1: 확인 가능
curl "http://localhost:8002/api/agents/Private%20Agent" \
  -H "Authorization: Bearer $USER1_TOKEN"
# → 200 OK

# USER2: 접근 불가
curl "http://localhost:8002/api/agents/Private%20Agent" \
  -H "Authorization: Bearer $USER2_TOKEN"
# → 404 Not Found (access denied)

# USER2: 목록에도 나타나지 않음
curl "http://localhost:8002/api/agents" \
  -H "Authorization: Bearer $USER2_TOKEN"
# → Private Agent 없음
```

## 🧪 Frontend에서 테스트

### 1. 에이전트 CRUD 작업 테스트
```javascript
// http://localhost:9060의 브라우저 콘솔에서
const agentTests = {
  // 에이전트 생성
  create: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Agent',
        description: 'A test agent for development',
        framework: 'Langchain',
        a2a_endpoint: 'http://localhost:8100/agent',
        capabilities: {
          skills: ['chat', 'search', 'analyze']
        },
        is_public: true,
        visibility: 'public'  // public, private, team
      })
    });
    console.log('Created:', await res.json());
  },

  // 에이전트 나열 (Access Control 필터링)
  list: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/?visibility=public', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.table(data.agents);
  },

  // 내 에이전트만 조회
  listMine: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/?only_mine=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.table(data.agents);
  },

  // 팀 에이전트 조회
  listTeam: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/?visibility=team', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.table(data.agents);
  },

  // 에이전트 상태 업데이트
  updateStatus: async (agentId) => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch(`/api/agents/${agentId}/`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status: 'PRODUCTION'
      })
    });
    console.log('Updated:', await res.json());
  }
};

// 테스트 실행
await agentTests.create();
await agentTests.list();
await agentTests.listMine();
```

## 🔐 Access Control 구현

### Visibility 옵션

- **public**: 모든 사용자에게 공개
- **private**: 소유자만 접근 가능
- **team**: 같은 부서 멤버만 접근 가능

### Agent 스키마

```python
class Agent(Base):
    __tablename__ = "agents"

    # 기본 필드
    id: int
    name: str
    description: str
    framework: AgentFramework
    status: AgentStatus

    # Access Control 필드
    owner_id: str  # 소유자 username
    department: str  # 부서명
    is_public: bool  # 공개 여부
    visibility: str  # 'public', 'private', 'team'
    allowed_users: List[str]  # 특정 사용자 접근 권한
```

### 필터링 로직

```python
# 기본 동작 (필터 없음)
# - public 에이전트
# - 내가 소유한 에이전트
# - 내 팀의 team 에이전트

# visibility=public
# - public 에이전트만

# visibility=private
# - 내가 소유한 private 에이전트만

# visibility=team
# - 내 부서의 team 에이전트만

# only_mine=true
# - 내가 소유한 모든 에이전트
```

## 🔐 환경 변수

```bash
# 서비스
SERVICE_NAME=agent-service
SERVICE_PORT=8002

# 데이터베이스
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/agent_service_db

# Redis
REDIS_URL=redis://localhost:6379/1

# JWT (user-service와 동일)
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# CORS
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
```

## 📂 프로젝트 구조

```
agent-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 앱
│   ├── api/
│   │   └── v1/
│   │       ├── agents.py          # 에이전트 CRUD 엔드포인트
│   │       ├── registry.py        # A2A Registry API (base)
│   │       └── a2a_proxy.py       # 🆕 A2A Universal Proxy
│   ├── a2a/                       # 🆕 A2A Protocol 지원
│   │   └── adapters/              # 프레임워크 어댑터
│   │       ├── __init__.py        # FrameworkAdapter ABC
│   │       ├── agno_adapter.py    # Agno 어댑터
│   │       ├── adk_adapter.py     # ADK 어댑터
│   │       ├── langchain_adapter.py  # Langchain 어댑터
│   │       └── custom_adapter.py  # Custom 어댑터
│   ├── core/
│   │   ├── config.py              # 설정
│   │   ├── database.py            # DB 모델 및 연결
│   │   ├── security.py            # JWT 인증
│   │   └── framework_templates.py # 🆕 Framework 템플릿
│   ├── models/                    # (database.py에 통합됨)
│   ├── schemas/                   # (agents.py에 통합됨)
│   └── services/                  # 비즈니스 로직
├── tests/
│   └── test_agents.py
├── alembic/                       # 데이터베이스 마이그레이션
├── .env.example
├── .env.local
├── pyproject.toml
└── README.md
```

## 🧪 테스트 실행

```bash
# 모든 테스트 실행
pytest

# 커버리지와 함께 실행
pytest --cov=app --cov-report=html

# 특정 테스트만 실행
pytest tests/test_agents.py -v
```

## 👥 팀 개발 워크플로우

### Git Pull 후 확인사항

다른 개발자가 마이그레이션 파일을 추가한 경우, pull 후 반드시 마이그레이션을 적용해야 합니다.

```bash
# 1. 코드 pull
git pull origin main

# 2. 새 마이그레이션 파일이 있는지 확인
ls alembic/versions/

# 3. 현재 DB 마이그레이션 상태 확인
alembic current

# 4. 최신 마이그레이션 적용 (중요!)
alembic upgrade head

# 5. 적용 확인
alembic current
# 출력 예시: 001 (head)
```

**⚠️ 주의사항:**
- `alembic upgrade head`를 실행하지 않으면 로컬 DB 스키마가 코드와 맞지 않아 에러가 발생합니다
- 마이그레이션은 순차적으로 적용되므로 중간 버전을 건너뛸 수 없습니다
- production DB에 적용하기 전 반드시 development 환경에서 테스트하세요

### 새 마이그레이션 생성 시

스키마를 변경했다면 다음 단계를 따르세요:

```bash
# 1. 모델 변경 (app/core/database.py 등)

# 2. 마이그레이션 자동 생성
alembic revision --autogenerate -m "Add user_preferences table"

# 3. 생성된 파일 확인 및 검토
# alembic/versions/002_add_user_preferences_table.py

# 4. 마이그레이션 적용
alembic upgrade head

# 5. 커밋 및 푸시
git add alembic/versions/002_*.py
git commit -m "feat: add user_preferences table migration"
git push
```

**마이그레이션 파일 리뷰 체크리스트:**
- [ ] upgrade() 함수가 올바른 스키마 변경을 수행하는가?
- [ ] downgrade() 함수가 정확히 롤백하는가?
- [ ] 데이터 손실 위험이 없는가? (특히 컬럼 삭제/변경 시)
- [ ] 기존 데이터 마이그레이션이 필요한가?

## 🐛 일반적인 문제

### 1. 마이그레이션 오류

**증상**: `alembic upgrade head` 실행 시 에러 발생

**원인 및 해결:**

```bash
# 원인 1: DB와 코드가 sync되지 않음
# 해결: 현재 상태 확인 후 재시도
alembic current
alembic history
alembic upgrade head

# 원인 2: 마이그레이션 충돌 (여러 명이 동시에 마이그레이션 생성)
# 해결: base 리비전 확인 및 수동 조정 필요
# alembic/versions/XXX.py 파일의 down_revision 확인

# 원인 3: DB에 수동으로 변경한 내역이 있음
# 해결: DB를 초기화하거나 수동으로 스키마를 맞춤
# development 환경에서만:
docker exec -it a2g-postgres-dev psql -U dev_user -c "DROP DATABASE agent_service_db;"
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE agent_service_db;"
alembic upgrade head
```

### 2. 데이터베이스 연결 문제
```bash
# PostgreSQL 실행 중인지 확인
docker ps | grep postgres

# 데이터베이스 존재 확인
docker exec -it a2g-postgres-dev psql -U dev_user -c "\l"

# 누락된 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE agent_service_db;"
```

### 2. 인증 문제
```javascript
// 토큰이 존재하는지 확인
console.log('Token:', localStorage.getItem('accessToken'));

// 토큰 디코딩 (디버깅 용도)
const token = localStorage.getItem('accessToken');
if (token) {
  const parts = token.split('.');
  const payload = JSON.parse(atob(parts[1]));
  console.log('Token payload:', payload);
  console.log('Expires:', new Date(payload.exp * 1000));
}
```

### 3. Access Control 문제

**증상**: 에이전트가 목록에 표시되지 않음

**해결**:
1. 에이전트의 `visibility` 설정 확인
2. 사용자의 `department`가 올바른지 확인
3. `owner_id`가 현재 사용자와 일치하는지 확인

```sql
-- 데이터베이스에서 직접 확인
SELECT id, name, owner_id, visibility, department
FROM agents;
```

## 📞 지원

- **담당자**: DEV4 (안준형)
- **Slack**: #a2g-platform-dev
- **이메일**: junhyung.ahn@company.com

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
docker exec a2g-agent-service uv run alembic revision --autogenerate -m "Add new field"

# 3. 생성된 파일 확인 및 검토
ls alembic/versions/  # 새로 생성된 파일 확인
vim alembic/versions/00X_*.py  # 내용 검토

# 4. 로컬에서 테스트
docker exec a2g-agent-service uv run alembic upgrade head

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
docker exec a2g-agent-service uv run alembic current

# 마이그레이션 히스토리 확인
docker exec a2g-agent-service uv run alembic history

# 특정 버전으로 롤백 (신중하게!)
docker exec a2g-agent-service uv run alembic downgrade <revision>

# 최신 상태로 업그레이드
docker exec a2g-agent-service uv run alembic upgrade head
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
docker exec a2g-agent-service uv run alembic current
docker exec a2g-agent-service uv run alembic upgrade head

# Q: "Table already exists" 에러
# A: 마이그레이션 stamp (이미 테이블이 있는 경우)
docker exec a2g-agent-service uv run alembic stamp head

# Q: 모든 서비스를 한 번에 업데이트하고 싶어요
# A: 루트 디렉토리에서
./start-dev.sh update
```
