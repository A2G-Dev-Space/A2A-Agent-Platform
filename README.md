# 🚀 A2A-Agent-Platform

AI 에이전트를 개발, 테스트, 배포 및 모니터링할 수 있는 통합 A2A (Agent-to-Agent) 플랫폼

## ✨ 주요 특징

- **🔄 Universal A2A Proxy**: 다양한 LLM 프레임워크(Google ADK, Agno OS, Langchain, Custom)를 단일 A2A 프로토콜로 통합
- **⭐ A2A Native 지원**: Google ADK는 Proxy 없이 직접 A2A endpoint 호출 (최적 성능)
- **🤖 Well-known Framework 지원**: Agno OS 등 표준 endpoint 패턴 자동 생성
- **🎯 A2A (Agent-to-Agent) Protocol**: JSON-RPC 2.0 기반 표준 통신
- **📡 Real-time Streaming**: Server-Sent Events (SSE) 기반 실시간 응답
- **🎨 3가지 모드**: Workbench (개발), Hub (사용), Flow (워크플로우)
- **🔐 통합 인증**: SSO + JWT 기반 Access Control (public/private/team)

## 🎯 사용자 경험 (User Journey)

A2A-Agent-Platform은 **3가지 운영 모드**로 AI 에이전트의 전체 라이프사이클을 지원합니다.

### 1️⃣ Workbench Mode: 에이전트 개발 및 테스트 🔧

**목적**: 에이전트를 등록하고, 설정하고, 테스트하는 개발 환경

**주요 기능**:

#### Agent 등록
- **프레임워크 선택**: Google ADK, Agno OS, Langchain, Custom 중 선택
- **자동 Endpoint 생성**:
  - A2A Native (Google ADK): Base URL만 입력 → Agent Card Discovery 자동
  - Well-known (Agno OS): Base URL + Agent ID 입력 → Endpoint 자동 생성
  - Custom: 전체 URL 직접 입력
- **Agent Card 설정**:
  - 이름, 설명, 버전
  - 카드 색상 (브랜딩)
  - Capabilities (streaming, tools, memory 등)
  - 태그 및 카테고리

#### Agent 구성
- **Access Control 설정**:
  - Public: 모든 사용자 접근 가능
  - Private: 본인만 접근 가능
  - Team: 특정 팀/부서만 접근 가능
- **Framework 설정**:
  - Authentication 정보 (API keys, tokens)
  - Custom headers 추가
  - Timeout 설정

#### 실시간 테스트
- **Dual Endpoint Testing**:
  - **A2A Proxy Endpoint**: 플랫폼 Proxy를 통한 테스트 (프로덕션과 동일)
  - **Original Endpoint**: 직접 호출 테스트 (디버깅용)
- **Interactive Chat Interface**:
  - 메시지 송수신 테스트
  - Streaming 응답 확인
  - Context 유지 확인
- **Real-time Tracing**:
  - 요청/응답 로그 실시간 확인
  - Latency 측정
  - 에러 디버깅

#### Agent 관리
- **버전 관리**: Agent 버전별 히스토리
- **Health Check**: Endpoint 상태 모니터링
- **Usage Statistics**: 호출 횟수, 평균 응답 시간 등

---

### 2️⃣ Hub Mode: 에이전트 사용 및 협업 🤝

**목적**: 등록된 에이전트를 검색하고, 선택하고, 실제로 사용하는 프로덕션 환경

**주요 기능**:

#### Agent Discovery (검색 및 발견)
- **Top-K Semantic Search**:
  - 자연어 쿼리로 Agent 검색
  - 벡터 기반 의미론적 매칭
  - OpenAI Embeddings 활용
  - 예: "데이터 분석을 도와줄 수 있는 에이전트를 찾아줘"
- **필터링**:
  - Framework별 필터
  - 카테고리/태그별 필터
  - Access Level별 필터 (본인 접근 가능한 것만 표시)
- **Agent Card 미리보기**:
  - 이름, 설명, Capabilities
  - 사용 통계 (인기도, 평점)
  - Framework 및 버전 정보

#### Interactive Chat
- **A2A Protocol 기반 대화**:
  - A2A JS SDK를 통한 표준화된 통신
  - 모든 Framework 에이전트와 동일한 방식으로 대화
- **실시간 Streaming**:
  - Server-Sent Events (SSE) 기반
  - 타이핑 효과로 응답 표시
  - 청크 단위로 즉시 렌더링
- **Context Management**:
  - 대화 히스토리 유지
  - Session 기반 Context
  - Multi-turn Conversation 지원
- **Rich Content Support**:
  - 텍스트, 코드, 이미지
  - Tool 호출 결과 표시
  - Artifacts 렌더링

