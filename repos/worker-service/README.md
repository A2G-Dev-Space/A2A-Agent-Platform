# 🔧 Worker Service

**담당자**: DEV2 (이병주)
**포트**: N/A (백그라운드 워커)
**기능**: Celery 비동기 작업 처리, 배치 작업, 스케줄링

## 📋 서비스 개요

Worker Service는 Celery 기반 백그라운드 작업 처리 서비스로, 무거운 연산, 배치 처리, 스케줄 작업 등을 비동기로 처리합니다.

## 🚀 빠른 시작

### 일반 사용 (권장)

`./start-dev.sh full`을 실행하면 이 서비스는 자동으로 Docker로 실행됩니다.

```bash
# 프로젝트 루트 디렉토리에서
./start-dev.sh setup   # 최초 1회
./start-dev.sh full    # 모든 서비스 시작 (이 서비스 포함)
```

### 이 서비스만 로컬 개발 (디버깅/개발 시)

Worker Service만 로컬에서 실행하고 싶을 때:

```bash
# 1. Docker 컨테이너 중지
docker stop a2g-worker-service

# 2. 로컬 환경 설정
cd repos/worker-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<ENVEOF
SERVICE_NAME=worker-service

# Redis (Celery Broker)
REDIS_URL=redis://localhost:6379/5
CELERY_BROKER_URL=redis://localhost:6379/5
CELERY_RESULT_BACKEND=redis://localhost:6379/5

# 데이터베이스 (작업 결과 저장용)
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/admin_service_db

# Celery 설정
CELERY_TASK_TRACK_STARTED=True
CELERY_TASK_TIME_LIMIT=300
CELERY_WORKER_CONCURRENCY=4

# OpenAI (LLM 작업용)
OPENAI_API_KEY=your-api-key
ENVEOF

# 4. Celery Worker 로컬 실행
celery -A app.worker worker --loglevel=info

# 5. Celery Beat 실행 (별도 터미널)
celery -A app.worker beat --loglevel=info

# 6. Flower 모니터링 (선택사항)
celery -A app.worker flower --port=5555
```

## 🎯 주요 기능

- LLM 비동기 호출
- 일별/주간 통계 집계
- 자동 정리 작업
- 이메일 발송

---

**문의**: DEV2 (byungju.lee@company.com) 또는 Slack #a2g-platform-dev
