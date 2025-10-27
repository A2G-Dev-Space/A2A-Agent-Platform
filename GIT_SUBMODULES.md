# 🔗 Git Submodules 설정 가이드

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일

---

## 1. 개요 (Overview)

A2G Agent Platform은 **Main Repository**와 **7개의 Sub-repositories**로 구성됩니다. Git Submodules를 사용하여 Main Repository에 각 서비스 repository를 포함하고, 독립적으로 개발/배포할 수 있도록 합니다.

### 1.1. Repository 구조

```
Agent-Platform-Development (Main Repository)
├── .gitmodules
├── services/
│   ├── user-service/          (Submodule)
│   ├── agent-service/         (Submodule)
│   ├── chat-service/          (Submodule)
│   ├── tracing-service/       (Submodule)
│   ├── admin-service/         (Submodule)
│   ├── worker-service/        (Submodule)
│   └── infra-service/         (Submodule)
├── frontend/                  (Main Repo에 포함)
├── docs/                      (Main Repo에 포함)
├── docker-compose.yml
└── README.md
```

### 1.2. Submodule vs Main Repository

| 항목 | Main Repository | Sub-repositories |
|------|----------------|------------------|
| **목적** | 전체 플랫폼 통합 관리 | 개별 서비스 독립 개발 |
| **포함 내용** | Frontend, Docs, Infra 설정 | 각 마이크로서비스 코드 |
| **개발자** | 모든 개발자 (통합) | 담당 개발자 (서비스별) |
| **배포 단위** | 전체 플랫폼 | 개별 서비스 |
| **Git 주소** | `A2G-Dev-Space/Agent-Platform-Development` | `A2G-Dev-Space/user-service`, etc. |

---

## 2. Sub-repositories 생성

### 2.1. GitHub Organization에 Repository 생성

**Organization**: `A2G-Dev-Space`

**생성할 Repositories**:

1. `user-service` - User 인증, 권한 관리, API Key 관리 (DEV2)
2. `agent-service` - Agent CRUD, A2A 프로토콜, AI 랭킹 (DEV1)
3. `chat-service` - Chat 세션/메시지 관리, WebSocket (DEV3)
4. `tracing-service` - LLM 로그 프록시, Trace 데이터 저장 (DEV1)
5. `admin-service` - LLM 모델 관리, 사용자 통계 (DEV2)
6. `worker-service` - Celery 비동기 작업, 헬스 체크 (DEV4)
7. `infra-service` - Mock SSO, 인프라 설정 (DEV4)

**각 Repository 생성 명령** (GitHub CLI):
```bash
gh repo create A2G-Dev-Space/user-service --private --description "User Service: 인증, 권한 관리, API Key"
gh repo create A2G-Dev-Space/agent-service --private --description "Agent Service: Agent CRUD, A2A, AI 랭킹"
gh repo create A2G-Dev-Space/chat-service --private --description "Chat Service: 채팅 세션/메시지, WebSocket"
gh repo create A2G-Dev-Space/tracing-service --private --description "Tracing Service: LLM 로그 프록시, Trace 데이터"
gh repo create A2G-Dev-Space/admin-service --private --description "Admin Service: LLM 관리, 사용자 통계"
gh repo create A2G-Dev-Space/worker-service --private --description "Worker Service: Celery 비동기 작업"
gh repo create A2G-Dev-Space/infra-service --private --description "Infra Service: Mock SSO, 인프라 설정"
```

### 2.2. 각 Repository 초기화

각 서비스 repository에 기본 구조를 생성합니다.

**예시: user-service**:
```bash
mkdir user-service && cd user-service
git init
git remote add origin https://github.com/A2G-Dev-Space/user-service.git

# 기본 FastAPI 구조 생성
mkdir -p app/{api,core,models,services}
touch app/__init__.py
touch app/main.py
touch requirements.txt
touch Dockerfile
touch .env.example
touch README.md

# 초기 commit
git add .
git commit -m "Initial commit: user-service structure"
git branch -M main
git push -u origin main
```

**모든 서비스에 대해 동일한 구조 적용** (DEV1-4가 각자 담당 서비스 초기화).

---

## 3. Main Repository에 Submodules 추가

### 3.1. Main Repository Clone

```bash
git clone https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development
```

### 3.2. Submodules 추가

```bash
# services 디렉토리 생성
mkdir -p services

# 각 서비스를 submodule로 추가
git submodule add https://github.com/A2G-Dev-Space/user-service.git services/user-service
git submodule add https://github.com/A2G-Dev-Space/agent-service.git services/agent-service
git submodule add https://github.com/A2G-Dev-Space/chat-service.git services/chat-service
git submodule add https://github.com/A2G-Dev-Space/tracing-service.git services/tracing-service
git submodule add https://github.com/A2G-Dev-Space/admin-service.git services/admin-service
git submodule add https://github.com/A2G-Dev-Space/worker-service.git services/worker-service
git submodule add https://github.com/A2G-Dev-Space/infra-service.git services/infra-service
```