#### Agent Collaboration
- **Multi-Agent Session**:
  - 하나의 대화에 여러 Agent 참여 (미래 기능)
  - Agent 간 협업
- **History & Bookmarks**:
  - 대화 히스토리 저장
  - 중요한 대화 북마크
  - 대화 내보내기 (Export)

#### Usage Analytics
- **개인 사용 통계**:
  - Agent별 사용 빈도
  - 평균 응답 시간
  - 만족도 피드백

---

### 3️⃣ Flow Mode: Multi-Agent 워크플로우 오케스트레이션 🔀

**목적**: 여러 에이전트를 조합하여 복잡한 워크플로우를 구성하는 고급 기능

**현재 상태**: UI 준비 완료, A2A JS SDK의 RemoteA2aAgent 지원 대기 중

**계획된 기능**:

#### Workflow Design
- **Visual Flow Builder**:
  - 드래그 앤 드롭으로 Agent 연결
  - 조건부 분기 (Conditional Flow)
  - 병렬 실행 (Parallel Execution)
- **Sub-Agent 구성**:
  - Root Agent 정의
  - Sub-Agent로 등록된 Agent 추가
  - Agent 간 데이터 전달 설정

#### Orchestration
- **Intelligent Routing**:
  - Root Agent가 적절한 Sub-Agent 선택
  - Context 기반 라우팅
  - Fallback Agent 지정
- **State Management**:
  - 전체 워크플로우 상태 관리
  - Agent 간 데이터 공유
  - 중간 결과 저장

#### Execution & Monitoring
- **실시간 워크플로우 실행**:
  - 각 Agent 실행 상태 시각화
  - 실시간 로그 스트리밍
  - 에러 발생 시 자동 재시도
- **Workflow History**:
  - 실행 히스토리 저장
  - 성공/실패 분석
  - 병목 구간 식별

---

### 4️⃣ Admin Features: 플랫폼 관리 (관리자 전용) 👨‍💼

**목적**: 플랫폼 전체의 리소스 관리 및 모니터링

**주요 기능**:

#### LLM Model Management
- **Model Pool 관리**:
  - 사용 가능한 LLM 모델 등록 (GPT-4, Claude, Gemini 등)
  - 모델별 API Key 관리
  - Rate Limit 설정
- **Model Assignment**:
  - 팀/사용자별 모델 할당
  - 사용량 쿼터 관리

#### Platform Statistics
- **전체 사용 통계**:
  - 일별/주별/월별 사용량
  - 가장 인기 있는 Agent Top 10
  - Framework별 분포
  - 응답 시간 평균
- **User Activity**:
  - Active Users 통계
  - 팀별 사용량
  - 비정상 패턴 감지

#### Agent Monitoring
- **Health Dashboard**:
  - 모든 Agent의 상태 한눈에 확인
  - Endpoint 연결 상태
  - 에러율 모니터링
- **Performance Metrics**:
  - Agent별 평균 응답 시간
  - 성공률/실패율
  - Timeout 발생 빈도

---

### 5️⃣ Cross-Cutting Features: 모든 모드에서 사용 가능 🌐

#### 통합 인증 (SSO)
- **싱글 사인온**:
  - 회사 SSO 계정으로 로그인
  - JWT 기반 세션 관리
  - 자동 토큰 갱신
- **Role-Based Access Control**:
  - User, Developer, Admin 역할
  - 역할별 기능 접근 제어

#### Real-time Tracing
- **모든 요청 추적**:
  - 요청/응답 로그 실시간 조회
  - Correlation ID 기반 추적
  - 에러 스택 트레이스
- **Debugging Tools**:
  - 요청 재실행 (Replay)
  - 응답 비교 (Diff)
  - 성능 프로파일링

#### Notifications
- **실시간 알림**:
  - Agent 상태 변경 알림
  - 에러 발생 알림 (Slack 연동)
  - 시스템 점검 공지

---

## 💼 사용 사례 (Use Cases)

### 사례 1: AI 개발자 - Agent 개발 및 배포
```
1. Workbench에서 Langchain Agent 등록
   - Framework: Langchain
   - Original Endpoint: http://my-server:8080/agent
   - Access: Private (개발 중)

2. Workbench에서 실시간 테스트
   - A2A Proxy Endpoint로 메시지 전송
   - Streaming 응답 확인
   - Tracing 로그로 Latency 측정

3. 테스트 완료 후 Public으로 변경
   - Access Control을 Public으로 전환
   - Hub에 자동으로 노출됨

4. Hub에서 본인의 Agent 사용
   - 검색하여 Agent 찾기
   - 실제 업무에 활용
```

