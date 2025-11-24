# A2A Platform Infrastructure

A2A Agent Platform의 인프라 설정 및 배포 가이드

## 프로덕션 배포 가이드

### 1. 사전 준비

프로덕션 환경에 배포하기 전에 다음 파일들을 준비하세요:

#### SSL/TLS 인증서
- `./ssl/server.key` - 서버 개인키
- `./ssl/server.crt` - 서버 인증서

#### SSO 인증서
- `./certs/sso.cer` - SSO 제공자의 공개 인증서

### 2. 환경 설정 (.env 파일 수정)

`.env` 파일에서 아래 항목들만 수정하면 모든 서비스에 자동으로 적용됩니다:

```bash
# 🔴 1. 서버 IP 주소 변경
HOST_IP=your-server-ip

# 🔴 2. SSO 설정 변경
ENABLE_MOCK_SSO=false  # 프로덕션에서는 반드시 false
SSO_CLIENT_ID=your-sso-client-id
IDP_ENTITY_ID=https://your-sso-domain.com/oauth2/authorize
SP_LOGOUT_URL=https://your-sso-domain.com/logout

# 🔴 3. JWT 보안 키 변경 (반드시!)
JWT_SECRET_KEY=your-strong-random-secret-key-here
```

### 3. 인증서 교체

#### SSL 인증서 교체
```bash
# 기존 개발용 인증서 백업
mv ./ssl/server.key ./ssl/server.key.dev
mv ./ssl/server.crt ./ssl/server.crt.dev

# 프로덕션 인증서 복사
cp /path/to/production/server.key ./ssl/server.key
cp /path/to/production/server.crt ./ssl/server.crt

# 권한 설정
chmod 600 ./ssl/server.key
chmod 644 ./ssl/server.crt
```

#### SSO 인증서 교체
```bash
# SSO 공개 인증서 복사
cp /path/to/sso/certificate.cer ./certs/sso.cer
chmod 644 ./certs/sso.cer
```

### 4. 배포 실행

```bash
cd /path/to/A2A-Agent-Platform/repos/infra

# 서비스 시작
docker compose down  # 기존 컨테이너 정리
docker compose up -d  # 새 설정으로 시작
```

### 5. 배포 확인

```bash
# 서비스 상태 확인
docker compose ps

# 로그 확인
docker compose logs -f api-gateway
docker compose logs -f user-service

# 로그인 테스트
# 브라우저에서 https://your-server-ip:9050 접속
```

---

## 개발 환경 설정

개발 환경에서는 Mock SSO를 사용합니다:

```bash
# .env 파일 설정
ENABLE_MOCK_SSO=true
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login

# 서비스 시작
docker compose up -d

# Mock SSO 로그인 페이지: http://localhost:9999/mock-sso/login
```

---

## 주요 설정 파일

### docker-compose.yml
- 모든 마이크로서비스 컨테이너 정의
- 환경 변수는 `.env`에서 자동으로 주입됨
- JWT_SECRET_KEY, SSL 설정 등이 모든 서비스에 일관되게 적용됨

### .env
- 단일 진실 공급원(Single Source of Truth)
- 이 파일만 수정하면 모든 서비스에 적용

### 인증서 디렉토리
- `./ssl/` - API Gateway SSL 인증서
- `./certs/` - SSO 인증서

---

## 트러블슈팅

### 로그인 후 401 에러 발생
→ JWT_SECRET_KEY가 모든 서비스에 일관되게 설정되었는지 확인:
```bash
docker compose exec user-service printenv JWT_SECRET_KEY
docker compose exec agent-service printenv JWT_SECRET_KEY
```

### SSL 인증서 오류
→ 인증서 파일 권한 및 경로 확인:
```bash
ls -la ./ssl/
```

### SSO 인증 실패
→ SSO 설정 및 인증서 확인:
```bash
docker compose logs user-service | grep -i sso
```

### 환경 변수가 적용되지 않음
→ 컨테이너 재생성 필요:
```bash
docker compose down
docker compose up -d
```
