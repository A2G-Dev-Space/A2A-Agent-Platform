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
│   │       └── agents.py          # 에이전트 CRUD 엔드포인트
│   ├── core/
│   │   ├── config.py             # 설정
│   │   ├── database.py           # DB 모델 및 연결
│   │   └── security.py           # JWT 인증
│   ├── models/                    # (database.py에 통합됨)
│   ├── schemas/                   # (agents.py에 통합됨)
│   └── services/                  # 비즈니스 로직
├── tests/
│   └── test_agents.py
├── alembic/                      # 데이터베이스 마이그레이션
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