### 사례 2: 일반 사용자 - Agent 검색 및 사용
```
1. Hub에서 "코드 리뷰" 검색
   - Top-K Semantic Search 결과 확인
   - 가장 적합한 Agent 선택

2. Interactive Chat으로 대화
   - 코드 붙여넣기
   - Streaming으로 리뷰 결과 즉시 확인

3. 만족스러운 결과 → 북마크 저장
   - 다음에 빠르게 재사용
```

### 사례 3: 팀 리더 - Multi-Agent Workflow 구성 (미래)
```
1. Flow에서 "데이터 분석 파이프라인" Workflow 생성
   - Root Agent: Orchestrator
   - Sub-Agent 1: Data Fetcher
   - Sub-Agent 2: Analyzer
   - Sub-Agent 3: Report Generator

2. Workflow 실행
   - Root Agent가 자동으로 Sub-Agent 조율
   - 실시간 진행 상황 확인

3. 결과 리포트 생성
   - 전체 워크플로우 결과 저장
   - 팀원들과 공유
```

### 사례 4: 관리자 - 플랫폼 운영
```
1. Admin Dashboard에서 전체 현황 확인
   - 오늘 Active Users: 150명
   - 가장 많이 사용된 Agent: "Code Assistant"
   - 평균 응답 시간: 2.3초

2. 새로운 LLM Model 추가
   - GPT-4o 모델 등록
   - API Key 설정
   - 개발팀에만 우선 할당

3. Agent Health 모니터링
   - 연결 실패한 Agent 발견
   - 담당 개발자에게 알림 전송
```

---

## 📚 프로젝트 문서

### 핵심 문서
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - 프로젝트 전체 개요 (먼저 읽으세요!)
- **[PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md)** - 상세 통합 가이드
- **[A2A_INTEGRATION_DESIGN.md](./A2A_INTEGRATION_DESIGN.md)** - A2A Universal Proxy 설계 문서 (필독)
- **[WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md)** - WSL 개발환경 설정 가이드

### Framework 지원 (3가지 유형)

**1️⃣ A2A Native Frameworks (Direct Call - Proxy 불필요) ⭐**
- **Google ADK**: A2A Protocol 네이티브 지원
  - 입력: Base URL만 (`http://your-server:8080`)
  - 호출: Frontend → Agent A2A Endpoint (Direct)
  - **Proxy 불필요** → 최적의 성능

**2️⃣ Well-known Non-A2A Frameworks (Proxy 필요) 🔄**
- **Agno OS**: 표준 endpoint 패턴 보유, 프로토콜 변환 필요
  - 입력: Base URL + Agent ID
  - 패턴: `{base_url}/agents/{agent_id}/runs`
  - 호출: Frontend → A2A Proxy → Protocol 변환 → Agent

**3️⃣ Custom Frameworks (Proxy 필요) 🔧**
- **Langchain, Custom**: 전체 endpoint URL 직접 입력
  - 입력: 전체 URL (`http://my-server.com/langchain/invoke`)
  - 호출: Frontend → A2A Proxy → Protocol 변환 → Agent

**💡 참고**: Agno OS는 향후 A2A 지원 완료 시 A2A Native로 전환 예정

### 서비스별 개발 가이드
각 서비스의 상세 개발 가이드는 해당 서비스 폴더의 README.md를 참조하세요:

- [API Gateway](./repos/api-gateway/README.md) - Port 9050
- [User Service](./repos/user-service/README.md) - Port 8001
- [Agent Service](./repos/agent-service/README.md) - Port 8002
- [Chat Service](./repos/chat-service/README.md) - Port 8003
- [Tracing Service](./repos/tracing-service/README.md) - Port 8004
- [Admin Service](./repos/admin-service/README.md) - Port 8005
- [Worker Service](./repos/worker-service/README.md) - Background Worker

## 🚀 빠른 시작

### 일반 개발/테스트 (권장)

모든 백엔드 서비스는 Docker로 실행되며, Frontend만 로컬에서 실행합니다.

```bash
# 1. 프로젝트 클론
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 2. 개발 환경 초기 설정 (최초 1회만 실행)
./start-dev.sh setup

# 3. 모든 서비스 시작 (백엔드는 Docker로 자동 실행됨)
./start-dev.sh full

# 4. Frontend만 로컬 실행 (별도 터미널)
cd frontend
npm install
npm run dev

# 5. 브라우저에서 접속
# Frontend: http://localhost:9060
# API Gateway: http://localhost:9050
```

### 특정 서비스 개발 시 (Backend 개발자)

특정 서비스만 로컬에서 디버깅/개발하고 싶을 때:

```bash
# 1. 모든 서비스 시작
./start-dev.sh full

# 2. 개발할 서비스만 Docker에서 중지
docker stop a2g-{service-name}

# 3. 해당 서비스를 로컬에서 실행
cd repos/{service-name}
uv venv && source .venv/bin/activate
uv sync
uvicorn app.main:app --reload --port {port}

# 예: chat-service 개발 시
# docker stop a2g-chat-service
# cd repos/chat-service
# uvicorn app.main:app --reload --port 8003
```

