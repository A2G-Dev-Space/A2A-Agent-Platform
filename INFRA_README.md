# 🏗️ A2G Platform - Infrastructure

**목적**: A2G Platform의 인프라 설정 및 Mock Services 제공

---

## 📋 포함 내용

1. **Mock Services**: 사외망 개발용 Mock SSO, PostgreSQL, Redis
2. **Docker Compose**: 사외망/사내망 환경별 설정
3. **Nginx**: API Gateway 설정 (SSL, 라우팅)
4. **SSL 인증서**: 로컬 개발용 자체 서명 인증서

---

## 📂 디렉토리 구조

```
.
├── docker-compose/
│   ├── docker-compose.external.yml  # 사외망 전용
│   └── docker-compose.internal.yml  # 사내망 전용
├── mock-sso/
│   ├── main.py                      # Mock SSO FastAPI 서버
│   ├── requirements.txt
│   ├── Dockerfile
│   └── templates/
│       └── login.html               # Mock SSO 로그인 UI
├── nginx/
│   └── dev.conf                     # Nginx 설정 (API Gateway)
├── certs/
│   ├── localhost.crt                # 로컬 개발용 SSL 인증서
│   └── localhost.key
├── scripts/
│   └── setup.sh                     # 초기 환경 설정 스크립트
├── .env.external.example            # 사외망 환경 변수 템플릿
└── .env.internal.example            # 사내망 환경 변수 템플릿
```

---

## 🚀 빠른 시작

### 1. 초기 설정 (최초 1회)

```bash
# 초기 설정 스크립트 실행
chmod +x scripts/setup.sh
./scripts/setup.sh
```

이 스크립트는 다음을 수행합니다:
- `.env` 파일 생성 (사외망 템플릿 복사)
- 로컬 개발용 SSL 인증서 생성
- Mock Services 자동 시작

### 2. Mock Services 실행

```bash
docker-compose -f docker-compose/docker-compose.external.yml up -d
```

### 3. 상태 확인

```bash
docker-compose -f docker-compose/docker-compose.external.yml ps
```

### 4. 로그 확인

```bash
# 모든 서비스 로그
docker-compose -f docker-compose/docker-compose.external.yml logs -f

# 특정 서비스 로그
docker-compose -f docker-compose/docker-compose.external.yml logs -f mock-sso
```

### 5. 중지

```bash
docker-compose -f docker-compose/docker-compose.external.yml down
```

---

## 🔐 Mock SSO 사용법

### 접속

1. 브라우저에서 Mock SSO 로그인 페이지 접속:
   ```
   http://localhost:9999/mock-sso/login?redirect_uri=https://localhost:9050/api/auth/callback/
   ```

2. 사용 가능한 테스트 계정:
   - **한승하** (syngha.han@samsung.com) - AI Platform Team
   - **김개발** (biend.i@samsung.com) - Backend Team
   - **테스트** (test.user@samsung.com) - QA Team

3. 사용자 카드를 클릭하면 자동으로 로그인 처리

### Health Check

```bash
curl http://localhost:9999/health
```

---

## 🗄️ PostgreSQL 접속 정보

```bash
# 호스트
Host: localhost
Port: 5432

# 데이터베이스
Database: agent_dev_platform_local
User: dev_user
Password: dev_password

# psql 접속
psql -h localhost -U dev_user -d agent_dev_platform_local
```

---

## 🔴 Redis 접속 정보

```bash
# 호스트
Host: localhost
Port: 6379
Password: dev_redis_password

# redis-cli 접속
redis-cli -h localhost -p 6379 -a dev_redis_password
```

---

## 🌐 Nginx API Gateway

### 라우팅 규칙

```
/api/auth/*     → user-service:8001
/api/users/*    → user-service:8001
/api/keys/*     → user-service:8001
/api/agents/*   → agent-service:8002
/api/chat/*     → chat-service:8003
/api/tracing/*  → tracing-service:8004
/api/log-proxy/* → tracing-service:8004
/api/admin/*    → admin-service:8005
/ws/*           → chat-service:8003 (WebSocket)
```

### SSL 인증서

로컬 개발용 자체 서명 인증서:
- `certs/localhost.crt`
- `certs/localhost.key`

**주의**: 브라우저에서 "안전하지 않음" 경고가 표시되면 "고급" → "계속 진행"

---

## 🔄 환경 전환 (사외망 ↔ 사내망)

### 사외망 → 사내망 전환

```bash
# 1. 환경 변수 교체
cp .env.internal.example .env

# 2. .env 파일 편집 (실제 값으로 변경)
# - DB_PASSWORD
# - REDIS_PASSWORD
# - SECRET_KEY
# - INTERNAL_MAIL_API_KEY

# 3. 사내망 Docker Compose 실행 (사내 서버에서)
docker-compose -f docker-compose/docker-compose.internal.yml up -d
```

---

## ⚠️ 주의사항

### Git 관리

**절대 커밋 금지**:
- `.env` (실제 환경 변수 값)
- `.env.internal` (사내망 비밀 정보)
- `certs/production.*` (운영용 SSL 인증서)

**커밋 가능**:
- `.env.external.example` (템플릿)
- `.env.internal.example` (템플릿)
- `certs/localhost.*` (로컬 개발용 자체 서명 인증서)

### .gitignore

```gitignore
# 환경 변수 (실제 값)
.env
.env.internal

# SSL 인증서 (운영용)
certs/production.*

# Docker 볼륨
postgres_data_*/
redis_data_*/
```

---

## 🐛 트러블슈팅

### Mock SSO 컨테이너 시작 실패

```bash
# 로그 확인
docker-compose -f docker-compose/docker-compose.external.yml logs mock-sso

# 재시작
docker-compose -f docker-compose/docker-compose.external.yml restart mock-sso
```

### PostgreSQL 연결 실패

```bash
# 헬스 체크
docker-compose -f docker-compose/docker-compose.external.yml exec postgres pg_isready -U dev_user

# 수동 접속 테스트
docker-compose -f docker-compose/docker-compose.external.yml exec postgres psql -U dev_user -d agent_dev_platform_local
```

### Redis 연결 실패

```bash
# 헬스 체크
docker-compose -f docker-compose/docker-compose.external.yml exec redis redis-cli -a dev_redis_password ping

# 응답: PONG
```

---

## 📚 관련 문서

- [DEV_ENVIRONMENT.md](./DEV_ENVIRONMENT.md) - 외부 개발 환경 가이드
- [MOCK_SERVICES.md](./MOCK_SERVICES.md) - Mock Services 상세 설명
- [ARCHITECTURE.md](./ARCHITECTURE.md) - 전체 아키텍처
- [API_CONTRACTS.md](./API_CONTRACTS.md) - API 계약서

---

## 📞 Contact

**책임 개발자**: 한승하 (syngha.han@samsung.com)

---

**Generated with** 🤖 Claude Code
