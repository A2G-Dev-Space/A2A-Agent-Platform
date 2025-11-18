# Hub 기능 종합 테스트 시나리오

**Version**: 1.0
**Date**: 2025-11-18
**Purpose**: A2A Agent Platform Hub 기능의 완전한 테스트 시나리오 및 요구사항 명세

---

## 구현 상태 요약

### ✅ 구현 완료 (Production Ready)

1. **Workbench 전체 기능**
   - Agent 생성/관리
   - Framework별 Chat 분기 처리 (Backend: if/else, Frontend: Factory)
   - Single Session 관리
   - Trace UI (5가지 event 실시간 표시)
   - Agent endpoint 설정

2. **통계 시스템 - Token Usage만 구현 완료**
   - Real-time Statistics API
     - User 수, Agent 수 (공개/개발)
     - Agent Token Usage (실시간 agent 대상)
     - Model Usage Statistics (총 token/LLM calls)
     - ❌ Agent Call 횟수 (미구현)
   - History Trend API
     - User 수 변화 기록
     - Agent 수 변화 기록
     - Token Usage Trend (All/Model/Agent 3가지 case)
     - ❌ Agent Call Trend (미구현)
   - Token Usage Statistics 수집 (LLM Proxy)
   - Daily Statistics Snapshot (Worker Service)

3. **Trace ID 시스템**
   - Agent Service에서 trace_id 발급
   - Platform LLM endpoint에 trace_id 포함
   - LLM Proxy에서 trace_id 추출 및 token tracking

### ✅ 최근 완료 (2025-11-18)

1. **Deploy/Undeploy 로직** (Section 3.1, 5)
   - ✅ Endpoint 검증 (localhost/127.0.0.1/0.0.0.0 차단, Private IP 허용)
   - ✅ Framework별 Health Check
     - Agno: GET /health
     - ADK: GET /.well-known/agent-card.json
     - Langchain/Custom: POST agent/info
   - ✅ Deploy 범위 설정 (team/public)
   - ✅ Status 관리 (DEVELOPMENT ↔ DEPLOYED_ALL/DEPLOYED_TEAM/DEPLOYED_DEPT)
   - ✅ Workbench에서 deployed agent 표시 (빨간색 Undeploy 버튼)
   - ✅ Hub에서 deployed agent 표시
   - ✅ Deployed agent는 Edit/Playground 접근 차단
   - ✅ Deployment Logging (deployment_logs 테이블)
   - ✅ Alembic migration 생성 및 적용

2. **Database Schema 부분 완료** (Section 4)
   - ✅ deployment_logs 테이블 (Alembic migration 008)
   - ✅ agent_call_statistics 테이블 (Alembic migration 008)
   - ❌ hub_sessions 테이블 (미구현)
   - ❌ hub_messages 테이블 (미구현)

### ❌ 미구현 (Hub 신규 기능)

1. **Hub UI** (Section 3.5)
   - Agent 검색 (이름, 태그, framework)
   - 추천 Agent (개인별 사용 많은 3개)
   - Agent Card 표시

2. **Agent Call 추적** (Section 3.4.2)
   - Chat/A2A Router 호출 기록 수집
   - Agent Call Trend API

3. **Hub Chat API** (Section 6)
   - Multi-session 지원
   - Hub Database 사용 (hub_sessions, hub_messages)
   - **중요**: 기존 Workbench와 동일한 방식으로 구현
     - Chat history를 모두 DB에 기록
     - 매번 전체 message를 이어붙여서 전송

4. **A2A Router** (Section 7)
   - Agno/Langchain용 A2A wrapper
   - A2A Protocol → Framework Protocol 변환

5. **Agent Card Hosting** (Section 3.2)
   - .well-known/agent-card.json 생성
   - Agno/Langchain용 Agent Card hosting

### 📋 구현 가이드 및 주의사항

1. **Database 스키마 변경 시 Alembic 사용 필수**
   - `docker exec a2g-agent-service uv run alembic revision -m "description"`
   - `docker exec a2g-agent-service uv run alembic upgrade head`
   - 절대 직접 SQL 실행 금지

