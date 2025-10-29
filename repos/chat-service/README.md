# 💬 Chat Service

**담당자**: DEV3 (김영섭)
**포트**: 8003
**기능**: WebSocket 기반 실시간 채팅, 메시지 스트리밍

## 📋 서비스 개요

Chat Service는 WebSocket을 이용한 실시간 채팅 및 메시지 스트리밍을 담당하는 서비스입니다.

## 🚀 빠른 시작

### 일반 사용 (권장)

`./start-dev.sh full`을 실행하면 이 서비스는 자동으로 Docker로 실행됩니다.

```bash
# 프로젝트 루트 디렉토리에서
./start-dev.sh setup   # 최초 1회
./start-dev.sh full    # 모든 서비스 시작 (이 서비스 포함)
```

### 이 서비스만 로컬 개발 (디버깅/개발 시)

Chat Service만 로컬에서 실행하고 싶을 때:

```bash
# 1. Docker 컨테이너 중지
docker stop a2g-chat-service

# 2. 로컬 환경 설정
cd repos/chat-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cat > .env.local <<ENVEOF
SERVICE_NAME=chat-service
SERVICE_PORT=8003
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/chat_service_db
REDIS_URL=redis://localhost:6379/2
JWT_SECRET_KEY=local-dev-secret-key
JWT_ALGORITHM=HS256
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]
ENVEOF

# 4. 마이그레이션 실행
alembic upgrade head

# 5. 로컬에서 실행
uvicorn app.main:app --reload --port 8003

# 6. 헬스 체크
curl http://localhost:8003/health
```

## 🎯 주요 기능

- WebSocket 연결 관리
- 실시간 메시지 전송
- 채팅 세션 관리
- Redis Pub/Sub 통합

---

**문의**: DEV3 (youngsub.kim@company.com) 또는 Slack #a2g-platform-dev