### 개발 환경 관리 명령어

```bash
# 초기 데이터베이스 설정 (처음 한번만)
./start-dev.sh setup

# 데이터베이스 마이그레이션 업데이트 (git pull 후)
./start-dev.sh update

# 모든 서비스 시작
./start-dev.sh full

# 최소 서비스만 시작 (API Gateway + Mock SSO + DB)
./start-dev.sh minimal

# API Gateway와 데이터베이스만 시작
./start-dev.sh gateway

# 모든 서비스 중지
./start-dev.sh stop
```

## 🏗️ 프로젝트 구조

```
Agent-Platform-Development/
├── frontend/               # React 19 + TypeScript Frontend
├── repos/                  # 백엔드 마이크로서비스들
│   ├── api-gateway/       # API 게이트웨이
│   ├── user-service/      # 사용자 인증 서비스
│   ├── agent-service/     # 에이전트 관리 서비스
│   ├── chat-service/      # 채팅 서비스
│   ├── tracing-service/   # 로그 추적 서비스
│   ├── admin-service/     # 관리자 서비스
│   ├── worker-service/    # 백그라운드 작업 서비스
│   ├── infra/            # Docker Compose 및 인프라 설정
│   └── shared/           # 공유 라이브러리
├── PROJECT_OVERVIEW.md    # 프로젝트 개요
├── PROJECT_INTEGRATED_GUIDE.md  # 통합 가이드
├── WSL_DEVELOPMENT_SETUP.md     # WSL 설정 가이드
└── README.md             # 이 파일

```

## 👥 팀 구성

| 개발자 | 담당 영역 | 연락처 |
|--------|-----------|--------|
| **한승하** | Frontend + Infra | syngha.han@company.com |
| **이병주** | Admin/Worker Service | byungju.lee@company.com |
| **김영섭** | Chat/Tracing Service | youngsub.kim@company.com |
| **안준형** | Agent Service | junhyung.ahn@company.com |

## 👥 팀 개발 워크플로우

### Git Pull 후 확인사항

다른 팀원이 데이터베이스 마이그레이션을 추가한 경우:

```bash
# 1. 코드 pull
git pull origin main

# 2. 모든 서비스의 마이그레이션 자동 업데이트
./start-dev.sh update

# 출력 예시:
# 🔄 Updating all service databases with latest migrations...
#
# 📦 user-service: Checking for migrations...
#    Current: 001
#    Running: alembic upgrade head...
#    ✅ Already up to date (001)
#
# 📦 agent-service: Checking for migrations...
#    Current: 001
#    Running: alembic upgrade head...
#    ✅ Updated to: 002
#
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 📊 Migration Update Summary:
#    ✅ Success: 2
#    ⏭️  Skipped: 3
#    ❌ Failed:  0
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#
# 🎉 All migrations completed successfully!
```

**⚠️ 주의:**
- `./start-dev.sh update`를 실행하지 않으면 DB 스키마와 코드가 맞지 않아 에러 발생
- PostgreSQL이 실행 중이어야 합니다 (`./start-dev.sh setup` 또는 `full` 먼저 실행)

### 새 마이그레이션 생성 시

스키마를 변경한 경우 해당 서비스에서 마이그레이션 생성:

```bash
# 1. 서비스 디렉토리로 이동
cd repos/agent-service

# 2. 모델 변경 (app/core/database.py 등)

# 3. 마이그레이션 생성
alembic revision --autogenerate -m "Add user_preferences table"

# 4. 생성된 파일 검토
# alembic/versions/002_add_user_preferences_table.py

# 5. 로컬에서 테스트
alembic upgrade head

# 6. 커밋 및 푸시
git add alembic/versions/002_*.py
git commit -m "feat: add user_preferences table migration"
git push

# 7. 팀원들에게 알리기
# Slack: "agent-service에 새 마이그레이션 추가했습니다. pull 후 ./start-dev.sh update 실행해주세요!"
```

### 일반적인 워크플로우

```bash
# 매일 아침 작업 시작 시
git pull origin main
./start-dev.sh update    # 새 마이그레이션 적용
./start-dev.sh full      # 서비스 시작
cd frontend && npm run dev

# 작업 중
# 1. 코드 변경
# 2. 테스트
# 3. 커밋 & 푸시

# 작업 종료 시
./start-dev.sh stop
```

## 📞 지원

- **GitHub**: https://github.com/A2G-Dev-Space/A2A-Agent-Platform

---

**© 2025 A2A-Agent-Platform Development Team**