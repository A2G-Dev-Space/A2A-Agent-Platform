# 🚀 A2G Agent Platform 프로젝트 종합 개요

**문서 버전**: 3.0 (통합본)
**최종 수정일**: 2025년 10월 29일
**개발 기간**: 6주 (Sprint 0-4)
**개발 인원**: 4명

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [팀 구성 및 역할](#4-팀-구성-및-역할)
5. [핵심 기능](#5-핵심-기능)
6. [플랫폼 운영 모드](#6-플랫폼-운영-모드)
7. [개발 환경 구성](#7-개발-환경-구성)
8. [API 명세 및 프로토콜](#8-api-명세-및-프로토콜)
9. [보안 및 인증](#9-보안-및-인증)
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
| **User Service** | 8001 | DEV1 (한승하) | SSO 인증, JWT 토큰, 사용자 관리 |
| **Agent Service** | 8002 | DEV4 (안준형) | 에이전트 CRUD, A2A Protocol, Top-K 추천 |
| **Chat Service** | 8003 | DEV3 (김영섭) | WebSocket 채팅, 메시지 스트리밍 |
| **Tracing Service** | 8004 | DEV3 (김영섭) | 로그 수집, 실시간 추적 |
| **Admin Service** | 8005 | DEV2 (이병주) | LLM 모델 관리, 통계 |
| **Worker Service** | 8006 | DEV2 (이병주) | Celery 백그라운드 작업 |

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

## 4. 팀 구성 및 역할

### 4.1 개발팀 구성

| 개발자 | 담당 영역 | 주요 책임 |
|--------|-----------|-----------|
| **DEV1 (한승하)** | Frontend + Infra | SPRINT Lead, UI/UX 전체, SSO 인증 |
| **DEV2 (이병주)** | Admin/Worker | LLM 관리, 통계, Celery 작업 |
| **DEV3 (김영섭)** | Chat/Tracing | WebSocket, 실시간 로그 |
| **DEV4 (안준형)** | Agent Service | A2A Protocol, Top-K, Registry |

### 4.2 Sprint 일정

| Sprint | 기간 | 주요 목표 |
|--------|------|-----------|
| Sprint 0 | 1주차 | 환경 구축, Mock 서비스, 레포지토리 설정 |
| Sprint 1 | 2주차 | 핵심 백엔드 API 구현 |
| Sprint 2 | 3주차 | Frontend 코어 + 백엔드 통합 |
| Sprint 3 | 4-5주차 | 고급 기능 구현 (WebSocket, Top-K) |
| Sprint 4 | 6주차 | 통합 테스트, 버그 수정, 배포 |

---

## 5. 핵심 기능

### 5.1 A2A (Agent-to-Agent) Protocol

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

### 5.2 Top-K 에이전트 추천

벡터 유사도 기반 지능형 에이전트 매칭:

1. 사용자 쿼리 → OpenAI Embedding (1536차원)
2. pgvector를 이용한 코사인 유사도 검색
3. 필터링 (상태, 부서, 권한)
4. 상위 K개 추천 + LLM 기반 매칭 이유 생성

### 5.3 Multi-Agent Tracing

실시간 다중 에이전트 실행 추적:
- WebSocket 기반 실시간 로그 스트리밍
- 에이전트별 색상 코딩
- Agent Transfer 자동 감지
- 실행 흐름 시각화

### 5.4 통합 인증 시스템

- **SSO 연동**: 사내 통합 인증 시스템 연동
- **JWT 토큰**: Bearer 토큰 기반 인증
- **RBAC**: Role-Based Access Control
  - PENDING: 승인 대기
  - USER: 일반 사용자
  - ADMIN: 관리자

---

## 6. 플랫폼 운영 모드

### 6.1 Workbench Mode (개발 모드)
- **목적**: 개인 에이전트 개발 및 테스트
- **특징**: 실시간 로그 추적, 에이전트 CRUD, 디버깅
- **테마**: 보라색/바이올렛 계열

### 6.2 Hub Mode (프로덕션 모드)
- **목적**: 프로덕션 에이전트 실행 및 탐색
- **특징**: PRODUCTION 상태 에이전트만 표시, 성능 최적화
- **테마**: 파란색 계열

### 6.3 Flow Mode (오케스트레이션 모드)
- **목적**: 다중 에이전트 워크플로우 실행
- **특징**: 시각적 플로우 빌더, 순차/병렬 실행
- **테마**: 청록색 계열

---

## 7. 개발 환경 구성

### 7.1 빠른 시작

```bash
# 1. 초기 설정 (최초 1회만)
./start-dev.sh setup

# 2. 모든 서비스 시작
./start-dev.sh full

# 3. Frontend 실행 (별도 터미널)
cd frontend && npm install && npm run dev

# 4. 접속
http://localhost:9060

# 서비스 중지
./start-dev.sh stop
```

### 7.2 환경별 설정

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

## 8. API 명세 및 프로토콜

### 8.1 주요 API 엔드포인트

#### User Service
- `POST /api/auth/login/` - SSO 로그인
- `POST /api/auth/callback/` - SSO 콜백
- `GET /api/users/me/` - 현재 사용자 정보
- `POST /api/users/me/api-keys/` - API 키 생성

#### Agent Service
- `GET /api/agents/` - 에이전트 목록
- `POST /api/agents/` - 에이전트 생성
- `POST /api/agents/recommend/` - Top-K 추천
- `POST /api/agents/a2a/register/` - A2A 등록

#### Chat Service
- `POST /api/chat/sessions/` - 세션 생성
- `WS /ws/{session_id}` - WebSocket 연결
- `POST /api/chat/sessions/{id}/messages/` - 메시지 전송

### 8.2 WebSocket 메시지 형식

```json
// 클라이언트 → 서버
{
  "type": "message",
  "content": "사용자 메시지",
  "metadata": {"timestamp": "2025-01-01T00:00:00Z"}
}

// 서버 → 클라이언트 (스트리밍)
{
  "type": "token",
  "content": "응답",
  "index": 0
}
```

---

## 9. 보안 및 인증

### 9.1 보안 아키텍처

```
사용자 → HTTPS/WSS → API Gateway → JWT 검증 → Backend Services
                         ↓
                    Rate Limiting
                    CORS Policy
                    SSL Termination
```

### 9.2 보안 체크리스트

- [x] JWT Bearer 토큰 인증
- [x] Rate Limiting (분당 100회)
- [x] 입력 검증 (Pydantic)
- [x] SQL Injection 방지 (ORM)
- [x] XSS/CSRF 방지
- [x] 민감 데이터 암호화
- [x] HTTPS/WSS 암호화

---

## 10. 배포 및 운영

### 10.1 배포 프로세스

```bash
# 1. 테스트
pytest tests/

# 2. Docker 이미지 빌드
docker build -t a2g-{service}:latest .

# 3. 레지스트리 푸시
docker push registry.company.com/a2g-{service}:v1.0.0

# 4. Kubernetes 배포
kubectl apply -f k8s/
```

### 10.2 모니터링

- **헬스 체크**: `/health` 엔드포인트
- **메트릭**: Prometheus + Grafana
- **로그**: ELK Stack
- **알림**: Slack 통합

### 10.3 성능 목표

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

## 📚 관련 문서

**개발 가이드:**
- [개발 환경 설정](./DEVELOPMENT_SETUP.md)
- [백엔드 구현 가이드](./BACKEND_IMPLEMENTATION_GUIDE.md)
- [개발자별 작업 가이드](./Developer_Work_Guide.md)

**기술 문서:**
- [기술 아키텍처](./Technical_Architecture.md)
- [UI/UX 디자인](./UI_UX_Design.md)
- [인증 및 보안](./Authentication_and_Security.md)

**운영 문서:**
- [테스팅 가이드](./TESTING_GUIDE.md)
- [빠른 시작](./QUICKSTART.md)
- [현재 상태](./CURRENT_STATUS.md)

---

## 🎯 다음 단계

1. **개발팀**: 각 서비스 폴더의 README 참조
2. **Frontend 개발자**: UI_UX_Design.md 참조
3. **Backend 개발자**: Technical_Architecture.md 참조
4. **DevOps**: Development_Environment_Settings.md 참조

---

## 📞 지원 및 문의

- **Slack**: #a2g-platform-dev
- **프로젝트 리드**: syngha.han@company.com (DEV1)
- **GitHub**: https://github.com/A2G-Dev-Space

---

**© 2025 A2G Platform Development Team. All rights reserved.**