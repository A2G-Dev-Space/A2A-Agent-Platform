# 🚀 A2G Agent Platform - 통합 프로젝트 가이드

**문서 버전**: 3.0 (통합본)
**최종 수정일**: 2025년 10월 29일
**개발 기간**: 6주 (Sprint 0-4)
**개발 인원**: 4명

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [핵심 기능](#4-핵심-기능)
5. [개발환경 설정](#5-개발환경-설정)
6. [API 명세](#6-api-명세)
7. [보안 및 인증](#7-보안-및-인증)
8. [UI/UX 설계](#8-uiux-설계)
9. [테스트 가이드](#9-테스트-가이드)
10. [배포 및 운영](#10-배포-및-운영)

---

## 1. 프로젝트 개요

### 1.1 A2G Agent Platform이란?

**A2G(AI Agent Generation) Platform**은 개발자들이 **LLM 기반 에이전트를 개발, 테스트, 배포 및 모니터링**할 수 있는 통합 플랫폼입니다.

### 1.2 비전과 목표

> "사내 모든 개발자가 쉽게 AI 에이전트를 개발하고 운영할 수 있는 통합 플랫폼"

**핵심 목표:**
- 개발 생산성 향상: 표준화된 A2A 프로토콜로 에이전트 간 통신 단순화
- 운영 안정성 확보: 자동 헬스 체크 및 모니터링
- 확장성과 유연성: 마이크로서비스 아키텍처로 독립적 확장

### 1.3 주요 특징

- **멀티 프레임워크 지원**: Agno, ADK, Langchain, Custom 에이전트 통합
- **A2A 프로토콜**: 표준화된 Agent-to-Agent 통신 인터페이스
- **실시간 추적**: WebSocket 기반 실시간 로그 및 디버깅
- **지능형 추천**: Top-K 알고리즘 기반 에이전트 추천
- **사내/사외 개발**: Mock 서비스를 통한 독립적 개발 환경

### 1.4 팀 구성 및 역할

| 개발자 | 담당 영역 | 주요 책임 | 포트 |
|--------|-----------|-----------|------|
| **DEV1 (한승하)** | Frontend + Infra + User Service | SPRINT Lead, UI/UX 전체, SSO 인증 | 9060, 8001 |
| **DEV2 (이병주)** | Admin/Worker Service | LLM 관리, 통계, Celery 작업 | 8005, 8006 |
| **DEV3 (김영섭)** | Chat/Tracing Service | WebSocket, 실시간 로그 | 8003, 8004 |
| **DEV4 (안준형)** | Agent Service | A2A Protocol, Top-K, Registry | 8002 |

### 1.5 Sprint 일정

| Sprint | 기간 | 주요 목표 |
|--------|------|-----------|
| Sprint 0 | 1주차 | 환경 구축, Mock 서비스, 레포지토리 설정 |
| Sprint 1 | 2주차 | 핵심 백엔드 API 구현 |
| Sprint 2 | 3주차 | Frontend 코어 + 백엔드 통합 |
| Sprint 3 | 4-5주차 | 고급 기능 구현 (WebSocket, Top-K) |
| Sprint 4 | 6주차 | 통합 테스트, 버그 수정, 배포 |

---

## 2. 시스템 아키텍처

### 2.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 브라우저                       │
│                     Port: 9060                          │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/WSS
        ┌──────────────▼──────────────┐
        │   API Gateway (Nginx)       │
        │        Port: 9050           │
        └──────────┬──────────────────┘
                   │
    ┌──────────────┼──────────────────────┐
    │              │                      │
┌───▼───┐ ┌───────▼──────┐ ┌────────▼───────┐
│User   │ │Agent Service │ │Chat Service   │
│Service│ │Port:8002     │ │Port:8003      │
│Port:  │ └──────────────┘ └───────────────┘
│8001   │ ┌──────────────┐ ┌───────────────┐
└───────┘ │Admin Service │ │Tracing Service│
          │Port:8005     │ │Port:8004      │
          └──────────────┘ └───────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │         PostgreSQL + Redis          │
    │      Ports: 5432, 6379             │
    └─────────────────────────────────────┘
```

### 2.2 마이크로서비스 구성

| 서비스 | 포트 | 담당자 | 주요 기능 |
|--------|------|--------|-----------|
| **API Gateway** | 9050 | 플랫폼 팀 | 요청 라우팅, 인증, Rate Limiting |
| **User Service** | 8001 | DEV1 | SSO 인증, JWT 토큰, 사용자 관리 |
| **Agent Service** | 8002 | DEV4 | 에이전트 CRUD, A2A Protocol, Top-K 추천 |
| **Chat Service** | 8003 | DEV3 | WebSocket 채팅, 메시지 스트리밍 |
| **Tracing Service** | 8004 | DEV3 | 로그 수집, 실시간 추적 |
| **Admin Service** | 8005 | DEV2 | LLM 모델 관리, 통계 |
| **Worker Service** | 8006 | DEV2 | Celery 백그라운드 작업 |

### 2.3 데이터베이스 구조

각 서비스는 독립된 데이터베이스를 사용:
- `user_service_db` - 사용자, 권한, API 키
- `agent_service_db` - 에이전트, 벡터 임베딩 (pgvector)
- `chat_service_db` - 채팅 세션, 메시지
- `tracing_service_db` - 로그, 추적 정보
- `admin_service_db` - LLM 모델, 플랫폼 통계

---

## 3. 기술 스택

### 3.1 Frontend
- **Framework**: React 19 + TypeScript
- **빌드 도구**: Vite
- **상태 관리**: Zustand
- **스타일링**: Tailwind CSS v4 + MUI
- **실시간 통신**: Socket.IO Client
- **HTTP Client**: Axios + React Query

### 3.2 Backend
- **Framework**: FastAPI (Python 3.11+)
- **패키지 관리**: UV (pip/poetry 대신)
- **ORM**: SQLAlchemy 2.0
- **마이그레이션**: Alembic
- **비동기 작업**: Celery
- **벡터 검색**: pgvector
- **LLM 통합**: LangChain

### 3.3 Infrastructure
- **컨테이너**: Docker + Docker Compose
- **API Gateway**: Nginx
- **데이터베이스**: PostgreSQL 15
- **캐시/브로커**: Redis 7
- **CI/CD**: GitHub Actions

---

## 4. 핵심 기능

### 4.1 A2A (Agent-to-Agent) Protocol

표준화된 JSON-RPC 2.0 기반 에이전트 통신:

```json
{
  "jsonrpc": "2.0",
  "method": "agent.execute",
  "params": {
    "task": "고객 문의 분석",
    "context": {"user_id": "user.id", "session_id": "session-uuid"}
  },
  "id": "request-001"
}
```

**지원 프레임워크:**
- **Agno**: 삼성 내부 에이전트 프레임워크
- **ADK**: Agent Development Kit
- **Langchain**: LangChain 기반 에이전트
- **Custom**: 사용자 정의 에이전트

### 4.2 Top-K 에이전트 추천

벡터 유사도 기반 지능형 에이전트 매칭:

1. 사용자 쿼리 → OpenAI Embedding (1536차원)
2. pgvector를 이용한 코사인 유사도 검색
3. 필터링 (상태, 부서, 권한)
4. 상위 K개 추천 + LLM 기반 매칭 이유 생성

### 4.3 플랫폼 운영 모드

#### Workbench Mode (개발 모드)
- **목적**: 개인 에이전트 개발 및 테스트
- **테마**: 보라색/바이올렛 계열
- **특징**: 실시간 로그 추적, 디버깅

#### Hub Mode (프로덕션 모드)
- **목적**: 프로덕션 에이전트 실행 및 탐색
- **테마**: 파란색 계열
- **특징**: PRODUCTION 상태 에이전트만 표시

#### Flow Mode (오케스트레이션 모드)
- **목적**: 다중 에이전트 워크플로우 실행
- **테마**: 청록색 계열
- **특징**: 시각적 플로우 빌더

---

## 5. 개발환경 설정

### 5.1 빠른 시작 (Docker)

```bash
# 1. 인프라 시작
docker compose -f repos/infra/docker-compose.dev.yml up -d

# 2. Frontend 실행
cd frontend && npm install && npm run dev

# 3. 접속
http://localhost:9060
```

### 5.2 데이터베이스 초기화

```bash
# PostgreSQL 컨테이너 접속
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres

# 데이터베이스 생성
CREATE DATABASE user_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
CREATE DATABASE admin_service_db;

# pgvector 확장 설치 (Agent Service용)
\c agent_service_db
CREATE EXTENSION IF NOT EXISTS vector;
```

### 5.3 환경 변수 설정

**개발 환경 (.env.local)**
```bash
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/{service}_db
REDIS_URL=redis://localhost:6379/0
JWT_SECRET_KEY=local-dev-secret-key
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
```

**운영 환경 (.env.internal)**
```bash
DATABASE_URL=postgresql://prod_user:${VAULT_PASSWORD}@company-db:5432/prod_db
REDIS_URL=redis://:${VAULT_REDIS_PASSWORD}@company-redis:6379/0
JWT_SECRET_KEY=${VAULT_JWT_SECRET}
IDP_ENTITY_ID=https://sso.company.com/auth
```

---

## 6. API 명세

### 6.1 인증 API (User Service)

#### POST /api/auth/login/
```json
// Request
{
  "redirect_uri": "http://localhost:9060/callback"
}

// Response
{
  "sso_login_url": "https://sso.company.com/login?redirect=..."
}
```

#### POST /api/auth/callback/
```json
// Request
{
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}

// Response
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 43200,
  "user": {
    "username": "test.user",
    "role": "USER"
  }
}
```

### 6.2 에이전트 API (Agent Service)

#### GET /api/agents/
```json
// Query Parameters
?status=PRODUCTION&framework=Langchain

// Response
{
  "agents": [
    {
      "id": 1,
      "name": "Customer Support Agent",
      "framework": "Langchain-agent",
      "status": "PRODUCTION",
      "capabilities": {
        "skills": ["chat", "search"]
      }
    }
  ]
}
```

#### POST /api/agents/recommend
```json
// Request
{
  "query": "고객 불만 처리를 도와줄 에이전트",
  "k": 5,
  "filters": {
    "status": "PRODUCTION"
  }
}

// Response
{
  "recommendations": [
    {
      "agent_id": 1,
      "name": "CS Helper Agent",
      "similarity_score": 0.95,
      "match_reason": "고객 지원 전문"
    }
  ]
}
```

### 6.3 WebSocket 메시지 형식 (Chat Service)

#### 클라이언트 → 서버
```json
{
  "type": "message",
  "content": "사용자 입력 메시지",
  "metadata": {
    "timestamp": "2025-01-01T00:00:00Z"
  }
}
```

#### 서버 → 클라이언트 (스트리밍)
```json
{
  "type": "token",
  "content": "응답",
  "index": 0
}
```

---

## 7. 보안 및 인증

### 7.1 보안 아키텍처

```
사용자 → HTTPS/WSS → API Gateway → JWT 검증 → Backend Services
                         ↓
                    Rate Limiting
                    CORS Policy
                    SSL Termination
```

### 7.2 JWT 토큰 구조

```json
{
  "sub": "user.id",          // 사용자 ID
  "role": "USER",             // 사용자 권한
  "email": "user@example.com",
  "exp": 1234567890,          // 만료 시간
  "type": "access"            // 토큰 타입
}
```

### 7.3 보안 체크리스트

- [x] JWT Bearer 토큰 인증
- [x] Rate Limiting (분당 100회)
- [x] 입력 검증 (Pydantic)
- [x] SQL Injection 방지 (ORM)
- [x] XSS/CSRF 방지
- [x] 민감 데이터 암호화
- [x] HTTPS/WSS 암호화

---

## 8. UI/UX 설계

### 8.1 디자인 시스템

#### 색상 팔레트
- **Workbench**: 보라색 계열 (#E9D5FF)
- **Hub**: 파란색 계열 (#E0F2FE)
- **Flow**: 청록색 계열 (#CCFBF1)

#### 타이포그래피
- **한글 폰트**: Pretendard
- **코드 폰트**: JetBrains Mono
- **시스템 폰트**: -apple-system, BlinkMacSystemFont

### 8.2 레이아웃 구조

```
┌────────┬────────────────────────────────────┐
│ Side   │          Header                    │
│ bar    ├────────────────────────────────────┤
│        │                                    │
│ [🔧]   │         Main Content Area         │
│ [🏢]   │                                    │
│ [⚡]   │                                    │
└────────┴────────────────────────────────────┘
```

### 8.3 반응형 디자인

- 모바일: 1열 레이아웃
- 태블릿: 2열 레이아웃
- 데스크톱: 3열 레이아웃

---

## 9. 테스트 가이드

### 9.1 브라우저 콘솔 테스트

```javascript
// 로그인 확인
localStorage.getItem('accessToken')

// API 테스트
fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(console.log)

// WebSocket 테스트
const ws = new WebSocket(`ws://localhost:8003/ws/test-session?token=${token}`);
ws.onmessage = (e) => console.log('메시지:', e.data);
```

### 9.2 서비스 헬스 체크

```bash
curl http://localhost:8001/health  # User Service
curl http://localhost:8002/health  # Agent Service
curl http://localhost:8003/health  # Chat Service
```

---

## 10. 배포 및 운영

### 10.1 Docker 이미지 빌드

```bash
# 이미지 빌드
docker build -t a2g-{service}:latest .

# 레지스트리 푸시
docker push registry.company.com/a2g-{service}:v1.0.0
```

### 10.2 성능 목표

| 작업 유형 | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| 단순 조회 | 50ms | 200ms | 500ms |
| 복잡 조회 | 200ms | 500ms | 1s |
| Top-K 추천 | 500ms | 1s | 2s |
| LLM 호출 | 2s | 5s | 10s |

**동시 처리 목표:**
- 동시 사용자: 1,000명
- 초당 요청: 500 RPS
- WebSocket 연결: 5,000개

---

## 📞 지원 및 문의

- **Slack**: #a2g-platform-dev
- **프로젝트 리드**: syngha.han@company.com (DEV1)
- **GitHub**: https://github.com/A2G-Dev-Space

---

**© 2025 A2G Platform Development Team. All rights reserved.**