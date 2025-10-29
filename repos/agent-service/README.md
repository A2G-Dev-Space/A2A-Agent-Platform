# 🤖 Agent Service

**담당자**: DEV4 (안준형)
**포트**: 8002
**설명**: 에이전트 레지스트리, A2A 프로토콜, Top-K 추천 서비스

## 🚀 빠른 시작

```bash
# 1. 환경 설정
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync

# 2. 설정 파일 작성
cp .env.example .env.local
# .env.local을 설정에 맞게 편집하세요

# 3. pgvector 확장자를 포함한 데이터베이스 설정
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"

# 4. 마이그레이션 실행
alembic init alembic  # 첫 실행 시만
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 5. 서비스 실행
uvicorn app.main:app --reload --port 8002

# 6. 헬스 체크
curl http://localhost:8002/health
```

## 📚 API 문서

실행 후 다음을 방문하세요: http://localhost:8002/docs

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
        is_public: true
      })
    });
    console.log('Created:', await res.json());
  },

  // 에이전트 나열
  list: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    console.table(data.agents);
  },

  // 추천 조회 (Top-K)
  recommend: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/agents/recommend/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'I need help with customer support',
        k: 5
      })
    });
    const data = await res.json();
    console.table(data.recommendations);
  }
};

// 테스트 실행
await agentTests.create();
await agentTests.list();
await agentTests.recommend();
```

### 2. A2A 프로토콜 테스트
```javascript
// A2A 에이전트 등록
const testA2A = async () => {
  const token = localStorage.getItem('accessToken');

  // 등록
  const regRes = await fetch('/api/agents/a2a/register/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'A2A Test Agent',
      framework: 'Langchain',
      endpoint: 'http://localhost:8100/rpc',
      capabilities: {
        version: '1.0.0',
        skills: ['chat', 'qa'],
        languages: ['ko', 'en']
      }
    })
  });
  const { agent_id } = await regRes.json();
  console.log('Registered Agent ID:', agent_id);

  // A2A를 통해 실행
  const execRes = await fetch(`/api/agents/${agent_id}/execute/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      task: 'Hello, agent!',
      context: { user_id: 'test' }
    })
  });
  console.log('Execution Result:', await execRes.json());
};

testA2A();
```

## 🔌 주요 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/agents/` | GET | 필터를 포함한 에이전트 나열 |
| `/api/agents/` | POST | 새 에이전트 생성 |
| `/api/agents/{id}/` | GET | 에이전트 상세정보 조회 |
| `/api/agents/{id}/` | PATCH | 에이전트 수정 |
| `/api/agents/{id}/` | DELETE | 에이전트 삭제 |
| `/api/agents/{id}/status/` | PATCH | 에이전트 상태 수정 |
| `/api/agents/{id}/execute/` | POST | 에이전트 작업 실행 |
| `/api/agents/recommend/` | POST | Top-K 추천 조회 |
| `/api/agents/a2a/register/` | POST | A2A 에이전트 등록 |
| `/api/agents/a2a/execute/{id}/` | POST | A2A 프로토콜을 통해 실행 |

## 🧮 Top-K 알고리즘 구현

```python
# app/services/recommendation_service.py
import numpy as np
from sqlalchemy import select
from sqlalchemy.sql import func

class RecommendationService:
    async def get_recommendations(
        self,
        query: str,
        k: int = 5,
        filters: dict = None
    ):
        # 1. 쿼리 임베딩 생성
        query_vector = await self.generate_embedding(query)

        # 2. pgvector를 사용하여 유사 에이전트 검색
        similarity_query = (
            select(
                Agent,
                1 - func.cosine_distance(
                    Agent.embedding_vector,
                    query_vector
                ).label('similarity')
            )
            .where(Agent.status == 'PRODUCTION')
            .order_by('similarity')
            .limit(k)
        )

        # 3. 필터 적용
        if filters:
            if filters.get('department'):
                similarity_query = similarity_query.where(
                    Agent.department == filters['department']
                )

        # 4. 쿼리 실행
        results = await db.execute(similarity_query)

        # 5. 매칭 이유 생성
        recommendations = []
        for agent, similarity in results:
            reason = await self.generate_match_reason(
                query, agent, similarity
            )
            recommendations.append({
                'agent_id': agent.id,
                'name': agent.name,
                'similarity_score': similarity,
                'match_reason': reason
            })

        return recommendations
```

## 🔐 환경 변수

```bash
# 서비스
SERVICE_NAME=agent-service
SERVICE_PORT=8002

# pgvector를 포함한 데이터베이스
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@postgres:5432/agent_service_db

# Redis
REDIS_URL=redis://redis:6379/1

# OpenAI (임베딩용)
OPENAI_API_KEY=your-openai-api-key
EMBEDDING_MODEL=text-embedding-ada-002
EMBEDDING_DIMENSION=1536

# 매칭 이유 생성용 LLM
LLM_API_KEY=your-llm-api-key
LLM_MODEL=gpt-3.5-turbo

# JWT (user-service와 동일)
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256

# 에이전트 레지스트리
REGISTRY_ENABLED=false  # 사용 가능할 때 true로 설정
REGISTRY_URL=http://localhost:8080/registry

# CORS
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
```

> ✅ **배포 환경에서는** `DATABASE_URL`, `REDIS_URL`만 사내 공용 엔드포인트로 교체하면 됩니다. 서비스별 Redis DB 번호는 그대로 유지해 주세요.

## 📂 프로젝트 구조

```
agent-service/
├── app/
│   ├── __init__.py
│   ├── main.py                    # FastAPI 앱
│   ├── api/
│   │   └── v1/
│   │       ├── agents.py          # 에이전트 CRUD 엔드포인트
│   │       ├── a2a.py            # A2A 프로토콜 엔드포인트
│   │       └── recommendations.py # Top-K 엔드포인트
│   ├── core/
│   │   ├── config.py             # 설정
│   │   ├── a2a_protocol.py       # A2A 구현
│   │   └── dependencies.py       # 공통 의존성
│   ├── models/
│   │   └── agent.py              # SQLAlchemy 모델
│   ├── schemas/
│   │   ├── agent.py              # 에이전트 스키마
│   │   └── a2a.py                # A2A 프로토콜 스키마
│   ├── services/
│   │   ├── agent_service.py      # 에이전트 비즈니스 로직
│   │   ├── recommendation_service.py # Top-K 알고리즘
│   │   └── registry_client.py    # 에이전트 레지스트리 클라이언트
│   └── utils/
│       └── embeddings.py         # 임베딩 생성
├── tests/
│   ├── test_agents.py
│   ├── test_a2a.py
│   └── test_recommendations.py
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

# A2A 프로토콜만 테스트
pytest tests/test_a2a.py -v

# Top-K 추천만 테스트
pytest tests/test_recommendations.py -v
```

## 🔄 A2A 프로토콜 테스트

### Mock A2A 에이전트
```python
# tests/mock_a2a_agent.py
from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.post("/rpc")
async def handle_a2a(request: dict):
    """Mock A2A 에이전트 엔드포인트"""
    return {
        "jsonrpc": "2.0",
        "result": {
            "status": "success",
            "data": {
                "response": f"Processed: {request.get('params', {}).get('task', 'No task')}"
            }
        },
        "id": request.get("id", "1")
    }

if __name__ == "__main__":
    uvicorn.run(app, port=8100)
```

Mock 에이전트 실행:
```bash
python tests/mock_a2a_agent.py
```