# Agent Service - Frontend 연동 가이드

## 📋 개요

Agent Service는 Agent CRUD, A2A 프로토콜, AI 랭킹 기능을 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. Agent CRUD

#### 1.1 Agent 목록 조회
```
GET /api/agents/
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `status`: DEVELOPMENT | PRODUCTION | DISABLED
- `visibility`: PRIVATE | TEAM | ALL
- `mode`: workbench | hub (현재 모드에 따라)

**Response:**
```json
[
  {
    "id": 1,
    "name": "Customer Support Agent",
    "description": "고객 문의를 처리하는 에이전트",
    "framework": "Agno",
    "status": "DEVELOPMENT",
    "visibility": "PRIVATE",
    "agno_base_url": "http://localhost:9080",
    "agno_agent_id": "customer-support-agent",
    "capabilities": ["customer_support", "qa"],
    "skill_kr": "고객지원, 챗봇",
    "skill_en": "customer support, chatbot",
    "logo_url": "https://...",
    "card_color": "#E3F2FD",
    "owner_id": 1,
    "owner_username": "syngha.han",
    "owner_username_kr": "한승하",
    "owner_deptname_kr": "AI Platform Team",
    "health_status": "healthy",
    "created_at": "2025-10-27T10:00:00Z",
    "updated_at": "2025-10-27T10:00:00Z"
  }
]
```

#### 1.2 Agent 생성
```
POST /api/agents/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Customer Support Agent",
  "description": "고객 문의를 처리하는 에이전트",
  "framework": "Agno",
  "agno_base_url": "http://localhost:9080",
  "agno_agent_id": "customer-support-agent",
  "skill_kr": "고객지원, 챗봇",
  "skill_en": "customer support, chatbot",
  "logo_url": "https://...",
  "card_color": "#E3F2FD",
  "visibility": "PRIVATE"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "Customer Support Agent",
  "status": "DEVELOPMENT",
  "message": "Agent created successfully"
}
```

#### 1.3 Agent 수정
```
PATCH /api/agents/{id}/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "description": "개선된 고객 문의 처리 에이전트",
  "agno_base_url": "http://localhost:9090"
}
```

#### 1.4 Agent 삭제
```
DELETE /api/agents/{id}/
Authorization: Bearer {accessToken}
```

#### 1.5 Agent 운영 전환
```
POST /api/agents/{id}/deploy/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "visibility": "TEAM",
  "production_endpoint": "https://agent.company.com:8080"
}
```

**Response:**
```json
{
  "id": 1,
  "status": "PRODUCTION",
  "visibility": "TEAM",
  "message": "Agent deployed successfully"
}
```

### 2. AI 랭킹 검색 (Hub 모드)

#### 2.1 Agent 검색
```
GET /api/agents/search?q={query}
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "Customer Support Agent",
    "description": "고객 문의를 처리하는 에이전트",
    "similarity_score": 0.95,
    ...
  }
]
```

### 3. Agent Health Check

#### 3.1 헬스 체크
```
POST /api/agents/{id}/health-check/
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "agent_id": 1,
  "health_status": "healthy",
  "checked_at": "2025-10-27T12:00:00Z"
}
```

## 💻 Frontend 실제 구현 세부사항

### 1. API 서비스 레이어

#### agentService (`frontend/src/api/agentService.ts`)
Agent 관련 모든 API 호출을 담당하는 서비스 레이어입니다.

**주요 함수:**
```typescript
// Agent 목록 조회
getAgents(): Promise<Agent[]> // GET /api/agents/

// Agent 생성
createAgent(data: AgentCreateData): Promise<Agent> // POST /api/agents/

// Agent 수정
updateAgent(id: string, data: Partial<Agent>): Promise<Agent> // PATCH /api/agents/{id}/

// Agent 삭제
deleteAgent(id: string): Promise<void> // DELETE /api/agents/{id}/

// Agent 배포
deployAgent(id: string, visibility: string): Promise<Agent> // POST /api/agents/{id}/deploy/

// Health Check
checkHealth(id: string): Promise<HealthStatus> // POST /api/agents/{id}/health-check/

// AI 랭킹 검색 (RAG)
searchAgents(query: string): Promise<Agent[]> // GET /api/agents/search?q={query}
```

### 2. 컴포넌트별 API 호출

#### WorkbenchDashboard (`frontend/src/pages/WorkbenchDashboard.tsx`)
**기능:** 사용자의 Agent 목록 조회 및 생성

```typescript
// Agent 목록 불러오기
const fetchAgents = async () => {
  const data = await agentService.getAgents();
  const myAgents = data.filter((agent) => agent.owner_user_id === user?.user_id);
  setAgents(myAgents);
};

// Agent 클릭 시 Playground로 이동
const handleAgentClick = (agent: Agent) => {
  navigate(`/workbench/playground/${agent.agent_id}`);
};

// Agent 삭제
const handleDeleteAgent = async (agentId: string) => {
  await agentService.deleteAgent(agentId);
  fetchAgents();
};
```

**API 호출:**
- GET `/api/agents/` (초기 로딩, 생성/삭제 후)
- DELETE `/api/agents/{id}/` (삭제 시)

#### AddAgentModal (`frontend/src/components/workbench/AddAgentModal.tsx`)
**기능:** 새 Agent 생성 폼

```typescript
// Framework별 필수 필드 검증
const validateForm = () => {
  if (formData.framework === 'Agno') {
    return formData.agno_base_url && formData.agno_agent_id;
  }
  // ...다른 프레임워크
};

