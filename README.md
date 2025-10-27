# 🤖 A2G Agent Platform - Microservice Architecture

**Version**: 2.0
**Development Period**: 6 Weeks (Sprint 0~4)
**Team**: 4 Developers (DEV1: Senior, SPRINT Lead)
**Architecture**: Microservice (Multi-Repository)
**Backend**: Python (FastAPI, Celery)
**Frontend**: React 19 + TypeScript

---

## 📋 목차

1. [프로젝트 비전](#1-프로젝트-비전)
2. [핵심 기능](#2-핵심-기능)
3. [Microservice Architecture](#3-microservice-architecture)
4. [Multi-Repository 구조](#4-multi-repository-구조)
5. [기술 스택](#5-기술-스택)
6. [빠른 시작](#6-빠른-시작)
7. [4명 팀 구성](#7-4명-팀-구성)
8. [6주 개발 일정](#8-6주-개발-일정)
9. [문서 가이드](#9-문서-가이드)
10. [Contact](#10-contact)

---

## 1. 프로젝트 비전

**A2G Agent Platform**은 개발자들이 **LLM 기반 에이전트를 쉽게 개발, 테스트, 배포, 모니터링할 수 있는 통합 플랫폼**입니다.

### 🎯 핵심 목표

- **A2A 프로토콜 통합**: Agno, ADK, Langchain-agent 등 다양한 프레임워크를 표준 인터페이스로 통합
- **지능형 Agent 추천**: 사용자 쿼리를 분석하여 가장 적합한 Top-K Agent 자동 추천
- **실시간 디버깅**: Multi-Agent Trace, WebSocket 기반 실시간 로그 추적
- **Microservice Architecture**: 독립적인 배포 및 확장 가능한 고가용성 시스템
- **외부 개발 환경**: 사외망에서도 완전한 기능 개발 가능 (Mock Services 제공)

---

## 2. 핵심 기능

### 2.1 A2A (Agent-to-Agent) 프로토콜 ⭐ 신규

다양한 Agent 프레임워크를 하나의 표준 인터페이스로 통합합니다.

**지원 프레임워크**:
- **Agno**: Samsung 사내 Agent 프레임워크
- **ADK (Agent Development Kit)**: 범용 Agent 개발 도구
- **Langchain-agent**: LangChain 기반 Agent
- **Custom**: 사용자 정의 Agent

**예시**:
```bash
# Agno Agent 등록
POST /api/agents/a2a/register
{
  "name": "Customer Support Agent",
  "framework": "Agno",
  "a2a_endpoint": "http://agno-server:9080/a2a/invoke",
  "capabilities": ["customer support", "Q&A", "ticket management"]
}

# 운영 전환
POST /api/agents/{id}/deploy
```

### 2.2 Top-K Agent 추천 시스템 ⭐ 신규

**운영 페이지**에서 사용자 쿼리를 입력하면, AI가 **가장 적합한 Agent Top-K개**를 추천합니다.

**동작 원리**:
1. 사용자 쿼리: "고객 문의를 처리할 에이전트가 필요해"
2. LLM이 쿼리를 분석하여 임베딩 벡터 생성
3. 등록된 Agent의 capabilities와 유사도 계산 (RAG)
4. 활성 상태(status=PRODUCTION)이고 헬스한 Agent만 필터링
5. Top-K개 반환 (유사도 순)

**결과**:
```json
{
  "recommendations": [
    {
      "agent": { "name": "Customer Support Agent", ... },
      "similarity_score": 0.94,
      "match_reasons": ["customer support", "Q&A"]
    }
  ]
}
```

### 2.3 실시간 Multi-Agent Tracing

**개발 모드**에서 Agent의 LLM 호출을 실시간으로 추적합니다.

- **Live Trace**: WebSocket 기반 실시간 로그 표시
- **Multi-Agent 추적**: 여러 Agent가 협업하는 경우 각 Agent별 로그 색상 구분
- **상세 메트릭**: LLM 모델, 프롬프트, 응답, 레이턴시 등

### 2.4 Google Gemini 스타일 UI

- **모드별 테마**: 운영 모드(파스텔 블루), 개발 모드(파스텔 레드)
- **라이트/다크 모드**: 완벽한 테마 지원
- **리치 미디어**: Markdown, 코드 블록, 파일/이미지 업로드

---

## 3. Microservice Architecture

### 3.1 서비스 구성

```
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (Nginx)                    │
│                  https://localhost:9050                 │
└──────────┬────────────┬────────────┬────────────────────┘
           │            │            │
    ┌──────▼──────┐ ┌──▼──────┐ ┌──▼──────┐
    │   User      │ │  Agent  │ │  Chat   │
    │  Service    │ │ Service │ │ Service │
    │   :8001     │ │  :8002  │ │  :8003  │
    │             │ │         │ │         │
    │ - SSO       │ │ - A2A   │ │ - WS    │
    │ - Auth      │ │ - Top-K │ │ - Msg   │
    └─────────────┘ └─────────┘ └─────────┘

    ┌───────────┐ ┌──────────┐ ┌──────────┐
    │  Tracing  │ │  Admin   │ │  Worker  │
    │  Service  │ │ Service  │ │ Service  │
    │   :8004   │ │  :8005   │ │ (Celery) │
    └───────────┘ └──────────┘ └──────────┘

    ┌─────────────────────────────────────────┐
    │  PostgreSQL + Redis + Mock SSO          │
    └─────────────────────────────────────────┘
```

### 3.2 서비스 책임

| 서비스 | 기술 | 포트 | 책임 |
|--------|------|------|------|
| **Frontend** | React + TypeScript | 9060 | UI/UX, SPA |
| **User Service** | FastAPI (Python) | 8001 | SSO, 인증, RBAC, API Key |
| **Agent Service** ⭐ | FastAPI (Python) | 8002 | A2A 프로토콜, Top-K 추천, Agent CRUD |
| **Chat Service** | FastAPI (Python) | 8003 | Session, Message, WebSocket |
| **Tracing Service** | FastAPI (Python) | 8004 | Log Proxy, Trace, Multi-Agent |
| **Admin Service** | FastAPI (Python) | 8005 | LLM 관리, 통계 |
| **Worker Service** | Celery (Python) | - | Health Check, Cleanup, Notify |

**중요**: 모든 Backend 서비스는 **Python (FastAPI/Celery)**로 통일합니다.

---

## 4. Multi-Repository 구조

### 4.1 Repository 목록

기존 Mono-repo를 폐기하고, **각 서비스를 독립 Repository**로 분리합니다.

```
GitHub Organization: A2G-Dev-Space

├── agent-platform-frontend/
│   └── React SPA
│
├── agent-platform-user-service/
│   └── FastAPI (SSO, Auth, API Key)
│
├── agent-platform-agent-service/
│   └── FastAPI (A2A, Top-K, RAG)
│
├── agent-platform-chat-service/
│   └── FastAPI (Session, Message, WebSocket)
│
├── agent-platform-tracing-service/
│   └── FastAPI (Log Proxy, Trace)
│
├── agent-platform-admin-service/
│   └── FastAPI (LLM, Stats)
│
├── agent-platform-worker-service/
│   └── Celery (Health, Cleanup)
│
└── agent-platform-infra/
    ├── docker-compose/
    ├── mock-sso/
    ├── nginx/
    └── certs/
```

### 4.2 Repository 클론

```bash
# 1. Infra 저장소 (최우선)
git clone https://github.com/A2G-Dev-Space/agent-platform-infra.git
cd agent-platform-infra
docker-compose -f docker-compose/docker-compose.external.yml up -d

# 2. Frontend
git clone https://github.com/A2G-Dev-Space/agent-platform-frontend.git

# 3. Backend Services
git clone https://github.com/A2G-Dev-Space/agent-platform-user-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-agent-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-chat-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-tracing-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-admin-service.git
git clone https://github.com/A2G-Dev-Space/agent-platform-worker-service.git
```

---

## 5. 기술 스택

### 5.1 Frontend

| 기술 | 용도 |
|------|------|
| **React 19** | UI 프레임워크 |
| **TypeScript** | 타입 안정성 |
| **Vite** | 빌드 도구 |
| **Zustand** | 전역 상태 관리 |
| **Tailwind CSS** | 유틸리티 CSS |
| **MUI (Material-UI)** | Gemini 스타일 컴포넌트 |
| **Socket.IO Client** | WebSocket 실시간 통신 |
| **React Markdown** | Markdown 렌더링 |

### 5.2 Backend (All Python)

| 기술 | 용도 |
|------|------|
| **FastAPI** | RESTful API, WebSocket |
| **Celery** | 비동기 작업 (Worker Service) |
| **PostgreSQL** | 데이터베이스 |
| **Redis** | Celery Broker, Pub/Sub, Cache |
| **LangChain** | RAG (Top-K 추천) |
| **FAISS / Pinecone** | Vector DB (임베딩 검색) |
| **OpenAI Embeddings** | 쿼리/Agent 임베딩 |

### 5.3 Infrastructure

| 기술 | 용도 |
|------|------|
| **Nginx** | API Gateway, SSL, 라우팅 |
| **Docker** | 컨테이너화 |
| **Docker Compose** | Multi-container 관리 |
| **GitHub Actions** | CI/CD |

---

## 6. 빠른 시작

### 6.1 사전 준비

- Docker Desktop
- Python 3.11+
- Node.js 18+
- Git

### 6.2 Mock Services 실행 (최우선)

```bash
# 1. Infra 저장소 클론
git clone https://github.com/A2G-Dev-Space/agent-platform-infra.git
cd agent-platform-infra

# 2. Mock Services 실행
docker-compose -f docker-compose/docker-compose.external.yml up -d

# 확인
docker ps
# 출력: mock-sso, postgres, redis 컨테이너 실행 중
```

### 6.3 서비스별 실행

**Frontend**:
```bash
cd agent-platform-frontend
npm install
npm run dev
# http://localhost:9060
```

**User Service**:
```bash
cd agent-platform-user-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

**Agent Service**:
```bash
cd agent-platform-agent-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8002
```

**Chat Service**:
```bash
cd agent-platform-chat-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8003
```

**Tracing Service**:
```bash
cd agent-platform-tracing-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8004
```

**Admin Service**:
```bash
cd agent-platform-admin-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8005
```

**Worker Service**:
```bash
cd agent-platform-worker-service
pip install -r requirements.txt
celery -A app.worker worker --loglevel=info
celery -A app.worker beat --loglevel=info  # 별도 터미널
```

---

## 7. 4명 팀 구성

### 7.1 역할 분담

| Developer | 담당 서비스 | 주요 책임 | 기술 |
|-----------|------------|----------|------|
| **DEV1** 🔥 (Senior, SPRINT Lead) | Frontend + Agent Service | UI/UX, A2A 프로토콜, Top-K 추천 | React, FastAPI, RAG |
| **DEV2** | User Service + Admin Service | SSO, 인증, LLM 관리, 통계 | FastAPI, JWT |
| **DEV3** | Chat Service + Worker Service | WebSocket, Celery, Health Check | FastAPI, Redis |
| **DEV4** | Tracing Service + Infra | Log Proxy, Docker, CI/CD | FastAPI, Nginx |

### 7.2 DEV1의 역할 (SPRINT Lead)

**DEV1**은 가장 능숙한 개발자로, **모든 SPRINT를 주도**합니다:

1. **Frontend 전체 개발**:
   - Layout, 공통 컴포넌트, 상태 관리
   - Agent Playground, Chat UI
   - Top-K 추천 페이지

2. **Agent Service 핵심 기능**:
   - A2A 프로토콜 구현
   - Top-K Agent 추천 시스템 (RAG)
   - Agent CRUD API

3. **SPRINT 리딩**:
   - Sprint 계획 수립
   - 팀원 코드 리뷰
   - 기술적 의사결정

---

## 8. 6주 개발 일정

### 8.1 Sprint 계획

| Sprint | 기간 | 주요 목표 | 담당 |
|--------|------|----------|------|
| **Sprint 0** | Week 1 | Mock Services, Infra 구축, Repository 생성 | DEV4, DEV2 |
| **Sprint 1** | Week 2 | User/Agent/Chat Service 기본 API 구현 | 전체 (DEV1 리드) |
| **Sprint 2** | Week 3 | Frontend Core + A2A 프로토콜 구현 | DEV1 (주도), DEV2 |
| **Sprint 3** | Week 4-5 | Top-K 추천 + WebSocket + Tracing | DEV1 (주도), DEV3, DEV4 |
| **Sprint 4** | Week 6 | 통합 테스트, 버그 수정, 사내망 배포 | 전체 |

### 8.2 Sprint 0 체크리스트 (Week 1) - 최우선

**DEV4 (Infra Lead)**:
- [ ] `agent-platform-infra` 저장소 생성
- [ ] Mock SSO 구현 (FastAPI)
- [ ] `docker-compose.external.yml` 작성
- [ ] Nginx 설정

**DEV2 (Backend Lead)**:
- [ ] `agent-platform-user-service` 저장소 생성
- [ ] User 모델 정의
- [ ] SSO 연동 준비

**DEV1 (SPRINT Lead)**:
- [ ] `agent-platform-frontend` 저장소 생성
- [ ] React 프로젝트 초기화
- [ ] `agent-platform-agent-service` 저장소 생성
- [ ] Agent 모델 설계 (A2A 필드 포함)

**DEV3**:
- [ ] `agent-platform-chat-service` 저장소 생성
- [ ] ChatSession/ChatMessage 모델 정의
- [ ] `agent-platform-worker-service` 저장소 생성

---

## 9. 문서 가이드

### 9.1 필수 문서 (읽는 순서)

1. **[ARCHITECTURE.md](./ARCHITECTURE.md)** ⭐ - 전체 Microservice 구조 및 도식도
2. **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)** - 개발 가이드 (팀 분담, 체크리스트 포함)
3. **[DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md)** - 외부 개발 환경 설정
4. **[API_CONTRACTS.md](./API_CONTRACTS.md)** - 서비스 간 API 계약서
5. **[MOCK_SERVICES.md](./MOCK_SERVICES.md)** - Mock SSO/DB/Redis 구현

### 9.2 기술 가이드

- **[FRONTEND_SETUP_GUIDE.md](./FRONTEND_SETUP_GUIDE.md)** ✨ NEW - Tailwind v4, React Compiler, Dark Theme 설정
- **[SSO_AUTHENTICATION_GUIDE.md](./SSO_AUTHENTICATION_GUIDE.md)** ✨ NEW - FastAPI 기반 SSO 인증 구현
- **[DATABASE_STRATEGY.md](./DATABASE_STRATEGY.md)** ✨ NEW - DB 분리 전략 및 Alembic 버전 관리

### 9.3 상세 스펙 문서

- **[SRS.md](./SRS.md)** - 요구사항 명세서
- **[BLUEPRINT.md](./BLUEPRINT.md)** - UI/UX 설계 명세서
- **[GLOSSARY.md](./GLOSSARY.md)** - 용어집
- **[GIT_SUBMODULES.md](./GIT_SUBMODULES.md)** - Git Submodules 가이드

### 9.4 Legacy 문서

- **[reference/SSO_GUIDE_LEGACY_DJANGO.md](./reference/SSO_GUIDE_LEGACY_DJANGO.md)** - Django 기반 SSO 가이드 (참고용)

---

## 10. Contact

**책임 개발자**: 한승하 (syngha.han@samsung.com)
**Slack 채널**: #a2g-dev (일반 문의), #a2g-frontend, #a2g-backend
**GitHub Issues**: [https://github.com/A2G-Dev-Space/agent-platform-infra/issues](https://github.com/A2G-Dev-Space/agent-platform-infra/issues)

---

## 🚀 Quick Links

### 핵심 문서
- [ARCHITECTURE.md - Microservice 구조 및 도식도](./ARCHITECTURE.md)
- [DEVELOPMENT_GUIDE.md - 개발 가이드 (4명 팀 분담)](./DEVELOPMENT_GUIDE.md)
- [API_CONTRACTS.md - API 계약서](./API_CONTRACTS.md)
- [DEV_ENVIRONMENT.md - 외부 개발 환경](./DEV_ENVIRONMENT.md)

### 신규 기술 가이드 ✨
- [FRONTEND_SETUP_GUIDE.md - Tailwind v4 & React Compiler](./FRONTEND_SETUP_GUIDE.md)
- [SSO_AUTHENTICATION_GUIDE.md - FastAPI SSO 인증](./SSO_AUTHENTICATION_GUIDE.md)
- [DATABASE_STRATEGY.md - DB 분리 & 버전 관리](./DATABASE_STRATEGY.md)

---

**Generated with** 🤖 Claude Code
