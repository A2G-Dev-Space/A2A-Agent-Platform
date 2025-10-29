# 🚀 A2G Agent Platform Development

AI 에이전트를 개발, 테스트, 배포 및 모니터링할 수 있는 통합 플랫폼

## 📚 프로젝트 문서

### 핵심 문서
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - 프로젝트 전체 개요 (먼저 읽으세요!)
- **[PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md)** - 상세 통합 가이드
- **[WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md)** - WSL 개발환경 설정 가이드

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

- **Slack**: #a2g-platform-dev
- **GitHub**: https://github.com/A2G-Dev-Space

---

**© 2025 A2G Platform Development Team**