### 3.3. .gitmodules 파일 확인

위 명령 실행 후 `.gitmodules` 파일이 자동 생성됩니다:

```ini
[submodule "services/user-service"]
	path = services/user-service
	url = https://github.com/A2G-Dev-Space/user-service.git
[submodule "services/agent-service"]
	path = services/agent-service
	url = https://github.com/A2G-Dev-Space/agent-service.git
[submodule "services/chat-service"]
	path = services/chat-service
	url = https://github.com/A2G-Dev-Space/chat-service.git
[submodule "services/tracing-service"]
	path = services/tracing-service
	url = https://github.com/A2G-Dev-Space/tracing-service.git
[submodule "services/admin-service"]
	path = services/admin-service
	url = https://github.com/A2G-Dev-Space/admin-service.git
[submodule "services/worker-service"]
	path = services/worker-service
	url = https://github.com/A2G-Dev-Space/worker-service.git
[submodule "services/infra-service"]
	path = services/infra-service
	url = https://github.com/A2G-Dev-Space/infra-service.git
```

### 3.4. Commit 및 Push

```bash
git add .gitmodules services/
git commit -m "Add 7 microservice repositories as submodules"
git push origin main
```

---

## 4. Submodules 사용법

### 4.1. Main Repository Clone (with Submodules)

**방법 1: Clone 시 Submodules도 함께**
```bash
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
```

**방법 2: Clone 후 Submodules 초기화**
```bash
git clone https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development
git submodule update --init --recursive
```

### 4.2. Submodule 업데이트 (최신 코드 가져오기)

**모든 Submodules 업데이트**:
```bash
git submodule update --remote --merge
```

**특정 Submodule 업데이트**:
```bash
cd services/user-service
git pull origin main
cd ../..
```

### 4.3. Submodule 내에서 작업

**Submodule로 이동**:
```bash
cd services/user-service
```

**일반적인 Git 작업 수행**:
```bash
# 브랜치 생성
git checkout -b feature/add-api-key-management

# 코드 수정 후 commit
git add .
git commit -m "feat: Add API key generation endpoint"

# Push to sub-repository
git push origin feature/add-api-key-management
```

**Main Repository로 돌아가기**:
```bash
cd ../..
```

### 4.4. Main Repository에서 Submodule 변경사항 반영

Submodule에서 작업한 내용을 Main Repository에 반영하려면:

```bash
# Submodule 업데이트 후
cd services/user-service
git pull origin main
cd ../..

# Main Repository에 변경사항 commit
git add services/user-service
git commit -m "Update user-service to latest version"
git push origin main
```

---

## 5. 개발 워크플로우

### 5.1. DEV2 (User Service 담당) 예시

**1) Sub-repository에서 작업**:
```bash
# Sub-repository clone
git clone https://github.com/A2G-Dev-Space/user-service.git
cd user-service

# 브랜치 생성
git checkout -b feature/sso-integration

# 코드 개발
# ... (FastAPI 코드 작성)

# Commit & Push
git add .
git commit -m "feat: Implement SSO callback handler"
git push origin feature/sso-integration

# Pull Request 생성
gh pr create --title "SSO Integration" --body "사내 SSO 연동 구현"
```

**2) Main Repository 업데이트** (통합 시):
```bash
# Main repository clone (Submodules 포함)
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# User Service submodule 업데이트
cd services/user-service
git pull origin main
cd ../..

# Main Repository에 반영
git add services/user-service
git commit -m "Update user-service: SSO integration"
git push origin main
```

### 5.2. 4명 병렬 개발 시나리오

**Sprint 1 시작**:
```bash
# DEV1: agent-service 작업
cd services/agent-service
git checkout -b sprint1/agent-crud
# ... 개발

# DEV2: user-service 작업
cd services/user-service
git checkout -b sprint1/sso-auth
# ... 개발

# DEV3: chat-service 작업
cd services/chat-service
git checkout -b sprint1/websocket
# ... 개발

# DEV4: infra-service 작업
cd services/infra-service
git checkout -b sprint1/mock-sso
# ... 개발
```

**각자 독립적으로 Push → Pull Request → Merge → Main Repository 업데이트**

---

## 6. Docker Compose와 Submodules 통합

### 6.1. Main Repository의 docker-compose.yml

Main Repository에서 모든 서비스를 실행할 수 있도록 docker-compose.yml 작성:

