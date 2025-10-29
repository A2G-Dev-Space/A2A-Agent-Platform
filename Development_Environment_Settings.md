# 🚀 A2G Platform 개발 환경 설정 종합 가이드

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 28일
**대상**: A2G Platform 개발팀 전원

---

## 📌 목차

1. [개요 및 아키텍처](#1-개요-및-아키텍처)
2. [30분 빠른 시작 가이드](#2-30분-빠른-시작-가이드)
3. [팀 구성 및 역할](#3-팀-구성-및-역할)
4. [데이터베이스 설정](#4-데이터베이스-설정)
5. [서브레포지토리 구조](#5-서브레포지토리-구조)
6. [Git Submodules 워크플로우](#6-git-submodules-워크플로우)
7. [Mock 서비스 구현](#7-mock-서비스-구현)
8. [외부 개발 환경](#8-외부-개발-환경)
9. [Sprint 계획 및 개발 워크플로우](#9-sprint-계획-및-개발-워크플로우)
10. [환경별 설정 관리](#10-환경별-설정-관리)
11. [마이그레이션 및 배포](#11-마이그레이션-및-배포)
12. [문제 해결 가이드](#12-문제-해결-가이드)

---

## 1. 개요 및 아키텍처

### 1.1 프로젝트 개요

**A2G Agent Platform**은 LLM 기반 에이전트를 개발, 테스트, 배포, 모니터링할 수 있는 마이크로서비스 플랫폼입니다.

- **개발 기간**: 6주 (Sprint 0-4)
- **팀 규모**: 4명 개발자
- **아키텍처**: 마이크로서비스 (Multi-Repository)
- **개발 환경**: 외부 개발 + 내부 통합 (하이브리드)

### 1.2 기술 스택

**백엔드** (모든 서비스 Python):
- FastAPI (REST API, WebSocket)
- Celery (비동기 작업)
- **uv** (패키지 관리 - pip/poetry 아님)
- PostgreSQL (데이터베이스)
- Redis (메시지 브로커, 캐시)
- Alembic (DB 마이그레이션)
- LangChain (RAG, Top-K 추천)

**프론트엔드**:
- React 19 + TypeScript
- Vite (빌드 도구)
- Zustand (상태 관리)
- Tailwind CSS + MUI
- Socket.IO (WebSocket)

**인프라**:
- Docker + Docker Compose
- Nginx (API Gateway)
- Mock SSO (개발용)

### 1.3 전체 시스템 아키텍처

```
┌─────────────────────── 외부 개발 환경 (사외망) ────────────────────────┐
│                                                                         │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐              │
│  │   Frontend    │   │ Backend APIs │   │   Workers    │              │
│  │ (React SPA)   │   │  (FastAPI)   │   │  (Celery)   │              │
│  │  Port: 9060   │   │ Ports: 8001- │   │              │              │
│  └──────┬────────┘   └──────┬───────┘   └──────┬───────┘              │
│         │                   │                   │                      │
│         └───────────────────┴───────────────────┘                      │
│                             │                                          │
│         ┌───────────────────▼───────────────────────────┐             │
│         │          Mock Services (Docker)               │             │
│         │  ┌──────────┐  ┌──────────┐  ┌──────────┐   │             │
│         │  │ Mock SSO │  │PostgreSQL │  │  Redis   │   │             │
│         │  │Port: 9999│  │Port: 5432│  │Port: 6379│   │             │
│         │  └──────────┘  └──────────┘  └──────────┘   │             │
│         └────────────────────────────────────────────────┘             │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

                          ⬇️ Git Push/Pull

┌─────────────────────── 내부 통합 환경 (사내망) ────────────────────────┐
│                                                                         │
│         ┌─────────────────────────────────────────────┐               │
│         │      Production/Staging Environment         │               │
│         │  ┌──────────┐  ┌──────────┐  ┌──────────┐  │               │
│         │  │ Real SSO │  │ Real DB  │  │Real Redis│  │               │
│         │  │(Company) │  │(Company) │  │(Company) │  │               │
│         │  └──────────┘  └──────────┘  └──────────┘  │               │
│         └─────────────────────────────────────────────┘               │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. 30분 빠른 시작 가이드

### 전제 조건

- Docker Desktop 설치 완료
- Python 3.11+ 설치
- Node.js 18+ 설치
- Git 설치
- uv 패키지 매니저 설치 (`pip install uv`)

### Step 1: Docker로 인프라 서비스 실행 (5분)

```bash
# Docker Desktop 실행 확인
docker --version

# PostgreSQL 실행
docker run -d \
  --name a2g-postgres-dev \
  -e POSTGRES_USER=dev_user \
  -e POSTGRES_PASSWORD=dev_password \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  postgres:15-alpine

# Redis 실행
docker run -d \
  --name a2g-redis-dev \
  -p 6379:6379 \
  redis:7-alpine

# Mock SSO 실행 (선택사항, 나중에 구축 가능)
# docker compose -f docker-compose.external.yml up -d mock-sso

# 실행 확인
docker ps
```

### Step 2: 데이터베이스 생성 (5분)

```bash
# PostgreSQL 접속
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres

# 각 서비스별 데이터베이스 생성
CREATE DATABASE user_service_db;
CREATE DATABASE admin_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
\l  -- DB 목록 확인
\q  -- 종료
```

### Step 3: 메인 레포지토리 클론 (5분)

```bash
# 메인 문서 레포지토리 클론
git clone https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 서브모듈 초기화 (각 서비스 레포지토리)
git submodule update --init --recursive
```

### Step 4: 담당 서비스 설정 (10분)

**예시: User Service (DEV1)**

```bash
# 서비스 디렉토리로 이동
cd services/user-service

# Python 환경 설정
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 패키지 설치
uv sync

# 환경 변수 설정
cat > .env.local << EOF
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@postgres:5432/user_service_db
REDIS_URL=redis://redis:6379/0
SERVICE_PORT=8001
JWT_SECRET_KEY=local-dev-secret-key
DEBUG=true
EOF

# docker-compose 네트워크에서 실행 시에는 위와 같이 `postgres`, `redis` 서비스를 직접 참조합니다.
# 만약 FastAPI 앱을 로컬 머신에서 단독으로 실행한다면 `postgres` → `localhost` 로 변경해 주세요.

# DB 마이그레이션
alembic init alembic  # 최초 1회만
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload --port 8001
```

### Step 5: API 테스트 (5분)

```bash
# 헬스 체크
curl http://localhost:8001/health

# API 문서 확인 (브라우저)
open http://localhost:8001/docs  # Swagger UI
```

---

## 3. 팀 구성 및 역할

### 3.1 개발자별 담당 업무

| Developer | Repository | 주요 책임 | 기술 스택 | 포트 |
|-----------|-----------|----------|----------|------|
| **DEV1 (한승하)** | `frontend`<br>`infra`<br>`user-service` | **Frontend 전체 개발**<br>Infra 구축<br>SSO 연동/인증 | React, TypeScript<br>Docker, Nginx<br>FastAPI | 9060<br>9050<br>8001 |
| **DEV2 (이병주)** | `admin-service`<br>`worker-service` | LLM 관리<br>통계 API<br>Celery Tasks | FastAPI<br>Celery | 8005<br>- |
| **DEV3 (김영섭)** | `chat-service`<br>`tracing-service` | WebSocket<br>로그 추적 | FastAPI<br>WebSocket | 8003<br>8004 |
| **DEV4 (안준형)** | `agent-service` | A2A 프로토콜<br>Top-K 추천<br>Registry 통합 | FastAPI<br>LangChain | 8002 |

### 3.2 개발 방식

**Frontend 개발**:
- DEV1이 Frontend의 모든 기능을 단독 개발
- 완성된 Frontend를 다른 팀원들에게 제공

**Backend 개발 및 테스트**:
- 각자 담당한 Backend 서비스를 구현
- DEV1이 제공한 Frontend와 연동 테스트

### 3.3 Sprint 일정

| Sprint | 기간 | 주요 목표 |
|--------|------|----------|
| Sprint 0 | 1주차 | 인프라 구축, Mock 서비스, 레포지토리 설정 |
| Sprint 1 | 2주차 | 핵심 Backend API 구현 |
| Sprint 2 | 3주차 | Frontend 핵심 + Backend 통합 |
| Sprint 3 | 4-5주차 | 고급 기능 + WebSocket |
| Sprint 4 | 6주차 | 통합 테스트, 버그 수정, 배포 |

---

## 4. 데이터베이스 설정

### 4.1 Docker PostgreSQL 설정

```yaml
# docker-compose.external.yml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_local:/var/lib/postgresql/data

volumes:
  postgres_data_local:
```

### 4.2 서비스별 데이터베이스

각 마이크로서비스는 독립된 데이터베이스를 사용합니다:

```sql
-- 데이터베이스 생성
CREATE DATABASE user_service_db;    -- User Service
CREATE DATABASE admin_service_db;   -- Admin Service
CREATE DATABASE agent_service_db;   -- Agent Service
CREATE DATABASE chat_service_db;    -- Chat Service
CREATE DATABASE tracing_service_db; -- Tracing Service
```

### 4.3 SQLAlchemy 설정

**database.py**:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# 환경 변수 로드
env_file = os.getenv("ENV_FILE", ".env.local")
load_dotenv(env_file)

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 4.4 Alembic 마이그레이션

```bash
# 초기화
alembic init alembic

# 마이그레이션 생성
alembic revision --autogenerate -m "Initial migration"

# 마이그레이션 실행
alembic upgrade head

# 히스토리 확인
alembic history

# 롤백
alembic downgrade -1
```

---

## 5. 서브레포지토리 구조

### 5.1 전체 저장소 구조

```
A2G-Dev-Space (GitHub Organization)
│
├── 📚 agent-platform-development/      # 메인 문서 저장소
│
├── 🌐 agent-platform-frontend/        # Frontend (DEV1)
├── 🏗️ agent-platform-infra/          # Infrastructure (DEV1)
├── 👤 agent-platform-user-service/    # User Service (DEV1)
├── ⚙️ agent-platform-admin-service/   # Admin Service (DEV2)
├── 🔄 agent-platform-worker-service/  # Worker Service (DEV2)
├── 💬 agent-platform-chat-service/    # Chat Service (DEV3)
├── 📊 agent-platform-tracing-service/ # Tracing Service (DEV3)
└── 🤖 agent-platform-agent-service/   # Agent Service (DEV4)
```

### 5.2 표준 서비스 구조

```
agent-platform-{service-name}/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 엔트리포인트
│   ├── database.py             # DB 연결
│   ├── models.py               # SQLAlchemy 모델
│   ├── schemas.py              # Pydantic 스키마
│   ├── core/
│   │   ├── config.py
│   │   └── security.py
│   ├── api/
│   │   └── v1/
│   │       └── endpoints/
│   └── utils/
├── alembic/                    # DB 마이그레이션
├── tests/
├── docker/
├── docs/
├── scripts/
├── requirements.txt
├── pyproject.toml
├── .env.local
├── .env.internal
├── .gitignore
└── README.md
```

### 5.3 서브레포 생성 및 초기화

```bash
# GitHub에 레포지토리 생성
gh repo create A2G-Dev-Space/agent-platform-user-service \
  --public --description "User authentication service"

# 로컬 클론 및 초기화
git clone https://github.com/A2G-Dev-Space/agent-platform-user-service.git
cd agent-platform-user-service

# Python 환경 설정
uv venv
source .venv/bin/activate

# 디렉토리 구조 생성
mkdir -p app/api/v1/endpoints app/core app/utils
mkdir -p alembic tests/unit tests/integration
mkdir -p docker docs scripts
```

---

## 6. Git Submodules 워크플로우

### 6.1 Submodules 초기화

```bash
# Main Repository에 Submodules 추가
mkdir -p services
git submodule add https://github.com/A2G-Dev-Space/user-service.git services/user-service
git submodule add https://github.com/A2G-Dev-Space/agent-service.git services/agent-service
# ... 나머지 서비스도 동일

# Commit
git add .gitmodules services/
git commit -m "Add microservice repositories as submodules"
git push origin main
```

### 6.2 Submodules 사용

```bash
# Clone with submodules
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git

# 또는 Clone 후 초기화
git clone https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development
git submodule update --init --recursive

# 모든 Submodules 업데이트
git submodule update --remote --merge

# 특정 Submodule에서 작업
cd services/user-service
git checkout main
git pull origin main
# ... 작업 수행
git push origin main

# Main Repository에 반영
cd ../..
git add services/user-service
git commit -m "Update user-service"
git push origin main
```

### 6.3 주의사항

- Main Repository는 각 Submodule의 특정 Commit Hash를 참조
- Submodule 변경 후 Main Repository도 업데이트 필요
- Detached HEAD 상태 주의 (항상 브랜치 체크아웃)

---

## 7. Mock 서비스 구현

### 7.1 Mock SSO Service

Mock SSO는 사외망에서 회사 SSO를 대체하는 개발용 인증 서비스입니다.

**main.py**:
```python
from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import jwt
import datetime

app = FastAPI(title="Mock SSO Service")
templates = Jinja2Templates(directory="templates")

# 테스트 사용자
MOCK_USERS = {
    "syngha.han": {
        "loginid": "syngha.han",
        "username": "한승하",
        "username_en": "Seungha Han",
        "mail": "syngha.han@example.com",
        "deptname": "AI Platform Team",
    },
    "test.user": {
        "loginid": "test.user",
        "username": "테스트",
        "username_en": "Test User",
        "mail": "test@example.com",
        "deptname": "QA Team",
    },
}

JWT_SECRET = "mock-sso-secret-key-12345"

@app.get("/mock-sso/login", response_class=HTMLResponse)
async def mock_login(request: Request, redirect_uri: str):
    """Mock SSO 로그인 페이지"""
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "users": MOCK_USERS,
            "redirect_uri": redirect_uri,
        }
    )

@app.post("/mock-sso/authenticate")
async def mock_authenticate(
    username: str = Form(...),
    redirect_uri: str = Form(...),
):
    """JWT 토큰 발급 및 리디렉션"""
    user_data = MOCK_USERS[username]

    id_token = jwt.encode(
        {
            **user_data,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    return RedirectResponse(
        url=f"{redirect_uri}?id_token={id_token}",
        status_code=302,
    )
```

### 7.2 Docker Compose 통합

```yaml
# docker-compose.external.yml
version: '3.8'

services:
  mock-sso:
    build: ./mock-sso
    ports:
      - "9999:9999"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass dev_redis_password
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 7.3 Mock 서비스 실행

```bash
# Mock 서비스 시작
cd infra/docker-compose
docker compose -f docker-compose.external.yml up -d

# 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f mock-sso

# 중지
docker compose down

# 데이터 초기화
docker compose down -v
```

---

## 8. 외부 개발 환경

### 8.1 환경 분리 전략

외부(사외망)와 내부(사내망) 환경을 환경 변수로 분리:

**`.env.local`** (외부 개발):
```bash
# Database
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@postgres:5432/user_service_db

# Mock SSO
IDP_ENTITY_ID=http://mock-sso:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9050/api/auth/callback/

# Redis
REDIS_URL=redis://redis:6379/0

# Service
SERVICE_PORT=8001
DEBUG=true
JWT_SECRET_KEY=local-dev-secret-key
```

**`.env.internal`** (사내망):
```bash
# Database (회사 DB)
DATABASE_URL=postgresql+asyncpg://prod_user:${VAULT_PASSWORD}@company-db:5432/prod_db

# Real SSO
IDP_ENTITY_ID=https://sso.company.com/auth
SP_REDIRECT_URL=https://platform.company.com/api/auth/callback/

# Redis (회사 Redis)
REDIS_URL=redis://:${VAULT_REDIS_PASSWORD}@company-redis:6379/0

# Service
SERVICE_PORT=8001
DEBUG=false
JWT_SECRET_KEY=${VAULT_JWT_SECRET}
```

> ✅ **호스트 전환 규칙**: 개발용 Docker Compose에서는 `postgres`, `redis` 서비스 이름을 그대로 사용하고, 운영/스테이징 배포 시에는 위 예시처럼 해당 환경의 엔드포인트로 `DATABASE_URL`, `REDIS_URL`만 교체하면 됩니다.

### 8.2 환경 전환

```bash
# 외부 개발 환경
cp .env.local .env

# 사내망 배포
cp .env.internal .env

# 환경 변수로 설정 파일 지정
ENV_FILE=.env.internal uvicorn app.main:app
```

### 8.3 API Contract 기반 개발

모든 서비스는 OpenAPI 3.0 스펙 제공:

```yaml
# openapi.yaml
openapi: 3.0.0
info:
  title: User Service API
  version: 1.0.0
paths:
  /api/users/:
    get:
      summary: List users
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/User'
```

### 8.4 배포 시 엔드포인트 전환 체크리스트

- [ ] 운영/스테이징 환경의 `DATABASE_URL`, `REDIS_URL` 값을 `.env.internal` 또는 배포 파이프라인 시크릿으로 교체합니다.
- [ ] Redis는 동일한 클러스터를 공유하되 서비스별 DB 번호(`0~7`)를 유지해 충돌을 방지합니다.
- [ ] API Gateway 환경 변수(`USER_SERVICE_URL`, 등)를 해당 환경의 도메인으로 조정합니다.
- [ ] 기타 환경 변수는 기본값을 유지하며, URL만 교체했는지 다시 확인합니다.

---

## 9. Sprint 계획 및 개발 워크플로우

### 9.1 Sprint별 체크리스트

#### Sprint 0 (1주차) - 기반 구축

**DEV1 (한승하)**:
- [ ] Frontend 프로젝트 초기화 (React + Vite)
- [ ] Mock SSO 서버 구현
- [ ] Nginx API Gateway 설정
- [ ] Docker Compose 구성

**DEV2 (이병주)**:
- [ ] Admin Service 프로젝트 생성
- [ ] Worker Service Celery 설정
- [ ] 데이터베이스 스키마 설계

**DEV3 (김영섭)**:
- [ ] Chat Service WebSocket 설정
- [ ] Tracing Service 로그 구조 설계
- [ ] Redis Pub/Sub 테스트

**DEV4 (안준형)**:
- [ ] Agent Service 프로젝트 생성
- [ ] A2A 프로토콜 명세 작성
- [ ] LangChain RAG 설정

#### Sprint 1 (2주차) - 핵심 API

- [ ] User 인증/권한 API
- [ ] Agent CRUD API
- [ ] Chat Session API
- [ ] LLM Model 관리 API

#### Sprint 2 (3주차) - Frontend 통합

- [ ] Frontend 레이아웃 완성
- [ ] API 연동
- [ ] WebSocket 연결
- [ ] 상태 관리 구현

#### Sprint 3 (4-5주차) - 고급 기능

- [ ] Top-K 추천 시스템
- [ ] 실시간 트레이싱
- [ ] 멀티 에이전트 지원
- [ ] 통계 대시보드

#### Sprint 4 (6주차) - 마무리

- [ ] 통합 테스트
- [ ] 성능 최적화
- [ ] 문서 정리
- [ ] 배포 준비

### 9.2 Git 워크플로우

```bash
# Feature 브랜치 생성
git checkout -b feature/TASK-101-user-auth

# 작업 및 커밋
git add .
git commit -m "feat: Add user authentication endpoint"

# Push 및 PR
git push origin feature/TASK-101-user-auth
# GitHub에서 PR 생성

# 코드 리뷰 후 머지
# develop → main 순서로 진행
```

### 9.3 커밋 메시지 규칙

```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 코드
chore: 빌드 관련 수정
```

---

## 10. 환경별 설정 관리

### 10.1 환경 변수 구조

```
각 서비스/
├── .env.example    # 예시 파일 (Git 포함)
├── .env.local      # 로컬 개발 (Git 제외)
├── .env.internal   # 사내망 (Git 제외)
└── .env.test       # 테스트용 (Git 제외)
```

### 10.2 Docker 환경 변수

```yaml
# docker-compose.yml
services:
  user-service:
    env_file:
      - .env.local  # 또는 .env.internal
    environment:
      - SERVICE_NAME=user-service
      - LOG_LEVEL=${LOG_LEVEL:-info}
```

### 10.3 Kubernetes ConfigMap/Secret

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-service-config
data:
  SERVICE_PORT: "8001"
  LOG_LEVEL: "info"

---
# k8s/secret.yaml
apiVersion: v1
kind: Secret
metadata:
  name: user-service-secret
type: Opaque
stringData:
  DATABASE_URL: "postgresql://..."
  JWT_SECRET: "..."
```

---

## 11. 마이그레이션 및 배포

### 11.1 데이터베이스 마이그레이션

#### 개발 환경

```bash
# 마이그레이션 생성
alembic revision --autogenerate -m "Add user table"

# 마이그레이션 실행
alembic upgrade head

# 롤백
alembic downgrade -1

# 마이그레이션 병합 (충돌 시)
alembic merge -m "Merge migrations"
```

#### 운영 배포

```bash
# 배포 스크립트
#!/bin/bash

echo "🚀 A2G Platform 배포 시작"

# 1. 백업
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# 2. 마이그레이션
alembic upgrade head

# 3. 헬스 체크
curl -f http://localhost:8001/health || exit 1

echo "✅ 배포 완료"
```

### 11.2 Docker 이미지 빌드 및 배포

```bash
# 이미지 빌드
docker build -t a2g-user-service:latest .

# 태깅
docker tag a2g-user-service:latest registry.company.com/a2g-user-service:v1.0.0

# 푸시
docker push registry.company.com/a2g-user-service:v1.0.0

# 배포 (Kubernetes)
kubectl set image deployment/user-service \
  user-service=registry.company.com/a2g-user-service:v1.0.0
```

### 11.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          uv sync
          uv run pytest

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build Docker image
        run: docker build -t $IMAGE_TAG .

      - name: Push to registry
        run: docker push $IMAGE_TAG

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: kubectl apply -f k8s/
```

---

## 12. 문제 해결 가이드

### 12.1 자주 발생하는 문제

#### "Connection refused" 에러

**증상**: 데이터베이스 연결 실패
**원인**: PostgreSQL이 실행되지 않음
**해결**:
```bash
# Docker 컨테이너 확인
docker ps | grep postgres

# 재시작
docker start a2g-postgres-dev
```

#### "Database does not exist" 에러

**증상**: 데이터베이스를 찾을 수 없음
**원인**: DB가 생성되지 않음
**해결**:
```bash
# DB 생성
docker exec -it a2g-postgres-dev psql -U dev_user -c "CREATE DATABASE user_service_db;"
```

#### "No module named 'app'" 에러

**증상**: Python 모듈 임포트 실패
**원인**: PYTHONPATH 설정 누락
**해결**:
```bash
# PYTHONPATH 설정
export PYTHONPATH="${PYTHONPATH}:$(pwd)"

# 또는 패키지 설치
uv pip install -e .
```

#### Alembic 마이그레이션 충돌

**증상**: 여러 개발자의 마이그레이션 충돌
**원인**: 동시에 마이그레이션 생성
**해결**:
```bash
# 최신 코드 pull
git pull origin develop

# 마이그레이션 병합
alembic merge -m "Merge migrations"

# 재실행
alembic upgrade head
```

#### Mock SSO 포트 충돌

**증상**: Port 9999 already in use
**원인**: 다른 프로세스가 포트 사용 중
**해결**:
```bash
# 포트 사용 프로세스 확인
lsof -i :9999

# 프로세스 종료
kill -9 <PID>
```

#### JWT 토큰 검증 실패

**증상**: Invalid signature error
**원인**: Mock과 Real SSO 알고리즘 불일치
**해결**: 환경에 따라 HS256/RS256 분기 처리

### 12.2 디버깅 팁

#### 로그 확인

```bash
# Docker 로그
docker logs -f a2g-postgres-dev

# Python 로그 레벨 설정
LOG_LEVEL=debug uvicorn app.main:app

# Celery 로그
celery -A app.worker worker --loglevel=debug
```

#### 데이터베이스 직접 확인

```bash
# PostgreSQL 접속
docker exec -it a2g-postgres-dev psql -U dev_user -d user_service_db

# 테이블 확인
\dt

# 데이터 조회
SELECT * FROM users LIMIT 10;
```

#### API 테스트

```bash
# curl로 테스트
curl -X POST http://localhost:8001/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","email":"test@example.com"}'

# httpie로 테스트
http POST localhost:8001/api/users/ \
  username=test email=test@example.com
```

### 12.3 성능 최적화

#### 데이터베이스 인덱스

```sql
-- 자주 조회되는 컬럼에 인덱스 추가
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_agents_status ON agents(status);
```

#### API 응답 캐싱

```python
from fastapi_cache import FastAPICache
from fastapi_cache.decorator import cache

@app.get("/api/agents/")
@cache(expire=60)  # 60초 캐싱
async def list_agents():
    return await get_all_agents()
```

#### 비동기 처리

```python
# 동기 대신 비동기 사용
async def get_user(user_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"http://user-service/{user_id}")
        return response.json()
```

---

## 📚 참고 자료

### 공식 문서
- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy](https://docs.sqlalchemy.org/)
- [Alembic](https://alembic.sqlalchemy.org/)
- [Docker](https://docs.docker.com/)
- [PostgreSQL](https://www.postgresql.org/docs/)
- [Redis](https://redis.io/documentation)

### 프로젝트 문서
- [Project_Guide.md](./Project_Guide.md) - 프로젝트 개요
- [Technical_Architecture.md](./Technical_Architecture.md) - 시스템 아키텍처
- [UI_UX_Design.md](./UI_UX_Design.md) - UI/UX 가이드

### 도구 및 확장
- VS Code Extensions: Python, Pylance, Docker, GitLens
- Chrome Extensions: React Developer Tools, Redux DevTools

---

## 📞 지원 및 문의

### Slack 채널
- `#a2g-platform-dev` - 일반 개발 문의
- `#a2g-platform-frontend` - Frontend 관련
- `#a2g-platform-backend` - Backend 관련
- `#a2g-platform-infra` - 인프라 관련

### 담당자
- **전체 총괄**: 한승하 (syngha.han) - DEV1
- **Agent Backend**: 안준형 - DEV4
- **DB 지원**: 내부 DBA팀
- **인프라**: DevOps팀

---

**마지막 업데이트**: 2025년 10월 28일
**작성**: A2G Platform Development Team