# 🏗️ A2G Platform - Microservice Architecture

**문서 버전**: 2.0
**최종 수정일**: 2025년 10월 27일
**개발 기간**: 6주 (Sprint 0~4)
**개발 인원**: 4명 (DEV1: 능숙한 개발자, SPRINT 담당)

---

## 📋 목차

1. [전체 아키텍처 개요](#1-전체-아키텍처-개요)
2. [Microservices 구성](#2-microservices-구성)
3. [Multi-Repository 구조](#3-multi-repository-구조)
4. [API 게이트웨이 및 라우팅](#4-api-게이트웨이-및-라우팅)
5. [A2A 프로토콜 및 Agent 관리](#5-a2a-프로토콜-및-agent-관리)
6. [Top-K Agent 추천 시스템](#6-top-k-agent-추천-시스템)
7. [데이터 플로우](#7-데이터-플로우)
8. [외부 개발 환경](#8-외부-개발-환경)

---

## 1. 전체 아키텍처 개요

### 1.1 Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              사외망 (External Network)                         │
│                                                                                │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         Frontend (React SPA)                            │ │
│  │                    http://localhost:9060                                │ │
│  └────────────────────────────┬────────────────────────────────────────────┘ │
│                               │                                               │
│                               ▼                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                    API Gateway (Nginx / FastAPI)                        │ │
│  │                       https://localhost:9050                            │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Routes:                                                         │  │ │
│  │  │  - /api/auth/*      → user-service:8001                         │  │ │
│  │  │  - /api/users/*     → user-service:8001                         │  │ │
│  │  │  - /api/agents/*    → agent-service:8002                        │  │ │
│  │  │  - /api/chat/*      → chat-service:8003                         │  │ │
│  │  │  - /api/tracing/*   → tracing-service:8004                      │  │ │
│  │  │  - /api/admin/*     → admin-service:8005                        │  │ │
│  │  │  - /ws/*            → chat-service:8003 (WebSocket)             │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────┬────────────────────────────────────────────┘ │
│                               │                                               │
│        ┌──────────────────────┴──────────────────────┐                       │
│        ▼                      ▼                      ▼                       │
│  ┌──────────┐         ┌──────────┐          ┌──────────┐                    │
│  │  User    │         │  Agent   │          │   Chat   │                    │
│  │ Service  │         │ Service  │          │ Service  │                    │
│  │  :8001   │         │  :8002   │          │  :8003   │                    │
│  │          │         │          │          │          │                    │
│  │ - SSO    │         │ - CRUD   │          │ - Session│                    │
│  │ - Auth   │         │ - A2A    │          │ - Message│                    │
│  │ - RBAC   │         │ - Top-K  │          │ - WebSock│                    │
│  │ - APIKey │         │ - RAG    │          │ - Files  │                    │
│  └────┬─────┘         └────┬─────┘          └────┬─────┘                    │
│       │                    │                     │                           │
│       │                    │                     │                           │
│  ┌────▼──────────────────────▼─────────────────▼─────┐                      │
│  │              PostgreSQL (localhost:5432)          │                      │
│  │         agent_dev_platform_local (External)       │                      │
│  └───────────────────────────────────────────────────┘                      │
│                                                                                │
│  ┌──────────┐         ┌──────────┐          ┌──────────┐                    │
│  │ Tracing  │         │  Admin   │          │  Worker  │                    │
│  │ Service  │         │ Service  │          │ Service  │                    │
│  │  :8004   │         │  :8005   │          │ (Celery) │                    │
│  │          │         │          │          │          │                    │
│  │ - LogPrxy│         │ - LLM    │          │ - Health │                    │
│  │ - Trace  │         │ - Stats  │          │ - Cleanup│                    │
│  │ - Multi  │         │ - Users  │          │ - Notify │                    │
│  └────┬─────┘         └──────────┘          └────┬─────┘                    │
│       │                                           │                           │
│       └───────────────────┬───────────────────────┘                           │
│                           ▼                                                   │
│  ┌─────────────────────────────────────────────────┐                         │
│  │         Redis (localhost:6379)                  │                         │
│  │  - Celery Broker                                │                         │
│  │  - Pub/Sub (WebSocket)                          │                         │
│  │  - Cache                                        │                         │
│  └─────────────────────────────────────────────────┘                         │
│                                                                                │
│  ┌─────────────────────────────────────────────────┐                         │
│  │         Mock SSO (FastAPI :9999)                │                         │
│  │  - Login Page                                   │                         │
│  │  - JWT Token Issuer                             │                         │
│  └─────────────────────────────────────────────────┘                         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

                        ⬇️  Git Push/Pull (Code Transfer)

┌────────────────────────────────────────────────────────────────────────────────┐
│                              사내망 (Internal Network)                          │
│                                                                                │
│  ┌─────────────────────────────────────────────────┐                         │
│  │         Production Environment                  │                         │
│  │  - Real SSO (company.com)                       │                         │
│  │  - Production DB (a2g-db.com:5432)              │                         │
│  │  - Production Redis (redis.company.com:6379)    │                         │
│  └─────────────────────────────────────────────────┘                         │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Microservices 구성

### 2.1 서비스 개요

| # | 서비스명 | 기술 스택 | 포트 | 주요 책임 | Repository |
|---|---------|---------|------|----------|------------|
| 1 | **Frontend** | React 19, TypeScript, Vite | 9060 | UI/UX, SPA | `agent-platform-frontend` |
| 2 | **API Gateway** | Nginx (또는 FastAPI) | 9050 | SSL, 라우팅, 인증 | `agent-platform-infra` |
| 3 | **User Service** | FastAPI (Python) | 8001 | SSO, 인증, RBAC, API Key | `agent-platform-user-service` |
| 4 | **Agent Service** | FastAPI (Python) | 8002 | Agent CRUD, A2A, Top-K 추천 | `agent-platform-agent-service` |
| 5 | **Chat Service** | FastAPI (Python) | 8003 | Session, Message, WebSocket | `agent-platform-chat-service` |
| 6 | **Tracing Service** | FastAPI (Python) | 8004 | Log Proxy, Trace, Multi-Agent | `agent-platform-tracing-service` |
| 7 | **Admin Service** | FastAPI (Python) | 8005 | LLM 관리, 통계, User 관리 | `agent-platform-admin-service` |
| 8 | **Worker Service** | Celery (Python) | - | Health Check, Cleanup, Notify | `agent-platform-worker-service` |

**중요**: 모든 Backend 서비스는 **Python (FastAPI/Celery)**로 통일합니다.

---

### 2.2 서비스별 상세 기능

#### 2.2.1 User Service

**책임**: 사용자 인증 및 권한 관리

**API Endpoints**:
```
POST   /api/auth/login         - SSO 로그인 시작
POST   /api/auth/callback      - SSO 콜백 처리
GET    /api/auth/logout        - 로그아웃
GET    /api/users              - 사용자 목록 (ADMIN)
PATCH  /api/users/{id}/role    - 역할 변경 (ADMIN)
POST   /api/keys               - API Key 생성
GET    /api/keys/active        - 활성 API Key 조회
```

**Database Models**:
- `User`: username, email, role (PENDING/USER/ADMIN), 부서 정보
- `APIKey`: key, user_id, created_at

---

#### 2.2.2 Agent Service ⭐ (핵심)

**책임**: A2A 프로토콜 기반 Agent 관리, Top-K 추천

**API Endpoints**:
```
# Agent CRUD
GET    /api/agents              - Agent 목록 조회
GET    /api/agents/my           - 내 Agent 조회
POST   /api/agents              - Agent 생성
PATCH  /api/agents/{id}         - Agent 수정
DELETE /api/agents/{id}         - Agent 삭제

# A2A Protocol (신규)
POST   /api/agents/a2a/register - A2A 프로토콜로 Agent 등록
                                 (Agno, ADK, Langchain-agent 지원)
POST   /api/agents/{id}/deploy  - 운영 전환 (A2A 엔드포인트 검증)

# Top-K Agent 추천 (신규)
POST   /api/agents/recommend    - Top-K Agent 추천
                                 Input: user_query, k (default: 5)
                                 Output: Top-K agents sorted by relevance
```

**Database Models**:
- `Agent`:
  - `id`, `name`, `description`, `framework` (Agno/ADK/Langchain/Custom)
  - `status` (DEVELOPMENT/PRODUCTION/DISABLED)
  - `a2a_endpoint` (A2A 프로토콜 엔드포인트)
  - `capabilities` (JSON: Agent가 수행 가능한 작업 목록)
  - `embedding_vector` (RAG용 임베딩)
  - `owner_id`, `created_at`, `updated_at`

**핵심 기능**:

1. **A2A 프로토콜 통합**:
   - Agno, ADK, Langchain-agent를 A2A 표준 인터페이스로 통합
   - Agent 등록 시 A2A 엔드포인트 자동 검증
   - 운영 전환 시 A2A 헬스 체크

2. **Top-K Agent 추천 시스템**:
   - **Input**: 사용자 쿼리 (예: "고객 문의 답변 에이전트가 필요해")
   - **Process**:
     1. 사용자 쿼리를 임베딩 벡터로 변환 (OpenAI Embeddings)
     2. Agent.capabilities + description을 벡터 DB에서 유사도 검색
     3. 활성 상태(status=PRODUCTION)이고 헬스한 Agent만 필터링
     4. Top-K개 반환 (유사도 순)
   - **Output**:
     ```json
     {
       "query": "고객 문의 답변 에이전트가 필요해",
       "recommendations": [
         {
           "agent": { /* Agent 객체 */ },
           "similarity_score": 0.94,
           "match_reasons": ["customer support", "Q&A"]
         }
       ]
     }
     ```

**기술 스택**:
- FastAPI
- LangChain (RAG)
- FAISS (Vector DB) 또는 Pinecone
- OpenAI Embeddings

---

#### 2.2.3 Chat Service

**책임**: 채팅 세션 관리, WebSocket 실시간 통신

**API Endpoints**:
```
POST   /api/chat/sessions       - 세션 생성 (trace_id 자동 생성)
GET    /api/chat/sessions       - 세션 목록
GET    /api/chat/sessions/{id}  - 세션 상세 (메시지 포함)
DELETE /api/chat/sessions/{id}  - 세션 삭제
POST   /api/chat/messages       - 메시지 생성
POST   /api/chat/files          - 파일 업로드

# WebSocket
WS     /ws/trace/{trace_id}     - 실시간 Trace Log 수신
```

**Database Models**:
- `ChatSession`: id, agent_id, user_id, trace_id, created_at
- `ChatMessage`: id, session_id, role (user/assistant), content, attachments

---

#### 2.2.4 Tracing Service

**책임**: LLM 호출 로그 프록시, Trace 데이터 관리

**API Endpoints**:
```
POST   /api/log-proxy/{trace_id}/chat/completions  - LLM 프록시
GET    /api/tracing/logs?trace_id=<uuid>           - Trace 로그 조회
```

**핵심 기능**:
- LLM 호출을 중계하며 요청/응답 로그 저장
- Multi-Agent 추적 (agent_id 자동 추론)
- Redis Pub/Sub으로 Chat Service에 실시간 로그 전송

---

#### 2.2.5 Admin Service

**책임**: LLM 모델 관리, 사용량 통계

**API Endpoints**:
```
GET    /api/admin/llm-models           - LLM 목록
POST   /api/admin/llm-models           - LLM 등록
GET    /api/admin/llm-models/available - 사용 가능 LLM
GET    /api/admin/stats/llm-usage      - LLM 사용량 통계
```

---

#### 2.2.6 Worker Service

**책임**: 비동기 작업 (Celery)

**주요 Task**:
- `check_llm_health`: LLM 헬스 체크 (5분마다)
- `check_agent_health`: Agent 헬스 체크 (10분마다)
- `cleanup_inactive_agents`: 비활성 Agent 정리 (매일)

---

## 3. Sub-Repository 구조 (Git Submodules)

### 3.1 Main Repository + Sub-repositories

기존 Mono-repo 구조를 폐기하고, **Main Repository**에 **7개의 Sub-repositories**를 Git Submodules로 포함합니다.

```
Agent-Platform-Development (Main Repository)
├── .gitmodules                          # Submodule 설정 파일
├── docker-compose.yml                   # 전체 플랫폼 실행
├── nginx.conf                           # API Gateway 설정
├── .env.external                        # 사외망 환경 변수
├── .env.internal                        # 사내망 환경 변수
├── README.md
├── docs/                                # 문서 (Main Repo에 포함)
│   ├── ARCHITECTURE.md
│   ├── SRS.md
│   ├── BLUEPRINT.md
│   ├── API_CONTRACTS.md
│   ├── GLOSSARY.md
│   ├── GIT_SUBMODULES.md
│   ├── DEVELOPMENT_GUIDE.md
│   ├── DEV_ENVIRONMENT.md
│   └── MOCK_SERVICES.md
│
├── frontend/                            # Frontend (Main Repo에 포함)
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── README.md
│
└── services/                            # Submodules 디렉토리
    ├── user-service/                    ⭐ Submodule
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── models.py
    │   │   ├── routers/
    │   │   └── services/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    ├── agent-service/                   ⭐ Submodule
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── models.py
    │   │   ├── a2a/              # A2A 프로토콜
    │   │   ├── recommender/      # Top-K 추천
    │   │   └── routers/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    ├── chat-service/                    ⭐ Submodule
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── models.py
    │   │   ├── websocket/        # WebSocket 처리
    │   │   └── routers/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    ├── tracing-service/                 ⭐ Submodule
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── log_proxy.py      # LLM 프록시
    │   │   ├── agent_transfer.py # Agent 전환 감지
    │   │   └── routers/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    ├── admin-service/                   ⭐ Submodule
    │   ├── app/
    │   │   ├── main.py
    │   │   ├── models.py
    │   │   ├── stats/            # 사용량 통계
    │   │   └── routers/
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    ├── worker-service/                  ⭐ Submodule
    │   ├── tasks/
    │   │   ├── health_check.py
    │   │   ├── cleanup.py
    │   │   └── notify.py
    │   ├── celery_app.py
    │   ├── requirements.txt
    │   ├── Dockerfile
    │   └── README.md
    │
    └── infra-service/                   ⭐ Submodule
        ├── mock_sso/
        │   ├── main.py           # Mock SSO FastAPI
        │   └── templates/
        ├── docker-compose/
        ├── nginx/
        └── README.md
```

### 3.2 .gitmodules 파일

Main Repository에 자동 생성되는 `.gitmodules` 파일:

```ini
[submodule "services/user-service"]
	path = services/user-service
	url = https://github.com/A2G-Dev-Space/user-service.git
	branch = main
[submodule "services/agent-service"]
	path = services/agent-service
	url = https://github.com/A2G-Dev-Space/agent-service.git
	branch = main
[submodule "services/chat-service"]
	path = services/chat-service
	url = https://github.com/A2G-Dev-Space/chat-service.git
	branch = main
[submodule "services/tracing-service"]
	path = services/tracing-service
	url = https://github.com/A2G-Dev-Space/tracing-service.git
	branch = main
[submodule "services/admin-service"]
	path = services/admin-service
	url = https://github.com/A2G-Dev-Space/admin-service.git
	branch = main
[submodule "services/worker-service"]
	path = services/worker-service
	url = https://github.com/A2G-Dev-Space/worker-service.git
	branch = main
[submodule "services/infra-service"]
	path = services/infra-service
	url = https://github.com/A2G-Dev-Space/infra-service.git
	branch = main
```

### 3.3 Main Repository 클론 (Submodules 포함)

**방법 1: 처음부터 Submodules 포함**:
```bash
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 전체 플랫폼 실행
docker-compose up --build
```

**방법 2: Clone 후 Submodules 초기화**:
```bash
git clone https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# Submodules 초기화
git submodule update --init --recursive

# 전체 플랫폼 실행
docker-compose up --build
```

### 3.4 Sub-repository에서 독립 개발

**DEV2가 user-service를 개발하는 경우**:

```bash
# Option 1: Sub-repository 직접 clone
git clone https://github.com/A2G-Dev-Space/user-service.git
cd user-service

# 개발
git checkout -b feature/sso-integration
# ... 코드 작성
git add .
git commit -m "feat: Implement SSO callback handler"
git push origin feature/sso-integration

# Option 2: Main Repository에서 작업
cd Agent-Platform-Development/services/user-service
git checkout -b feature/sso-integration
# ... 코드 작성
git add .
git commit -m "feat: Implement SSO callback handler"
git push origin feature/sso-integration
```

### 3.5 Main Repository에 Submodule 업데이트 반영

Submodule에서 변경사항이 Merge되면, Main Repository에 반영:

```bash
cd Agent-Platform-Development

# 모든 Submodules 최신 버전으로 업데이트
git submodule update --remote --merge

# 특정 Submodule만 업데이트
cd services/user-service
git pull origin main
cd ../..

# Main Repository에 반영
git add services/user-service
git commit -m "Update user-service: SSO integration"
git push origin main
```

### 3.6 왜 Git Submodules인가?

| 비교 항목 | Mono-repo | Multi-repo (독립) | **Sub-repo (Submodules)** ⭐ |
|----------|-----------|-------------------|---------------------------|
| **독립 개발** | ❌ | ✅ | ✅ |
| **통합 실행** | ✅ | ❌ | ✅ |
| **버전 관리** | 어려움 | 쉬움 | 쉬움 |
| **CI/CD** | 단일 | 서비스별 | 양쪽 모두 |
| **Clone 편의성** | 쉬움 | 복잡 | 쉬움 (`--recursive`) |

**Sub-repository의 장점**:
1. **독립 개발**: 각 서비스를 독립 Repository로 개발
2. **통합 실행**: Main Repository에서 `docker-compose up` 한 번으로 전체 플랫폼 실행
3. **버전 추적**: Main Repository가 각 Submodule의 특정 Commit Hash를 참조
4. **CI/CD 양립**: 각 Sub-repo에 독립 CI + Main Repo에 통합 CI

**상세 내용**: [GIT_SUBMODULES.md](./GIT_SUBMODULES.md) 참조

---

## 4. API 게이트웨이 및 라우팅

### 4.1 Nginx 라우팅 설정

```nginx
# agent-platform-infra/nginx/nginx.conf

server {
    listen 443 ssl;
    server_name localhost;

    ssl_certificate /etc/nginx/certs/localhost.crt;
    ssl_certificate_key /etc/nginx/certs/localhost.key;

    # User Service
    location /api/auth/ {
        proxy_pass http://user-service:8001;
    }
    location /api/users/ {
        proxy_pass http://user-service:8001;
    }
    location /api/keys/ {
        proxy_pass http://user-service:8001;
    }

    # Agent Service
    location /api/agents/ {
        proxy_pass http://agent-service:8002;
    }

    # Chat Service
    location /api/chat/ {
        proxy_pass http://chat-service:8003;
    }

    # Tracing Service
    location /api/tracing/ {
        proxy_pass http://tracing-service:8004;
    }
    location /api/log-proxy/ {
        proxy_pass http://tracing-service:8004;
    }

    # Admin Service
    location /api/admin/ {
        proxy_pass http://admin-service:8005;
    }

    # WebSocket (Chat Service)
    location /ws/ {
        proxy_pass http://chat-service:8003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 5. A2A 프로토콜 및 Agent 관리

### 5.1 A2A 프로토콜 표준

**A2A (Agent-to-Agent) 프로토콜**은 다양한 Agent 프레임워크(Agno, ADK, Langchain)를 통합하는 표준 인터페이스입니다.

#### 5.1.1 A2A 엔드포인트 스펙

모든 Agent는 다음 엔드포인트를 구현해야 합니다:

```
POST /a2a/invoke
Content-Type: application/json

Request:
{
  "session_id": "uuid",
  "message": "사용자 입력",
  "context": {
    "user_id": "username",
    "trace_id": "uuid"
  }
}

Response:
{
  "response": "Agent 응답",
  "status": "success",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

#### 5.1.2 Agent 등록 (A2A)

**Agno Agent 등록 예시**:

```bash
curl -X POST http://localhost:8002/api/agents/a2a/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Customer Support Agent",
    "framework": "Agno",
    "a2a_endpoint": "http://agno-server.local:9080/a2a/invoke",
    "capabilities": ["customer support", "Q&A", "ticket management"],
    "description": "고객 문의 처리 전문 에이전트"
  }'
```

**Langchain-agent 등록 예시**:

```bash
curl -X POST http://localhost:8002/api/agents/a2a/register \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Document Analyzer",
    "framework": "Langchain",
    "a2a_endpoint": "http://langchain-agent.local:8080/a2a/invoke",
    "capabilities": ["document analysis", "summarization", "extraction"],
    "description": "문서 분석 및 요약 에이전트"
  }'
```

#### 5.1.3 운영 전환

```bash
# 1. Agent를 A2A 프로토콜로 등록 (DEVELOPMENT 상태)
POST /api/agents/a2a/register

# 2. 개발 및 테스트

# 3. 운영 전환
POST /api/agents/{id}/deploy
{
  "a2a_endpoint": "http://production-agent.company.com/a2a/invoke"
}

# 시스템이 자동으로:
# - A2A 엔드포인트 검증 (health check)
# - status를 PRODUCTION으로 변경
# - Top-K 추천 풀에 추가
```

---

## 6. Top-K Agent 추천 시스템

### 6.1 추천 알고리즘

```python
# agent-platform-agent-service/app/recommender/service.py

from langchain.embeddings import OpenAIEmbeddings
from langchain.vectorstores import FAISS

class AgentRecommender:
    def __init__(self):
        self.embeddings = OpenAIEmbeddings()
        self.vector_store = FAISS.load_local("agent_embeddings")

    def recommend(self, user_query: str, k: int = 5):
        # 1. 사용자 쿼리 임베딩
        query_embedding = self.embeddings.embed_query(user_query)

        # 2. 활성 Agent만 필터링
        active_agents = Agent.query.filter(
            Agent.status == "PRODUCTION",
            Agent.health_status == "healthy"
        ).all()

        # 3. 유사도 검색
        results = self.vector_store.similarity_search_with_score(
            query_embedding,
            k=k,
            filter={"status": "PRODUCTION"}
        )

        # 4. Top-K 반환
        recommendations = []
        for agent, score in results:
            recommendations.append({
                "agent": agent.to_dict(),
                "similarity_score": score,
                "match_reasons": self._extract_match_reasons(user_query, agent)
            })

        return recommendations
```

### 6.2 Frontend 통합

**운영 페이지 (Production Mode)**:

```typescript
// agent-platform-frontend/src/pages/ProductionPage.tsx

const [query, setQuery] = useState("");
const [recommendations, setRecommendations] = useState([]);

const handleRecommend = async () => {
  const response = await fetch("/api/agents/recommend", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query, k: 5 })
  });

  const data = await response.json();
  setRecommendations(data.recommendations);
};

return (
  <div>
    <Input
      placeholder="어떤 작업을 수행하고 싶으신가요?"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
    />
    <Button onClick={handleRecommend}>Agent 추천받기</Button>

    {recommendations.map(rec => (
      <AgentCard
        agent={rec.agent}
        score={rec.similarity_score}
        matchReasons={rec.match_reasons}
      />
    ))}
  </div>
);
```

---

## 7. 데이터 플로우

### 7.1 Agent 등록 플로우 (A2A)

```
Developer (Agno Agent 개발)
  │
  ├─ 1. Agno 서버에 Agent 구현
  │      - http://localhost:9080/a2a/invoke 엔드포인트 구현
  │
  ├─ 2. A2G Platform에 Agent 등록
  │      POST /api/agents/a2a/register
  │      {
  │        "name": "My Agent",
  │        "framework": "Agno",
  │        "a2a_endpoint": "http://localhost:9080/a2a/invoke",
  │        "capabilities": ["task1", "task2"]
  │      }
  │
  ├─ 3. Agent Service가 처리
  │      - A2A 엔드포인트 검증 (health check)
  │      - Agent 데이터베이스에 저장 (status=DEVELOPMENT)
  │      - capabilities 임베딩 생성 및 Vector DB 저장
  │
  ├─ 4. 개발자가 테스트 (Playground)
  │      - Chat Service를 통해 메시지 전송
  │      - Agent Service가 A2A 프로토콜로 Agent 호출
  │
  └─ 5. 운영 전환
         POST /api/agents/{id}/deploy
         - 운영 A2A 엔드포인트 검증
         - status → PRODUCTION
         - Top-K 추천 풀에 추가
```

### 7.2 Top-K 추천 플로우

```
User (운영 페이지에서 쿼리 입력)
  │
  ├─ 1. Frontend에서 쿼리 전송
  │      POST /api/agents/recommend
  │      { "query": "고객 문의 답변 에이전트", "k": 5 }
  │
  ├─ 2. Agent Service가 처리
  │      - 쿼리 임베딩 (OpenAI Embeddings)
  │      - Vector DB에서 유사도 검색 (FAISS)
  │      - 활성 Agent만 필터링 (status=PRODUCTION, health=healthy)
  │      - Top-K개 반환
  │
  └─ 3. Frontend가 추천 Agent 표시
         - AgentCard 컴포넌트로 렌더링
         - similarity_score 및 match_reasons 표시
         - 클릭 시 해당 Agent Playground로 이동
```

### 7.3 실시간 Trace 플로우

```
User가 Agent와 채팅
  │
  ├─ 1. Frontend → Chat Service
  │      POST /api/chat/messages
  │      { "session_id": 123, "content": "Hello" }
  │
  ├─ 2. Chat Service → Agent (A2A)
  │      POST {agent.a2a_endpoint}/a2a/invoke
  │      { "message": "Hello", "context": {...} }
  │
  ├─ 3. Agent → Tracing Service (LLM 호출)
  │      POST /api/log-proxy/{trace_id}/chat/completions
  │      { "model": "gpt-4", "messages": [...] }
  │
  ├─ 4. Tracing Service가 처리
  │      - LLM Endpoint로 프록시
  │      - 요청/응답 LogEntry DB 저장
  │      - Redis Pub/Sub으로 Chat Service에 로그 전송
  │
  ├─ 5. Chat Service → Frontend (WebSocket)
  │      WS /ws/trace/{trace_id}
  │      { "type": "trace_log", "data": {...} }
  │
  └─ 6. Frontend LiveTrace 컴포넌트가 실시간 표시
```

---

## 8. 외부 개발 환경

### 8.1 Mock Services

사외망에서 개발 시 필요한 Mock Services:

```yaml
# agent-platform-infra/docker-compose/docker-compose.external.yml

version: '3.8'
services:
  mock-sso:
    build: ../mock-sso
    ports:
      - "9999:9999"

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: agent_dev_platform_local
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

### 8.2 환경 전환

**사외망 → 사내망 전환**:

```bash
# 각 서비스 .env 파일 교체
cd agent-platform-user-service
cp .env.internal .env

cd agent-platform-agent-service
cp .env.internal .env

# ... (모든 서비스 동일)
```

**환경 변수 예시**:

```bash
# .env.external (사외망)
SSO_ENDPOINT=http://localhost:9999/mock-sso
DB_HOST=localhost
REDIS_HOST=localhost

# .env.internal (사내망)
SSO_ENDPOINT=https://sso.company.com
DB_HOST=a2g-db.company.com
REDIS_HOST=redis.company.com
```

---

## 9. 4명 팀 구성 및 역할

| Developer | 담당 서비스 | 주요 작업 | 기술 스택 |
|-----------|------------|----------|----------|
| **DEV1 (한승하)** | Frontend 전체 + Infra + User Service | Frontend 모든 기능, Docker/CI/CD, SSO/인증 | React, TypeScript, Docker, FastAPI |
| **DEV2 (이병주)** | Admin Service + Worker Service | LLM 관리, 통계, Celery Tasks | FastAPI, Celery, Redis |
| **DEV3 (김영섭)** | Chat Service + Tracing Service | WebSocket, Session/Message, Log Proxy | FastAPI, WebSocket, Redis |
| **DEV4 (안준형)** | Agent Service (agent subrepo) | A2A 프로토콜, Top-K 추천, Agent CRUD | FastAPI, RAG, LangChain |

### 개발 방식

**Frontend 개발**:
- **DEV1 (한승하)**가 Frontend의 모든 기능을 개발하여 제공

**Backend 개발 및 테스트**:
- **DEV1~DEV4 모두** 각자 담당한 Backend 서비스를 구현
- 각 개발자는 자신의 Backend와 Frontend 간의 연동을 테스트
- Frontend 기능에 이상이 없는지, 오류 동작은 없는지 확인

**Repository 관리**:
- **Agent subrepo**: DEV4 (안준형) 전담
- **Infra repo**: DEV1 (한승하) 전담

---

## 10. 6주 개발 일정

| Sprint | 기간 | 주요 목표 | 담당 |
|--------|------|----------|------|
| **Sprint 0** | Week 1 | Mock Services, Infra 구축, Repository 생성 | DEV1 (Infra), 전체 (Repo) |
| **Sprint 1** | Week 2 | User/Agent/Chat Service 기본 API | DEV1~DEV4 (각 Backend) |
| **Sprint 2** | Week 3 | Frontend Core 개발 + Backend 연동 | DEV1 (Frontend), 전체 (테스트) |
| **Sprint 3** | Week 4-5 | Frontend 완성 + Backend 고도화 | DEV1 (Frontend), 전체 (Backend) |
| **Sprint 4** | Week 6 | 통합 테스트 + 배포 | 전체 |

---

## 📚 관련 문서

- [README.md](./README.md): 프로젝트 개요
- [SRS.md](./SRS.md): 요구사항 명세서
- [BLUEPRINT.md](./BLUEPRINT.md): UI/UX 설계
- [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md): 개발 가이드 (팀 분담 포함)
- [API_CONTRACTS.md](./API_CONTRACTS.md): API 계약서
- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md): 외부 개발 환경

---

**문의**: syngha.han@samsung.com
