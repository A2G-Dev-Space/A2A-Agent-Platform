# ⚙️ Admin Service

**담당자**: DEV2 (이병주)
**포트**: 8005
**기능**: LLM 모델 관리, 플랫폼 통계, 관리자 기능

## 📋 서비스 개요

Admin Service는 플랫폼 관리자를 위한 핵심 관리 서비스로, LLM 모델 관리, 사용 통계 분석, 사용자/에이전트 관리 등의 관리 기능을 제공합니다.

## 🚀 빠른 시작

### 일반 사용 (권장)

`./start-dev.sh full`을 실행하면 이 서비스는 자동으로 Docker로 실행됩니다.

```bash
# 프로젝트 루트 디렉토리에서
./start-dev.sh setup   # 최초 1회
./start-dev.sh full    # 모든 서비스 시작 (이 서비스 포함)
```

### 이 서비스만 로컬 개발 (디버깅/개발 시)

Admin Service만 로컬에서 실행하고 싶을 때:

```bash
# 1. Docker 컨테이너 중지
docker stop a2g-admin-service

# 2. 로컬 환경 설정
cd repos/admin-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<ENVEOF
SERVICE_NAME=admin-service
SERVICE_PORT=8005
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/admin_service_db
REDIS_URL=redis://localhost:6379/4
JWT_SECRET_KEY=local-dev-secret-key
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]

# OpenAI API (선택사항)
OPENAI_API_KEY=your-api-key
OPENAI_MODEL_DEFAULT=gpt-3.5-turbo
ENVEOF

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 로컬에서 실행
uvicorn app.main:app --reload --port 8005

# 6. 헬스 체크
curl http://localhost:8005/health
```

## 🎯 주요 기능

- LLM 모델 등록 및 관리
- 플랫폼 통계 대시보드
- 사용자 권한 관리
- 에이전트 승인 프로세스

---

**문의**: DEV2 (byungju.lee@company.com) 또는 Slack #a2g-platform-dev
