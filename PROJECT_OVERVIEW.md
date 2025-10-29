# 🚀 A2G Agent Platform - 프로젝트 개요

**문서 버전**: 4.0 (통합본)
**최종 수정일**: 2025년 10월 29일
**개발 기간**: 6주 (Sprint 0-4)
**개발 인원**: 4명

---

## 📋 목차

1. [프로젝트 소개](#1-프로젝트-소개)
2. [시스템 아키텍처](#2-시스템-아키텍처)
3. [기술 스택](#3-기술-스택)
4. [팀 구성](#4-팀-구성)
5. [핵심 기능](#5-핵심-기능)
6. [플랫폼 모드](#6-플랫폼-모드)
7. [빠른 시작](#7-빠른-시작)
8. [관련 문서](#8-관련-문서)

---

## 1. 프로젝트 소개

### 1.1 A2G Platform이란?

**A2G(AI Agent Generation) Platform**은 개발자들이 **LLM 기반 에이전트를 개발, 테스트, 배포 및 모니터링**할 수 있는 통합 플랫폼입니다.

### 1.2 비전

> "사내 모든 개발자가 쉽게 AI 에이전트를 개발하고 운영할 수 있는 통합 플랫폼"

### 1.3 핵심 목표

- **개발 생산성 향상**: 표준화된 A2A 프로토콜로 에이전트 간 통신 단순화
- **운영 안정성 확보**: 자동 헬스 체크 및 실시간 모니터링
- **확장성과 유연성**: 마이크로서비스 아키텍처로 독립적 확장

### 1.4 주요 특징

- ✅ **멀티 프레임워크 지원**: Agno, ADK, Langchain, Custom 에이전트 통합
- ✅ **A2A 프로토콜**: 표준화된 Agent-to-Agent 통신 (JSON-RPC 2.0)
- ✅ **실시간 추적**: WebSocket 기반 실시간 로그 및 디버깅
- ✅ **지능형 추천**: Top-K 알고리즘 기반 에이전트 추천
- ✅ **통합 인증**: SSO + JWT 기반 보안 시스템

---

## 2. 시스템 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────┐
│                   사용자 브라우저                         │
│          React 19 + TypeScript (Port: 9060)             │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/WSS
        ┌──────────────▼──────────────┐
        │   API Gateway (Nginx)       │
        │        Port: 9050           │
        └──────────┬──────────────────┘
                   │ JWT Bearer Token
    ┌──────────────┼──────────────────────────────────┐
    │              │                                   │
┌───▼────┐ ┌──────▼───────┐ ┌─────────▼────────┐
│User    │ │Agent Service │ │Chat Service      │
│Service │ │(Port: 8002)  │ │(Port: 8003)      │
│8001    │ │A2A Protocol  │ │WebSocket         │
└────────┘ └──────────────┘ └──────────────────┘
           ┌──────────────┐ ┌──────────────────┐
           │Tracing       │ │Admin Service     │
           │Service 8004  │ │(Port: 8005)      │
           │Log Collection│ │LLM Management    │
           └──────────────┘ └──────────────────┘
                   │
    ┌──────────────▼──────────────────────┐
    │    PostgreSQL + Redis + Celery      │
    │   Ports: 5432, 6379, Worker         │
    └─────────────────────────────────────┘
```

### 2.2 마이크로서비스 구성

| 서비스 | 포트 | 담당자 | 주요 역할 |
|--------|------|--------|-----------|
| **API Gateway** | 9050 | 플랫폼 팀 | 요청 라우팅, 인증, Rate Limiting |
| **User Service** | 8001 | DEV1 (한승하) | SSO 인증, JWT, 사용자 관리 |
| **Agent Service** | 8002 | DEV4 (안준형) | 에이전트 CRUD, A2A, Top-K |
| **Chat Service** | 8003 | DEV3 (김영섭) | WebSocket 채팅, 스트리밍 |
| **Tracing Service** | 8004 | DEV3 (김영섭) | 로그 수집, 실시간 추적 |
| **Admin Service** | 8005 | DEV2 (이병주) | LLM 관리, 통계 대시보드 |
| **Worker Service** | N/A | DEV2 (이병주) | Celery 백그라운드 작업 |
| **Frontend** | 9060 | DEV1 (한승하) | React UI, 3가지 모드 |

### 2.3 데이터베이스

각 서비스는 독립된 데이터베이스 사용:
- `user_service_db` - 사용자, 권한, API 키
- `agent_service_db` - 에이전트, 벡터 임베딩 (pgvector)
- `chat_service_db` - 채팅 세션, 메시지
- `tracing_service_db` - 로그, Agent Transfer
- `admin_service_db` - LLM 모델, 플랫폼 통계

---

## 3. 기술 스택

### 3.1 Frontend

| 기술 | 버전/설명 |
|------|-----------|
| **React** | 19.0.0 |
| **TypeScript** | 5.6.3 |
| **Vite** | 6.0.5 |
| **Tailwind CSS** | v4 |
| **Zustand** | 상태 관리 |
| **React Query** | 서버 상태 관리 |
| **Socket.IO** | WebSocket 클라이언트 |

### 3.2 Backend

| 기술 | 버전/설명 |
|------|-----------|
| **FastAPI** | 0.104.0 |
| **Python** | 3.11+ |
| **UV** | 패키지 매니저 |
| **SQLAlchemy** | 2.0 (ORM) |
| **Alembic** | 마이그레이션 |
| **Celery** | 비동기 작업 |
| **pgvector** | 벡터 검색 |

### 3.3 Infrastructure

| 기술 | 버전/설명 |
|------|-----------|
| **Docker** | 컨테이너화 |
| **Nginx** | API Gateway |
| **PostgreSQL** | 15 |
| **Redis** | 7.2 |
| **Flower** | Celery 모니터링 |

---

## 4. 팀 구성

### 4.1 개발팀

| 개발자 | 담당 영역 | 이메일 | 주요 책임 |
|--------|-----------|--------|-----------|
| **DEV1 (한승하)** | Frontend + User Service | syngha.han@company.com | SPRINT Lead, UI/UX, SSO 인증 |
| **DEV2 (이병주)** | Admin + Worker | byungju.lee@company.com | LLM 관리, 통계, Celery 작업 |
| **DEV3 (김영섭)** | Chat + Tracing | youngsub.kim@company.com | WebSocket, 실시간 로그 |
| **DEV4 (안준형)** | Agent Service | joonhyung.ahn@company.com | A2A Protocol, Top-K, Registry |

### 4.2 Sprint 일정

| Sprint | 기간 | 주요 목표 |
|--------|------|-----------|
| **Sprint 0** | 1주차 | 환경 구축, Mock 서비스, 레포 설정 |
| **Sprint 1** | 2주차 | 핵심 백엔드 API 구현 |
| **Sprint 2** | 3주차 | Frontend 코어 + 백엔드 통합 |
| **Sprint 3** | 4-5주차 | 고급 기능 (WebSocket, Top-K) |
| **Sprint 4** | 6주차 | 통합 테스트, 버그 수정, 배포 |

---

## 5. 핵심 기능

### 5.1 A2A (Agent-to-Agent) Protocol

표준화된 JSON-RPC 2.0 기반 에이전트 간 통신:

```json
{
  "jsonrpc": "2.0",
  "method": "agent.execute",
  "params": {
    "task": "고객 문의 분석",
    "context": {"user_id": "test.user", "session_id": "session-123"}
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

1. 사용자 쿼리 → **OpenAI Embedding** (1536차원)
2. **pgvector** 코사인 유사도 검색
3. 필터링 (상태, 부서, 권한)
4. 상위 K개 추천 + **LLM 기반 매칭 이유** 생성

### 5.3 Multi-Agent Tracing

실시간 다중 에이전트 실행 추적:
- WebSocket 기반 실시간 로그 스트리밍
- 에이전트별 색상 코딩
- **Agent Transfer 자동 감지**
- 실행 흐름 시각화

### 5.4 통합 인증

- **SSO 연동**: 사내 통합 인증 시스템
- **JWT 토큰**: Bearer 토큰 기반
- **RBAC**: Role-Based Access Control
  - `PENDING`: 승인 대기
  - `USER`: 일반 사용자
  - `ADMIN`: 관리자

---

## 6. 플랫폼 모드

A2G Platform은 3가지 운영 모드를 제공합니다:

### 6.1 🔧 Workbench Mode (개발 모드)

**URL**: `/workbench`

**목적**: 개인 에이전트 개발 및 테스트

**주요 기능**:
- 에이전트 CRUD (생성, 수정, 삭제)
- Playground 채팅 테스트
- 실시간 로그 추적
- DEVELOPMENT 상태 에이전트 관리

**테마**: 파스텔 퍼플 (#E9D5FF)

### 6.2 🏢 Hub Mode (프로덕션 모드)

**URL**: `/hub`

**목적**: 프로덕션 에이전트 탐색 및 사용

**주요 기능**:
- Top-K AI 추천
- 에이전트 검색 및 카드 뷰
- PRODUCTION 상태 에이전트만 표시
- 에이전트 실행

**테마**: 파스텔 블루 (#E0F2FE)

### 6.3 ⚡ Flow Mode (워크플로우 모드)

**URL**: `/flow`

**목적**: 다중 에이전트 워크플로우 실행

**주요 기능**:
- 비주얼 플로우 빌더
- 순차/병렬 실행
- Agent Transfer 시각화
- 워크플로우 저장 및 재실행

**테마**: 파스텔 틸 (#CCFBF1)

---

## 7. 빠른 시작

### 7.1 환경 설정 및 실행

```bash
# 1. 저장소 클론
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 2. 초기 설정 (최초 1회만)
./start-dev.sh setup

# 3. 모든 서비스 시작
./start-dev.sh full

# 4. Frontend 실행 (별도 터미널)
cd frontend
npm install
npm run dev

# 5. 브라우저에서 접속
# http://localhost:9060
```

### 7.2 서비스 확인

```bash
# API Gateway 헬스 체크
curl http://localhost:9050/health

# User Service 헬스 체크
curl http://localhost:8001/health

# Agent Service 헬스 체크
curl http://localhost:8002/health

# Flower (Celery 모니터링)
# http://localhost:5555
```

### 7.3 서비스 중지

```bash
# 모든 서비스 중지
./start-dev.sh stop
```

### 7.4 로컬 개발 (디버깅)

특정 서비스만 로컬에서 실행하고 싶은 경우:

```bash
# 1. Docker에서 해당 서비스 중지
docker stop a2g-user-service

# 2. 해당 서비스 폴더로 이동
cd repos/user-service

# 3. 로컬 환경 설정 및 실행
uv venv
source .venv/bin/activate
uv sync
uvicorn app.main:app --reload --port 8001
```

---

## 8. 관련 문서

### 8.1 개발 가이드

- **[PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md)** - 통합 개발 가이드 (1230줄, 필독)
  - 전체 시스템 아키텍처
  - 백엔드/프론트엔드 구현 패턴
  - API 명세 및 테스트 가이드
  - 배포 및 트러블슈팅

- **[WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md)** - WSL 환경 설정
  - WSL2 설치 및 설정
  - Docker Desktop 연동
  - Git, Node.js, Python 설치

### 8.2 서비스별 README

각 서비스의 상세 구현 정보는 해당 README 참조:

**Backend Services:**
- [repos/user-service/README.md](./repos/user-service/README.md) - SSO, JWT, API 키 관리
- [repos/agent-service/README.md](./repos/agent-service/README.md) - A2A Protocol, Top-K, pgvector
- [repos/chat-service/README.md](./repos/chat-service/README.md) - WebSocket, 스트리밍, Redis Pub/Sub
- [repos/tracing-service/README.md](./repos/tracing-service/README.md) - 로그 수집, Agent Transfer 감지
- [repos/admin-service/README.md](./repos/admin-service/README.md) - LLM 관리, 통계 대시보드
- [repos/worker-service/README.md](./repos/worker-service/README.md) - Celery 태스크, Beat 스케줄링
- [repos/api-gateway/README.md](./repos/api-gateway/README.md) - Nginx 설정, Rate Limiting

**Frontend:**
- [frontend/README.md](./frontend/README.md) - React 19, UI/UX 시스템, 컴포넌트 가이드

---

## 9. 다음 단계

### 9.1 새로운 개발자

1. **환경 설정**: [WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md) 참조
2. **전체 시스템 이해**: [PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md) 읽기
3. **담당 서비스**: 해당 서비스 `README.md` 정독
4. **실습**: `./start-dev.sh full`로 시스템 실행 후 테스트

### 9.2 Frontend 개발자

1. [frontend/README.md](./frontend/README.md) - React 컴포넌트 가이드
2. [PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md) - API 통합 패턴

### 9.3 Backend 개발자

1. [PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md) - FastAPI 구현 패턴
2. 담당 서비스의 `repos/{service-name}/README.md`

### 9.4 DevOps/인프라

1. [WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md) - 환경 구성
2. [PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md) - 배포 가이드

---

## 10. 지원 및 문의

### 10.1 연락처

- **Slack**: #a2g-platform-dev
- **프로젝트 리드**: syngha.han@company.com (DEV1, 한승하)
- **GitHub**: https://github.com/A2G-Dev-Space

### 10.2 이슈 보고

1. GitHub Issues에 버그/기능 요청 등록
2. Slack #a2g-platform-dev 채널에서 토론
3. 긴급 이슈는 프로젝트 리드에게 직접 연락

---

**© 2025 A2G Platform Development Team. All rights reserved.**