2. **Agent Endpoint Host IP 정책**
   - 차단: `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`
   - 허용: Private IP (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
   - 허용: Public IP, DNS

3. **Framework별 Health Check**
   - Agno: `GET /health`
   - ADK: `GET /.well-known/agent-card.json`
   - Langchain/Custom: `POST {endpoint}` with agent/info

4. **Multi-session History 구현 방침**
   - Workbench 단일 세션 방식과 동일하게 구현
   - 모든 chat history를 DB에 저장
   - 매 요청 시 전체 conversation history를 포함해서 전송

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [Workbench vs Hub 비교](#2-workbench-vs-hub-비교)
3. [Hub 핵심 기능 요구사항](#3-hub-핵심-기능-요구사항)
4. [Database Schema 설계](#4-database-schema-설계)
5. [Deploy/Undeploy 로직](#5-deployundeploy-로직)
6. [Hub Chat 및 A2A API Endpoint](#6-hub-chat-및-a2a-api-endpoint)
7. [A2A API Endpoint (외부 시스템용)](#7-a2a-api-endpoint-외부-시스템용)
8. [사용자 테스트 시나리오](#8-사용자-테스트-시나리오)
9. [Playwright 자동화 테스트 시나리오](#9-playwright-자동화-테스트-시나리오)
10. [체크리스트](#10-체크리스트)
11. [구현 우선순위](#11-구현-우선순위)
12. [핵심 요약](#12-핵심-요약)

---

## 1. 시스템 개요

### 1.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────────────┐
│                    A2A Agent Platform                           │
│                                                                   │
│  ┌──────────────────┐              ┌──────────────────┐         │
│  │   Workbench      │              │       Hub        │         │
│  │   (Development)  │              │   (Production)   │         │
│  ├──────────────────┤              ├──────────────────┤         │
│  │ - Single User    │              │ - Multi User     │         │
│  │ - Single Session │              │ - Multi Session  │         │
│  │ - Trace Enabled  │              │ - No Trace       │         │
│  │ - localhost OK   │              │ - Public IP/DNS  │         │
│  │                  │              │                  │         │
│  │ Chat: Framework별 분기 처리 (Backend: if/else, Frontend: Factory) │
│  └──────────────────┘              └──────────────────┘         │
│                                                                   │
│  ┌──────────────────────────────────────────────────┐           │
│  │   A2A API Endpoint (외부 시스템용, Chat 아님)    │           │
│  │   - ADK: 자체 endpoint                           │           │
│  │   - Agno/Langchain: Platform이 A2A wrapper 제공  │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
         │                                      │
         │ (Framework 고유 프로토콜 사용)       │
         │                                      │
    ┌────▼──────────┐                    ┌────▼──────────┐
    │   ADK Agent   │                    │  Agno Agent   │
    │               │                    │               │
    │ ADK Protocol  │                    │ Agno Protocol │
    └───────────────┘                    └───────────────┘
```

### 1.2 Trace ID 시스템 ✅ **[구현 완료]**

**중요:** Platform은 agent별 Trace ID를 발급하여 LLM 사용량 추적 및 agent 특정에 사용합니다.

#### Trace ID 발급 및 사용 흐름:

1. **Agent 생성 시** (Agent Service):
   ```python
   trace_id = str(uuid.uuid4())  # 고유 trace_id 발급
   agent.trace_id = trace_id      # DB에 저장
   ```

2. **Agent 실행 시** (Platform 제공):
   ```bash
   # Agent는 trace_id가 포함된 Platform LLM endpoint 사용
   PLATFORM_LLM_ENDPOINT="http://localhost:9050/api/llm/trace/{trace_id}/v1"
   PLATFORM_API_KEY="a2g_xxxx..."
   ```

3. **LLM Proxy가 Agent 특정**:
   - Agent가 LLM 호출: `POST /api/llm/trace/{trace_id}/v1/chat/completions`
   - LLM Proxy: URL에서 trace_id 추출
   - Agent Service 조회: `GET /internal/agents/by-trace-id/{trace_id}`
   - Token usage tracking 및 agent 특정

**핵심:**
- ✅ Trace ID는 **URL endpoint에 포함** (HTTP Header 아님)
- ✅ Platform이 endpoint와 API key 제공 → agent 특정 가능
- ✅ Workbench: Trace UI 제공 (5가지 event 실시간)
- ✅ Hub: Trace 수집만 (UI는 제공 안 함)

### 1.3 통신 방식의 분리

**중요:** Platform은 2가지 통신 방식을 지원합니다.

#### 1.3.1 Chat 통신 (Workbench & Hub 공통)
- **목적:** UI에서 Agent와 대화
- **방식:** Framework별 고유 프로토콜 사용 (기존 Workbench 방식 유지)
- **특징:** 각 framework의 endpoint와 return/event를 존중
- **Trace ID:** Platform endpoint를 통해 자동 추적

| Framework | Chat 프로토콜 | Workbench | Hub |
|-----------|--------------|-----------|-----|
| **ADK** | A2A JSON-RPC | Framework 분기 | Framework 분기 (동일) |
| **Agno** | multipart/form-data + SSE | Framework 분기 | Framework 분기 (동일) |
| **Langchain** | Langchain Protocol | Framework 분기 | Framework 분기 (동일) |

#### 1.3.2 A2A API Endpoint (외부 시스템용)
- **목적:** 외부 시스템이 우리 platform의 agent를 A2A 프로토콜로 호출
- **방식:** A2A Protocol (JSON-RPC 2.0)
- **특징:** Chat UI용이 아니라 **API Expose용**
- **사용 예:** 다른 A2A agent, A2A client, 외부 시스템 통합

| Framework | A2A Endpoint | Platform 역할 |
|-----------|--------------|---------------|
| **ADK** | Agent 자체 제공 | ❌ 불필요 (A2A Native) |
| **Agno** | Platform 제공 | ✅ A2A wrapper 제공 |
| **Langchain** | Platform 제공 | ✅ A2A wrapper 제공 |

---

## 2. Workbench vs Hub 비교

### 2.1 기능 비교표

| 기능 | Workbench | Hub |
|------|-----------|-----|
| **사용 목적** | 개발/테스트 | 프로덕션/공유 |
| **사용자 수** | Single User | Multi User |
| **Session 관리** | Single Session (per user+agent) | Multi Session (per user+agent) |
| **Trace** | ✅ 제공 (5가지 event 실시간) | ❌ 제공 안 함 |
| **Agent 상태** | DEVELOPMENT | DEPLOYED |
| **Endpoint 제약** | localhost/127.0.0.1 허용 | Public IP/DNS만 허용 |
| **Chat 가능 여부** | 항상 가능 | Deploy 시에만 가능 |
| **통계 집계** | ❌ 안 함 | ✅ Agent call 집계 |
| **공개 범위** | 본인만 | 팀 / 전체 공개 |
| **Agent Card Hosting** | ❌ 안 함 | ✅ 제공 (.well-known) |

### 2.2 데이터 흐름

#### Workbench 모드 ✅ **[구현 완료]**

```
1. User → Workbench에서 Agent 생성
   ├─ Framework 선택 (ADK/Agno/Langchain/Custom)
   ├─ Agent 정보 입력 (name, description, endpoint)
   └─ DB 저장 (status: DEVELOPMENT)

2. User → Configuration 탭에서 endpoint 확인
   └─ PLATFORM_LLM_ENDPOINT 제공 (with trace_id)

3. User → Chat Playground에서 테스트
   ├─ Framework별 분기 처리로 통신
   ├─ Trace 창에 실시간 event 표시
   └─ WorkbenchSession에 history 저장
```

#### Hub 모드 ❌ **[미구현]**

```
1. User → Workbench에서 Agent Deploy 버튼 클릭
   ├─ Endpoint 검증 (localhost 불가)
   ├─ Deploy 범위 선택 (팀/전체)
   ├─ DB 업데이트 (status: DEPLOYED, deployed_at, visibility)
   └─ A2A API Endpoint 활성화 (외부 시스템용)
      ├─ ADK: 자체 endpoint 사용
      └─ Agno/Langchain: Platform이 A2A wrapper 제공

2. User → Hub에서 Agent 검색/선택
   ├─ 검색 (이름, 태그, framework)
   ├─ 추천 Agent (개인별 사용 많은 3개)
   └─ 모든 Agent (이름순)

3. User → Agent 클릭하여 Chat
   ├─ Chat 통신: Framework별 분기 처리 (Workbench와 동일)
   │  ├─ Backend: if framework == "Agno" / else (ADK)
   │  └─ Frontend: ChatAdapterFactory + Framework별 component
   ├─ HubSession에 history 저장
   └─ Agent call 통계 집계

4. 외부 시스템 → A2A API Endpoint 호출 (별도)
   ├─ ADK: Agent의 .well-known/agent-card.json 직접 호출
   └─ Agno/Langchain: Platform의 A2A wrapper 호출
      └─ Platform이 A2A → Framework 프로토콜 변환
```

---

## 3. Hub 핵심 기능 요구사항

### 3.1 Deploy/Undeploy ❌ **[미구현]**

#### 3.1.1 Deploy 요구사항

**사전 조건:**
- Agent가 DEVELOPMENT 상태
- Agent endpoint가 설정되어 있음

**Deploy 시 검증:**
1. ✅ **Endpoint 검증**
   - localhost, 127.0.0.1, 0.0.0.0 → ❌ 에러
   - Public IP 또는 DNS → ✅ 허용
   - 에러 메시지: "Deploy requires a publicly accessible endpoint. Please update your agent's host to an exposed IP or DNS (not localhost/127.0.0.1/0.0.0.0)"

2. ✅ **Agent Card 검증 (ADK만)**
   - ADK: `/.well-known/agent-card.json` 또는 `/.well-known/agent.json` 응답 확인
   - Agno/Langchain: Platform이 Agent Card hosting 제공 (검증 skip)

3. ✅ **Deploy 범위 설정**
   - `team`: 같은 department의 user만 접근
   - `public`: 모든 user 접근

**Deploy 후 변경사항:**
- `status`: DEVELOPMENT → DEPLOYED
- `deployed_at`: 현재 timestamp
- `deployed_by`: current_user
- `visibility`: 선택한 범위
- `validated_endpoint`: 검증된 endpoint 저장

**Deploy 후 Workbench 제약:**
- Workbench Chat Playground → ❌ 사용 불가 (Undeploy 하라는 안내)
- Trace 수집 → ❌ 중단

#### 3.1.2 Undeploy 요구사항

**Undeploy 시 변경사항:**
- `status`: DEPLOYED → DEVELOPMENT
- `deployed_at`: NULL
- `deployed_by`: NULL
- `visibility`: private (기본값)

**Undeploy 후:**
- Workbench Chat Playground → ✅ 사용 가능
- Trace 수집 → ✅ 재개
- Hub에서 → ❌ 표시 안 됨

### 3.2 Agent Card Hosting (.well-known) ❌ **[미구현]**

#### 3.2.1 Agent Card 생성 로직

**필수 요소만 포함:**
```json
{
  "name": "Agent Name",
  "url": "https://platform.com/api/hub/a2a/{agent_id}",
  "version": "1.0.0",
  "capabilities": {
    "streaming": true
  },
  "skills": [
    {
      "id": "skill_1",
      "name": "Agent Skill",
      "description": "Agent Description",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

**생성 기준:**
- Workbench "Add Agent" 시 입력한 정보 기반
- `name`: Agent name
- `description`: Agent description → skills[0].description
- `tags`: capabilities에서 추출 또는 framework 기본값
- `url`: Platform의 A2A Router endpoint

#### 3.2.2 Hosting Endpoint

**ADK Agent (A2A Native):**
- Platform에서 hosting 안 함
- Agent 자체 endpoint 사용: `{agent_endpoint}/.well-known/agent-card.json`

**Agno/Langchain Agent (A2A Router 필요):**
```
GET /api/hub/a2a/{agent_id}/.well-known/agent-card.json
→ Platform이 생성한 Agent Card 반환

POST /api/hub/a2a/{agent_id}/tasks/send
→ A2A Router가 Framework Adapter로 변환하여 실제 agent 호출
```

### 3.3 Multi-User Multi-Session ❌ **[미구현]**

#### 3.3.1 Session 관리

**Workbench:**
- Table: `workbench_sessions`
- Unique Key: (user_id, agent_id)
- 1 user + 1 agent = 1 session (항상)

**Hub:**
- Table: `hub_sessions`
- Unique Key: (user_id, agent_id, session_id)
- 1 user + 1 agent = N sessions (사용자가 새 대화 시작할 때마다)

#### 3.3.2 Session 생성 시점

**Workbench:**
- Chat Playground 최초 진입 시 자동 생성
- 기존 session 있으면 재사용

**Hub:**
- "New Chat" 버튼 클릭 시 생성
- Session List에서 선택하여 이전 대화 이어가기

### 3.4 통계 시스템

#### 3.4.1 Token Usage 통계 ✅ **[구현 완료]**

**수집 항목:**
- `agent_id`: Agent ID
- `user_id`: 호출한 user
- `model_name`: LLM 모델명
- `prompt_tokens`, `completion_tokens`, `total_tokens`
- `source`: 호출 출처 ('chat' / 'a2a_router')
- `called_at`: 호출 시각
- `date`: 집계 날짜

**집계 방법:**
- LLM Proxy에서 token usage 자동 수집
- token_usage_statistics 테이블에 저장
- Worker Service에서 일별 snapshot 생성

#### 3.4.2 Agent Call 추적 ❌ **[미구현]**

**수집 항목:**
- `agent_id`: Agent ID
- `user_id`: 호출한 user
- `called_at`: 호출 시각
- `call_type`: 호출 유형
  - `'chat'`: Hub/Workbench Chat 호출
  - `'a2a_router'`: A2A Router API 호출 (외부 시스템)
  - `'all'`: 전체 (집계용)
- `agent_status`: Agent 상태 (DEPLOYED/DEVELOPMENT)

**집계 방법:**
- Hub/Workbench Chat: message 전송 시 `call_type='chat'` 기록
- A2A Router: 외부 시스템 호출 시 `call_type='a2a_router'` 기록
- agent_call_statistics 테이블에 저장

#### 3.4.3 Real-time Statistics (Admin only)

**✅ 구현 완료:**
1. **User 수** (활성 사용자)
2. **Agent 수 (공개)** - DEPLOYED 상태
3. **Agent 수 (개발)** - DEVELOPMENT 상태
4. **Agent Token Usage:**
   - 실시간 존재하는 agent에 대해서만 집계되는 token 사용량
   - Agent별 prompt_tokens, completion_tokens, total_tokens
5. **Model Usage Statistics:**
   - 실시간 존재하는 agent들이 사용한 총 token 사용량
   - Model별 LLM call 횟수
   - Model별 total_tokens

**❌ 미구현:**
6. **Agent Call 횟수:**
   - A2A Router 호출 수 (외부 시스템용)
   - Chat 호출 수 (Hub + Workbench)
   - All (총 호출 수)
   - Deploy/Develop 무관하게 집계

**API Endpoint:**
```
GET /api/statistics/realtime
Response:
{
  "users": 150,
  "agents_deployed": 25,
  "agents_development": 45,
  "agent_calls": {
    "a2a_router": 1250,
    "chat": 8900,
    "total": 10150
  },
  "agent_token_usage": {
    // 실시간 존재하는 agent들만
    "total_tokens": 5842350,
    "prompt_tokens": 3245120,
    "completion_tokens": 2597230,
    "by_agent": [
      {
        "agent_id": 1,
        "agent_name": "Math Agent",
        "total_tokens": 1250000,
        "prompt_tokens": 700000,
        "completion_tokens": 550000
      }
      // ... top agents
    ]
  },
  "model_usage": {
    // 실시간 존재하는 agent들이 사용한 모델 통계
    "total_tokens": 5842350,
    "total_llm_calls": 12450,
    "by_model": [
      {
        "model_name": "gpt-4",
        "total_tokens": 3200000,
        "llm_calls": 5600,
        "prompt_tokens": 1800000,
        "completion_tokens": 1400000
      },
      {
        "model_name": "gpt-3.5-turbo",
        "total_tokens": 2642350,
        "llm_calls": 6850,
        "prompt_tokens": 1445120,
        "completion_tokens": 1197230
      }
    ]
  }
}
```

#### 3.4.4 History Trend (Admin only)

**✅ 구현 완료:**

**1. User 수 변화 기록:**
- 일별 활성 사용자 수 변화
- Line chart로 표시

**2. Agent 수 변화 기록:**
- 일별 Agent 수 변화 (DEPLOYED / DEVELOPMENT 구분)
- Line chart로 표시

**3. Token Usage Trend:**

**Case 1: All Model, All Agent 선택 시**
- Top K agent의 token 누적 사용량을 line chart로 표시
- 어떤 agent가 가장 많이 사용했는지 보기 위함
- **한 agent가 다양한 model 사용 시 총 token 사용량 합산**
- Agent마다 line 하나

**Case 2: 특정 Model 선택 시**
- 해당 model을 사용한 agent들의 Top K token 누적 사용량을 line chart로 표시
- 어떤 agent가 해당 model을 가장 많이 사용했는지 보기 위함
- Agent마다 line 하나

**Case 3: 특정 Agent 선택 시**
- 해당 agent가 어떤 model을 얼마나 사용했는지 누적 line graph 표시
- Model마다 line 하나

**❌ 미구현:**

**4. Agent Call Trend:**
- **All Agent:** Top K agent의 call 누적 횟수 (line chart, default K=10)
  - Agent마다 line 하나
  - call_type별 필터 가능 (chat/a2a_router/all)
- **Agent 선택:** 해당 agent의 call_type별 누적 횟수
  - call_type마다 line 하나 (chat, a2a_router)

**API Endpoints:**

```
# User 수 변화
GET /api/statistics/trend/users
Query params:
  - date_range: "1w" | "1m" | "3m" | "6m" | "1y"

Response:
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "data": [120, 145, 150, ...]
}

# Agent 수 변화
GET /api/statistics/trend/agents
Query params:
  - date_range: "1w" | "1m" | "3m" | "6m" | "1y"

Response:
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "datasets": [
    {
      "label": "DEPLOYED",
      "data": [20, 22, 25, ...]
    },
    {
      "label": "DEVELOPMENT",
      "data": [40, 43, 45, ...]
    }
  ]
}

# Token Usage Trend
GET /api/statistics/trend/token-usage
Query params:
  - date_range: "1w" | "1m" | "3m" | "6m" | "1y"
  - top_k: number (default: 10)
  - model_name: string (optional, 특정 model 선택 시)
  - agent_id: number (optional, 특정 agent 선택 시)

Response (Case 1: All Model, All Agent):
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "datasets": [
    {
      "agent_id": 1,
      "agent_name": "Math Agent",
      "data": [125000, 145000, 180000, ...]  // 모든 model 합산
    },
    {
      "agent_id": 2,
      "agent_name": "Text Agent",
      "data": [80000, 95000, 110000, ...]  // 모든 model 합산
    }
  ]
}

Response (Case 2: Model 선택 시):
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "model_name": "gpt-4",
  "datasets": [
    {
      "agent_id": 1,
      "agent_name": "Math Agent",
      "data": [75000, 85000, 105000, ...]  // gpt-4만
    },
    {
      "agent_id": 5,
      "agent_name": "Code Agent",
      "data": [60000, 72000, 88000, ...]  // gpt-4만
    }
  ]
}

Response (Case 3: Agent 선택 시):
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "agent_id": 1,
  "agent_name": "Math Agent",
  "datasets": [
    {
      "model_name": "gpt-4",
      "data": [75000, 85000, 105000, ...]
    },
    {
      "model_name": "gpt-3.5-turbo",
      "data": [50000, 60000, 75000, ...]
    }
  ]
}

# Agent Call Trend
GET /api/statistics/trend/agent-calls
Query params:
  - date_range: "1w" | "1m" | "3m" | "6m" | "1y"
  - top_k: number (default: 10)
  - call_type: "chat" | "a2a_router" | "all" (default: "all")
  - agent_id: number (optional, for specific agent)

Response (All Agent):
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "datasets": [
    {
      "agent_id": 1,
      "agent_name": "Math Agent",
      "data": [120, 145, 180, ...]
    },
    {
      "agent_id": 2,
      "agent_name": "Text Agent",
      "data": [80, 95, 110, ...]
    }
  ]
}

Response (Agent 선택 시):
{
  "labels": ["2025-01-01", "2025-01-02", ...],
  "agent_id": 1,
  "agent_name": "Math Agent",
  "datasets": [
    {
      "call_type": "chat",
      "data": [100, 120, 150, ...]
    },
    {
      "call_type": "a2a_router",
      "data": [20, 25, 30, ...]
    }
  ]
}
```

#### 3.4.4 Statistics Dashboard UI

**Real-time Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ Real-time Statistics                                        │
├─────────────────────────────────────────────────────────────┤
│ 📊 Overview                                                 │
│ ├─ Users: 150                                               │
│ ├─ Agents (Deployed): 25                                    │
│ └─ Agents (Development): 45                                 │
│                                                               │
│ 📞 Agent Calls                                               │
│ ├─ Chat: 8,900                                              │
│ ├─ A2A Router: 1,250                                        │
│ └─ Total: 10,150                                            │
│                                                               │
│ 🎯 Agent Token Usage (실시간 존재하는 Agent만)               │
│ ├─ Total Tokens: 5,842,350                                  │
│ ├─ Prompt Tokens: 3,245,120                                 │
│ ├─ Completion Tokens: 2,597,230                             │
│ └─ Top Agents:                                               │
│     • Math Agent: 1,250,000 tokens                          │
│     • Text Agent: 980,000 tokens                            │
│     • Code Agent: 750,000 tokens                            │
│                                                               │
│ 🤖 Model Usage Statistics (실시간 Agent들의 모델 사용)       │
│ ├─ Total LLM Calls: 12,450                                  │
│ ├─ Total Tokens: 5,842,350                                  │
│ └─ By Model:                                                 │
│     • gpt-4: 3,200,000 tokens (5,600 calls)                │
│     • gpt-3.5-turbo: 2,642,350 tokens (6,850 calls)        │
└─────────────────────────────────────────────────────────────┘
```

**History Trend Section:**
```
┌─────────────────────────────────────────────────────────────┐
│ History Trend                                               │
├─────────────────────────────────────────────────────────────┤
│ [Tab: User/Agent] [Tab: Token Usage] [Tab: Agent Calls]    │
│                                                               │
│ ═══════════════════════════════════════════════════════════ │
│ User/Agent Tab:                                              │
│ ├─ Date Range: [1 Month ▼]                                 │
│ └─ Charts:                                                   │
│     ┌─────────────────────────────────────┐                │
│     │    User Count Trend                  │                │
│     │ 200 ┌──────────────────────────┐    │                │
│     │     │         ╱──Users          │    │                │
│     │ 100 │       ╱                   │    │                │
│     │   0 └────────────────────────────┘   │                │
│     │     Jan  Feb  Mar  Apr  May          │                │
│     └─────────────────────────────────────┘                │
│     ┌─────────────────────────────────────┐                │
│     │    Agent Count Trend                 │                │
│     │  50 ┌──────────────────────────┐    │                │
│     │     │     ╱──Deployed           │    │                │
│     │  25 │   ╱──Development          │    │                │
│     │   0 └────────────────────────────┘   │                │
│     │     Jan  Feb  Mar  Apr  May          │                │
│     └─────────────────────────────────────┘                │
│                                                               │
│ ═══════════════════════════════════════════════════════════ │
│ Token Usage Tab:                                             │
│ ├─ Filter: [All Models ▼] [All Agents ▼]                   │
│ ├─ Top K: [10 ▼]                                            │
│ ├─ Date Range: [1 Month ▼]                                 │
│ └─ Line Chart:                                               │
│     ┌─────────────────────────────────────┐                │
│     │   Token Usage Trend (All/All)        │                │
│     │ 2M  ┌──────────────────────────┐    │                │
│     │     │     ╱──Math Agent         │    │                │
│     │ 1M  │   ╱──Text Agent            │    │                │
│     │     │ ╱──Code Agent              │    │                │
│     │   0 └────────────────────────────┘   │                │
│     │     Jan  Feb  Mar  Apr  May          │                │
│     └─────────────────────────────────────┘                │
│                                                               │
│     Case: Model 선택 시 (예: gpt-4)                         │
│     → 해당 model 사용한 agent들의 Top K token 누적          │
│                                                               │
│     Case: Agent 선택 시 (예: Math Agent)                    │
│     → 해당 agent의 model별 token 사용량 (model마다 line)    │
│                                                               │
│ ═══════════════════════════════════════════════════════════ │
│ Agent Calls Tab:                                             │
│ ├─ Filter: [All Agents ▼] [Call Type: All ▼]               │
│ ├─ Top K: [10 ▼]                                            │
│ ├─ Date Range: [1 Month ▼]                                 │
│ └─ Line Chart:                                               │
│     ┌─────────────────────────────────────┐                │
│     │        Agent Call Trend              │                │
│     │  10k ┌──────────────────────────┐   │                │
│     │      │     ╱──Math Agent         │   │                │
│     │   5k │   ╱──Text Agent            │   │                │
│     │      │ ╱──Code Agent              │   │                │
│     │   0  └────────────────────────────┘   │                │
│     │      Jan  Feb  Mar  Apr  May         │                │
│     └─────────────────────────────────────┘                │
│                                                               │
│     Case: Agent 선택 시 (예: Math Agent)                    │
│     → 해당 agent의 call_type별 누적 (chat, a2a_router)      │
└─────────────────────────────────────────────────────────────┘
```

### 3.5 Hub UI 기능 ❌ **[미구현]**

#### 3.5.1 검색 기능

**검색 조건:**
- Agent name (부분 일치)
- Framework (필터)
- Tags (필터)
- Visibility (본인 소유 + 공개된 것)

**검색 결과:**
- Agent Card 형태로 표시
  - Logo/Color
  - Name
  - Description
  - Framework badge
  - Total calls

#### 3.5.2 추천 Agent

**기준:**
- 개인별 agent call 수 기준 Top 3
- Agent Card 형태로 Carousel 표시

#### 3.5.3 모든 Agent

**정렬:**
- 기본: 이름순 (A-Z)
- 옵션: 최신순, 인기순

**표시:**
- Grid 형태 Agent Card

### 3.6 cURL 테스트 UI

#### 3.6.1 표시 위치

**Workbench - Configuration Tab:**
```bash
# Test Agent Card (ADK only)
curl https://your-agent-endpoint/.well-known/agent-card.json

# Test A2A Communication
curl -X POST https://your-agent-endpoint/tasks/send \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "test-123",
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello"}]
      }
    },
    "id": "req-123"
  }'
```

**Hub - Agent Detail Page:**
```bash
# Test Platform-hosted Agent Card (Agno/Langchain)
curl https://platform.com/api/hub/a2a/{agent_id}/.well-known/agent-card.json

# Test A2A Router
curl -X POST https://platform.com/api/hub/a2a/{agent_id}/tasks/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "sendMessage",
    "params": {
      "message": {
        "messageId": "test-456",
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello from Hub"}]
      }
    },
    "id": "req-456"
  }'
```

#### 3.6.2 복사 기능

- "Copy" 버튼 클릭 시 clipboard에 복사
- 복사 완료 시 Toast 알림

---

## 4. Database Schema 설계 ❌ **[미구현]**

### 4.1 Agent Table (수정)

```sql
CREATE TABLE agents (
    -- 기존 필드
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    framework VARCHAR(50) NOT NULL,
    a2a_endpoint VARCHAR(500),
    capabilities JSONB DEFAULT '{}',
    owner_id VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    trace_id UUID,

    -- Deploy 관련 필드 (추가)
    status VARCHAR(50) DEFAULT 'DEVELOPMENT', -- DEVELOPMENT, DEPLOYED
    deployed_at TIMESTAMP,
    deployed_by VARCHAR(255),
    validated_endpoint VARCHAR(500), -- Deploy 시 검증된 public endpoint

    -- 공개 범위 (기존)
    visibility VARCHAR(50) DEFAULT 'private', -- private, team, public
    is_public BOOLEAN DEFAULT FALSE,

    -- Agent Card (추가)
    agent_card JSONB, -- Platform이 생성한 Agent Card (Agno/Langchain용)

    -- UI (기존)
    card_color VARCHAR(20),
    logo_url VARCHAR(500),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agents_status ON agents(status);
CREATE INDEX idx_agents_visibility ON agents(visibility);
CREATE INDEX idx_agents_deployed_at ON agents(deployed_at);
```

### 4.2 HubSession Table (신규)

```sql
CREATE TABLE hub_sessions (
    id SERIAL PRIMARY KEY,
    session_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,

    -- Session metadata
    session_name VARCHAR(255), -- 사용자가 지정한 이름 (옵션)
    last_message_at TIMESTAMP,

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, agent_id, session_id)
);

CREATE INDEX idx_hub_sessions_user ON hub_sessions(user_id);
CREATE INDEX idx_hub_sessions_agent ON hub_sessions(agent_id);
CREATE INDEX idx_hub_sessions_updated ON hub_sessions(updated_at DESC);
```

### 4.3 HubMessage Table (신규)

```sql
CREATE TABLE hub_messages (
    id SERIAL PRIMARY KEY,
    session_id UUID NOT NULL REFERENCES hub_sessions(session_id) ON DELETE CASCADE,

    -- Message content
    role VARCHAR(50) NOT NULL, -- user, agent, system
    content TEXT NOT NULL,
    parts JSONB, -- A2A Message parts

    -- Metadata
    message_id VARCHAR(255),

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_hub_messages_session ON hub_messages(session_id);
CREATE INDEX idx_hub_messages_created ON hub_messages(created_at);
```

### 4.4 AgentCallStatistics Table (신규)

```sql
CREATE TABLE agent_call_statistics (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Call metadata
    call_type VARCHAR(50) NOT NULL, -- 'chat', 'a2a_router'
    agent_status VARCHAR(50), -- 'DEPLOYED', 'DEVELOPMENT' (snapshot at call time)
    called_at TIMESTAMP DEFAULT NOW(),

    -- Request metadata (옵션)
    request_metadata JSONB,

    -- Aggregation helper
    date DATE DEFAULT CURRENT_DATE -- For daily aggregation
);

CREATE INDEX idx_agent_calls_agent ON agent_call_statistics(agent_id);
CREATE INDEX idx_agent_calls_user ON agent_call_statistics(user_id);
CREATE INDEX idx_agent_calls_timestamp ON agent_call_statistics(called_at);
CREATE INDEX idx_agent_calls_type ON agent_call_statistics(call_type);
CREATE INDEX idx_agent_calls_date ON agent_call_statistics(date); -- For trend queries
```

**call_type 값:**
- `'chat'`: Hub 또는 Workbench에서 Chat 호출
- `'a2a_router'`: 외부 시스템이 A2A Router API 호출

**agent_status 값:**
- `'DEPLOYED'`: 호출 시점에 agent가 deployed 상태
- `'DEVELOPMENT'`: 호출 시점에 agent가 development 상태
- Deploy/Develop 무관하게 모두 집계

### 4.5 TokenUsageStatistics Table (신규)

```sql
CREATE TABLE token_usage_statistics (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,

    -- Token counts
    prompt_tokens INTEGER NOT NULL DEFAULT 0,
    completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_tokens INTEGER NOT NULL DEFAULT 0,

    -- Model info
    model_name VARCHAR(255) NOT NULL,

    -- LLM call metadata
    llm_call_id VARCHAR(255), -- 추적을 위한 call ID
    source VARCHAR(50) NOT NULL, -- 'chat', 'a2a_router'

    -- Timestamps
    called_at TIMESTAMP DEFAULT NOW(),
    date DATE DEFAULT CURRENT_DATE -- For daily aggregation
);

CREATE INDEX idx_token_usage_agent ON token_usage_statistics(agent_id);
CREATE INDEX idx_token_usage_model ON token_usage_statistics(model_name);
CREATE INDEX idx_token_usage_date ON token_usage_statistics(date);
CREATE INDEX idx_token_usage_source ON token_usage_statistics(source);
CREATE INDEX idx_token_usage_agent_model ON token_usage_statistics(agent_id, model_name);
```

**기록 시점:**
- LLM 호출 완료 시 즉시 기록
- Workbench/Hub Chat: `source='chat'`
- A2A Router: `source='a2a_router'`
- 실시간 존재하는 agent에 대해서만 집계 (deleted agent는 제외)

### 4.6 DailyStatisticsSnapshot Table (신규)

```sql
CREATE TABLE daily_statistics_snapshot (
    id SERIAL PRIMARY KEY,
    snapshot_date DATE NOT NULL UNIQUE,

    -- User/Agent counts
    total_users INTEGER NOT NULL DEFAULT 0,
    total_agents_deployed INTEGER NOT NULL DEFAULT 0,
    total_agents_development INTEGER NOT NULL DEFAULT 0,

    -- Agent calls (daily aggregation)
    total_calls_chat INTEGER NOT NULL DEFAULT 0,
    total_calls_a2a_router INTEGER NOT NULL DEFAULT 0,
    total_calls_all INTEGER NOT NULL DEFAULT 0,

    -- Token usage (daily aggregation)
    total_tokens INTEGER NOT NULL DEFAULT 0,
    total_prompt_tokens INTEGER NOT NULL DEFAULT 0,
    total_completion_tokens INTEGER NOT NULL DEFAULT 0,
    total_llm_calls INTEGER NOT NULL DEFAULT 0,

    -- Metadata
    snapshot_metadata JSONB, -- Top agents, top models 등

    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_snapshot_date ON daily_statistics_snapshot(snapshot_date DESC);
```

**생성 주기:**
- Worker Service에서 매일 자정(또는 설정된 시간)에 생성
- 전날 데이터를 집계하여 snapshot 생성
- Trend graph를 위한 historical data

**snapshot_metadata 예시:**
```json
{
  "top_agents_by_calls": [
    {"agent_id": 1, "agent_name": "Math Agent", "total_calls": 1250},
    {"agent_id": 2, "agent_name": "Text Agent", "total_calls": 890}
  ],
  "top_agents_by_tokens": [
    {"agent_id": 1, "agent_name": "Math Agent", "total_tokens": 125000},
    {"agent_id": 3, "agent_name": "Code Agent", "total_tokens": 98000}
  ],
  "top_models": [
    {"model_name": "gpt-4", "total_tokens": 320000, "llm_calls": 560},
    {"model_name": "gpt-3.5-turbo", "total_tokens": 264000, "llm_calls": 685}
  ]
}
```

### 4.7 Migration Script

```python
# alembic/versions/xxx_add_hub_tables.py

def upgrade():
    # 1. agents 테이블에 deploy 관련 컬럼 추가
    op.add_column('agents', sa.Column('deployed_at', sa.TIMESTAMP(), nullable=True))
    op.add_column('agents', sa.Column('deployed_by', sa.String(255), nullable=True))
    op.add_column('agents', sa.Column('validated_endpoint', sa.String(500), nullable=True))
    op.add_column('agents', sa.Column('agent_card', sa.JSON(), nullable=True))

    # 2. hub_sessions 테이블 생성
    op.create_table('hub_sessions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('session_name', sa.String(255), nullable=True),
        sa.Column('last_message_at', sa.TIMESTAMP(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id'),
        sa.UniqueConstraint('user_id', 'agent_id', 'session_id'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE')
    )

    # 3. hub_messages 테이블 생성
    op.create_table('hub_messages',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('session_id', sa.UUID(), nullable=False),
        sa.Column('role', sa.String(50), nullable=False),
        sa.Column('content', sa.TEXT(), nullable=False),
        sa.Column('parts', sa.JSON(), nullable=True),
        sa.Column('message_id', sa.String(255), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['session_id'], ['hub_sessions.session_id'], ondelete='CASCADE')
    )

    # 4. agent_call_statistics 테이블 생성
    op.create_table('agent_call_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('call_type', sa.String(50), nullable=False),  # 'chat', 'a2a_router'
        sa.Column('agent_status', sa.String(50), nullable=True),  # 'DEPLOYED', 'DEVELOPMENT'
        sa.Column('called_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('request_metadata', sa.JSON(), nullable=True),
        sa.Column('date', sa.DATE(), server_default=sa.text('CURRENT_DATE')),  # For aggregation
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE')
    )

    # 5. token_usage_statistics 테이블 생성
    op.create_table('token_usage_statistics',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('agent_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(255), nullable=False),
        sa.Column('prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('model_name', sa.String(255), nullable=False),
        sa.Column('llm_call_id', sa.String(255), nullable=True),
        sa.Column('source', sa.String(50), nullable=False),  # 'chat', 'a2a_router'
        sa.Column('called_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.Column('date', sa.DATE(), server_default=sa.text('CURRENT_DATE')),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['agent_id'], ['agents.id'], ondelete='CASCADE')
    )

    # 6. daily_statistics_snapshot 테이블 생성
    op.create_table('daily_statistics_snapshot',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('snapshot_date', sa.DATE(), nullable=False),
        sa.Column('total_users', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_agents_deployed', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_agents_development', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_calls_chat', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_calls_a2a_router', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_calls_all', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_prompt_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_completion_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('total_llm_calls', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('snapshot_metadata', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(), server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('snapshot_date')
    )

    # 7. 인덱스 생성
    op.create_index('idx_agents_status', 'agents', ['status'])
    op.create_index('idx_agents_deployed_at', 'agents', ['deployed_at'])
    op.create_index('idx_hub_sessions_user', 'hub_sessions', ['user_id'])
    op.create_index('idx_hub_sessions_agent', 'hub_sessions', ['agent_id'])
    op.create_index('idx_hub_sessions_updated', 'hub_sessions', ['updated_at'])
    op.create_index('idx_hub_messages_session', 'hub_messages', ['session_id'])
    op.create_index('idx_hub_messages_created', 'hub_messages', ['created_at'])
    op.create_index('idx_agent_calls_agent', 'agent_call_statistics', ['agent_id'])
    op.create_index('idx_agent_calls_user', 'agent_call_statistics', ['user_id'])
    op.create_index('idx_agent_calls_timestamp', 'agent_call_statistics', ['called_at'])
    op.create_index('idx_agent_calls_type', 'agent_call_statistics', ['call_type'])
    op.create_index('idx_agent_calls_date', 'agent_call_statistics', ['date'])
    op.create_index('idx_token_usage_agent', 'token_usage_statistics', ['agent_id'])
    op.create_index('idx_token_usage_model', 'token_usage_statistics', ['model_name'])
    op.create_index('idx_token_usage_date', 'token_usage_statistics', ['date'])
    op.create_index('idx_token_usage_source', 'token_usage_statistics', ['source'])
    op.create_index('idx_token_usage_agent_model', 'token_usage_statistics', ['agent_id', 'model_name'])
    op.create_index('idx_daily_snapshot_date', 'daily_statistics_snapshot', ['snapshot_date'], postgresql_using='btree', postgresql_ops={'snapshot_date': 'DESC'})

def downgrade():
    op.drop_table('daily_statistics_snapshot')
    op.drop_table('token_usage_statistics')
    op.drop_table('agent_call_statistics')
    op.drop_table('hub_messages')
    op.drop_table('hub_sessions')
    op.drop_column('agents', 'agent_card')
    op.drop_column('agents', 'validated_endpoint')
    op.drop_column('agents', 'deployed_by')
    op.drop_column('agents', 'deployed_at')
```

---

## 5. Deploy/Undeploy 로직 ❌ **[미구현]**

### 5.1 Backend API Endpoints

#### 5.1.1 Deploy Agent

```python
# repos/agent-service/app/api/v1/agents.py

from urllib.parse import urlparse

def validate_public_endpoint(endpoint: str) -> bool:
    """
    Validate that endpoint is publicly accessible

    Returns:
        True if endpoint is public IP or DNS
        False if endpoint is localhost/127.0.0.1/0.0.0.0
    """
    parsed = urlparse(endpoint)
    hostname = parsed.hostname or parsed.netloc.split(':')[0]

    # Reject localhost addresses
    localhost_addresses = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    if hostname.lower() in localhost_addresses:
        return False

    return True

@router.post("/agents/{agent_id}/deploy")
async def deploy_agent(
    agent_id: int,
    deploy_config: DeployConfig,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Deploy agent to Hub

    Request:
        {
            "visibility": "team" | "public"
        }

    Validations:
        1. Agent must be owned by current user
        2. Agent must be in DEVELOPMENT status
        3. Agent endpoint must be publicly accessible (not localhost)
        4. For ADK: Agent Card must be reachable
    """
    # 1. Load agent
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    if agent.owner_id != current_user["username"]:
        raise HTTPException(403, "Not authorized")

    if agent.status == AgentStatus.DEPLOYED:
        raise HTTPException(400, "Agent is already deployed")

    # 2. Validate endpoint is public
    if not agent.a2a_endpoint:
        raise HTTPException(400, "Agent endpoint not configured")

    if not validate_public_endpoint(agent.a2a_endpoint):
        raise HTTPException(
            400,
            "Deploy requires a publicly accessible endpoint. "
            "Please update your agent's host to an exposed IP or DNS "
            "(not localhost/127.0.0.1/0.0.0.0)"
        )

    # 3. For ADK: Validate Agent Card is reachable
    if agent.framework == AgentFramework.GOOGLE_ADK:
        try:
            agent_card = await validate_agent_endpoint(agent.a2a_endpoint)
        except Exception as e:
            raise HTTPException(
                400,
                f"Failed to validate ADK agent endpoint: {str(e)}"
            )

    # 4. For Agno/Langchain: Generate Agent Card
    if agent.framework in [AgentFramework.AGNO_OS, AgentFramework.LANGCHAIN]:
        agent_card = generate_agent_card(agent)
        agent.agent_card = agent_card

    # 5. Update agent status
    agent.status = AgentStatus.DEPLOYED
    agent.deployed_at = func.now()
    agent.deployed_by = current_user["username"]
    agent.visibility = deploy_config.visibility
    agent.validated_endpoint = agent.a2a_endpoint

    await db.commit()
    await db.refresh(agent)

    return {
        "success": True,
        "agent_id": agent_id,
        "status": "DEPLOYED",
        "visibility": agent.visibility,
        "agent_card_url": f"/api/hub/a2a/{agent_id}/.well-known/agent-card.json"
    }

def generate_agent_card(agent: Agent) -> Dict[str, Any]:
    """
    Generate Agent Card from agent metadata

    Uses information entered in Workbench "Add Agent"
    """
    return {
        "name": agent.name,
        "description": agent.description or f"{agent.name} agent",
        "url": f"http://localhost:9050/api/hub/a2a/{agent.id}",
        "version": "1.0.0",
        "capabilities": {
            "streaming": agent.capabilities.get("streaming", True)
        },
        "skills": [
            {
                "id": "default_skill",
                "name": agent.name,
                "description": agent.description or f"{agent.name} capability",
                "tags": agent.capabilities.get("tags", [agent.framework.value.lower()])
            }
        ]
    }
```

#### 5.1.2 Undeploy Agent

```python
@router.post("/agents/{agent_id}/undeploy")
async def undeploy_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    Undeploy agent from Hub

    - Returns agent to DEVELOPMENT status
    - Removes from Hub listings
    - Enables Workbench chat again
    """
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    if agent.owner_id != current_user["username"]:
        raise HTTPException(403, "Not authorized")

    if agent.status != AgentStatus.DEPLOYED:
        raise HTTPException(400, "Agent is not deployed")

    # Update status
    agent.status = AgentStatus.DEVELOPMENT
    agent.deployed_at = None
    agent.deployed_by = None
    agent.visibility = "private"

    await db.commit()

    return {
        "success": True,
        "agent_id": agent_id,
        "status": "DEVELOPMENT"
    }
```

### 5.2 Frontend - Deploy UI

```typescript
// frontend/src/components/workbench/DeployDialog.tsx

interface DeployDialogProps {
  agent: Agent;
  onDeploy: (visibility: 'team' | 'public') => Promise<void>;
}

export function DeployDialog({ agent, onDeploy }: DeployDialogProps) {
  const [visibility, setVisibility] = useState<'team' | 'public'>('team');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeploy = async () => {
    setLoading(true);
    setError(null);

    try {
      // Validate endpoint is not localhost
      const url = new URL(agent.a2a_endpoint);
      const hostname = url.hostname.toLowerCase();
      const localHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '::1'];

      if (localHostnames.includes(hostname)) {
        setError(
          "Deploy requires a publicly accessible endpoint. " +
          "Please update your agent's host to an exposed IP or DNS " +
          "(not localhost/127.0.0.1/0.0.0.0)"
        );
        return;
      }

      await onDeploy(visibility);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog>
      <DialogTitle>Deploy Agent to Hub</DialogTitle>
      <DialogContent>
        {error && (
          <Alert severity="error">{error}</Alert>
        )}

        <FormControl>
          <FormLabel>Visibility</FormLabel>
          <RadioGroup value={visibility} onChange={(e) => setVisibility(e.target.value)}>
            <FormControlLabel value="team" control={<Radio />} label="Team Only" />
            <FormControlLabel value="public" control={<Radio />} label="Public (All Users)" />
          </RadioGroup>
        </FormControl>

        <Typography variant="caption" color="textSecondary">
          Note: Once deployed, Workbench chat will be disabled until you undeploy.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleDeploy} disabled={loading}>
          Deploy
        </Button>
      </DialogActions>
    </Dialog>
  );
}
```

---

## 6. Hub Chat  ❌ **[미구현]**

### 6.1 Hub Chat API (Framework별 분기 처리)

**중요:** Hub Chat은 기존 Workbench Chat과 동일한 방식을 사용합니다.
- Framework별로 직접 분기 처리 (ChatAdapterFactory 같은 추상화 없음)
- Agno: multipart/form-data + SSE streaming
- ADK: A2A JSON-RPC protocol

```python
# repos/chat-service/app/api/v1/hub.py

class HubChatRequest(BaseModel):
    """Hub chat request"""
    agent_id: int
    session_id: Optional[str] = None
    # ADK fields
    messages: Optional[list[Message]] = []  # Conversation history for ADK
    # Agno fields
    content: Optional[str] = None  # Single message for Agno
    selected_resource: Optional[str] = None  # team_id for Agno

@router.post("/hub/chat/stream")
async def hub_chat_stream(
    request: HubChatRequest,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """
    Hub chat endpoint (same logic as Workbench)

    Framework branching:
    - Agno: multipart/form-data + SSE
    - ADK: A2A JSON-RPC
    """
    user_id = current_user["username"]
    token = authorization.replace("Bearer ", "") if authorization else ""

    # 1. Get agent info (framework, endpoint, trace_id, status)
    agent_info = await get_agent_info(request.agent_id, token)
    if not agent_info:
        raise HTTPException(404, "Agent not found")

    # 2. Check deployed status
    if agent_info.get("status") != "DEPLOYED":
        raise HTTPException(400, "Agent is not deployed")

    # 3. Check access control
    await check_access(agent_info, current_user)

    framework = agent_info.get("framework", "ADK")
    agent_url = agent_info.get("a2a_endpoint")
    trace_id = agent_info.get("trace_id")

    if not agent_url:
        raise HTTPException(400, "Agent endpoint not configured")

    # 4. Load or create Hub session
    session = await get_or_create_hub_session(
        db,
        user_id,
        request.agent_id,
        request.session_id
    )

    # 5. Record agent call (Hub Chat)
    await record_agent_call(
        db,
        request.agent_id,
        user_id,
        call_type='chat',  # Hub Chat 호출
        agent_status=agent_info.get("status")
    )

    # 6. Branch based on framework (same as Workbench)
    if framework == "Agno":
        # Agno: multipart/form-data + SSE streaming
        if not request.content:
            raise HTTPException(400, "content is required for Agno agents")

        return await _handle_agno_stream(
            request,
            agent_url,
            user_id,
            trace_id,
            db  # For token usage recording
        )

    else:  # ADK
        # ADK: A2A JSON-RPC protocol
        if not request.messages:
            raise HTTPException(400, "messages array is required for ADK agents")

        return await _handle_adk_stream(
            request,
            agent_url,
            trace_id,
            session,
            db  # For token usage recording
        )

async def _handle_adk_stream(
    request: HubChatRequest,
    agent_url: str,
    trace_id: str,
    session: HubSession,
    db: AsyncSession
):
    """
    Handle ADK framework streaming using A2A JSON-RPC
    """
    async def event_stream():
        yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id})}\n\n"

        try:
            # Stream from ADK agent using A2A protocol
            async for event in _stream_from_agent_a2a(
                agent_url,
                request.messages,
                trace_id,
                request.session_id
            ):
                if event["type"] == "text_token":
                    yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

        except Exception as e:
            logger.error(f"[Hub] Error streaming from ADK agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
            # Note: trace_id는 Agent → LLM Proxy 통신에서는 URL에 포함
            # Platform → Frontend 통신에서만 필요시 header 사용 (Workbench Trace UI용)
        }
    )

async def _handle_agno_stream(
    request: HubChatRequest,
    agent_url: str,
    user_id: str,
    trace_id: Optional[str],
    db: AsyncSession
):
    """
    Handle Agno framework streaming using multipart/form-data + SSE
    """
    # Build Agno endpoint with team routing
    if request.selected_resource:
        team_id = request.selected_resource.replace("team_", "")
        chat_endpoint = f"{agent_url.rstrip('/')}/teams/{team_id}/runs"
    else:
        chat_endpoint = f"{agent_url.rstrip('/')}/runs"

    async def stream_generator():
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Build form data
                form_data = {
                    "message": request.content,
                    "stream": "true",
                    "monitor": "true",
                    "user_id": user_id,
                }

                # Start SSE streaming
                async with client.stream(
                    "POST",
                    chat_endpoint,
                    data=form_data,
                    files=[],
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Agent error: {response.status_code}'})}\n\n"
                        return

                    # Stream start
                    if trace_id:
                        yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id})}\n\n"

                    # Forward SSE events from Agno
                    async for line in response.aiter_lines():
                        yield f"{line}\n"

                    # Stream end
                    yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

        except Exception as e:
            logger.error(f"[Hub] Error streaming from Agno agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive"
            # Note: trace_id는 Agent → LLM Proxy 통신에서는 URL에 포함
            # Platform → Frontend 통신에서만 필요시 header 사용 (Workbench Trace UI용)
        }
    )

async def record_agent_call(
    db: AsyncSession,
    agent_id: int,
    user_id: str,
    call_type: str,  # 'chat' or 'a2a_router'
    agent_status: str  # 'DEPLOYED' or 'DEVELOPMENT'
):
    """Record agent call for statistics"""
    call = AgentCallStatistic(
        agent_id=agent_id,
        user_id=user_id,
        call_type=call_type,
        agent_status=agent_status,
        called_at=func.now()
    )
    db.add(call)
    await db.commit()

async def record_token_usage(
    db: AsyncSession,
    agent_id: int,
    user_id: str,
    model_name: str,
    prompt_tokens: int,
    completion_tokens: int,
    total_tokens: int,
    source: str,  # 'chat' or 'a2a_router'
    llm_call_id: str = None
):
    """Record token usage for statistics"""
    usage = TokenUsageStatistic(
        agent_id=agent_id,
        user_id=user_id,
        model_name=model_name,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
        total_tokens=total_tokens,
        source=source,
        llm_call_id=llm_call_id,
        called_at=func.now()
    )
    db.add(usage)
    await db.commit()
```

**핵심 차이점:**

**Backend (chat-service):**
- ✅ Workbench와 동일한 framework별 분기 처리
  - Agno: multipart/form-data + SSE streaming
  - ADK: A2A JSON-RPC protocol
- ✅ Framework별 고유 프로토콜 존중
- ❌ A2A Protocol 사용 안 함 (A2A는 외부 API용)
- ✅ HubSession 사용 (multi-session 지원)
- ✅ Agent call 통계 기록 (call_type='chat')
- ✅ Token usage 통계 기록 (source='chat')

**Frontend:**
- ✅ Workbench와 동일한 `ChatAdapterFactory` 사용
  - ADKChatAdapter / AgnoChatAdapter
- ✅ Framework별 component 사용
  - ChatPlaygroundADK / ChatPlaygroundAgno
- ✅ Hub에서도 동일한 패턴 적용

---

## 7. A2A API Endpoint (외부 시스템용) ❌ **[미구현]**

**목적:** 외부 시스템이 우리 platform의 deployed agent를 A2A 프로토콜로 호출할 수 있도록 API 제공

**사용 예:**
- 다른 A2A agent가 우리 agent를 sub-agent로 사용
- A2A client가 우리 agent 호출
- 외부 시스템 통합

### 7.1 Agent Card Hosting Endpoint

```python
# repos/agent-service/app/api/v1/hub.py

@router.get("/hub/a2a/{agent_id}/.well-known/agent-card.json")
async def get_agent_card(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Provide Agent Card for deployed agents

    - ADK: Redirect to agent's own endpoint
    - Agno/Langchain: Return platform-generated Agent Card
    """
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    if agent.status != AgentStatus.DEPLOYED:
        raise HTTPException(400, "Agent is not deployed")

    # ADK: Redirect to agent's own Agent Card
    if agent.framework == AgentFramework.GOOGLE_ADK:
        agent_card_url = f"{agent.validated_endpoint}/.well-known/agent-card.json"
        return RedirectResponse(agent_card_url)

    # Agno/Langchain: Return platform-generated Agent Card
    if not agent.agent_card:
        raise HTTPException(500, "Agent Card not generated")

    return agent.agent_card
```

### 7.2 A2A Router Endpoint (외부 시스템용 API)

**중요:** 이 endpoint는 Hub Chat용이 아니라 **외부 시스템**이 우리 agent를 A2A 프로토콜로 호출하기 위한 API입니다.

```python
# repos/agent-service/app/api/v1/hub.py

@router.post("/hub/a2a/{agent_id}/tasks/send")
async def a2a_router(
    agent_id: int,
    request_body: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """
    A2A Protocol Router (for external systems)

    Provides A2A-compliant API for deployed agents
    This is NOT used by Hub Chat UI - it's for external A2A clients

    Use cases:
    - Other A2A agents calling our agent as sub-agent
    - A2A clients integrating with our platform
    - External systems using A2A protocol

    Flow:
        1. Load agent from DB
        2. For ADK: Forward directly to agent endpoint (A2A native)
        3. For Agno/Langchain: Transform A2A → Framework protocol
        4. Call agent endpoint
        5. Transform response back to A2A
        6. Record agent call statistics
    """
    # 1. Load agent
    agent = await db.get(Agent, agent_id)
    if not agent:
        raise HTTPException(404, "Agent not found")

    if agent.status != AgentStatus.DEPLOYED:
        raise HTTPException(400, "Agent is not deployed")

    # 2. Check access control
    if agent.visibility == "team":
        if current_user.get("department") != agent.department:
            raise HTTPException(403, "Access denied")
    elif agent.visibility == "private":
        if current_user["username"] != agent.owner_id:
            raise HTTPException(403, "Access denied")

    # 3. Record agent call (A2A Router - external system)
    await record_agent_call(
        db,
        agent_id,
        current_user["username"],
        call_type='a2a_router',  # A2A Router API 호출
        agent_status=agent.status
    )

    # 4. Framework-specific handling
    if agent.framework == AgentFramework.GOOGLE_ADK:
        # ADK: Direct A2A call (pass-through)
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{agent.validated_endpoint}/tasks/send",
                json=request_body,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            a2a_response = response.json()

        # 5. Record token usage (ADK)
        if 'result' in a2a_response and 'usage' in a2a_response['result']:
            usage = a2a_response['result']['usage']
            await record_token_usage(
                db,
                agent_id,
                current_user["username"],
                usage.get('model_name'),
                usage.get('prompt_tokens', 0),
                usage.get('completion_tokens', 0),
                usage.get('total_tokens', 0),
                source='a2a_router',
                llm_call_id=request_body.get('id')
            )

        return a2a_response

    else:
        # Agno/Langchain: Transform via adapter
        adapter = get_framework_adapter(agent.framework)

        # Transform request
        framework_request = adapter.transform_request(request_body, agent)

        # Call agent endpoint
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                agent.validated_endpoint,
                json=framework_request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            framework_response = response.json()

        # 5. Record token usage (Agno/Langchain)
        # Extract from framework response (adapter should provide this)
        usage_info = adapter.extract_usage(framework_response)
        if usage_info:
            await record_token_usage(
                db,
                agent_id,
                current_user["username"],
                usage_info.get('model_name'),
                usage_info.get('prompt_tokens', 0),
                usage_info.get('completion_tokens', 0),
                usage_info.get('total_tokens', 0),
                source='a2a_router',
                llm_call_id=request_body.get('id')
            )

        # Transform response
        a2a_response = adapter.transform_response(framework_response, request_body)

        return a2a_response
```

**통계 기록:**
- **Agent Call Statistics:**
  - `call_type='a2a_router'`: 외부 시스템의 A2A API 호출
  - `agent_status`: 호출 시점의 agent 상태 기록
  - Deploy/Develop 무관하게 모두 집계
- **Token Usage Statistics:**
  - `source='a2a_router'`: A2A Router 호출에서 발생한 token 사용
  - ADK: A2A response에서 usage 추출
  - Agno/Langchain: Framework response에서 usage 추출 (adapter.extract_usage())
  - Model별, Agent별 token 사용량 추적

### 7.3 Framework Adapters for A2A Router

**중요:** 이 Adapters는 A2A Router (외부 시스템용 API)에서만 사용됩니다.
Hub Chat은 기존 `ChatAdapterFactory`의 adapters를 사용합니다.

#### 7.3.1 Agno A2A Adapter

```python
# repos/agent-service/app/frameworks/agno_a2a_adapter.py

class AgnoA2AAdapter(FrameworkAdapter):
    """
    A2A Adapter for Agno OS framework (for external systems)

    This is ONLY used by A2A Router API, NOT by Hub Chat
    Hub Chat uses the original AgnoAdapter from ChatAdapterFactory

    Transforms between A2A Protocol and Agno Protocol
    """

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent: Agent
    ) -> Dict[str, Any]:
        """
        A2A → Agno transformation

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
          "id": "..."
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
            "session_id": message.get("contextId", message.get("messageId", "default")),
            "stream": False
        }

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Agno → A2A transformation

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
          "id": "..."
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

    def extract_usage(
        self,
        framework_response: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Extract token usage from Agno response

        Agno format (if available):
        {
          "output": "...",
          "metadata": {
            "model": "gpt-4",
            "usage": {
              "prompt_tokens": 100,
              "completion_tokens": 50,
              "total_tokens": 150
            }
          }
        }
        """
        metadata = framework_response.get("metadata", {})
        usage = metadata.get("usage", {})

        if not usage:
            return None

        return {
            "model_name": metadata.get("model", "unknown"),
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }
```

#### 7.3.2 Langchain Adapter

```python
# repos/agent-service/app/frameworks/langchain.py

class LangchainAdapter(FrameworkAdapter):
    """
    Adapter for Langchain framework

    Note: Langchain endpoint structure varies, this is a generic implementation
    """

    def transform_request(
        self,
        a2a_request: Dict[str, Any],
        agent: Agent
    ) -> Dict[str, Any]:
        """
        A2A → Langchain transformation

        Langchain format (varies by implementation):
        {
          "query": "...",
          "history": [],
          "config": {}
        }
        """
        params = a2a_request.get("params", {})
        message = params.get("message", {})
        parts = message.get("parts", [])

        # Extract text
        text_parts = [p["text"] for p in parts if p.get("kind") == "text"]
        query = " ".join(text_parts)

        return {
            "query": query,
            "history": [],
            "config": {}
        }

    def transform_response(
        self,
        framework_response: Dict[str, Any],
        original_request: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Langchain → A2A transformation

        Langchain format (varies):
        {
          "response": "...",
          "metadata": {...}
        }
        """
        response_text = framework_response.get("response", framework_response.get("output", ""))
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
                        "text": response_text
                    }
                ]
            },
            "id": request_id
        }

    def extract_usage(
        self,
        framework_response: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """
        Extract token usage from Langchain response

        Langchain format (if available):
        {
          "response": "...",
          "metadata": {
            "model": "gpt-4",
            "token_usage": {
              "prompt_tokens": 100,
              "completion_tokens": 50,
              "total_tokens": 150
            }
          }
        }
        """
        metadata = framework_response.get("metadata", {})
        usage = metadata.get("token_usage", metadata.get("usage", {}))

        if not usage:
            return None

        return {
            "model_name": metadata.get("model", "unknown"),
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0)
        }
```

---

## 8. 사용자 테스트 시나리오

### 8.1 테스트 환경 준비

**필요한 Agent:**
1. ADK Agent (port 8001) - A2A Native
2. Agno Agent (port 8002) - A2A Router 필요
3. Langchain Agent (port 8003) - A2A Router 필요

**사용자:**
- User A (developer1, department: engineering)
- User B (developer2, department: engineering)
- User C (user3, department: marketing)

### 8.2 Scenario 1: Workbench 기본 동작 (이미 구현됨)

**목적:** Workbench에서 Agent 생성 및 Chat 테스트

**단계:**
1. User A로 로그인
2. Workbench → Add Agent
   - Name: "Math Agent ADK"
   - Framework: Google ADK
   - Endpoint: http://localhost:8001
3. Configuration 탭에서 endpoint 확인
   - PLATFORM_LLM_ENDPOINT 표시됨
   - trace_id 포함됨
4. Chat Playground에서 메시지 전송
   - "Calculate 15 * 23"
5. Trace 창에서 5가지 event 확인
   - Request, Response, Tool Call, etc.
6. WorkbenchSession에 history 저장 확인

**검증:**
- ✅ Agent 생성 성공
- ✅ localhost endpoint 저장/복구 됨
- ✅ Chat 동작
- ✅ Trace 실시간 표시
- ✅ Session history 저장

### 8.3 Scenario 2: Deploy 실패 케이스 (localhost 검증)

**목적:** localhost endpoint는 deploy 불가 검증

**단계:**
1. User A로 로그인
2. Workbench → Math Agent ADK 선택
3. Deploy 버튼 클릭
4. Visibility: "Team" 선택
5. Deploy 클릭

**예상 결과:**
- ❌ 에러 메시지 표시:
  ```
  Deploy requires a publicly accessible endpoint.
  Please update your agent's host to an exposed IP or DNS
  (not localhost/127.0.0.1/0.0.0.0)
  ```

**검증:**
- ✅ localhost 검증 동작
- ✅ 명확한 에러 메시지

### 8.4 Scenario 3: Deploy 성공 (Public Endpoint)

**목적:** Public endpoint로 deploy 성공

**전제:**
- ADK Agent를 public IP에서 실행 (예: 192.168.1.100:8001)
- Agent endpoint를 http://192.168.1.100:8001로 수정

**단계:**
1. User A로 로그인
2. Workbench → Edit Agent
   - Endpoint: http://192.168.1.100:8001로 변경
3. Deploy 버튼 클릭
4. Visibility: "Public" 선택
5. Deploy 클릭

**예상 결과:**
- ✅ Deploy 성공 메시지
- ✅ Agent status: DEPLOYED
- ✅ deployed_at, deployed_by 기록됨
- ✅ Agent Card URL 표시:
  ```
  Agent Card: http://192.168.1.100:8001/.well-known/agent-card.json
  cURL Test:
  curl http://192.168.1.100:8001/.well-known/agent-card.json
  ```

**검증:**
- ✅ Public endpoint 허용
- ✅ Deploy 상태 변경
- ✅ cURL 테스트 UI 표시

### 8.5 Scenario 4: Deploy 후 Workbench Chat 차단

**목적:** Deploy된 agent는 Workbench에서 chat 불가

**단계:**
1. User A로 로그인
2. Workbench → Math Agent ADK (DEPLOYED) 선택
3. Chat Playground 탭 클릭

**예상 결과:**
- ❌ Chat 입력창 비활성화
- 📋 안내 메시지:
  ```
  This agent is currently deployed to Hub.
  To test in Workbench, please undeploy it first.
  [Undeploy Button]
  ```

**검증:**
- ✅ Deploy된 agent는 Workbench chat 불가
- ✅ Undeploy 유도

### 8.6 Scenario 5: Hub에서 Agent 검색 및 Chat

**목적:** Hub에서 deploy된 agent 검색하고 framework adapter로 chat

**단계:**
1. User B로 로그인
2. Hub 페이지 이동
3. 검색창에 "Math" 입력
4. "Math Agent ADK" Agent Card 클릭
5. Chat 창에서 메시지 전송
   - "What is 100 divided by 4?"
6. 응답 확인

**예상 결과:**
- ✅ Agent Card 표시 (Logo, Name, Description, Framework)
- ✅ Chat 창 열림
- ✅ **Framework별 분기 처리** (Workbench와 동일)
- ✅ 응답 받음: "25"
- ✅ HubSession 생성됨 (user_b + math_agent + new session_id)
- ✅ HubMessage 저장됨
- ✅ AgentCallStatistic 기록됨

**내부 동작:**
- Frontend: ChatAdapterFactory → ADKChatAdapter → ChatPlaygroundADK
- Backend: if framework == "ADK" → _handle_adk_stream() → ADK Agent
- ADK Protocol 사용 (A2A 아님)

**검증:**
- ✅ Multi-user 지원 (User A가 deploy, User B가 사용)
- ✅ Framework 분기 처리 동작 (Workbench와 동일)
- ✅ Hub session/message 저장
- ✅ Statistics 기록

### 8.7 Scenario 6: Agno Agent Deploy 및 A2A Router

**목적:** Agno agent deploy 시 Platform이 Agent Card hosting 및 A2A Router 제공

**단계:**
1. User A로 로그인
2. Workbench → Add Agent
   - Name: "Text Agent Agno"
   - Framework: Agno OS
   - Endpoint: http://192.168.1.100:8002/agents/text_agent/runs
3. Deploy 버튼 클릭
   - Visibility: "Public"
4. cURL Test UI에서 Agent Card URL 확인
   - Platform-hosted: `http://localhost:9050/api/hub/a2a/{agent_id}/.well-known/agent-card.json`
5. cURL 복사 버튼 클릭
6. Terminal에서 테스트
   ```bash
   curl http://localhost:9050/api/hub/a2a/2/.well-known/agent-card.json
   ```

**예상 결과:**
- ✅ Platform이 생성한 Agent Card 반환
  ```json
  {
    "name": "Text Agent Agno",
    "description": "...",
    "url": "http://localhost:9050/api/hub/a2a/2",
    "version": "1.0.0",
    "capabilities": {"streaming": true},
    "skills": [...]
  }
  ```

**검증:**
- ✅ Agno agent deploy 성공
- ✅ Platform이 Agent Card 생성
- ✅ cURL 테스트 성공

### 8.8 Scenario 7: Agno Agent Hub Chat 및 A2A API

**목적:** Hub Chat은 Framework별 분기 처리, A2A API는 외부 시스템용

#### 7-1. Hub Chat (Framework별 분기 처리)

**단계:**
1. User B로 로그인
2. Hub → "Text Agent Agno" 검색
3. Agent Card 클릭
4. Chat: "Convert 'hello' to uppercase"

**예상 결과:**
- ✅ Chat 응답: "HELLO"

**내부 동작:**
- Frontend: ChatAdapterFactory → AgnoChatAdapter → ChatPlaygroundAgno
- Backend: if framework == "Agno" → _handle_agno_stream() → Agno Agent
- **Agno Protocol 사용 (A2A 아님)**

#### 7-2. A2A API (외부 시스템용)

**단계:**
1. cURL Test 탭에서 A2A API 테스트
   ```bash
   curl -X POST http://localhost:9050/api/hub/a2a/2/tasks/send \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "jsonrpc": "2.0",
       "method": "sendMessage",
       "params": {
         "message": {
           "messageId": "test-789",
           "role": "user",
           "parts": [{"kind": "text", "text": "Hello from external system"}]
         }
       },
       "id": "req-789"
     }'
   ```

**예상 결과:**
- ✅ cURL 응답 (A2A 형식):
  ```json
  {
    "jsonrpc": "2.0",
    "result": {
      "kind": "message",
      "role": "agent",
      "parts": [{"kind": "text", "text": "HELLO FROM EXTERNAL SYSTEM"}]
    },
    "id": "req-789"
  }
  ```

**내부 동작:**
- 외부 시스템 → A2A Router → **Agno A2A Adapter** → Agno Agent
- A2A Protocol → Agno Protocol 변환

**검증:**
- ✅ Hub Chat: Framework별 분기 처리 (Workbench와 동일)
- ✅ A2A API: 외부 시스템용, A2A Router 사용
- ✅ 두 통신 방식이 독립적으로 동작

### 8.9 Scenario 8: 팀 공개 Agent 접근 제어

**목적:** team visibility agent는 같은 department만 접근

**단계:**
1. User A로 로그인
2. Workbench → "Math Agent ADK" Deploy
   - Visibility: "Team" (engineering)
3. User C로 로그인 (department: marketing)
4. Hub → "Math" 검색

**예상 결과:**
- ❌ "Math Agent ADK"가 검색 결과에 없음

**단계 (계속):**
5. User B로 로그인 (department: engineering)
6. Hub → "Math" 검색

**예상 결과:**
- ✅ "Math Agent ADK" 표시됨
- ✅ Chat 가능

**검증:**
- ✅ Team visibility 접근 제어 동작
- ✅ 같은 department만 접근

### 8.10 Scenario 9: 추천 Agent (개인별 Top 3)

**목적:** 개인별 가장 많이 사용한 agent Top 3 표시

**전제:**
- User B가 다음 agent들 사용:
  - Math Agent ADK: 10회
  - Text Agent Agno: 5회
  - Data Agent Langchain: 3회
  - Image Agent: 1회

**단계:**
1. User B로 로그인
2. Hub 메인 페이지 이동
3. "Recommended for You" 섹션 확인

**예상 결과:**
- ✅ 3개 Agent Card 표시 (Carousel)
  1. Math Agent ADK (10 calls)
  2. Text Agent Agno (5 calls)
  3. Data Agent Langchain (3 calls)

**검증:**
- ✅ 개인별 사용 통계 기반 추천
- ✅ Top 3만 표시

### 8.11 Scenario 10: 모든 Agent 이름순 정렬

**목적:** Hub에서 모든 공개 agent를 이름순으로 표시

**단계:**
1. User B로 로그인
2. Hub → "All Agents" 섹션 확인

**예상 결과:**
- ✅ Grid 형태로 Agent Card 표시
- ✅ 이름순 정렬 (A-Z):
  1. Data Agent Langchain
  2. Image Agent
  3. Math Agent ADK
  4. Text Agent Agno

**검증:**
- ✅ 이름순 정렬 동작
- ✅ 본인 소유 + 공개된 agent만 표시

### 8.12 Scenario 11: Multi-Session 관리

**목적:** Hub에서 1 user + 1 agent에 대해 여러 session 생성

**단계:**
1. User B로 로그인
2. Hub → "Math Agent ADK" 선택
3. Chat: "What is 5 + 5?" → 응답 확인
4. Chat: "Multiply it by 2" → 응답 확인
5. "New Chat" 버튼 클릭
6. Chat: "Calculate 100 / 5" → 응답 확인
7. Session List 확인

**예상 결과:**
- ✅ Session List에 2개 session 표시:
  - Session 1: "What is 5 + 5?" (2 messages)
  - Session 2: "Calculate 100 / 5" (1 message)
- ✅ Session 1 클릭 시 이전 대화 복원

**검증:**
- ✅ Multi-session 지원
- ✅ Session별 history 분리 저장
- ✅ Session 전환 동작

### 8.13 Scenario 12: Undeploy 및 Workbench 복귀

**목적:** Undeploy 후 Workbench에서 다시 chat 가능

**단계:**
1. User A로 로그인
2. Workbench → "Math Agent ADK" (DEPLOYED)
3. Undeploy 버튼 클릭
4. 확인 다이얼로그 → Yes

**예상 결과:**
- ✅ Agent status: DEPLOYED → DEVELOPMENT
- ✅ deployed_at, deployed_by → NULL
- ✅ visibility → private

**단계 (계속):**
5. Chat Playground 탭 클릭
6. Chat: "Test message"

**예상 결과:**
- ✅ Chat 입력창 활성화됨
- ✅ 메시지 전송 가능
- ✅ Trace 재개됨

**단계 (계속):**
7. User B로 로그인
8. Hub → "Math" 검색

**예상 결과:**
- ❌ "Math Agent ADK" 검색 결과에 없음 (undeployed)

**검증:**
- ✅ Undeploy 동작
- ✅ Workbench chat 재활성화
- ✅ Hub에서 제거됨

### 8.14 Scenario 13: Agent Call Statistics

**목적:** Agent call 통계 집계 확인

**단계:**
1. Admin으로 로그인
2. Statistics 페이지 이동
3. "Agent Analytics" 섹션 확인

**예상 결과:**
- ✅ Agent별 통계 표시:
  | Agent Name | Total Calls | Unique Users | Avg Daily Calls |
  |------------|-------------|--------------|-----------------|
  | Math Agent ADK | 25 | 5 | 5.0 |
  | Text Agent Agno | 15 | 3 | 3.0 |
  | Data Agent | 10 | 2 | 2.0 |

**검증:**
- ✅ Agent call 통계 집계
- ✅ Frontend request 기준 카운트
- ✅ Unique user 수 집계

---

## 9. Worker Service - Daily Statistics Snapshot

### 9.1 개요

Worker Service는 매일 자정(또는 설정된 시간)에 통계 데이터를 집계하여 `daily_statistics_snapshot` 테이블에 저장합니다.

**목적:**
- History Trend graph를 위한 historical data 생성
- 실시간 집계 부담 감소
- 장기간 통계 데이터 보존

### 9.2 Snapshot 생성 로직

```python
# repos/worker-service/app/tasks/statistics.py

import asyncio
from datetime import date, timedelta
from sqlalchemy import select, func, and_
from app.core.database import get_db
from app.models import (
    Agent, AgentCallStatistic, TokenUsageStatistic,
    DailyStatisticsSnapshot, User
)

async def create_daily_snapshot():
    """
    Create daily statistics snapshot

    Runs every day at midnight (or configured time)
    """
    async with get_db() as db:
        snapshot_date = date.today() - timedelta(days=1)  # 전날 데이터

        # 1. Count users
        total_users = await db.scalar(
            select(func.count(func.distinct(User.username)))
        )

        # 2. Count agents
        total_agents_deployed = await db.scalar(
            select(func.count(Agent.id))
            .where(Agent.status == 'DEPLOYED')
        )

        total_agents_development = await db.scalar(
            select(func.count(Agent.id))
            .where(Agent.status == 'DEVELOPMENT')
        )

        # 3. Agent calls aggregation
        calls_result = await db.execute(
            select(
                AgentCallStatistic.call_type,
                func.count(AgentCallStatistic.id).label('count')
            )
            .where(AgentCallStatistic.date == snapshot_date)
            .group_by(AgentCallStatistic.call_type)
        )

        calls_by_type = {row.call_type: row.count for row in calls_result}
        total_calls_chat = calls_by_type.get('chat', 0)
        total_calls_a2a_router = calls_by_type.get('a2a_router', 0)
        total_calls_all = total_calls_chat + total_calls_a2a_router

        # 4. Token usage aggregation
        token_result = await db.execute(
            select(
                func.sum(TokenUsageStatistic.total_tokens),
                func.sum(TokenUsageStatistic.prompt_tokens),
                func.sum(TokenUsageStatistic.completion_tokens),
                func.count(TokenUsageStatistic.id)
            )
            .where(TokenUsageStatistic.date == snapshot_date)
        )

        row = token_result.first()
        total_tokens = row[0] or 0
        total_prompt_tokens = row[1] or 0
        total_completion_tokens = row[2] or 0
        total_llm_calls = row[3] or 0

        # 5. Top agents by calls
        top_agents_calls = await db.execute(
            select(
                Agent.id,
                Agent.name,
                func.count(AgentCallStatistic.id).label('total_calls')
            )
            .join(AgentCallStatistic, AgentCallStatistic.agent_id == Agent.id)
            .where(AgentCallStatistic.date == snapshot_date)
            .group_by(Agent.id, Agent.name)
            .order_by(func.count(AgentCallStatistic.id).desc())
            .limit(10)
        )

        top_agents_by_calls = [
            {
                "agent_id": row.id,
                "agent_name": row.name,
                "total_calls": row.total_calls
            }
            for row in top_agents_calls
        ]

        # 6. Top agents by tokens
        top_agents_tokens = await db.execute(
            select(
                Agent.id,
                Agent.name,
                func.sum(TokenUsageStatistic.total_tokens).label('total_tokens')
            )
            .join(TokenUsageStatistic, TokenUsageStatistic.agent_id == Agent.id)
            .where(TokenUsageStatistic.date == snapshot_date)
            .group_by(Agent.id, Agent.name)
            .order_by(func.sum(TokenUsageStatistic.total_tokens).desc())
            .limit(10)
        )

        top_agents_by_tokens = [
            {
                "agent_id": row.id,
                "agent_name": row.name,
                "total_tokens": row.total_tokens
            }
            for row in top_agents_tokens
        ]

        # 7. Top models
        top_models = await db.execute(
            select(
                TokenUsageStatistic.model_name,
                func.sum(TokenUsageStatistic.total_tokens).label('total_tokens'),
                func.count(TokenUsageStatistic.id).label('llm_calls')
            )
            .where(TokenUsageStatistic.date == snapshot_date)
            .group_by(TokenUsageStatistic.model_name)
            .order_by(func.sum(TokenUsageStatistic.total_tokens).desc())
            .limit(10)
        )

        top_models_list = [
            {
                "model_name": row.model_name,
                "total_tokens": row.total_tokens,
                "llm_calls": row.llm_calls
            }
            for row in top_models
        ]

        # 8. Create snapshot
        snapshot = DailyStatisticsSnapshot(
            snapshot_date=snapshot_date,
            total_users=total_users,
            total_agents_deployed=total_agents_deployed,
            total_agents_development=total_agents_development,
            total_calls_chat=total_calls_chat,
            total_calls_a2a_router=total_calls_a2a_router,
            total_calls_all=total_calls_all,
            total_tokens=total_tokens,
            total_prompt_tokens=total_prompt_tokens,
            total_completion_tokens=total_completion_tokens,
            total_llm_calls=total_llm_calls,
            snapshot_metadata={
                "top_agents_by_calls": top_agents_by_calls,
                "top_agents_by_tokens": top_agents_by_tokens,
                "top_models": top_models_list
            }
        )

        db.add(snapshot)
        await db.commit()

        print(f"Daily snapshot created for {snapshot_date}")
```

### 9.3 Scheduler 설정

```python
# repos/worker-service/app/core/scheduler.py

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.tasks.statistics import create_daily_snapshot

def setup_scheduler():
    """Setup APScheduler for periodic tasks"""
    scheduler = AsyncIOScheduler()

    # Daily snapshot at midnight
    scheduler.add_job(
        create_daily_snapshot,
        trigger='cron',
        hour=0,
        minute=0,
        id='daily_statistics_snapshot',
        replace_existing=True
    )

    scheduler.start()
    print("Scheduler started: Daily snapshot at 00:00")

    return scheduler
```

```python
# repos/worker-service/main.py

from app.core.scheduler import setup_scheduler

async def startup():
    """Application startup"""
    # Setup scheduler
    scheduler = setup_scheduler()
    print("Worker Service started")

if __name__ == "__main__":
    import asyncio
    asyncio.run(startup())

    # Keep running
    import time
    while True:
        time.sleep(1)
```

### 9.4 Manual Trigger (개발/테스트용)

```python
# repos/worker-service/app/api/v1/admin.py

@router.post("/admin/statistics/snapshot/trigger")
async def trigger_snapshot(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_admin)  # Admin only
):
    """
    Manually trigger daily snapshot creation

    For development and testing purposes
    """
    from app.tasks.statistics import create_daily_snapshot

    await create_daily_snapshot()

    return {"success": True, "message": "Snapshot created"}
```

---

## 10. Playwright 자동화 테스트 시나리오

### 10.1 Test Suite 구조

```typescript
// tests/hub/deploy.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Hub Deploy Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Login as User A
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer1');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/workbench');
  });

  test('Deploy with localhost endpoint should fail', async ({ page }) => {
    // Navigate to agent
    await page.goto('http://localhost:9060/workbench/agents/1');

    // Click deploy button
    await page.click('[data-testid="deploy-button"]');

    // Select visibility
    await page.click('[data-testid="visibility-team"]');

    // Click deploy
    await page.click('[data-testid="confirm-deploy"]');

    // Expect error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText(
      'Deploy requires a publicly accessible endpoint'
    );
  });

  test('Deploy with public endpoint should succeed', async ({ page }) => {
    // Update agent endpoint first
    await page.goto('http://localhost:9060/workbench/agents/1/edit');
    await page.fill('[data-testid="endpoint-input"]', 'http://192.168.1.100:8001');
    await page.click('[data-testid="save-button"]');

    // Deploy
    await page.click('[data-testid="deploy-button"]');
    await page.click('[data-testid="visibility-public"]');
    await page.click('[data-testid="confirm-deploy"]');

    // Expect success
    await expect(page.locator('[data-testid="success-message"]')).toContainText(
      'Agent deployed successfully'
    );

    // Verify status badge
    await expect(page.locator('[data-testid="agent-status"]')).toContainText('DEPLOYED');
  });

  test('Workbench chat should be disabled after deploy', async ({ page }) => {
    // Assume agent is deployed
    await page.goto('http://localhost:9060/workbench/agents/1');
    await page.click('[data-testid="chat-tab"]');

    // Expect chat input disabled
    await expect(page.locator('[data-testid="chat-input"]')).toBeDisabled();

    // Expect notice
    await expect(page.locator('[data-testid="deploy-notice"]')).toContainText(
      'This agent is currently deployed to Hub'
    );
  });
});

test.describe('Hub Agent Discovery', () => {
  test.beforeEach(async ({ page }) => {
    // Login as User B
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer2');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('**/hub');
  });

  test('Search for deployed agent', async ({ page }) => {
    // Search
    await page.fill('[data-testid="search-input"]', 'Math');
    await page.waitForTimeout(500);

    // Expect agent card
    await expect(page.locator('[data-testid="agent-card-1"]')).toBeVisible();
    await expect(page.locator('[data-testid="agent-card-1"]')).toContainText('Math Agent ADK');
  });

  test('Recommended agents should show top 3', async ({ page }) => {
    // Check recommended section
    const recommendedSection = page.locator('[data-testid="recommended-agents"]');
    await expect(recommendedSection).toBeVisible();

    // Expect 3 agent cards
    const cards = recommendedSection.locator('[data-testid^="agent-card-"]');
    await expect(cards).toHaveCount(3);
  });

  test('All agents should be sorted by name', async ({ page }) => {
    // Get all agent cards
    const cards = page.locator('[data-testid="all-agents"] [data-testid^="agent-card-"]');
    const count = await cards.count();

    // Extract names
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const name = await cards.nth(i).locator('[data-testid="agent-name"]').textContent();
      names.push(name || '');
    }

    // Verify sorted
    const sortedNames = [...names].sort();
    expect(names).toEqual(sortedNames);
  });
});

test.describe('Hub Chat', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer2');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
    await page.goto('http://localhost:9060/hub');
  });

  test('ADK agent chat with framework adapter', async ({ page }) => {
    // Select agent
    await page.click('[data-testid="agent-card-1"]');

    // Send message
    await page.fill('[data-testid="chat-input"]', 'Calculate 10 + 5');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="agent-message"]');

    // Verify response
    const response = await page.locator('[data-testid="agent-message"]').last().textContent();
    expect(response).toContain('15');

    // Note: Uses ADK Adapter (not A2A Protocol)
  });

  test('Agno agent chat with framework adapter', async ({ page }) => {
    // Select Agno agent
    await page.click('[data-testid="agent-card-2"]');

    // Send message
    await page.fill('[data-testid="chat-input"]', 'Convert HELLO to lowercase');
    await page.click('[data-testid="send-button"]');

    // Wait for response
    await page.waitForSelector('[data-testid="agent-message"]');

    // Verify response
    const response = await page.locator('[data-testid="agent-message"]').last().textContent();
    expect(response).toContain('hello');

    // Note: Uses Agno Adapter (not A2A Protocol)
  });

  test('Multi-session creation', async ({ page }) => {
    // Select agent
    await page.click('[data-testid="agent-card-1"]');

    // First session
    await page.fill('[data-testid="chat-input"]', 'First message');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="agent-message"]');

    // New chat
    await page.click('[data-testid="new-chat-button"]');

    // Second session
    await page.fill('[data-testid="chat-input"]', 'Second message');
    await page.click('[data-testid="send-button"]');
    await page.waitForSelector('[data-testid="agent-message"]');

    // Verify session list
    await page.click('[data-testid="session-list-button"]');
    const sessions = page.locator('[data-testid^="session-item-"]');
    await expect(sessions).toHaveCount(2);
  });
});

test.describe('cURL Test UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer1');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');
  });

  test('Copy Agent Card cURL command', async ({ page }) => {
    await page.goto('http://localhost:9060/workbench/agents/2'); // Agno agent
    await page.click('[data-testid="curl-test-tab"]');

    // Click copy button
    await page.click('[data-testid="copy-agent-card-curl"]');

    // Verify toast
    await expect(page.locator('[data-testid="toast"]')).toContainText('Copied to clipboard');

    // Verify clipboard (requires clipboard permissions)
    // const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    // expect(clipboardText).toContain('/.well-known/agent-card.json');
  });

  test('Copy A2A Router cURL command', async ({ page }) => {
    await page.goto('http://localhost:9060/workbench/agents/2');
    await page.click('[data-testid="curl-test-tab"]');

    await page.click('[data-testid="copy-a2a-router-curl"]');

    await expect(page.locator('[data-testid="toast"]')).toContainText('Copied to clipboard');
  });
});

test.describe('Access Control', () => {
  test('Team visibility - same department can access', async ({ page }) => {
    // Login as User B (same department as User A)
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer2');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    await page.goto('http://localhost:9060/hub');
    await page.fill('[data-testid="search-input"]', 'Math');

    // Should see team agent
    await expect(page.locator('[data-testid="agent-card-1"]')).toBeVisible();
  });

  test('Team visibility - different department cannot access', async ({ page }) => {
    // Login as User C (different department)
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'user3');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    await page.goto('http://localhost:9060/hub');
    await page.fill('[data-testid="search-input"]', 'Math');

    // Should not see team agent
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
  });
});

test.describe('Undeploy', () => {
  test('Undeploy restores Workbench chat', async ({ page }) => {
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer1');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    // Undeploy
    await page.goto('http://localhost:9060/workbench/agents/1');
    await page.click('[data-testid="undeploy-button"]');
    await page.click('[data-testid="confirm-undeploy"]');

    // Wait for status update
    await expect(page.locator('[data-testid="agent-status"]')).toContainText('DEVELOPMENT');

    // Check chat enabled
    await page.click('[data-testid="chat-tab"]');
    await expect(page.locator('[data-testid="chat-input"]')).not.toBeDisabled();
  });

  test('Undeployed agent not visible in Hub', async ({ page }) => {
    // Login as User B
    await page.goto('http://localhost:9060/login');
    await page.fill('[data-testid="username"]', 'developer2');
    await page.fill('[data-testid="password"]', 'password');
    await page.click('[data-testid="login-button"]');

    await page.goto('http://localhost:9060/hub');
    await page.fill('[data-testid="search-input"]', 'Math');

    // Should not see undeployed agent
    await expect(page.locator('[data-testid="no-results"]')).toBeVisible();
  });
});
```

### 10.2 실행 방법

```bash
# Install dependencies
npm install -D @playwright/test

# Run all tests
npx playwright test

# Run specific test suite
npx playwright test tests/hub/deploy.spec.ts

# Run with UI
npx playwright test --ui

# Generate report
npx playwright show-report
```

---

## 11. 체크리스트

### 11.1 Backend Implementation

- [ ] Database Migration
  - [ ] hub_sessions, hub_messages
  - [ ] agent_call_statistics
  - [ ] token_usage_statistics
  - [ ] daily_statistics_snapshot
- [ ] Deploy/Undeploy API endpoints
- [ ] Public endpoint validation
- [ ] Agent Card generation for Agno/Langchain
- [ ] Agent Card hosting endpoint
- [ ] A2A Router endpoint
- [ ] Framework Adapters (Agno, Langchain) with extract_usage()
- [ ] Multi-session management
- [ ] Statistics recording
  - [ ] Agent call statistics (call_type: chat/a2a_router)
  - [ ] Token usage statistics (source: chat/a2a_router)
- [ ] Worker Service - Daily snapshot
- [ ] Statistics API endpoints (realtime, trends)
- [ ] Access control (team/public visibility)

### 11.2 Frontend Implementation

- [ ] Deploy/Undeploy UI
- [ ] Deploy validation (localhost check)
- [ ] Workbench chat disable when deployed
- [ ] Hub search functionality
- [ ] Recommended agents (Top 3)
- [ ] All agents (sorted by name)
- [ ] Agent Card component
- [ ] Hub chat interface
- [ ] Multi-session UI
- [ ] Session list and switching
- [ ] cURL test UI
- [ ] Copy to clipboard functionality
- [ ] Statistics dashboard (Admin only)
  - [ ] Real-time statistics
    - [ ] User/Agent counts
    - [ ] Agent calls (chat/a2a_router/total)
    - [ ] Agent token usage
    - [ ] Model usage statistics
  - [ ] History trends
    - [ ] User/Agent count trends
    - [ ] Token usage trends (All/Model/Agent selection)
    - [ ] Agent call trends (Top K filter)

### 11.3 Testing

- [ ] Manual test scenarios (7.1 ~ 7.14)
- [ ] Playwright automated tests (8.1)
- [ ] Integration tests (Backend APIs)
- [ ] End-to-end tests (Full user flow)

---

## 12. 구현 우선순위

### Phase 1: Core Deploy Logic (Week 1)
1. Database migration
2. Deploy/Undeploy API
3. Public endpoint validation
4. Workbench UI updates

### Phase 2: Hub Infrastructure (Week 2)
1. Multi-session management
2. Hub chat API
3. Agent Card hosting
4. A2A Router

### Phase 3: Hub UI (Week 3)
1. Agent search
2. Recommended agents
3. All agents
4. Chat interface
5. Session management UI

### Phase 4: Advanced Features (Week 4)
1. Statistics tracking
2. cURL test UI
3. Access control refinement
4. Playwright tests

---

## 12. 핵심 요약

### 통신 방식 분리의 중요성

**A2A Agent Platform은 2가지 통신 방식을 제공합니다:**

#### 1️⃣ **Chat 통신 (Workbench & Hub 공통)**
- **목적:** UI에서 Agent와 대화
- **방식:** Framework별 고유 프로토콜 (ADK Protocol, Agno Protocol, Langchain Protocol)
- **Adapter:** ChatAdapterFactory의 framework adapters 사용
- **특징:** 각 framework의 endpoint와 return/event를 존중

```
Frontend → Hub Chat API → ChatAdapterFactory → Framework Adapter → Agent
```

#### 2️⃣ **A2A API Endpoint (외부 시스템용)**
- **목적:** 외부 시스템이 우리 agent를 A2A 프로토콜로 호출
- **방식:** A2A Protocol (JSON-RPC 2.0)
- **Adapter:** A2A Router용 별도 adapters (Agno A2A Adapter, Langchain A2A Adapter)
- **특징:** Chat UI용이 아니라 **API Expose용**

```
외부 시스템 → A2A Router → A2A Adapter → Agent
```

### Framework별 정리

| Framework | Hub Chat | A2A API Endpoint |
|-----------|----------|------------------|
| **ADK** | Framework별 분기 처리 | Agent 자체 제공 |
| **Agno** | Framework별 분기 처리 | Platform이 A2A wrapper 제공 |
| **Langchain** | Framework별 분기 처리 | Platform이 A2A wrapper 제공 |

### Workbench vs Hub

| 기능 | Workbench | Hub |
|------|-----------|-----|
| **Chat 방식** | Framework별 분기 | Framework별 분기 (동일) |
| **Session 관리** | Single Session | Multi Session |
| **Trace** | ✅ 제공 | ❌ 제공 안 함 |
| **Endpoint** | localhost OK | Public IP/DNS만 |
| **A2A API** | ❌ 제공 안 함 | ✅ 제공 (외부 시스템용) |

---

**문서 작성:** 2025-11-18
**작성자:** Claude Code
**버전:** 2.0 (수정: Chat과 A2A API 분리 명시)
