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

실행 후 다음을 방문하세요: http://localhost:8002/docs

## 🔌 주요 엔드포인트

### 기본 CRUD 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/agents/` | GET | 에이전트 목록 조회 (Access Control 필터링 포함) |
| `/api/agents/` | POST | 새 에이전트 생성 |
| `/api/agents/{id}/` | GET | 에이전트 상세정보 조회 |
| `/api/agents/{id}/` | PUT | 에이전트 수정 (status 포함) |
| `/api/agents/{id}/` | DELETE | 에이전트 삭제 |

### Access Control 필터 파라미터

GET `/api/agents/`에서 사용 가능한 필터:

| 파라미터 | 타입 | 설명 | 예시 |
|---------|------|------|------|
| `status` | string | 에이전트 상태 필터 | `DEVELOPMENT`, `PRODUCTION` |
| `framework` | string | 프레임워크 필터 | `Langchain`, `Agno` |
| `department` | string | 부서 필터 | `AI Platform Team` |
| `visibility` | string | 공개 범위 | `public`, `private`, `team` |
| `only_mine` | boolean | 내 에이전트만 조회 | `true`, `false` |

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
