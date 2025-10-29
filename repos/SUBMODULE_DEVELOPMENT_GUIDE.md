# 📚 A2G Platform - 서브모듈 개발 가이드

**버전**: 1.0
**최종 업데이트**: 2025년 10월 28일
**대상**: 모든 개발팀 멤버

---

## 📋 목차

1. [개요](#개요)
2. [저장소 구조](#저장소-구조)
3. [서비스 개발 가이드라인](#서비스-개발-가이드라인)
4. [Frontend 테스트 통합](#frontend-테스트-통합)
5. [Mock 서비스 개발](#mock-서비스-개발)
6. [Frontend를 사용한 API 테스트](#frontend를-사용한-api-테스트)
7. [서비스별 가이드](#서비스별-가이드)
8. [개발 워크플로우](#개발-워크플로우)
9. [문제 해결](#문제-해결)

---

## 🎯 개요

이 가이드는 Git 서브모듈로 백엔드 서비스를 개발하고 frontend 애플리케이션을 통해 테스트하기 위한 포괄적인 지침을 제공합니다.

### 핵심 원칙
- **독립적 개발**: 각 서비스는 독립적으로 개발될 수 있습니다
- **Frontend 통합**: 모든 서비스는 통합 Frontend를 통해 테스트할 수 있습니다
- **Mock 서비스**: 의존성이 없을 때 Mock 서비스로 개발할 수 있습니다
- **실시간 테스트**: WebSocket 연결을 Frontend의 실시간 기능을 통해 테스트할 수 있습니다

---

## 📁 저장소 구조

```
A2G-Dev-Space/
├── agent-platform-development/      # 메인 문서 & Frontend
│   ├── frontend/                   # React 19 Frontend 애플리케이션
│   └── repos/                      # 서브모듈 마운트 지점
│       ├── user-service/          # → git@github.com:A2G-Dev-Space/agent-platform-user-service.git
│       ├── agent-service/         # → git@github.com:A2G-Dev-Space/agent-platform-agent-service.git
│       ├── chat-service/          # → git@github.com:A2G-Dev-Space/agent-platform-chat-service.git
│       ├── tracing-service/       # → git@github.com:A2G-Dev-Space/agent-platform-tracing-service.git
│       ├── admin-service/         # → git@github.com:A2G-Dev-Space/agent-platform-admin-service.git
│       ├── worker-service/        # → git@github.com:A2G-Dev-Space/agent-platform-worker-service.git
│       ├── infra/                 # → git@github.com:A2G-Dev-Space/agent-platform-infra.git
│       └── shared/                # → git@github.com:A2G-Dev-Space/agent-platform-shared.git
```

### 서브모듈 설정

```bash
# 서브모듈과 함께 메인 저장소 복제
git clone --recursive git@github.com:A2G-Dev-Space/agent-platform-development.git

# 또는 이미 복제한 경우 서브모듈 초기화
cd agent-platform-development
git submodule init
git submodule update

# 새 서브모듈 추가 (예제)
cd repos
git submodule add git@github.com:A2G-Dev-Space/agent-platform-user-service.git user-service
```

---

## 🔧 서비스 개발 가이드라인

### 1. 서비스 템플릿 구조

각 서비스는 다음과 같은 구조를 따라야 합니다:

```
service-name/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱 진입점
│   ├── api/                 # API 라우트
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       └── endpoints/
│   ├── core/                # 핵심 기능
│   │   ├── __init__.py
│   │   ├── config.py        # 설정 관리
│   │   ├── security.py      # 보안 유틸리티
│   │   └── dependencies.py  # 의존성 주입
│   ├── models/              # SQLAlchemy 모델
│   │   ├── __init__.py
│   │   └── domain.py
│   ├── schemas/             # Pydantic 스키마
│   │   ├── __init__.py
│   │   └── api.py
│   ├── services/            # 비즈니스 로직
│   │   └── __init__.py
│   └── utils/               # 유틸리티
│       └── __init__.py
├── tests/                   # 테스트 파일
├── alembic/                 # 데이터베이스 마이그레이션
├── .env.example            # 환경 변수 템플릿
├── .env.local              # 로컬 개발 설정
├── pyproject.toml          # UV 패키지 관리
├── Dockerfile              # 컨테이너 정의
├── docker-compose.yml      # 로컬 개발 compose
└── README.md               # 서비스 문서
```

### 2. 기본 서비스 설정

`pyproject.toml` 생성:

```toml
[project]
name = "agent-platform-{service-name}"
version = "0.1.0"
description = "A2G Platform - {Service Name}"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
    "sqlalchemy>=2.0.0",
    "asyncpg>=0.29.0",
    "redis>=5.0.0",
    "pydantic>=2.5.0",
    "pydantic-settings>=2.1.0",
    "python-jose[cryptography]>=3.3.0",
    "passlib[bcrypt]>=1.7.4",
    "httpx>=0.25.0",
    "alembic>=1.13.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "pytest-asyncio>=0.21.0",
    "pytest-cov>=4.1.0",
    "black>=23.0.0",
    "isort>=5.12.0",
    "mypy>=1.7.0",
]
```

### 3. 환경 설정

`.env.local` 생성:

```bash
# 서비스 설정
SERVICE_NAME=user-service
SERVICE_PORT=8001
DEBUG=true

# 데이터베이스
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@localhost:5432/user_service_db

# Redis
REDIS_URL=redis://localhost:6379/0

# 보안
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=720

# CORS (Frontend 접근용)
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]

# 추적
TRACE_SERVICE_URL=http://localhost:8004
```

---

## 🎨 Frontend 테스트 통합

### 1. Frontend API 프록시 설정

Frontend는 이미 백엔드 서비스로의 API 요청을 프록시하도록 설정되어 있습니다:

```typescript
// frontend/vite.config.ts
export default defineConfig({
  server: {
    port: 9060,
    proxy: {
      '/api': {
        target: 'http://localhost:9050',  // API Gateway
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:9050',     // WebSocket
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
```

### 2. 직접 서비스 테스트 (API Gateway 없이)

직접 서비스 테스트를 위해 프록시를 서비스로 수정합니다:

```typescript
// 예: user-service를 직접 테스트하는 경우
'/api/auth': {
  target: 'http://localhost:8001',
  changeOrigin: true,
},
'/api/users': {
  target: 'http://localhost:8001',
  changeOrigin: true,
},
```

### 3. Frontend 콘솔에서 엔드포인트 테스트

브라우저 콘솔(F12)을 열고 엔드포인트를 테스트합니다:

```javascript
// 인증 테스트
const testLogin = async () => {
  const response = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect_uri: 'http://localhost:9060/callback' })
  });
  console.log(await response.json());
};

// 에이전트 생성 테스트
const testCreateAgent = async () => {
  const token = localStorage.getItem('accessToken');
  const response = await fetch('/api/agents/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: 'Test Agent',
      description: 'Testing from console',
      framework: 'Langchain',
      is_public: true
    })
  });
  console.log(await response.json());
};

// WebSocket 연결 테스트
const testWebSocket = () => {
  const ws = new WebSocket('ws://localhost:8003/ws/test-session?token=' + localStorage.getItem('accessToken'));

  ws.onopen = () => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({ type: 'ping' }));
  };

  ws.onmessage = (event) => {
    console.log('Received:', JSON.parse(event.data));
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};
```

---

## 🔌 Mock 서비스 개발

### 1. Mock SSO 서비스

`repos/infra/mock-sso/main.py` 생성:

```python
from fastapi import FastAPI, Form
from fastapi.responses import RedirectResponse
import jwt
import json

app = FastAPI()

MOCK_USERS = {
    "dev1": {
        "loginid": "syngha.han",
        "username": "한승하",
        "mail": "syngha.han@company.com",
        "deptname": "AI Platform Team",
        "deptname_en": "AI Platform Team"
    },
    "dev2": {
        "loginid": "byungju.lee",
        "username": "이병주",
        "mail": "byungju.lee@company.com",
        "deptname": "AI Platform Team",
        "deptname_en": "AI Platform Team"
    }
}

@app.get("/mock-sso/login")
async def mock_login(redirect_uri: str, user: str = "dev1"):
    """Mock SSO login - 지정된 사용자로 자동 로그인"""
    user_data = MOCK_USERS.get(user, MOCK_USERS["dev1"])

    # Mock ID 토큰 생성
    id_token = jwt.encode(
        user_data,
        "mock-sso-secret-key-12345",
        algorithm="HS256"
    )

    # 토큰과 함께 리다이렉트
    return RedirectResponse(url=f"{redirect_uri}?id_token={id_token}")

@app.get("/mock-sso/logout")
async def mock_logout(redirect_uri: str):
    """Mock SSO 로그아웃"""
    return RedirectResponse(url=redirect_uri)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9999)
```

### 2. Mock 서비스 실행

```bash
# Mock SSO 시작
cd repos/infra/mock-sso
python main.py

# 또는 Docker 사용
docker run -d \
  --name mock-sso \
  -p 9999:9999 \
  -v $(pwd):/app \
  -w /app \
  python:3.11-slim \
  sh -c "pip install fastapi uvicorn pyjwt && python main.py"
```

---

## 🧪 Frontend를 사용한 API 테스트

### 1. Frontend DevTools 사용

#### 에이전트 관리 테스트

1. Workbench 모드로 이동 (`http://localhost:9060/workbench`)
2. DevTools 네트워크 탭 열기 (F12 → Network)
3. 새 에이전트를 생성하고 다음을 관찰합니다:
   - 요청 헤더 (인증 토큰)
   - 요청 페이로드
   - 응답 데이터
   - 응답 시간

#### 실시간 테스트

1. 채팅 세션으로 이동
2. DevTools 콘솔 열기
3. WebSocket 프레임 모니터링:
   ```javascript
   // 콘솔에서 WebSocket 서비스 접근
   const ws = window.websocketService;
   ws.on('message', (data) => console.log('WS Message:', data));
   ```

### 2. Frontend 테스트 패널 사용

테스트 패널 컴포넌트 생성:

```typescript
// frontend/src/components/dev/TestPanel.tsx
import React, { useState } from 'react';
import { agentService } from '@/services/agentService';

export const TestPanel: React.FC = () => {
  const [results, setResults] = useState<any[]>([]);

  const testEndpoints = async () => {
    const tests = [
      { name: 'Get Agents', fn: () => agentService.getAgents() },
      { name: 'Get Recommendations', fn: () => agentService.getRecommendations({ query: 'test', k: 3 }) },
      { name: 'Health Check', fn: () => fetch('/api/health').then(r => r.json()) },
    ];

    for (const test of tests) {
      try {
        const start = Date.now();
        const result = await test.fn();
        const time = Date.now() - start;
        setResults(prev => [...prev, {
          name: test.name,
          status: 'success',
          time,
          data: result
        }]);
      } catch (error) {
        setResults(prev => [...prev, {
          name: test.name,
          status: 'error',
          error: error.message
        }]);
      }
    }
  };

  return (
    <div className="p-4">
      <button onClick={testEndpoints} className="btn btn-primary">
        테스트 실행
      </button>
      <div className="mt-4">
        {results.map((result, idx) => (
          <div key={idx} className="mb-2 p-2 border rounded">
            <div className="font-bold">{result.name}</div>
            <div className={result.status === 'success' ? 'text-green-600' : 'text-red-600'}>
              상태: {result.status} {result.time && `(${result.time}ms)`}
            </div>
            {result.data && (
              <pre className="text-xs mt-1 overflow-auto">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
```

---

## 📘 서비스별 가이드

### User Service (DEV1: 한승하)

**담당사항**: 인증, 권한부여, 사용자 관리

#### 테스트할 주요 엔드포인트
```javascript
// Frontend 콘솔 테스트
const userServiceTests = {
  // SSO 로그인 흐름 테스트
  testLogin: async () => {
    const res = await fetch('/api/auth/login/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ redirect_uri: window.location.origin + '/callback' })
    });
    const data = await res.json();
    console.log('SSO URL:', data.sso_login_url);
    // window.open(data.sso_login_url); // 실제 리다이렉트 테스트하려면 주석 제거
  },

  // 사용자 프로필 테스트
  testProfile: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/users/me/', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('User Profile:', await res.json());
  },

  // API 키 생성 테스트
  testApiKey: async () => {
    const token = localStorage.getItem('accessToken');
    const res = await fetch('/api/users/me/api-keys/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name: 'Test Key' })
    });
    console.log('New API Key:', await res.json());
  }
};
```

### Agent Service (DEV4: 안준형)

**담당사항**: 에이전트 레지스트리, A2A 프로토콜, Top-K 추천

#### A2A 프로토콜 테스트
```python
# repos/agent-service/tests/test_a2a.py
import httpx
import pytest

@pytest.mark.asyncio
async def test_a2a_registration():
    async with httpx.AsyncClient() as client:
        # A2A를 통해 에이전트 등록
        response = await client.post(
            "http://localhost:8002/api/agents/a2a/register",
            json={
                "name": "Test A2A Agent",
                "framework": "Langchain",
                "endpoint": "http://localhost:8100/agent",
                "capabilities": {
                    "skills": ["chat", "search"],
                    "version": "1.0.0"
                }
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "agent_id" in data

        # A2A를 통해 실행 테스트
        exec_response = await client.post(
            f"http://localhost:8002/api/agents/a2a/execute/{data['agent_id']}",
            json={
                "task": "Hello, agent",
                "context": {"user_id": "test"}
            }
        )
        assert exec_response.status_code == 200
```

#### Top-K 테스트
```javascript
// 브라우저 콘솔에서 테스트
const testTopK = async () => {
  const token = localStorage.getItem('accessToken');

  // 추천 API 테스트
  const response = await fetch('/api/agents/recommend/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      query: '고객 불만 처리를 도와줄 에이전트',
      k: 5,
      filters: {
        status: 'PRODUCTION'
      }
    })
  });

  const recommendations = await response.json();
  console.table(recommendations.recommendations);
};
```

### Chat Service (DEV3: 김영섭)

**담당사항**: WebSocket 채팅, 세션 관리

#### Frontend WebSocket 테스트
```javascript
// 고급 WebSocket 테스트
class ChatTester {
  constructor(sessionId) {
    const token = localStorage.getItem('accessToken');
    this.ws = new WebSocket(
      `ws://localhost:8003/ws/${sessionId}?token=${token}`
    );
    this.setupHandlers();
  }

  setupHandlers() {
    this.ws.onopen = () => {
      console.log('✅ WebSocket 연결됨');
      this.sendMessage('Hello from tester!');
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('📨 수신:', data);

      // 메시지 타입별 처리
      switch(data.type) {
        case 'stream_start':
          console.log('🎬 스트림 시작');
          break;
        case 'token':
          process.stdout.write(data.content); // 실시간 토큰 표시
          break;
        case 'stream_end':
          console.log('\n✅ 스트림 완료');
          break;
        case 'agent_transfer':
          console.log('🔄 에이전트 전달:', data.from_agent, '→', data.to_agent);
          break;
      }
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket 오류:', error);
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket 연결 해제');
    };
  }

  sendMessage(content) {
    this.ws.send(JSON.stringify({
      type: 'message',
      content: content,
      timestamp: new Date().toISOString()
    }));
  }

  close() {
    this.ws.close();
  }
}

// 사용 예제
const chatTest = new ChatTester('test-session-123');
// chatTest.sendMessage('Another message');
// chatTest.close();
```

### Admin Service (DEV2: 이병주)

**담당사항**: LLM 관리, 통계, 시스템 설정

#### LLM 모델 관리 테스트
```javascript
// LLM 모델 CRUD 테스트
const adminTests = {
  // LLM 모델 나열
  listModels: async () => {
    const res = await fetch('/api/admin/llm-models/', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    console.table(await res.json());
  },

  // 새 LLM 모델 추가
  addModel: async () => {
    const res = await fetch('/api/admin/llm-models/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Custom LLM',
        provider: 'Custom',
        endpoint: 'http://localhost:8080/v1',
        api_key: 'test-key-12345'
      })
    });
    console.log('New Model:', await res.json());
  },

  // 통계 조회
  getStats: async () => {
    const res = await fetch('/api/admin/statistics/?start_date=2025-01-01&end_date=2025-12-31', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
    });
    const stats = await res.json();
    console.log('Platform Statistics:');
    console.table(stats.statistics);
    console.log('Daily Breakdown:');
    console.table(stats.daily_breakdown);
  }
};
```

---

## 🔄 개발 워크플로우

### 1. 초기 설정

```bash
# 1. 서브모듈과 함께 복제
git clone --recursive git@github.com:A2G-Dev-Space/agent-platform-development.git
cd agent-platform-development

# 2. 인프라 시작
docker-compose -f repos/infra/docker-compose.dev.yml up -d

# 3. 서비스 설정
cd repos/user-service
uv venv
source .venv/bin/activate
uv sync
cp .env.example .env.local

# 4. 데이터베이스 마이그레이션 실행
alembic upgrade head

# 5. 서비스 시작
uvicorn app.main:app --reload --port 8001

# 6. Frontend 시작
cd ../../frontend
npm install
npm run dev

# 7. 브라우저 열기
open http://localhost:9060
```

### 2. 개발 사이클

```
코드 작성 → 로컬 테스트 → Frontend로 테스트 → 작동?
  ↑                                            ↓
  ← 아니오                                   예 ↓
                                            테스트 작성 → Commit & Push → PR 생성
```

### 3. 테스트 체크리스트

- [ ] 로컬 단위 테스트 통과
- [ ] 서비스 오류 없이 시작
- [ ] Frontend에서 엔드포인트 접근 가능
- [ ] 인증/권한 작동
- [ ] WebSocket 연결 안정적 (해당하는 경우)
- [ ] 오류 처리 정상 작동
- [ ] 로그가 추적 서비스에 나타남

---

## 🐛 문제 해결

### 일반적인 문제 및 해결책

#### 1. CORS 오류
```python
# 서비스의 main.py에 추가
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:9060"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. 데이터베이스 연결 문제
```bash
# PostgreSQL 실행 중인지 확인
docker ps | grep postgres

# 데이터베이스 존재 확인
docker exec -it a2g-postgres-dev psql -U dev_user -c "\l"

# 누락된 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE your_service_db;"
```

#### 3. Frontend가 서비스에 연결할 수 없음
```javascript
// 서비스가 실행 중인지 확인
fetch('http://localhost:8001/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);

// vite.config.ts에서 프록시 설정 확인
```

#### 4. WebSocket 연결 실패
```javascript
// WebSocket 직접 테스트
const ws = new WebSocket('ws://localhost:8003/ws/test');
ws.onopen = () => console.log('Connected');
ws.onerror = (e) => console.error('Error:', e);
```

#### 5. 인증 문제
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

### 디버그 모드 설정

서비스의 `.env.local`에 추가:
```bash
# 디버그 로깅 활성화
DEBUG=true
LOG_LEVEL=DEBUG

# SQL 쿼리 로깅 활성화
SQLALCHEMY_ECHO=true

# 상세 오류 메시지 활성화
SHOW_ERROR_DETAILS=true
```

### 로그 모니터링

```bash
# 서비스 로그 보기
tail -f service.log

# 모든 Docker 로그 보기
docker-compose logs -f

# 특정 서비스 필터링
docker-compose logs -f user-service

# Frontend 콘솔 확인
# 브라우저 DevTools(F12) → Console
```

---

## 📚 추가 자료

### 문서
- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0 Documentation](https://docs.sqlalchemy.org/)
- [Pydantic V2 Documentation](https://docs.pydantic.dev/)
- [React Query Documentation](https://tanstack.com/query/latest)

### 내부 문서
- [프로젝트 가이드](../Project_Guide.md)
- [기술 아키텍처](../Technical_Architecture.md)
- [인증 및 보안](../Authentication_and_Security.md)
- [UI/UX 설계](../UI_UX_Design.md)

### 연락처
- Slack: #a2g-platform-dev
- 담당자: syngha.han@company.com

---

**© 2025 A2G Platform 개발팀**
