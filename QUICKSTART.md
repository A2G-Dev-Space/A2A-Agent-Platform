# 🚀 A2G Platform - 빠른 시작 가이드

**첫 실행까지 소요 시간**: ~10분
**필수 사항**: Docker, Node.js 18+, Python 3.11+

---

## 🎯 한 줄 명령어로 시작 (Docker)

```bash
# 저장소 복제 및 모든 서비스 시작
git clone --recursive https://github.com/A2G-Dev-Space/agent-platform-development.git
cd agent-platform-development
docker-compose -f repos/infra/docker-compose.dev.yml up -d
cd frontend && npm install && npm run dev
```

주소: http://localhost:9060

---

## 📋 단계별 설정

### 1. 인프라 시작 (2분)

```bash
# PostgreSQL
docker run -d \
  --name a2g-postgres-dev \
  -e POSTGRES_USER=dev_user \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Redis
docker run -d \
  --name a2g-redis-dev \
  -p 6379:6379 \
  redis:7-alpine

# 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres <<EOF
CREATE DATABASE user_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
CREATE DATABASE admin_service_db;
\q
EOF

# Agent Service용 pgvector 활성화
docker exec -it a2g-postgres-dev psql -U dev_user -d agent_service_db -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Mock SSO 시작 (1분)

```bash
cd repos/infra/mock-sso
pip install fastapi uvicorn python-jose
python main.py &
```

### 3. Frontend 시작 (2분)

```bash
cd frontend
npm install
npm run dev &
```

주소: http://localhost:9060

### 4. 빠른 백엔드 서비스 시작 (선택사항 - 3분)

인증을 위해 최소한 User Service를 실행합니다:

```bash
cd repos/user-service

# Python 환경 설정
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn sqlalchemy asyncpg redis pydantic python-jose passlib httpx alembic

# 설정
cat > .env.local <<EOF
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=local-dev-secret-key
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9060/callback
EOF

# 실행
uvicorn app.main:app --reload --port 8001
```

---

## ✅ 설치 확인

### 1. 서비스 확인

```bash
# 모든 서비스 실행 확인
curl http://localhost:9999/health        # Mock SSO
curl http://localhost:9060               # Frontend
curl http://localhost:8001/health        # User Service (실행한 경우)
```

### 2. 로그인 흐름 테스트

1. http://localhost:9060 접속
2. "Login with SSO" 클릭
3. 테스트 사용자 선택 (예: "한승하 (syngha.han)")
4. 로그인되어야 합니다

### 3. 브라우저 콘솔에서 테스트

```javascript
// 브라우저 콘솔(F12)를 열고 테스트합니다
// 인증 확인
console.log('Token:', localStorage.getItem('accessToken'));

// API 호출 테스트
fetch('/api/health')
  .then(r => r.json())
  .then(console.log)
  .catch(console.error);
```

---

## 🔧 개발 워크플로우

### Frontend 개발만 하는 경우

```bash
# 최소 인프라 시작
docker-compose -f repos/infra/docker-compose.dev.yml up postgres redis mock-sso -d

# Frontend 시작
cd frontend && npm run dev
```

### 백엔드 서비스 개발하는 경우

```bash
# 인프라 시작
docker-compose -f repos/infra/docker-compose.dev.yml up postgres redis -d

# 서비스 개발
cd repos/YOUR-SERVICE
uv venv && source .venv/bin/activate
uv sync
uvicorn app.main:app --reload --port 800X

# Frontend로 테스트
cd frontend && npm run dev
```

### 전체 통합 테스트

```bash
# Docker Compose로 모든 것 시작
docker-compose -f repos/infra/docker-compose.dev.yml up -d

# 로그 모니터링
docker-compose -f repos/infra/docker-compose.dev.yml logs -f

# 모든 것 중지
docker-compose -f repos/infra/docker-compose.dev.yml down
```

---

## 🧪 빠른 테스트 코드

### 인증 테스트
```javascript
// http://localhost:9060의 브라우저 콘솔에서
const login = async () => {
  const res = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect_uri: window.location.origin + '/callback' })
  });
  const data = await res.json();
  window.open(data.sso_login_url);
};
login();
```

### 에이전트 생성 테스트
```javascript
// 로그인 후
const createAgent = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/agents/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Agent',
      description: 'Created from console',
      framework: 'Langchain',
      is_public: true,
      capabilities: { skills: ['chat', 'search'] }
    })
  });
  console.log(await res.json());
};
createAgent();
```

### WebSocket 테스트
```javascript
const testWS = () => {
  const token = localStorage.getItem('accessToken');
  const ws = new WebSocket(`ws://localhost:8003/ws/test-session?token=${token}`);

  ws.onopen = () => console.log('연결됨');
  ws.onmessage = (e) => console.log('메시지:', e.data);
  ws.onerror = (e) => console.error('에러:', e);

  // 테스트 메시지 전송
  setTimeout(() => {
    ws.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
  }, 1000);
};
testWS();
```

---

## 🛠️ 문제 해결

### 포트가 이미 사용 중인 경우
```bash
# 포트를 사용 중인 프로세스 찾기 및 종료
lsof -i :9060  # 또는 다른 포트
kill -9 <PID>
```

### 데이터베이스 연결 실패
```bash
# PostgreSQL 컨테이너 재생성
docker rm -f a2g-postgres-dev
docker run -d --name a2g-postgres-dev ... (1단계의 명령어 사용)
```

### Frontend가 Backend에 연결할 수 없음
```bash
# Backend 실행 확인
curl http://localhost:8001/health

# vite.config.ts의 프록시 확인
# Frontend 재시작: npm run dev
```

### Mock SSO가 작동하지 않음
```bash
# 실행 중인지 확인
curl http://localhost:9999/

# 다시 시작
pkill -f "python main.py"
cd repos/infra/mock-sso && python main.py &
```

---

## 📚 다음 단계

1. **문서 읽기**:
   - [프로젝트 가이드](Project_Guide.md)
   - [기술 아키텍처](Technical_Architecture.md)
   - [서브모듈 개발 가이드](repos/SUBMODULE_DEVELOPMENT_GUIDE.md)

2. **Frontend 탐색**:
   - Workbench 모드: http://localhost:9060/workbench
   - Hub 모드: http://localhost:9060/hub
   - Flow 모드: http://localhost:9060/flow

3. **서비스 개발**:
   - repos/에서 서비스 선택
   - 각 서비스 폴더의 README 따르기
   - Frontend로 즉시 테스트

---

## 🎉 성공 체크리스트

- [ ] Frontend가 http://localhost:9060에서 로드됨
- [ ] Mock SSO로 로그인 가능
- [ ] Workbench/Hub/Flow 모드 간 네비게이션 가능
- [ ] 새 에이전트 생성 가능 (백엔드 서비스 실행 시)
- [ ] 브라우저 콘솔에 주요 오류 없음

---

**도움이 필요하신가요?**
- Slack: #a2g-platform-dev
- 담당자: syngha.han@company.com

**즐거운 코딩! 🚀**