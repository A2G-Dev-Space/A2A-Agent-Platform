## 1. 🎯 프로젝트 비전 및 핵심 목표

A2G Agent Platform은 개발자들이 LLM 기반 에이전트를 **쉽게 개발(IDE)**, **테스트(Playground)**, **배포(Vending Machine)**, **모니터링(Stats)**, **사용(Use)** 할 수 있도록 지원하는 차세대 통합 에이전트 운영 플랫폼입니다.
본 프로젝트(Phase 2)의 핵심 목표는 다음과 같습니다.
 * (REQ 0) 확장 가능한 아키텍처: 기존 모놀리식 구조에서 탈피하여, 고성능/고가용성을 위한 **마이크로서비스 아키텍처(MSA)**를 구축합니다.
 * (REQ 4) 최고의 UI/UX: Google Gemini 수준의 세련되고 직관적인 UI를 제공하여 사용자 경험을 극대화합니다.
 * (REQ 2) 개방형 생태계 (A2A): A2A(Agent-to-Agent) 프로토콜 및 SDK를 지원하여, Agno, Langchain(LangGraph), ADK 등 다양한 외부 프레임워크와의 원활한 연동을 보장합니다.
 * (REQ 1) 지능형 플랫폼: 단순한 도구 모음을 넘어, 사용자의 요구에 맞는 에이전트를 추천(AI Ranking)하고, 리소스(Lifecycle)를 자동 관리하는 지능형 플랫폼을 지향합니다.
 * (REQ 3, 7, 10) 강력한 디버깅 경험:** 실시간 멀티 에이전트 로그 추적, 대화형 채팅 히스토리, 리치 미디어(파일/이미지)를 지원하는 통합 Workbench를 제공합니다.

## 2. 🏛️ 목표 아키텍처 (Microservice Structure) - (REQ 0)

Phase 2 아키텍처는 기능적 책임을 명확히 분리한 마이크로서비스들로 구성됩니다. 모든 서비스는 API Gateway를 통해 통신하며 독립적으로 배포/확장됩니다.
(개략적인 아키텍처 다이어그램 삽입 위치)

| 서비스 ID | 서비스명 | 주요 기술 | 핵심 책임 (분할된 기능) |
|---|---|---|---|
| 1 | api-gateway | Nginx / Kong | 단일 진입점: SSL 종료, 요청 라우팅, 전역 인증(JWT 검증), 속도 제한 |
| 2 | frontend | React / Vite | 사용자 인터페이스: (REQ 4) Gemini 기반 UI, (REQ 1) 모드별 테마, (REQ 3) 리치 플레이그라운드 |
| 3 | user-service | Go (Gin) / FastAPI | 인증/인가: SSO 연동, JWT 발급/검증, 역할(RBAC) 관리, API Key CRUD |
| 4 | agent-service | FastAPI (Python) | 에이전트 관리: (REQ 5) 에이전트 CRUD (메타데이터/디자인 포함), (REQ 2) A2A 등록 API, (REQ 1) AI 랭킹 API |
| 5 | chat-service | FastAPI (Python) | 실시간 통신: (REQ 7) WebSocket 연결/인증/그룹 관리, (REQ 6, 8) Chat History (세션/메시지) CRUD API, (REQ 3) 파일 업/다운로드 |
| 6 | tracing-service | Go (Fiber) / Rust | 로그 프록시: (고성능) /api/log-proxy/ 운영, LLM 호출 검증/로깅(DB 저장), chat-service로 로그 전송 (gRPC/PubSub) |
| 7 | admin-service | Django / FastAPI | 플랫폼 관리: (Django Admin) 사용자 역할 부여, LLM 모델 등록. (FastAPI) LLM 통계, 에이전트 통계 API 제공 |
| 8 | worker-service | Celery (Python) | 비동기 작업: (REQ 12) LLM/Agent 헬스 체크, (REQ 10, 11) 비활성 에이전트 정리, (REQ 12) 실패 알림 (사내 메일 연동) |
| 9 | database | PostgreSQL | 데이터 영속성: 모든 서비스의 공용 데이터베이스 |
| 10 | message-broker | Redis | 메시지 큐: Celery 브로커, 서비스 간 Pub/Sub 통신 |

## 3. 🛠️ 핵심 기술 스택 (Technology Stack)

| 구분 | 기술 스택 | 상세 설명 |
|---|---|---|
| Frontend | React 19+ (Vite), TypeScript | (REQ 4) 성능과 안정성을 갖춘 최신 프론트엔드 환경. |
|  | Zustand | 간결하고 강력한 전역 상태 관리. |
|  | Tailwind CSS + MUI (Base UI) | (REQ 4) Gemini 스타일의 세련된 UI를 위한 유틸리티 및 컴포넌트 라이브러리. |
|  | React Router DOM | SPA 라우팅 및 중첩/동적 레이아웃 관리. |
|  | Recharts | 관리자용 통계 대시보드 시각화. |
|  | React Markdown | (REQ 3) 채팅창 Markdown, 코드 블록 렌더링. |
|  | Socket.IO Client (또는 useWebSocket) | (REQ 7) 실시간 Trace Log 수신. |
| API Gateway | Nginx (초기) / Kong (확장) | (REQ 0) 마이크로서비스 진입점, 라우팅, SSL 종료, 인증 처리. |
| Backend Services | Go (Gin / Fiber) | (REQ 0) user-service, tracing-service 등 고성능/저지연이 필수적인 서비스. |
|  | FastAPI (Python) | (REQ 0) agent-service, chat-service 등 Python 생태계(AI/ML) 연동 및 빠른 API 개발이 필요한 서비스. |
|  | Django (Python) | (REQ 0) admin-service의 핵심. 강력한 Admin UI를 즉시 제공. |
|  | Celery & Redis | (REQ 0) worker-service의 핵심. 비동기/주기적 작업 실행. |
| Database & Infra | PostgreSQL, Redis | 데이터 영속성 및 고성능 메시지 브로커/캐시. |
|  | Docker & Compose | 개발 및 배포 환경 표준화. |
| Inter-Service | gRPC (선호) / REST API | (REQ 0) 서비스 간 고효율 내부 통신 프로토콜. |