// Agent 생성
const handleSubmit = async () => {
  const createdAgent = await agentService.createAgent(formData);
  onSuccess(); // 부모 컴포넌트에서 목록 새로고침
};
```

**API 호출:**
- POST `/api/agents/` (생성 시)

#### HubDashboard (`frontend/src/pages/HubDashboard.tsx`)
**기능:** 공개 Agent 검색 및 조회

```typescript
// 공개 Agent 목록
const fetchPublicAgents = async () => {
  const data = await agentService.getAgents();
  const publicAgents = data.filter((agent) => agent.visibility === 'PUBLIC');
  setAgents(publicAgents);
};

// AI 랭킹 검색
const handleSearch = async () => {
  const results = await agentService.searchAgents(searchQuery);
  setAgents(results);
};
```

**API 호출:**
- GET `/api/agents/` (초기 로딩)
- GET `/api/agents/search?q={query}` (검색 시)

#### WorkbenchPlayground/HubPlayground
**기능:** Agent와의 대화 (Chat Service 연동)

```typescript
// Agent 정보 불러오기
const fetchAgent = async () => {
  const agents = await agentService.getAgents();
  const foundAgent = agents.find((a) => a.agent_id === agentId);
  setAgent(foundAgent);
};
```

**API 호출:**
- GET `/api/agents/` (Agent 정보 조회)

#### FlowPage (`frontend/src/pages/FlowPage.tsx`)
**기능:** 멀티 Agent 선택 및 조합

```typescript
// 모든 Agent 불러오기 (본인 + 공개)
const fetchAgents = async () => {
  const data = await agentService.getAgents();
  setAgents(data);
};

// 여러 Agent 선택
const toggleAgentSelection = (agent: Agent) => {
  if (selectedAgents.find((a) => a.agent_id === agent.agent_id)) {
    setSelectedAgents(selectedAgents.filter((a) => a.agent_id !== agent.agent_id));
  } else {
    setSelectedAgents([...selectedAgents, agent]);
  }
};
```

**API 호출:**
- GET `/api/agents/` (Agent 목록 조회)

### 3. AgentCard 컴포넌트

#### AgentCard (`frontend/src/components/common/AgentCard.tsx`)
Agent 정보를 카드 형태로 표시하는 공통 컴포넌트입니다.

**Props:**
- `agent`: Agent - 표시할 Agent 데이터
- `mode`: 'workbench' | 'hub' - 표시 모드 (삭제 버튼 유무)
- `onClick`: () => void - 카드 클릭 핸들러
- `onDelete`: () => void - 삭제 버튼 핸들러 (workbench 모드만)

**표시 정보:**
- Agent 이름, 설명
- Framework 아이콘 (Agno, ADK, Langchain, Custom)
- Health Status (healthy, unhealthy, unknown)
- Skills (skill_kr 표시)
- 소유자 정보 (owner_username_kr, owner_deptname_kr)

## 🧪 테스트 시나리오

### 시나리오 1: Workbench에서 Agent 생성
1. Workbench 대시보드로 이동
2. "+ 새 에이전트 만들기" 카드 클릭
3. 모달에서 정보 입력:
   - 이름: "Customer Support Agent"
   - 설명: "고객 문의 처리"
   - 프레임워크: Agno
   - Base URL: http://localhost:9080
   - Agent ID: customer-support-agent
4. POST `/api/agents/` 호출
5. 새 Agent 카드가 대시보드에 표시됨

### 시나리오 2: Hub에서 Agent 검색
1. Hub 대시보드로 이동
2. 검색창에 "고객 지원" 입력
3. GET `/api/agents/search?q=고객 지원` 호출
4. AI 랭킹 기반으로 정렬된 Agent 목록 표시

### 시나리오 3: Agent 운영 전환
1. Workbench에서 Agent 카드의 "운영 배포" 버튼 클릭
2. 모달에서 공개 범위 선택: "팀 공개"
3. POST `/api/agents/{id}/deploy/` 호출
4. Agent status가 PRODUCTION으로 변경됨
5. 팀 멤버들이 Hub에서 해당 Agent 카드 확인 가능

## 📁 초기 폴더 구조

```
agent-service/
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── models.py           # Agent 모델
│   ├── schemas.py
│   ├── api/
│   │   ├── __init__.py
│   │   ├── agents.py       # Agent CRUD
│   │   └── search.py       # AI 랭킹 검색
│   ├── services/
│   │   ├── __init__.py
│   │   ├── embeddings.py   # RAG 임베딩
│   │   └── health.py       # Health Check
│   └── dependencies.py
├── tests/
├── requirements.txt        # FastAPI, sentence-transformers, numpy
├── Dockerfile
└── README.md
```

## 🔑 환경 변수

```bash
DB_HOST=localhost
DB_NAME=agent_dev_platform_local
DB_USER=dev_user
DB_PASSWORD=dev_password

# Embedding Model
EMBEDDING_MODEL="sentence-transformers/all-MiniLM-L6-v2"
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] Workbench에서 Agent 생성이 정상적으로 작동하는가?
- [ ] Agent 카드가 프레임워크별로 올바르게 표시되는가?
- [ ] Agent 수정/삭제가 정상적으로 작동하는가?
- [ ] Hub에서 AI 랭킹 검색이 작동하는가?
- [ ] Agent 운영 전환이 정상적으로 작동하는가?
- [ ] 팀 공개 Agent가 같은 팀 멤버에게만 표시되는가?
- [ ] Health Status가 올바르게 표시되는가?
