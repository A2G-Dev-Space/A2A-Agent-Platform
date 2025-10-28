# 📘 A2G Agent Platform - 프로젝트 종합 가이드

**문서 버전**: 2.0 (통합본)
**최종 수정일**: 2025년 10월 28일
**개발 기간**: 6주 (Sprint 0-4)
**개발 인원**: 4명

---

## 📌 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [비전과 목표](#2-비전과-목표)
3. [핵심 기능](#3-핵심-기능)
4. [플랫폼 모드](#4-플랫폼-모드)
5. [기술 스택](#5-기술-스택)
6. [팀 구성](#6-팀-구성)
7. [소프트웨어 요구사항](#7-소프트웨어-요구사항)
8. [데이터 모델](#8-데이터-모델)
9. [용어 사전](#9-용어-사전)
10. [빠른 시작](#10-빠른-시작)

---

## 1. 프로젝트 개요

### 1.1 A2G Agent Platform이란?

**A2G(AI Agent Generation) Platform**은 개발자들이 **LLM 기반 에이전트를 개발, 테스트, 배포 및 모니터링**할 수 있는 통합 플랫폼입니다.

### 1.2 주요 특징

- **멀티 프레임워크 지원**: Agno, ADK, Langchain, Custom 에이전트 통합
- **A2A 프로토콜**: 표준화된 Agent-to-Agent 통신 인터페이스
- **실시간 추적**: WebSocket 기반 실시간 로그 및 디버깅
- **지능형 추천**: Top-K 알고리즘 기반 에이전트 추천
- **사내/사외 개발**: Mock 서비스를 통한 독립적 개발 환경

### 1.3 프로젝트 구조

```
A2G-Dev-Space (GitHub Organization)
│
├── 📚 agent-platform-development/      # 메인 문서 저장소
├── 🌐 agent-platform-frontend/         # React 19 + TypeScript
├── 🏗️ agent-platform-infra/           # Docker, Nginx, Mock Services
├── 👤 agent-platform-user-service/     # 인증/권한 (FastAPI)
├── ⚙️ agent-platform-admin-service/    # LLM 관리 (FastAPI)
├── 🔄 agent-platform-worker-service/   # 백그라운드 작업 (Celery)
├── 💬 agent-platform-chat-service/     # 채팅 서비스 (FastAPI + WebSocket)
├── 📊 agent-platform-tracing-service/  # 로그 추적 (FastAPI)
└── 🤖 agent-platform-agent-service/    # 에이전트 관리 (FastAPI)
```

---

## 2. 비전과 목표

### 2.1 비전
> "사내 모든 개발자가 쉽게 AI 에이전트를 개발하고 운영할 수 있는 통합 플랫폼"

### 2.2 핵심 목표

1. **개발 생산성 향상**
   - 표준화된 A2A 프로토콜로 에이전트 간 통신 단순화
   - 실시간 디버깅으로 개발 시간 단축

2. **운영 안정성 확보**
   - 자동 헬스 체크 및 모니터링
   - 에이전트 버전 관리 및 롤백 지원

3. **확장성과 유연성**
   - 마이크로서비스 아키텍처로 독립적 확장
   - 다양한 LLM 프레임워크 통합 지원

---

## 3. 핵심 기능

### 3.1 A2A (Agent-to-Agent) Protocol

**통합 에이전트 통신 표준**

```json
{
  "jsonrpc": "2.0",
  "method": "agent.execute",
  "params": {
    "task": "분석 요청",
    "context": {"user_id": "test.user"}
  },
  "id": "request-001"
}
```

**지원 프레임워크**:
- **Agno**: 삼성 내부 에이전트 프레임워크
- **ADK**: Agent Development Kit
- **Langchain**: LangChain 기반 에이전트
- **Custom**: 사용자 정의 에이전트

### 3.2 Top-K 에이전트 추천 시스템

**AI 기반 최적 에이전트 매칭**

1. 사용자 쿼리 입력
2. LLM이 쿼리를 벡터로 임베딩
3. 등록된 에이전트 capabilities와 유사도 계산
4. 상위 K개 에이전트 추천 (점수 포함)

### 3.3 Multi-Agent Tracing

**실시간 다중 에이전트 실행 추적**

- WebSocket 기반 실시간 로그 스트리밍
- 에이전트별 색상 코딩
- Agent Transfer 자동 감지
- 실행 흐름 시각화

---

## 4. 플랫폼 모드

### 4.1 Workbench Mode (개발 모드)
- **목적**: 개인 에이전트 개발 및 테스트
- **특징**:
  - 실시간 로그 추적 (TraceCapturePanel)
  - 에이전트 등록/수정/삭제
  - 프라이빗 에이전트 실행
- **색상 테마**: 보라색/바이올렛 계열

### 4.2 Hub Mode (프로덕션 모드)
- **목적**: 프로덕션 에이전트 실행
- **특징**:
  - PRODUCTION 상태 에이전트만 표시
  - 추적 기능 비활성화 (성능 최적화)
  - 공개 에이전트만 실행
- **색상 테마**: 파란색 계열

### 4.3 Flow Mode (오케스트레이션 모드)
- **목적**: 다중 에이전트 워크플로우 실행
- **특징**:
  - 시각적 플로우 빌더
  - 순차/병렬 실행
  - 조건부 분기
- **색상 테마**: 청록색 계열

---

## 5. 기술 스택

### 5.1 Frontend
```yaml
Framework: React 19
Language: TypeScript
Build Tool: Vite
State Management: Zustand
Styling: Tailwind CSS + MUI
WebSocket: Socket.IO Client
```

### 5.2 Backend
```yaml
Framework: FastAPI (Python 3.11+)
Package Manager: uv (NOT pip/poetry)
Database: PostgreSQL 15 + SQLAlchemy 2.0
Cache/Broker: Redis 7
Task Queue: Celery
Migration: Alembic
```

### 5.3 Infrastructure
```yaml
API Gateway: Nginx
Container: Docker + Docker Compose
CI/CD: GitHub Actions
Monitoring: Prometheus + Grafana
```

---

## 6. 팀 구성

### 6.1 개발팀 구성 (4명)

| 개발자 | 담당 영역 | 서비스 | 역할 |
|--------|-----------|---------|------|
| **DEV1** (한승하) | Frontend + Infra | frontend, infra, user-service | SPRINT Lead, UI/UX, SSO |
| **DEV2** (이병주) | 관리 서비스 | admin-service, worker-service | LLM 관리, Celery |
| **DEV3** (김영섭) | 실시간 서비스 | chat-service, tracing-service | WebSocket, 로그 |
| **DEV4** (안준형) | 에이전트 서비스 | agent-service | A2A, Top-K, Registry |

### 6.2 Sprint 일정 (6주)

| Sprint | 주차 | 주요 작업 |
|--------|------|-----------|
| Sprint 0 | 1주차 | 환경 구축, 레포지토리 생성, Mock 서비스 |
| Sprint 1 | 2주차 | 핵심 백엔드 API 구현 |
| Sprint 2 | 3주차 | Frontend 코어 + 백엔드 통합 |
| Sprint 3 | 4-5주차 | 고급 기능 구현 |
| Sprint 4 | 6주차 | 통합 테스트, 버그 수정, 배포 |

---

## 7. 소프트웨어 요구사항

### 7.1 기능 요구사항

#### FR-001: 사용자 인증 및 권한
- SSO 기반 로그인
- RBAC (Role-Based Access Control)
  - PENDING: 승인 대기
  - USER: 일반 사용자
  - ADMIN: 관리자
- JWT 토큰 기반 세션 관리

#### FR-002: 에이전트 생명주기 관리
- CRUD 작업
- 상태 전환: DEVELOPMENT → STAGING → PRODUCTION → DEPRECATED
- 버전 관리 및 롤백

#### FR-003: 실시간 통신
- WebSocket 기반 채팅
- 실시간 로그 스트리밍
- Agent Transfer 감지

#### FR-004: 지능형 기능
- Top-K 에이전트 추천
- LLM 모델 관리
- 사용 통계 및 분석

### 7.2 비기능 요구사항

#### NFR-001: 성능
- API 응답 시간 < 500ms (P95)
- WebSocket 레이턴시 < 100ms
- 동시 사용자 1,000명 지원

#### NFR-002: 보안
- HTTPS/WSS 암호화
- JWT 토큰 유효기간: 12시간
- SQL Injection 방지
- XSS/CSRF 방지

#### NFR-003: 확장성
- 수평 확장 가능한 마이크로서비스
- 서비스별 독립 배포
- 자동 스케일링 지원

#### NFR-004: 가용성
- 99.9% Uptime SLA
- 자동 헬스 체크
- 장애 자동 복구

---

## 8. 데이터 모델

### 8.1 User (사용자)
```python
class User:
    id: int                    # Primary Key
    username: str             # SSO loginid
    username_kr: str          # 한글 이름
    email: str                # 이메일
    role: UserRole            # PENDING/USER/ADMIN
    department_kr: str        # 부서명 (한글)
    department_en: str        # 부서명 (영문)
    created_at: datetime      # 생성 시간
    updated_at: datetime      # 수정 시간
```

### 8.2 Agent (에이전트)
```python
class Agent:
    id: int                    # Primary Key
    name: str                  # 에이전트 이름
    framework: AgentFramework  # Agno/ADK/Langchain/Custom
    status: AgentStatus        # DEVELOPMENT/STAGING/PRODUCTION/DEPRECATED
    a2a_endpoint: str          # A2A 프로토콜 엔드포인트
    capabilities: dict         # {"skills": ["chat", "search"]}
    embedding_vector: vector   # 임베딩 벡터 (1536차원)
    owner_id: str             # 소유자 ID
    department: str           # 소속 부서
    is_public: bool           # 공개 여부
    health_status: str        # healthy/unhealthy/unknown
    created_at: datetime      # 생성 시간
    updated_at: datetime      # 수정 시간
```

### 8.3 ChatSession (채팅 세션)
```python
class ChatSession:
    id: int                    # Primary Key
    trace_id: str             # UUID for tracing
    user_id: str              # 사용자 ID
    agent_id: int             # 에이전트 ID
    title: str                # 세션 제목
    messages: list[Message]   # 메시지 목록
    created_at: datetime      # 생성 시간
    updated_at: datetime      # 수정 시간
```

### 8.4 LogEntry (로그)
```python
class LogEntry:
    id: int                    # Primary Key
    trace_id: str             # 추적 ID
    service_name: str         # 서비스명
    agent_id: int             # 에이전트 ID
    level: str                # DEBUG/INFO/WARNING/ERROR
    message: str              # 로그 메시지
    metadata: dict            # 추가 메타데이터
    created_at: datetime      # 생성 시간
```

---

## 9. 용어 사전

### 핵심 용어

| 용어 | 설명 |
|------|------|
| **A2A Protocol** | Agent-to-Agent Protocol. JSON-RPC 2.0 기반 표준 통신 규약 |
| **Top-K** | 벡터 유사도 기반 상위 K개 에이전트 추천 알고리즘 |
| **Trace ID** | 요청 추적을 위한 고유 식별자 (UUID) |
| **Agent Transfer** | 실행 중 다른 에이전트로 제어권 이전 |
| **Capability** | 에이전트가 수행 가능한 작업 목록 |
| **Embedding** | 텍스트를 벡터로 변환한 수치 표현 |
| **Mock Service** | 사외망 개발을 위한 모의 서비스 |
| **SSO** | Single Sign-On, 통합 인증 시스템 |
| **RBAC** | Role-Based Access Control, 역할 기반 접근 제어 |
| **WebSocket** | 실시간 양방향 통신 프로토콜 |

### 에이전트 프레임워크

| 프레임워크 | 설명 | 엔드포인트 형식 |
|------------|------|-----------------|
| **Agno** | 삼성 내부 AI 에이전트 프레임워크 | `http://agno.samsung.net/{agent-name}/agent` |
| **ADK** | Agent Development Kit | `http://adk.samsung.net/{agent-name}` |
| **Langchain** | LangChain 기반 에이전트 | `http://agent-name.langchain.com/execute` |
| **Custom** | 사용자 정의 에이전트 | `http://custom-endpoint.com` |

### 플랫폼 모드 비교

| 구분 | Workbench | Hub | Flow |
|------|-----------|-----|------|
| **용도** | 개발/테스트 | 프로덕션 실행 | 워크플로우 |
| **추적** | 실시간 로그 | 비활성화 | 플로우 추적 |
| **에이전트** | 모든 상태 | PRODUCTION만 | 선택적 |
| **접근** | 개인/팀 | 공개 | 권한 기반 |
| **색상** | 보라색 | 파란색 | 청록색 |

---

## 10. 빠른 시작

### 10.1 사전 준비
```bash
# 필수 도구 설치
- Docker Desktop
- Node.js 18+
- Python 3.11+
- uv (Python 패키지 매니저)
- Git
```

### 10.2 Docker로 인프라 실행
```bash
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

# 데이터베이스 생성
docker exec -it a2g-postgres-dev psql -U dev_user -d postgres
CREATE DATABASE user_service_db;
CREATE DATABASE admin_service_db;
CREATE DATABASE agent_service_db;
CREATE DATABASE chat_service_db;
CREATE DATABASE tracing_service_db;
\q
```

### 10.3 Frontend 실행
```bash
git clone https://github.com/A2G-Dev-Space/agent-platform-frontend.git
cd agent-platform-frontend
npm install
npm run dev
# http://localhost:9060
```

### 10.4 Backend 서비스 실행 (예: User Service)
```bash
git clone https://github.com/A2G-Dev-Space/agent-platform-user-service.git
cd agent-platform-user-service

# Python 환경 설정
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate

# 패키지 설치
uv sync

# 환경 변수 설정
cat > .env.local << EOF
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db
SERVICE_PORT=8001
JWT_SECRET_KEY=local-dev-secret-key
EOF

# DB 마이그레이션
alembic init alembic  # 최초 1회
alembic revision --autogenerate -m "Initial"
alembic upgrade head

# 서버 실행
uvicorn app.main:app --reload --port 8001
```

### 10.5 서비스 포트 맵

| 서비스 | 포트 | URL |
|--------|------|-----|
| Frontend | 9060 | http://localhost:9060 |
| API Gateway | 9050 | https://localhost:9050 |
| User Service | 8001 | http://localhost:8001/docs |
| Agent Service | 8002 | http://localhost:8002/docs |
| Chat Service | 8003 | http://localhost:8003/docs |
| Tracing Service | 8004 | http://localhost:8004/docs |
| Admin Service | 8005 | http://localhost:8005/docs |
| Mock SSO | 9999 | http://localhost:9999 |

---

## 📞 지원 및 문의

- **Slack**: #a2g-platform-dev
- **프로젝트 리드**: syngha.han (DEV1)
- **GitHub**: https://github.com/A2G-Dev-Space
- **문서**: 이 파일이 메인 참조 문서입니다

---

**© 2025 A2G Platform Development Team. All rights reserved.**