## 4. 📂 프로젝트 구조 (Monorepo) - (REQ 0)

Phase 2는 서비스 간의 연동 및 버전 관리를 용이하게 하기 위해 Monorepo 구조를 지향합니다.

```text
/ (Project Root: agent-platform)
├── services/                 # (신규) 백엔드 마이크로서비스
│   ├── user-service/         # (Go/Gin) 인증, 유저, API Key
│   ├── agent-service/        # (FastAPI) 에이전트 CRUD, 랭킹, A2A
│   ├── chat-service/         # (FastAPI) 채팅 세션/메시지, WebSocket
│   ├── tracing-service/      # (Go/Fiber) 로그 프록시, 로그 저장/전송
│   ├── admin-service/        # (Django) 관리자 UI, 통계 API
│   └── worker-service/       # (Celery) 백그라운드 작업 (헬스체크, 정리)
│
├── frontend/                 # 프론트엔드 (React/Vite)
│   ├── public/               # (REQ 2, 4) 로고, Favicon, 다국어 파일
│   ├── src/
│   │   ├── api/              # 백엔드 서비스 API 호출 함수
│   │   ├── assets/           # (REQ 4) UI 디자인용 이미지, 아이콘
│   │   ├── components/       # 재사용 UI (디자인 시스템 기반)
│   │   │   ├── common/       # (Button, Modal, Input...)
│   │   │   ├── layout/       # (Header, Sidebar...)
│   │   │   ├── agent/        # (AgentCard, AddAgentModal...)
│   │   │   ├── chat/         # (ChatMessageList, ChatInput...)
│   │   │   └── trace/        # (LiveTrace, TraceLogItem...)
│   │   ├── hooks/            # (useActiveApiKey, useTraceLogSocket...)
│   │   ├── pages/            # 라우팅 단위 페이지
│   │   │   ├── AgentPlayground/  # 플레이그라운드 (하위 컴포넌트 분리)
│   │   │   ├── Settings/       # 설정 (하위 탭 컴포넌트 분리)
│   │   │   └── ...
│   │   ├── services/         # (REQ 7.7) 프레임워크별 로직 (전략 패턴)
│   │   │   ├── agent-frameworks/
│   │   │   │   ├── framework.interface.ts
│   │   │   │   ├── framework.registry.ts
│   │   │   │   ├── agno.service.tsx
│   │   │   │   ├── custom.service.tsx
│   │   │   │   └── (adk.service.tsx, langgraph.service.tsx ...)
│   │   │   └── agnoApiService.ts
│   │   ├── store/            # Zustand 스토어 (auth, workspace, framework)
│   │   ├── styles/           # 전역 CSS, Tailwind 설정
│   │   ├── types/            # (agent.ts, chat.ts, trace.ts...)
│   │   ├── utils/            # 공통 유틸리티 함수
│   │   ├── App.tsx           # 메인 라우팅/테마 적용
│   │   └── main.tsx          # 애플리케이션 시작점
│   └── vite.config.ts
│
├── infra/                    # 인프라 설정 (IaC)
│   ├── docker-compose/       # (신규) 서비스별/환경별 Docker Compose
│   ├── nginx/                # API Gateway 설정
│   └── certs/                # 로컬 개발용 SSL 인증서
│
├── sdks/                     # (신규) A2A 프로토콜 SDK (REQ 2)
│   ├── python-sdk/
│   └── js-sdk/
│
├── docs/                     # 공통 문서 (본 README.md, SRS.md 등)
│
└── package.json              # (Monorepo 루트 - Lerna/Nx/Turborepo 관리)
```

## 5. 🤝 개발 및 협업 가이드
 * Git 브랜칭: main (안정, 배포), develop (개발 통합), feature/{JIRA-TICKET} (기능 개발) 플로우를 사용합니다.
 * 커밋/PR: 모든 커밋은 type(scope): message (예: feat(agent-service): A2A 등록 API 구현) 형식을 따릅니다. PR은 반드시 1명 이상의 리뷰어 승인을 받아야 develop에 머지됩니다.
 * 코드 품질: 모든 커밋은 lint-staged를 통해 Pre-commit Hook이 실행되어, 각 서비스/앱에 정의된 린트(ESLint, Flake8) 및 포맷터(Prettier, Black)를 통과해야 합니다.
 * 상태 관리 (Frontend): 전역 상태는 Zustand를 사용합니다. 서버 상태(API 데이터)는 react-query (TanStack Query) 도입을 적극 권장합니다.
6. 📞 Contact Point (REQ 3)
 * 책임 개발자: 한승하 (syngha.han@samsung.com)
 * 문의 채널 (임시): (A2G 플랫폼 개발팀 사내 메신저 채널)
 * 버그 리포트 / 기능 제안: (프로젝트 Jira 또는 Git Issues 링크)
<!-- end list -->

