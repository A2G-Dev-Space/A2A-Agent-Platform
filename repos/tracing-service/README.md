# 🔍 Tracing Service

**담당자**: DEV3 (김영섭)
**포트**: 8004
**기능**: 로그 수집, 실시간 추적, Agent Transfer 감지

## 📋 서비스 개요

Tracing Service는 플랫폼 전체의 로그를 수집하고, 에이전트 실행을 실시간으로 추적하며, 멀티 에이전트 간 Transfer를 감지하는 핵심 모니터링 서비스입니다.

## 🚀 빠른 시작

### 일반 사용 (권장)

`./start-dev.sh full`을 실행하면 이 서비스는 자동으로 Docker로 실행됩니다.

```bash
# 프로젝트 루트 디렉토리에서
./start-dev.sh setup   # 최초 1회
./start-dev.sh full    # 모든 서비스 시작 (이 서비스 포함)
```

### 이 서비스만 로컬 개발 (디버깅/개발 시)

Tracing Service만 로컬에서 실행하고 싶을 때:

```bash
# 1. Docker 컨테이너 중지
docker stop a2g-tracing-service

# 2. 로컬 환경 설정
cd repos/tracing-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<ENVEOF
SERVICE_NAME=tracing-service
SERVICE_PORT=8004
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/tracing_service_db
REDIS_URL=redis://localhost:6379/3
JWT_SECRET_KEY=local-dev-secret-key
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
ENVEOF

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 로컬에서 실행
uvicorn app.main:app --reload --port 8004

# 6. 헬스 체크
curl http://localhost:8004/health
```

## 🎯 주요 기능

- 로그 수집 및 저장
- 실시간 로그 스트리밍
- Agent Transfer 자동 감지
- 성능 메트릭 수집

---

**문의**: DEV3 (youngsub.kim@company.com) 또는 Slack #a2g-platform-dev
