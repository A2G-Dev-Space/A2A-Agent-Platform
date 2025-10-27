#!/bin/bash

echo "🚀 A2G Platform Infra 초기 설정 스크립트"

# 1. 환경 변수 복사 (사외망 기본)
if [ ! -f ".env" ]; then
    echo "📝 환경 변수 파일 복사 중..."
    cp .env.external.example .env
    echo "✅ .env 파일 생성 완료 (사외망 환경)"
else
    echo "⚠️  .env 파일이 이미 존재합니다."
fi

# 2. SSL 인증서 생성 (로컬 개발용)
if [ ! -f "certs/localhost.crt" ]; then
    echo "🔐 로컬 개발용 SSL 인증서 생성 중..."
    mkdir -p certs
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout certs/localhost.key \
      -out certs/localhost.crt \
      -subj "/C=KR/ST=Seoul/L=Seoul/O=A2G/OU=Dev/CN=localhost"
    echo "✅ SSL 인증서 생성 완료"
else
    echo "⚠️  SSL 인증서가 이미 존재합니다."
fi

# 3. Docker Compose 실행
echo "🐳 Mock Services 시작 중..."
docker-compose -f docker-compose/docker-compose.external.yml up -d

echo ""
echo "✅ 설정 완료!"
echo ""
echo "Mock Services 상태 확인:"
docker-compose -f docker-compose/docker-compose.external.yml ps
echo ""
echo "접속 정보:"
echo "  - Mock SSO: http://localhost:9999/health"
echo "  - PostgreSQL: localhost:5432 (DB: agent_dev_platform_local, User: dev_user)"
echo "  - Redis: localhost:6379 (Password: dev_redis_password)"
