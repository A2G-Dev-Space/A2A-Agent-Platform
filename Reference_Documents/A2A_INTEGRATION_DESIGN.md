# A2A Protocol Integration Design

**Version**: 1.0
**Date**: 2025-10-31
**Status**: Implementation Ready

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture Design](#2-architecture-design)
3. [Agent Card Management](#3-agent-card-management)
4. [Universal A2A Proxy Server](#4-universal-a2a-proxy-server)
5. [Framework Templates](#5-framework-templates)
6. [Hub Implementation](#6-hub-implementation)
7. [Flow Implementation](#7-flow-implementation)
8. [Database Schema Changes](#8-database-schema-changes)
9. [API Specifications](#9-api-specifications)
10. [Frontend Components](#10-frontend-components)
11. [Implementation Guide](#11-implementation-guide)

---

## 1. System Overview

### 1.1 Goals

사용자가 다양한 LLM Framework의 에이전트를 A2G Platform에서 통합 관리하고, A2A 프로토콜을 통해 통신할 수 있도록 합니다.

**핵심 기능:**

1. **Agent Card 생성 및 저장**: UI를 통해 Agent Card 정보를 입력하여 플랫폼에 저장
2. **Universal A2A Server**: 모든 Framework의 endpoint를 A2A server로 변환 (agent_id로 구별)
3. **Framework 템플릿**: 알려진 Framework는 사전 정의된 템플릿 제공
4. **Hub**: A2A JS SDK를 사용하여 선택한 agent와 대화
5. **Flow**: 여러 agent를 sub-agent로 사용하는 multi-agent 시스템 (현재는 UI만, 향후 구현)

### 1.2 User Journey

```
1. Workbench에서 Agent 생성
   ├─ Framework 선택 (Google ADK/Agno OS/Langchain/Custom)
   ├─ Agent Card 정보 입력
   │  ├─ A2A Native (Google ADK): Base URL만 입력 → 직접 A2A 호출 (Proxy 불필요)
   │  ├─ Well-known (Agno OS): Base URL + Agent ID 입력 → Proxy로 프로토콜 변환
   │  └─ Custom (Langchain, Custom): 전체 endpoint URL 입력 → Proxy로 프로토콜 변환
   └─ 저장 → Agent Service에 등록

2. Hub에서 Agent 사용
   ├─ 등록된 Agent 목록 조회
   ├─ Agent 선택
   └─ 호출 방식 (Framework 유형에 따라 자동 분기)
      ├─ A2A Native (Google ADK): Frontend → Agent Endpoint (Direct, Proxy 불필요)
      └─ Well-known/Custom: Frontend → Universal A2A Proxy → Framework Adapter → Agent Endpoint

3. Flow에서 Multi-Agent 구성 (미래)
   ├─ 여러 Agent 선택
   ├─ Sub-agent로 구성
   └─ RemoteA2aAgent로 호출 (JS SDK 지원 시)
```

---

## 2. Architecture Design

### 2.1 System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                      Frontend (React)                         │
│                                                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐          │
│  │ Workbench   │  │    Hub      │  │    Flow     │          │
│  │ Agent Card  │  │  A2A Chat   │  │ Multi-Agent │          │
│  │   Creator   │  │  (JS SDK)   │  │ UI (준비중)  │          │
│  └─────────────┘  └─────────────┘  └─────────────┘          │
│         │                 │                 │                 │
└─────────┼─────────────────┼─────────────────┼─────────────────┘
          │                 │                 │
          │ POST /api/agents│ GET /api/agents │
          │                 │ POST /api/a2a/proxy/{agent_id}
          │                 │                 │
┌─────────▼─────────────────▼─────────────────▼─────────────────┐
│                   API Gateway (9050)                           │
│                  - JWT Authentication                          │
│                  - Request Routing                             │
└────────────────────────────┬───────────────────────────────────┘
                             │
┌────────────────────────────▼───────────────────────────────────┐
│              Agent Service (8002)                              │
│                                                                 │
│  ┌──────────────────────┐  ┌────────────────────────────┐    │
│  │  Agent Registry      │  │  Universal A2A Proxy       │    │
│  │  - Agent Card CRUD   │  │  - /api/a2a/proxy/{id}    │    │
│  │  - Framework Meta    │  │  - Framework Adapters      │    │
│  │  - Access Control    │  │  - Request/Response        │    │
│  └──────────────────────┘  │    Transformation          │    │
│                             └────────────────────────────┘    │
│                                       │                        │
│  ┌────────────────────────────────────▼──────────────────┐   │
│  │           Framework Adapter System                     │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │   │
│  │  │  Agno    │ │   ADK    │ │Langchain │ │ Custom  │ │   │
│  │  │ Adapter  │ │ Adapter  │ │ Adapter  │ │ Adapter │ │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └─────────┘ │   │
│  └───────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
┌─────────▼────────┐  ┌────────▼────────┐  ┌──────▼──────┐
│ Agno Agent       │  │  ADK Agent      │  │   Custom    │
│ (User's Server)  │  │ (User's Server) │  │   Agent     │
│ Port: 8100       │  │ Port: 8101      │  │ Port: 8102  │
└──────────────────┘  └─────────────────┘  └─────────────┘
```

### 2.2 Data Flow

#### Agent Registration Flow

```
User → Workbench UI → POST /api/agents
  {
    agent_card: {
      name: "My Agent",
      description: "...",
      framework: "Agno",
      url: "http://user-server:8100",  # 실제 endpoint
      version: "1.0.0",
      protocol_version: "1.0",
      capabilities: {...}
    }
  }
  ↓
Agent Service
  ├─ Validate Agent Card
  ├─ Apply Framework Template (if known)
  ├─ Store in Database
  └─ Return agent_id

Database:
  agents table:
    - id (PK)
    - name (unique)
    - framework (Agno/ADK/Langchain/Custom)
    - original_endpoint (user's actual endpoint)
    - agent_card (JSONB)
    - a2a_proxy_url (generated: /api/a2a/proxy/{id})
```

#### Agent Invocation Flow (Hub)

```
User → Hub UI → Select Agent → A2A JS SDK
  ↓
A2AClient.fromCardUrl(
  "http://localhost:9050/api/a2a/proxy/123/.well-known/agent-card.json"
)
  ↓
client.sendMessage({...})
  ↓
POST http://localhost:9050/api/a2a/proxy/123/tasks/send
  {
    jsonrpc: "2.0",
    method: "sendMessage",
    params: {...}
  }
  ↓
Agent Service - Universal A2A Proxy
  ├─ Load Agent from DB (id=123)
  ├─ Get Framework Adapter (Agno)
  ├─ Transform Request (A2A → Agno format)
  ├─ Call original_endpoint (http://user-server:8100/run)
  ├─ Transform Response (Agno → A2A format)
  └─ Return A2A Response

  ↓
Hub UI receives response via A2A JS SDK
```

---

## 3. Agent Card Management

### 3.1 Enhanced Agent Model

기존 Agent 모델을 확장하여 A2A Protocol 지원:

```python
# repos/agent-service/app/core/database.py

class AgentFramework(str, enum.Enum):
    AGNO_OS = "Agno OS"
    GOOGLE_ADK = "Google ADK"
    LANGCHAIN = "Langchain"
    CUSTOM = "Custom"

class Agent(Base):
    __tablename__ = "agents"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)

    # Framework 정보
    framework = Column(Enum(AgentFramework), nullable=False)
    framework_version = Column(String)  # e.g., "0.1.0"

    # A2A Protocol 정보
    agent_card = Column(JSON, nullable=False)  # Full AgentCard (A2A spec)
    original_endpoint = Column(String, nullable=False)  # User's actual endpoint
    a2a_proxy_url = Column(String, nullable=False)  # Generated proxy URL

    # Access Control
    owner_id = Column(String, nullable=False)
    department = Column(String)
    visibility = Column(String, default="public")  # public/private/team

    # Metadata
    status = Column(Enum(AgentStatus), default=AgentStatus.DEVELOPMENT)
    health_status = Column(Enum(HealthStatus), default=HealthStatus.UNKNOWN)
    last_health_check = Column(DateTime(timezone=True))

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 3.2 Framework Template System

**플랫폼의 3가지 Framework 유형 구분**

플랫폼은 Framework를 **A2A 프로토콜 지원 여부**와 **Proxy 필요성**에 따라 3가지 유형으로 구분합니다:

---

#### 1️⃣ A2A Native Frameworks (Direct A2A Call - Proxy 불필요) ⭐

**개념**: A2A Protocol을 네이티브로 지원하는 프레임워크입니다.

**특징**:
- ✅ **Proxy 불필요**: 플랫폼 proxy를 거치지 않고 Frontend가 직접 Agent의 A2A endpoint 호출
- ✅ **표준 준수**: `.well-known/agent-card.json`을 통한 Agent Card Discovery 지원
- ✅ **최적의 성능**: 중간 변환 없이 직접 통신

**호출 흐름**:
```
Frontend → Agent A2A Endpoint (Direct)
```

**플랫폼 역할**: 메타데이터 저장 및 검색 용도로만 사용 (프로토콜 변환 불필요)

**지원 프레임워크**:

| Framework | A2A Endpoint 패턴 | 필수 입력 | 현재 상태 |
|-----------|-------------------|----------|-----------|
| **Google ADK** | `{base_url}/.well-known/agent-card.json` | `base_url` | ✅ 현재 지원 |
| **Agno OS** | `{base_url}/.well-known/agent-card.json` | `base_url` | 🚧 미래 지원 예정 |

**예시 (Google ADK)**:
```
사용자 입력:
  - Base URL: http://my-adk-server:8080

시스템 동작:
  1. Agent Card Discovery: http://my-adk-server:8080/.well-known/agent-card.json
  2. 플랫폼 등록: 메타데이터만 저장 (검색용)
  3. Frontend 호출: 직접 A2A endpoint 호출 (Proxy 불필요!)
```

---

#### 2️⃣ Well-known Non-A2A Frameworks (Proxy 필요) 🔄

**개념**: 표준 endpoint 패턴을 가지고 있지만 A2A Protocol을 네이티브로 지원하지 않는 프레임워크입니다.

**특징**:
- ❌ **A2A 비지원**: Framework 고유의 프로토콜 사용 (e.g., Agno Protocol)
- ✅ **Proxy 필요**: 플랫폼 proxy를 통한 프로토콜 변환 필요
- ✅ **자동 endpoint 생성**: Base URL과 Agent ID만 입력하면 endpoint 자동 생성

**호출 흐름**:
```
Frontend → Universal A2A Proxy → Framework Adapter (프로토콜 변환) → Agent Endpoint
```

**플랫폼 역할**: 프로토콜 변환 (A2A ↔ Framework Protocol)

**지원 프레임워크**:

| Framework | Original Endpoint 패턴 | 필수 입력 | 현재 상태 |
|-----------|------------------------|----------|-----------|
| **Agno OS** | `{base_url}/agents/{agent_id}/runs` | `base_url`, `agent_id` | ✅ 현재 지원 |

**예시 (Agno OS - 현재)**:
```
사용자 입력:
  - Base URL: http://my-agno-server:8100
  - Agent ID: my_agent

시스템 동작:
  1. Endpoint 자동 생성: http://my-agno-server:8100/agents/my_agent/runs
  2. 플랫폼 등록: Proxy URL 생성 (/api/a2a/proxy/123)
  3. Frontend 호출: Proxy를 통해 A2A → Agno Protocol 변환

프로토콜 변환 예시:
  A2A Request: { "jsonrpc": "2.0", "method": "sendMessage", ... }
    ↓ (Agno Adapter)
  Agno Request: { "input": "...", "session_id": "...", "stream": false }
```

---

#### 3️⃣ Custom Frameworks (Proxy 필요) 🔧

**개념**: 표준 endpoint 패턴이 없는 프레임워크로, 사용자가 **전체 endpoint URL**을 직접 입력합니다.

**특징**:
- ❌ **표준 패턴 없음**: Framework마다 endpoint 구조가 다름
- ✅ **Proxy 필요**: 플랫폼 proxy를 통한 프로토콜 변환 필요
- ✅ **전체 URL 입력**: 사용자가 완전한 endpoint URL을 제공

**호출 흐름**:
```
Frontend → Universal A2A Proxy → Framework Adapter (프로토콜 변환) → Agent Endpoint
```

**플랫폼 역할**: 프로토콜 변환 (A2A ↔ Framework Protocol)

**지원 프레임워크**:

| Framework | 입력 방식 | 예시 |
|-----------|----------|------|
| **Langchain** | 전체 URL | `http://my-server.com/langchain/invoke` |
| **Custom** | 전체 URL | `http://my-custom-agent.com/api/v1/chat` |

**예시 (Langchain)**:
```
사용자 입력:
  - Original Endpoint: http://my-server.com/langchain/invoke

시스템 동작:
  1. 플랫폼 등록: 사용자 제공 URL 저장 + Proxy URL 생성 (/api/a2a/proxy/456)
  2. Frontend 호출: Proxy를 통해 A2A → Langchain Protocol 변환

프로토콜 변환 예시:
  A2A Request: { "jsonrpc": "2.0", "method": "sendMessage", ... }
    ↓ (Langchain Adapter)
  Langchain Request: { "query": "...", "history": [], "config": {} }
```

---

#### 🔄 Framework 간 차이점 요약

| 항목 | A2A Native | Well-known Non-A2A | Custom |
|------|-----------|-------------------|--------|
| **A2A 지원** | ✅ 네이티브 지원 | ❌ 지원 안 함 | ❌ 지원 안 함 |
| **Proxy 필요** | ❌ 불필요 | ✅ 필요 | ✅ 필요 |
| **입력 방식** | Base URL | Base URL + Agent ID | 전체 URL |
| **Endpoint 생성** | 자동 (Agent Card Discovery) | 자동 (패턴 적용) | 수동 (사용자 입력) |
| **프로토콜 변환** | ❌ 불필요 | ✅ 필요 | ✅ 필요 |
| **성능** | ⚡ 최고 (직접 호출) | 🔄 중간 (1회 변환) | 🔄 중간 (1회 변환) |
| **플랫폼 역할** | 메타데이터 저장 | 프록시 + 변환 | 프록시 + 변환 |

---

**💡 중요: Agno OS의 미래 전환**

현재 Agno OS는 **Well-known Non-A2A (Proxy 필요)** 카테고리에 속하지만, 향후 A2A Protocol 지원이 완료되면 **A2A Native (Proxy 불필요)** 카테고리로 전환될 예정입니다.

```
현재:  Agno OS (Well-known) → Proxy 필요
미래:  Agno OS (A2A Native) → Proxy 불필요 (Google ADK와 동일)
```

```python
# repos/agent-service/app/core/framework_templates.py

from typing import Dict, Any
from pydantic import BaseModel
from enum import Enum

class FrameworkType(str, Enum):
    """프레임워크 유형 (3가지)"""
    A2A_NATIVE = "a2a_native"        # A2A 네이티브 지원 (Proxy 불필요)
    WELL_KNOWN = "well_known"        # 표준 패턴 (Proxy 필요)
    CUSTOM = "custom"                # 커스텀 URL (Proxy 필요)

class FrameworkTemplate(BaseModel):
    """Framework-specific template configuration"""
    framework: str
    framework_type: FrameworkType  # 3가지 유형 구분
    requires_proxy: bool           # Proxy 필요 여부
    default_protocol_version: str
    endpoint_pattern: str          # Endpoint 생성 패턴 (빈 문자열 = 수동 입력)
    a2a_endpoint_pattern: str      # A2A Native용 Agent Card Discovery 패턴
    capabilities_template: Dict[str, Any]
    required_config: list[str]     # 필수 입력 필드

# ============================================================
# 1️⃣ A2A Native Frameworks (Direct A2A Call - Proxy 불필요)
# ============================================================
A2A_NATIVE_FRAMEWORKS: Dict[str, FrameworkTemplate] = {
    "Google ADK": FrameworkTemplate(
        framework="Google ADK",
        framework_type=FrameworkType.A2A_NATIVE,
        requires_proxy=False,  # ⭐ Proxy 불필요!
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}",  # Base URL만 사용
        a2a_endpoint_pattern="{base_url}/.well-known/agent-card.json",
        capabilities_template={
            "streaming": True,
            "tools": True,
            "extensions": True
        },
        required_config=["base_url"]  # Base URL만 필요
    )
    # Note: Agno OS는 향후 A2A 지원 완료 시 여기에 추가 예정
}

# ============================================================
# 2️⃣ Well-known Non-A2A Frameworks (Proxy 필요)
# ============================================================
WELL_KNOWN_FRAMEWORKS: Dict[str, FrameworkTemplate] = {
    "Agno OS": FrameworkTemplate(
        framework="Agno OS",
        framework_type=FrameworkType.WELL_KNOWN,
        requires_proxy=True,  # ✅ Proxy 필요
        default_protocol_version="1.0",
        endpoint_pattern="{base_url}/agents/{agent_id}/runs",
        a2a_endpoint_pattern="",  # Not applicable (non-A2A)
        capabilities_template={
            "streaming": True,
            "tools": True,
            "memory": True
        },
        required_config=["base_url", "agent_id"]
    )
}

# ============================================================
# 3️⃣ Custom Frameworks (Proxy 필요)
# ============================================================
CUSTOM_FRAMEWORKS: Dict[str, FrameworkTemplate] = {
    "Langchain": FrameworkTemplate(
        framework="Langchain",
        framework_type=FrameworkType.CUSTOM,
        requires_proxy=True,  # ✅ Proxy 필요
        default_protocol_version="1.0",
        endpoint_pattern="",  # 사용자가 전체 URL 입력
        a2a_endpoint_pattern="",  # Not applicable (non-A2A)
        capabilities_template={
            "streaming": True,
            "tools": True,
            "chains": True
        },
        required_config=["original_endpoint"]  # 전체 URL 필요
    ),
    "Custom": FrameworkTemplate(
        framework="Custom",
        framework_type=FrameworkType.CUSTOM,
        requires_proxy=True,  # ✅ Proxy 필요
        default_protocol_version="1.0",
        endpoint_pattern="",  # 사용자가 전체 URL 입력
        a2a_endpoint_pattern="",  # Not applicable (non-A2A)
        capabilities_template={
            "streaming": True,
            "tools": True
        },
        required_config=["original_endpoint"]  # 전체 URL 필요
    )
}

# Combined registry (모든 프레임워크 통합)
FRAMEWORK_TEMPLATES: Dict[str, FrameworkTemplate] = {
    **A2A_NATIVE_FRAMEWORKS,
    **WELL_KNOWN_FRAMEWORKS,
    **CUSTOM_FRAMEWORKS
}

def get_framework_template(framework: str) -> FrameworkTemplate:
    """Get framework template by name"""
    return FRAMEWORK_TEMPLATES.get(framework)

def apply_framework_template(
    framework: str,
    agent_card: Dict[str, Any],
    config: Dict[str, Any]
) -> Dict[str, Any]:
    """Apply framework template to agent card"""
    template = get_framework_template(framework)
    if not template:
        raise ValueError(f"Unknown framework: {framework}")

    # Validate required config
    missing = [key for key in template.required_config if key not in config]
    if missing:
        raise ValueError(f"Missing required config: {missing}")

    # Generate endpoint URL
    endpoint_url = template.endpoint_pattern.format(**config)

    # Merge capabilities
    capabilities = {**template.capabilities_template, **agent_card.get("capabilities", {})}

    # Update agent card
    agent_card["url"] = endpoint_url
    agent_card["protocol_version"] = template.default_protocol_version
    agent_card["capabilities"] = capabilities

    return agent_card
```

---

## 4. Universal A2A Proxy Server

### 4.1 Proxy Architecture

Agent Service 내부에 Universal A2A Proxy를 구현합니다. 이는 **Non-A2A 프레임워크의 endpoint를 A2A 프로토콜로 변환**합니다.

**중요**: **A2A Native 프레임워크 (Google ADK)는 Proxy를 거치지 않습니다.** Frontend가 직접 Agent의 A2A endpoint를 호출합니다.

**Proxy 대상 프레임워크**:
- ✅ Well-known Non-A2A (Agno OS 현재) - Proxy 필요
- ✅ Custom (Langchain, Custom) - Proxy 필요
- ❌ A2A Native (Google ADK) - Proxy 불필요 (Direct Call)

**주요 책임**:
1. **A2A Native 프레임워크**: 메타데이터 저장만 (Proxy 동작 없음)
2. **Non-A2A 프레임워크**: 프로토콜 변환 및 Proxy 동작
   - A2A Agent Card 제공 (`/.well-known/agent-card.json`)
   - A2A Protocol endpoint 제공 (`/tasks/send`)
   - Framework별 Request/Response 변환
   - 실제 Agent endpoint 호출

### 4.2 Proxy Endpoints

```python
# repos/agent-service/app/api/v1/a2a_proxy.py

from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Any, Dict
import httpx

from app.core.database import get_db, Agent
from app.core.security import get_current_user
from app.a2a.adapters import get_framework_adapter

router = APIRouter()

@router.get("/a2a/proxy/{agent_id}/.well-known/agent-card.json")
async def get_agent_card(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    A2A Agent Card endpoint

    This endpoint provides the Agent Card for A2A JS SDK discovery.
    """
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Return Agent Card with proxy URL
    agent_card = agent.agent_card.copy()
    agent_card["url"] = f"http://localhost:9050/api/a2a/proxy/{agent_id}"

    return agent_card


@router.post("/a2a/proxy/{agent_id}/tasks/send")
async def proxy_a2a_request(
    agent_id: int,
    request_body: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Universal A2A Proxy endpoint

    Handles A2A Protocol requests and forwards to actual agent endpoint.

    Flow:
    1. Load agent from database
    2. Get framework adapter
    3. Transform A2A request → Framework format
    4. Call original endpoint
    5. Transform Framework response → A2A format
    """
    # 1. Load agent
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 2. Check access control
    # (Implement based on visibility and owner_id)

    # 3. Get framework adapter
    adapter = get_framework_adapter(agent.framework)

    # 4. Transform request
    framework_request = adapter.transform_request(request_body, agent.agent_card)

    # 5. Call original endpoint
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.post(
                agent.original_endpoint,
                json=framework_request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            framework_response = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Failed to call agent endpoint: {str(e)}"
            )

    # 6. Transform response
    a2a_response = adapter.transform_response(framework_response, request_body)

    return a2a_response


@router.get("/a2a/proxy/{agent_id}/tasks/{task_id}")
async def get_task_status(
    agent_id: int,
    task_id: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get task status (for streaming/async tasks)
    """
    # Implementation depends on framework support
    raise HTTPException(status_code=501, detail="Not implemented yet")
```

### 4.3 Framework Adapters

```python
# repos/agent-service/app/a2a/adapters/__init__.py

from abc import ABC, abstractmethod
from typing import Dict, Any
from enum import Enum

class AgentFramework(str, Enum):
    AGNO_OS = "Agno OS"
    GOOGLE_ADK = "Google ADK"  # A2A Native - Adapter 불필요
    LANGCHAIN = "Langchain"
    CUSTOM = "Custom"

class FrameworkAdapter(ABC):
    """Base class for framework adapters"""

    @abstractmethod
    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform A2A request to framework-specific format"""
        pass

    @abstractmethod
    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Transform framework response to A2A format"""
        pass


# repos/agent-service/app/a2a/adapters/agno_adapter.py

from . import FrameworkAdapter
from typing import Dict, Any

class AgnoOSAdapter(FrameworkAdapter):
    """Adapter for Agno OS framework (Well-known Non-A2A)"""

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent_card: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform A2A request to Agno format

        A2A format:
        {
          "jsonrpc": "2.0",
          "method": "sendMessage",
          "params": {
            "message": {
              "messageId": "...",
              "role": "user",
              "parts": [{"kind": "text", "text": "..."}]
            }
          },
          "id": "request-123"
        }

        Agno format:
        {
          "input": "...",
          "session_id": "...",
          "stream": false
        }
        """
        params = a2a_request.get("params", {})
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text from parts
        text_parts = [p["text"] for p in parts if p.get("kind") == "text"]
        input_text = " ".join(text_parts)

        return {
            "input": input_text,
            "session_id": message.get("messageId", "default"),
            "stream": False
        }

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Transform Agno response to A2A format

        Agno format:
        {
          "output": "...",
          "metadata": {...}
        }

        A2A format:
        {
          "jsonrpc": "2.0",
          "result": {
            "kind": "message",
            "messageId": "...",
            "role": "agent",
            "parts": [{"kind": "text", "text": "..."}]
          },
          "id": "request-123"
        }
        """
        output = framework_response.get("output", "")
        request_id = original_request.get("id", "unknown")

        return {
            "jsonrpc": "2.0",
            "result": {
                "kind": "message",
                "messageId": f"response-{request_id}",
                "role": "agent",
                "parts": [
                    {
                        "kind": "text",
                        "text": output
                    }
                ]
            },
            "id": request_id
        }


# repos/agent-service/app/a2a/adapters/google_adk_adapter.py

# ⭐ NOTE: Google ADK는 A2A Native이므로 Adapter가 실제로 필요하지 않습니다.
# Frontend가 직접 Agent의 A2A endpoint를 호출하므로, 이 Adapter는 사용되지 않습니다.
# 이 코드는 일관성을 위해 남겨두지만, 실제 운영 시 호출되지 않습니다.

class GoogleADKAdapter(FrameworkAdapter):
    """
    Adapter for Google ADK framework (A2A Native)

    ⚠️ Important: Google ADK는 A2A Protocol을 네이티브로 지원하므로
    실제로는 이 Adapter를 거치지 않습니다.
    Frontend가 직접 Agent의 A2A endpoint를 호출합니다.
    """

    def transform_request(self, a2a_request, agent_card):
        # Pass-through (변환 불필요)
        return a2a_request

    def transform_response(self, framework_response, original_request):
        # Pass-through (변환 불필요)
        return framework_response


# repos/agent-service/app/a2a/adapters/langchain_adapter.py

class LangchainAdapter(FrameworkAdapter):
    """Adapter for Langchain framework"""
    # Similar implementation
    pass


# repos/agent-service/app/a2a/adapters/custom_adapter.py

class CustomAdapter(FrameworkAdapter):
    """Pass-through adapter for custom A2A-compliant agents"""

    def transform_request(self, a2a_request, agent_card):
        # No transformation needed for A2A-compliant agents
        return a2a_request

    def transform_response(self, framework_response, original_request):
        # No transformation needed
        return framework_response


# repos/agent-service/app/a2a/adapters/__init__.py (continued)

def get_framework_adapter(framework: str) -> FrameworkAdapter:
    """
    Factory function to get appropriate adapter

    ⚠️ Note: Google ADK (A2A Native)는 실제로 Adapter를 사용하지 않습니다.
    Frontend가 직접 호출하므로 이 함수가 호출되지 않습니다.
    """
    adapters = {
        "Agno OS": AgnoOSAdapter(),
        "Google ADK": GoogleADKAdapter(),  # A2A Native (실제로는 사용 안 됨)
        "Langchain": LangchainAdapter(),
        "Custom": CustomAdapter()
    }

    adapter = adapters.get(framework)
    if not adapter:
        raise ValueError(f"Unsupported framework: {framework}")

    return adapter
```

---

## 5. Framework Templates

### 5.1 Frontend Framework Selection UI

사용자가 Agent를 생성할 때 Framework를 선택하면 자동으로 템플릿이 적용됩니다.

```typescript
// frontend/src/types/index.ts

export interface FrameworkTemplate {
  framework: string;
  displayName: string;
  description: string;
  logoUrl: string;
  requiredFields: FormField[];
  capabilitiesTemplate: Record<string, any>;
}

// ============================================================
// 1️⃣ A2A Native Frameworks (Direct A2A Call - Proxy 불필요)
// ============================================================
export const A2A_NATIVE_FRAMEWORKS: Record<string, FrameworkTemplate> = {
  "Google ADK": {
    framework: "Google ADK",
    displayName: "Google ADK (A2A Native)",
    description: "Google Agent Development Kit - A2A Protocol 네이티브 지원",
    logoUrl: "/assets/frameworks/google-adk.svg",
    frameworkType: "a2a_native",
    requiresProxy: false,  // ⭐ Proxy 불필요!
    requiredFields: [
      { name: "base_url", label: "Base URL", placeholder: "http://your-adk-server:8080" }
    ],
    capabilitiesTemplate: {
      streaming: true,
      tools: true,
      extensions: true
    }
  }
};

// ============================================================
// 2️⃣ Well-known Non-A2A Frameworks (Proxy 필요)
// ============================================================
export const WELL_KNOWN_FRAMEWORKS: Record<string, FrameworkTemplate> = {
  "Agno OS": {
    framework: "Agno OS",
    displayName: "Agno OS (Well-known)",
    description: "Agno framework for agentic applications",
    logoUrl: "/assets/frameworks/agno-os.svg",
    frameworkType: "well_known",
    requiresProxy: true,  // ✅ Proxy 필요
    requiredFields: [
      { name: "base_url", label: "Base URL", placeholder: "http://your-server:8100" },
      { name: "agent_id", label: "Agent ID", placeholder: "my_agent" }
    ],
    capabilitiesTemplate: {
      streaming: true,
      tools: true,
      memory: true
    }
  }
};

// ============================================================
// 3️⃣ Custom Frameworks (Proxy 필요)
// ============================================================
export const CUSTOM_FRAMEWORKS: Record<string, FrameworkTemplate> = {
  Langchain: {
    framework: "Langchain",
    displayName: "Langchain",
    description: "Langchain agent framework",
    logoUrl: "/assets/frameworks/langchain.svg",
    frameworkType: "custom",
    requiresProxy: true,  // ✅ Proxy 필요
    requiredFields: [
      { name: "original_endpoint", label: "Full Endpoint URL", placeholder: "http://your-server:8102/langchain/invoke" }
    ],
    capabilitiesTemplate: {
      streaming: false,
      tools: true,
      chains: true
    }
  },
  Custom: {
    framework: "Custom",
    displayName: "Custom A2A Agent",
    description: "Custom A2A-compliant agent",
    logoUrl: "/assets/frameworks/custom.svg",
    frameworkType: "custom",
    requiresProxy: true,  // ✅ Proxy 필요
    requiredFields: [
      { name: "original_endpoint", label: "Full Endpoint URL", placeholder: "http://your-server:8103/api/v1/chat" }
    ],
    capabilitiesTemplate: {}
  }
};

// Combined registry (모든 프레임워크 통합)
export const FRAMEWORK_TEMPLATES: Record<string, FrameworkTemplate> = {
  ...A2A_NATIVE_FRAMEWORKS,
  ...WELL_KNOWN_FRAMEWORKS,
  ...CUSTOM_FRAMEWORKS
};
```

---

## 6. Hub Implementation

### 6.1 A2A JS SDK Integration

Hub에서는 A2A JS SDK를 사용하여 선택한 agent와 대화합니다.

```typescript
// frontend/src/services/a2aService.ts

import { A2AClient } from "@a2a-js/sdk/client";
import { MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

export class A2AService {
  private clients: Map<number, A2AClient> = new Map();

  /**
   * Initialize A2A client for an agent
   */
  async initClient(agentId: number): Promise<A2AClient> {
    const existingClient = this.clients.get(agentId);
    if (existingClient) {
      return existingClient;
    }

    // Agent Card URL points to our proxy
    const agentCardUrl = `http://localhost:9050/api/a2a/proxy/${agentId}/.well-known/agent-card.json`;

    try {
      const client = await A2AClient.fromCardUrl(agentCardUrl);
      this.clients.set(agentId, client);
      return client;
    } catch (error) {
      console.error(`Failed to initialize A2A client for agent ${agentId}:`, error);
      throw error;
    }
  }

  /**
   * Send message to agent via A2A protocol
   */
  async sendMessage(
    agentId: number,
    message: string,
    contextId?: string
  ): Promise<any> {
    const client = await this.initClient(agentId);

    const messageParams: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: message }],
        kind: "message",
        contextId,
      },
      configuration: {
        blocking: true, // Wait for response
        acceptedOutputModes: ["text/plain"],
      },
    };

    const response = await client.sendMessage(messageParams);

    if ("error" in response) {
      throw new Error(response.error.message);
    }

    return response.result;
  }

  /**
   * Stream messages from agent
   */
  async* streamMessage(
    agentId: number,
    message: string,
    contextId?: string
  ): AsyncGenerator<any> {
    const client = await this.initClient(agentId);

    const streamParams: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: message }],
        kind: "message",
        contextId,
      },
      configuration: {
        blocking: false, // Streaming mode
        acceptedOutputModes: ["text/plain"],
      },
    };

    const stream = client.sendMessageStream(streamParams);

    for await (const event of stream) {
      yield event;
    }
  }
}

export default new A2AService();
```

### 6.2 Hub Chat Component

```typescript
// frontend/src/pages/Hub/HubChatPage.tsx

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import a2aService from '@/services/a2aService';
import { agentService } from '@/services/agentService';

export function HubChatPage() {
  const { agentId } = useParams<{ agentId: string }>();
  const [agent, setAgent] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      const data = await agentService.getAgentById(Number(agentId));
      setAgent(data.agent_card);
    } catch (error) {
      console.error('Failed to load agent:', error);
    }
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use A2A JS SDK to send message
      const response = await a2aService.sendMessage(Number(agentId), input);

      // Extract text from response
      const agentText = response.parts?.[0]?.text || 'No response';
      const agentMessage = { role: 'agent', content: agentText };
      setMessages((prev) => [...prev, agentMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage = { role: 'error', content: 'Failed to communicate with agent' };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Agent Info Header */}
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">{agent?.name}</h1>
        <p className="text-sm text-gray-600">{agent?.description}</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`mb-4 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}
          >
            <div
              className={`inline-block p-3 rounded-lg ${
                msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="text-center text-gray-500">Agent is thinking...</div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
            className="flex-1 border rounded px-3 py-2"
          />
          <button
            onClick={handleSend}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## 7. Flow Implementation

### 7.1 Current Status (UI Only)

Flow는 현재 **UI만 구현**하고, 실제 multi-agent 기능은 A2A JS SDK가 `RemoteA2aAgent`를 지원할 때 구현합니다.

```typescript
// frontend/src/pages/Flow/FlowPage.tsx

import React, { useState } from 'react';

export function FlowPage() {
  const [selectedAgents, setSelectedAgents] = useState<number[]>([]);

  const handleExecute = async () => {
    // Placeholder: Show "Feature in Progress"
    alert("This feature is currently in progress. Please wait for A2A JS SDK to support RemoteA2aAgent.");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Multi-Agent Flow</h1>

      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded mb-6">
        <h2 className="font-semibold text-yellow-800">⚠️ Feature in Progress</h2>
        <p className="text-sm text-yellow-700 mt-2">
          Multi-agent orchestration is currently under development.
          This feature requires A2A JS SDK to support <code>RemoteA2aAgent</code>.
        </p>
        <p className="text-sm text-yellow-700 mt-1">
          For implementation details, see: <code>/docs/FLOW_IMPLEMENTATION_GUIDE.md</code>
        </p>
      </div>

      {/* Agent Selection UI */}
      <div className="border rounded p-4">
        <h2 className="font-semibold mb-2">Select Agents</h2>
        {/* Agent selection checkboxes */}
      </div>

      {/* Flow Diagram Placeholder */}
      <div className="border rounded p-4 mt-4 h-64 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Flow visualization will be displayed here</p>
      </div>

      <button
        onClick={handleExecute}
        className="mt-4 px-4 py-2 bg-gray-400 text-white rounded"
        disabled
      >
        Execute Flow (Coming Soon)
      </button>
    </div>
  );
}
```

### 7.2 Future Implementation Guide

```markdown
# FLOW_IMPLEMENTATION_GUIDE.md

## When A2A JS SDK supports RemoteA2aAgent

### Files to Modify

1. **frontend/src/services/a2aService.ts**
   - Add `createMultiAgentFlow()` method
   - Use `RemoteA2aAgent` to define sub-agents

2. **frontend/src/pages/Flow/FlowPage.tsx**
   - Remove "Feature in Progress" warning
   - Enable "Execute Flow" button
   - Implement `handleExecute()` with actual A2A calls

### Implementation Steps

1. Define Root Agent with Sub-Agents:

```typescript
import { LlmAgent, RemoteA2aAgent } from "@a2a-js/sdk";

// Define sub-agents
const mathAgent = new RemoteA2aAgent({
  name: "math_agent",
  description: "Math operations",
  agentCard: "http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json"
});

const textAgent = new RemoteA2aAgent({
  name: "text_agent",
  description: "Text processing",
  agentCard: "http://localhost:9050/api/a2a/proxy/2/.well-known/agent-card.json"
});

// Create root agent
const rootAgent = new LlmAgent({
  name: "root_agent",
  model: "gemini-2.0-flash",
  description: "Orchestrator",
  instruction: "You coordinate multiple agents...",
  subAgents: [mathAgent, textAgent]
});
```

2. Execute Multi-Agent Flow:

```typescript
const runner = new Runner({
  appName: "flow_app",
  agent: rootAgent,
  sessionService: new InMemorySessionService(),
  memoryService: new InMemoryMemoryService(),
  artifactService: new InMemoryArtifactService()
});

const content = {
  role: 'user',
  parts: [{ text: query }]
};

for await (const event of runner.runAsync({ userId: "user1", sessionId: "session1", newMessage: content })) {
  if (event.is_final_response()) {
    // Display result
  }
}
```

3. Delete Placeholder Code:

- Remove "Feature in Progress" UI component
- Remove `disabled` attribute from Execute button
- Delete the alert in `handleExecute()`

### Testing

After implementation:
1. Select 2+ agents in Flow UI
2. Click "Execute Flow"
3. Verify sub-agents are called correctly
4. Check multi-agent response in UI
```

---

## 8. Database Schema Changes

### 8.1 Migration Script

```bash
# repos/agent-service/
uv run alembic revision --autogenerate -m "Add A2A proxy fields"
```

```python
# alembic/versions/00X_add_a2a_proxy_fields.py

def upgrade():
    # Add new columns
    op.add_column('agents', sa.Column('agent_card', sa.JSON(), nullable=True))
    op.add_column('agents', sa.Column('original_endpoint', sa.String(), nullable=True))
    op.add_column('agents', sa.Column('a2a_proxy_url', sa.String(), nullable=True))
    op.add_column('agents', sa.Column('framework_version', sa.String(), nullable=True))

    # Migrate existing data
    connection = op.get_bind()
    connection.execute("""
        UPDATE agents
        SET
            agent_card = jsonb_build_object(
                'name', name,
                'description', description,
                'framework', framework::text,
                'url', a2a_endpoint,
                'version', '1.0.0',
                'protocol_version', '1.0'
            ),
            original_endpoint = a2a_endpoint,
            a2a_proxy_url = '/api/a2a/proxy/' || id::text
        WHERE agent_card IS NULL
    """)

    # Make columns non-nullable after migration
    op.alter_column('agents', 'agent_card', nullable=False)
    op.alter_column('agents', 'original_endpoint', nullable=False)
    op.alter_column('agents', 'a2a_proxy_url', nullable=False)

def downgrade():
    op.drop_column('agents', 'framework_version')
    op.drop_column('agents', 'a2a_proxy_url')
    op.drop_column('agents', 'original_endpoint')
    op.drop_column('agents', 'agent_card')
```

---

## 9. API Specifications

### 9.1 Agent Registration API (Enhanced)

```
POST /api/agents
```

**Request:**
```json
{
  "agent_card": {
    "name": "My Agent",
    "description": "Agent description",
    "framework": "Agno",
    "framework_config": {
      "base_url": "http://my-server:8100",
      "agent_name": "my_agent"
    },
    "version": "1.0.0",
    "capabilities": {
      "skills": ["chat", "analysis"]
    },
    "visibility": "public"
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent_id": 123,
  "agent_card": {
    "name": "My Agent",
    "description": "Agent description",
    "url": "http://localhost:9050/api/a2a/proxy/123",
    "version": "1.0.0",
    "protocol_version": "1.0",
    "capabilities": {
      "skills": ["chat", "analysis"],
      "streaming": true,
      "tools": true,
      "memory": true
    }
  },
  "a2a_proxy_url": "http://localhost:9050/api/a2a/proxy/123",
  "message": "Agent registered successfully"
}
```

### 9.2 A2A Proxy API

#### Get Agent Card

```
GET /api/a2a/proxy/{agent_id}/.well-known/agent-card.json
```

**Response:** Standard A2A Agent Card

#### Send Message

```
POST /api/a2a/proxy/{agent_id}/tasks/send
Authorization: Bearer <jwt_token>
```

**Request:** A2A Protocol format
**Response:** A2A Protocol format

---

## 10. Frontend Components

### 10.1 Agent Creation Form

```typescript
// frontend/src/components/agent/AgentCreateForm.tsx

export function AgentCreateForm() {
  const [framework, setFramework] = useState<string>('');
  const [formData, setFormData] = useState<any>({});

  const template = FRAMEWORK_TEMPLATES[framework];

  const handleFrameworkChange = (fw: string) => {
    setFramework(fw);
    // Reset form data
    setFormData({});
  };

  const handleSubmit = async () => {
    // Apply framework template
    const agentCard = {
      name: formData.name,
      description: formData.description,
      framework: framework,
      framework_config: {
        // Collect from template required fields
      },
      version: "1.0.0",
      capabilities: {
        skills: formData.skills || []
      },
      visibility: formData.visibility || "public"
    };

    await agentService.createAgent({ agent_card: agentCard });
  };

  return (
    <form>
      {/* Framework Selection */}
      <div>
        <label>Framework</label>
        <select value={framework} onChange={(e) => handleFrameworkChange(e.target.value)}>
          <option value="">Select Framework</option>
          {Object.keys(FRAMEWORK_TEMPLATES).map(fw => (
            <option key={fw} value={fw}>{FRAMEWORK_TEMPLATES[fw].displayName}</option>
          ))}
        </select>
      </div>

      {/* Dynamic fields based on template */}
      {template && template.requiredFields.map(field => (
        <div key={field.name}>
          <label>{field.label}</label>
          <input
            type="text"
            placeholder={field.placeholder}
            onChange={(e) => setFormData({...formData, [field.name]: e.target.value})}
          />
        </div>
      ))}

      <button type="button" onClick={handleSubmit}>Create Agent</button>
    </form>
  );
}
```

---

## 11. Implementation Guide

### 11.1 Phase 1: Backend Foundation (Week 1)

**Tasks:**
1. ✅ Database schema migration
2. ✅ Framework template system
3. ✅ Enhanced Agent Registration API
4. ✅ Universal A2A Proxy endpoints
5. ✅ Framework adapters (Agno, ADK, Langchain, Custom)

**Files to Create/Modify:**
- `repos/agent-service/app/core/framework_templates.py` (NEW)
- `repos/agent-service/app/api/v1/a2a_proxy.py` (NEW)
- `repos/agent-service/app/a2a/adapters/*.py` (NEW)
- `repos/agent-service/app/core/database.py` (MODIFY)
- `repos/agent-service/alembic/versions/00X_*.py` (NEW)

### 11.2 Phase 2: Frontend Integration (Week 2)

**Tasks:**
1. ✅ Framework templates in Frontend
2. ✅ Agent creation form with framework selection
3. ✅ A2A Service layer (A2A JS SDK integration)
4. ✅ Hub chat UI with A2A client
5. ✅ Flow placeholder UI

**Files to Create/Modify:**
- `frontend/src/types/index.ts` (MODIFY)
- `frontend/src/services/a2aService.ts` (NEW)
- `frontend/src/components/agent/AgentCreateForm.tsx` (NEW)
- `frontend/src/pages/Hub/HubChatPage.tsx` (NEW)
- `frontend/src/pages/Flow/FlowPage.tsx` (MODIFY)

### 11.3 Phase 3: Testing & Documentation (Week 3)

**Tasks:**
1. ✅ End-to-end testing
2. ✅ Documentation updates
3. ✅ Flow implementation guide
4. ✅ Example agent implementations

### 11.4 Future Work

**When A2A JS SDK supports RemoteA2aAgent:**
1. Remove Flow placeholder
2. Implement multi-agent orchestration
3. Enable Flow execution

---

## 12. Testing Strategy

### 12.1 Agent Registration Test

```bash
# 1. Register Agno agent
curl -X POST http://localhost:9050/api/agents \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "agent_card": {
      "name": "Test Agno Agent",
      "description": "Test agent",
      "framework": "Agno",
      "framework_config": {
        "base_url": "http://localhost:8100",
        "agent_name": "test_agent"
      },
      "version": "1.0.0",
      "visibility": "public"
    }
  }'

# Response:
# {
#   "success": true,
#   "agent_id": 1,
#   "a2a_proxy_url": "http://localhost:9050/api/a2a/proxy/1"
# }
```

### 12.2 A2A Proxy Test

```bash
# 1. Get Agent Card
curl http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json

# 2. Send A2A message
curl -X POST http://localhost:9050/api/a2a/proxy/1/tasks/send \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "msg-123",
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello"}],
        "kind": "message"
      }
    },
    "id": "req-123"
  }'
```

### 12.3 Hub A2A Client Test

```javascript
// In browser console at http://localhost:9060
const { A2AClient } = await import("@a2a-js/sdk/client");

// Initialize client
const client = await A2AClient.fromCardUrl(
  "http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json"
);

// Send message
const response = await client.sendMessage({
  message: {
    messageId: "test-123",
    role: "user",
    parts: [{ kind: "text", text: "Hello from Hub!" }],
    kind: "message"
  },
  configuration: {
    blocking: true,
    acceptedOutputModes: ["text/plain"]
  }
});

console.log(response);
```

---

## 13. Migration Path

### 13.1 Existing Agents

기존에 등록된 agents는 migration script에서 자동으로 변환됩니다:

```sql
UPDATE agents
SET
  agent_card = jsonb_build_object(
    'name', name,
    'description', description,
    'framework', framework::text,
    'url', a2a_endpoint,
    'version', '1.0.0'
  ),
  original_endpoint = a2a_endpoint,
  a2a_proxy_url = '/api/a2a/proxy/' || id::text
WHERE agent_card IS NULL;
```

### 13.2 Backward Compatibility

기존 API endpoints는 유지:
- `GET /api/agents` - 기존 동작 유지
- `POST /api/agents` - 새로운 format 지원 + 기존 format도 호환

---

## 14. Security Considerations

### 14.1 A2A Proxy Security

1. **Authentication**: JWT token 필수
2. **Access Control**: Agent visibility 확인
3. **Rate Limiting**: Agent별 호출 제한
4. **Timeout**: Long-running requests 방지

### 14.2 Framework Adapter Security

1. **Input Validation**: 모든 request 검증
2. **Output Sanitization**: Response 필터링
3. **Error Handling**: 민감한 정보 노출 방지

---

## 15. Performance Optimization

### 15.1 Caching

- Agent Card 캐싱 (Redis, TTL: 5분)
- Framework Adapter 인스턴스 재사용

### 15.2 Async Processing

- httpx.AsyncClient 사용
- Connection pooling

---

## Conclusion

이 설계는 A2G Platform에 A2A Protocol 통합을 위한 완전한 가이드입니다.

**주요 이점:**
1. 모든 Framework의 agent를 통일된 A2A 프로토콜로 관리
2. 사용자는 UI를 통해 쉽게 Agent Card 생성
3. Hub에서 표준화된 방식으로 모든 agent와 대화
4. Flow는 미래 확장 준비 완료

**구현 순서:**
1. Backend (Agent Service) - Framework templates, A2A Proxy
2. Frontend - Agent creation UI, Hub A2A integration
3. Testing - End-to-end validation
4. Flow - UI only, future guide 작성

이제 각 단계별 구현을 시작하겠습니다.