```yaml
version: '3.8'

services:
  user-service:
    build:
      context: ./services/user-service
      dockerfile: Dockerfile
    ports:
      - "8001:8000"
    env_file:
      - ./services/user-service/.env
    depends_on:
      - postgres
      - redis

  agent-service:
    build:
      context: ./services/agent-service
      dockerfile: Dockerfile
    ports:
      - "8002:8000"
    env_file:
      - ./services/agent-service/.env
    depends_on:
      - postgres
      - redis

  chat-service:
    build:
      context: ./services/chat-service
      dockerfile: Dockerfile
    ports:
      - "8003:8000"
    env_file:
      - ./services/chat-service/.env
    depends_on:
      - postgres
      - redis

  tracing-service:
    build:
      context: ./services/tracing-service
      dockerfile: Dockerfile
    ports:
      - "8004:8000"
    env_file:
      - ./services/tracing-service/.env
    depends_on:
      - postgres
      - redis

  admin-service:
    build:
      context: ./services/admin-service
      dockerfile: Dockerfile
    ports:
      - "8005:8000"
    env_file:
      - ./services/admin-service/.env
    depends_on:
      - postgres
      - redis

  worker-service:
    build:
      context: ./services/worker-service
      dockerfile: Dockerfile
    env_file:
      - ./services/worker-service/.env
    depends_on:
      - redis

  infra-service:
    build:
      context: ./services/infra-service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"  # Mock SSO
    env_file:
      - ./services/infra-service/.env

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "9060:9060"
    depends_on:
      - user-service
      - agent-service
      - chat-service

  nginx:
    image: nginx:latest
    ports:
      - "9050:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - user-service
      - agent-service
      - chat-service
      - tracing-service
      - admin-service
      - frontend

  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: a2g
      POSTGRES_PASSWORD: a2g_password
      POSTGRES_DB: a2g_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 6.2. 전체 플랫폼 실행

```bash
# Main Repository에서
docker-compose up --build
```

---

## 7. Submodule 관리 명령어 요약

### 7.1. 자주 사용하는 명령어

```bash
# 1. Submodules 초기화 (처음 clone 후)
git submodule update --init --recursive

# 2. 모든 Submodules 업데이트
git submodule update --remote --merge

# 3. 특정 Submodule 업데이트
cd services/user-service
git pull origin main
cd ../..

# 4. Submodule 상태 확인
git submodule status

# 5. Submodule 변경사항 Main Repository에 반영
git add services/user-service
git commit -m "Update user-service"
git push origin main

# 6. Submodule 삭제 (필요 시)
git submodule deinit services/user-service
git rm services/user-service
rm -rf .git/modules/services/user-service
```

### 7.2. Submodule 브랜치 추적

특정 브랜치를 추적하도록 설정:

```bash
# .gitmodules 파일 수정
[submodule "services/user-service"]
	path = services/user-service
	url = https://github.com/A2G-Dev-Space/user-service.git
	branch = main  # 추적할 브랜치 지정

# 업데이트
git submodule update --remote --merge
```

---

## 8. 주의사항

### 8.1. Submodule Commit Hash

- Main Repository는 각 Submodule의 **특정 Commit Hash**를 참조합니다.
- Submodule이 업데이트되어도 Main Repository에서 명시적으로 반영하지 않으면 이전 버전을 계속 참조합니다.
- **항상 `git submodule update --remote`로 최신 상태를 유지**하세요.

### 8.2. Detached HEAD 문제

Submodule 디렉토리로 이동하면 "detached HEAD" 상태가 될 수 있습니다.

**해결 방법**:
```bash
cd services/user-service
git checkout main
```

### 8.3. Submodule 변경사항 Push 전 Main Repository Push 방지

Submodule에서 변경사항을 Push하지 않고 Main Repository를 Push하면, 다른 개발자가 해당 Commit을 가져올 수 없습니다.

**권장 워크플로우**:
1. Submodule에서 작업
2. Submodule Push
3. Main Repository에서 Submodule 업데이트
4. Main Repository Push

---

## 9. CI/CD 통합

### 9.1. GitHub Actions 예시

**.github/workflows/ci.yml** (Main Repository):
```yaml
name: CI Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-services:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout with submodules
        uses: actions/checkout@v3
        with:
          submodules: recursive

      - name: Build all services
        run: docker-compose build

      - name: Run tests
        run: docker-compose up -d && docker-compose exec -T user-service pytest
```

### 9.2. 개별 Sub-repository CI

각 Sub-repository에도 독립적인 CI를 설정:

**user-service/.github/workflows/ci.yml**:
```yaml
name: User Service CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: pip install -r requirements.txt
      - name: Run tests
        run: pytest
```

---

## 10. 문의

- **Git Submodules 관련 이슈**: GitHub Issues에 `[Submodule]` 태그로 등록
- **책임자**: 한승하 (syngha.han@samsung.com)

---

**다음 단계**: [ARCHITECTURE.md](./ARCHITECTURE.md)에서 Sub-repository 구조 확인
