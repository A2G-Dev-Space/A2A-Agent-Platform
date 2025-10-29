# User Service - A2G Platform

## Overview

User Service는 A2G Platform의 인증, 권한부여, 사용자 관리를 담당하는 마이크로서비스입니다.

## Features

- SSO 연동 로그인/로그아웃
- JWT 토큰 발급/검증
- 사용자 프로비저닝
- API Key 관리
- RBAC 권한 관리

## Quick Start

### 일반 사용 (권장)

`./start-dev.sh full`을 실행하면 이 서비스는 자동으로 Docker로 실행됩니다.

```bash
# 프로젝트 루트 디렉토리에서
./start-dev.sh setup   # 최초 1회
./start-dev.sh full    # 모든 서비스 시작 (이 서비스 포함)
```

### 이 서비스만 로컬 개발 (디버깅/개발 시)

User Service만 로컬에서 실행하고 싶을 때:

```bash
# 1. Docker 컨테이너 중지
docker stop a2g-user-service

# 2. 로컬 환경 설정
cd repos/user-service
uv venv
source .venv/bin/activate
uv sync

# 3. 환경 변수 설정
cp .env.example .env.local

# 4. 로컬에서 실행
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

### Docker

```bash
# Build and run
docker build -t user-service .
docker run -p 8001:8001 user-service
```

## API Endpoints

### Authentication

- `POST /api/auth/login/` - Initiate SSO login
- `POST /api/auth/callback/` - Handle SSO callback
- `POST /api/auth/logout/` - Logout user

### User Management

- `GET /api/users/me/` - Get current user profile
- `POST /api/users/me/api-keys/` - Create API key
- `GET /api/users/me/api-keys/` - List API keys
- `DELETE /api/users/me/api-keys/{key_id}` - Delete API key

## Environment Variables

```bash
# Service Settings
SERVICE_NAME=user-service
SERVICE_PORT=8001
DEBUG=true

# Database
DATABASE_URL=postgresql+asyncpg://dev_user:dev_password@postgres:5432/user_service_db

# Redis
REDIS_URL=redis://redis:6379/0

# Security
JWT_SECRET_KEY=local-dev-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=720

# CORS
CORS_ORIGINS=["http://localhost:9060", "http://localhost:9050"]

# SSO
IDP_ENTITY_ID=http://mock-sso:9999/mock-sso/login
SP_REDIRECT_URL=http://localhost:9050/api/auth/callback/
```

> ✅ **배포 시에는** 위 두 URL(`DATABASE_URL`, `REDIS_URL`)만 사내 공용 엔드포인트로 교체하면 됩니다. 나머지 설정은 동일하게 유지하세요.

## Testing

```bash
# Run tests
pytest

# Run with coverage
pytest --cov=app tests/
```

## License

Copyright (c) 2025 A2G Platform Development Team