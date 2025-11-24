# SSL/HTTPS 설정 가이드

## 🔐 개요

이 디렉토리는 API Gateway의 HTTPS를 위한 SSL 인증서를 관리합니다.

## 🚀 빠른 시작

### 1. 인증서 준비

#### 옵션 A: 기존 인증서 사용 (.pfx 또는 .p7b)

```bash
cd /path/to/A2A-Agent-Platform/repos/infra/ssl

# .pfx 파일 변환
./convert-certificates.sh your-certificate.pfx

# .p7b 파일 변환 (개인키 파일 필요)
./convert-certificates.sh your-certificate.p7b your-private.key
```

#### 옵션 B: 개발용 자체 서명 인증서 생성

```bash
cd /path/to/A2A-Agent-Platform/repos/infra/ssl

./generate-certificates.sh
```

### 2. 환경 변수 설정

`.env` 파일에서 SSL 활성화:

```bash
# repos/infra/.env
SSL_ENABLED=true
SSL_KEYFILE=/app/ssl/server.key
SSL_CERTFILE=/app/ssl/server.crt
```

### 3. 서비스 시작

```bash
cd repos/infra

# SSL 인증서가 준비되면 자동으로 HTTPS로 시작
docker-compose up -d api-gateway

# 또는 전체 재시작
docker-compose restart
```

## ✅ 확인

### 1. 서비스 로그 확인

```bash
docker-compose logs api-gateway | grep SSL
```

다음과 같은 로그가 표시되면 성공:
```
✅ Starting with HTTPS (SSL enabled)
   Certificate: /app/ssl/server.crt
   Private Key: /app/ssl/server.key
```

### 2. HTTPS 접속 테스트

```bash
# 로컬에서 테스트
curl -k https://localhost:9050/health

# 원격에서 테스트
curl -k https://172.26.110.192:9050/health
```

### 3. 브라우저에서 확인

```
https://172.26.110.192:9050/health
```

⚠️ **자체 서명 인증서인 경우**: 브라우저에서 보안 경고가 표시됩니다. "고급" → "계속 진행"을 클릭하면 접속 가능합니다.

## 📁 파일 구조

```
ssl/
├── server.crt                    # SSL 인증서 (필수)
├── server.key                    # 개인키 (필수, 600 권한)
├── ca-chain.crt                  # 중간 인증서 (선택)
├── generate-certificates.sh      # 개발용 인증서 생성 스크립트
├── convert-certificates.sh       # .pfx/.p7b 변환 스크립트
├── CERTIFICATE_CONVERSION_GUIDE.md  # 변환 상세 가이드
└── README.md                     # 이 파일
```

## 🔄 자동 SSL 활성화 로직

API Gateway는 다음 조건을 모두 만족하면 자동으로 HTTPS로 시작합니다:

1. ✅ `SSL_ENABLED=true`
2. ✅ `server.key` 파일 존재
3. ✅ `server.crt` 파일 존재

조건이 만족되지 않으면 HTTP로 시작하며 로그에 표시됩니다:

```
⚠️  Starting with HTTP (SSL disabled or certificates not found)
   ❌ SSL key file not found: /app/ssl/server.key
```

## 🔧 트러블슈팅

### 문제 1: "SSL key file not found"

**원인**: 인증서 파일이 없거나 경로가 잘못됨

**해결**:
```bash
# 파일 존재 확인
ls -la repos/infra/ssl/server.*

# 없다면 생성 또는 변환
cd repos/infra/ssl
./generate-certificates.sh
# 또는
./convert-certificates.sh your-certificate.pfx
```

### 문제 2: "Permission denied"

**원인**: 개인키 파일 권한 문제

**해결**:
```bash
chmod 600 repos/infra/ssl/server.key
chmod 644 repos/infra/ssl/server.crt
```

### 문제 3: "Connection refused" 또는 "SSL handshake failed"

**원인**: 인증서와 개인키가 일치하지 않음

**해결**:
```bash
# 일치 여부 확인
cd repos/infra/ssl
openssl x509 -noout -modulus -in server.crt | openssl md5
openssl rsa -noout -modulus -in server.key | openssl md5

# 두 값이 같아야 함. 다르면 인증서 재생성 필요
```

### 문제 4: 브라우저에서 "NET::ERR_CERT_AUTHORITY_INVALID"

**원인**: 자체 서명 인증서 사용

**해결**:
- 개발 환경: 브라우저 경고 무시하고 진행
- 프로덕션: CA 서명 인증서 사용 (Let's Encrypt, DigiCert 등)

### 문제 5: HTTP로 시작됨 (HTTPS 원함)

**확인 사항**:
```bash
# 1. 환경변수 확인
docker-compose config | grep SSL

# 2. 컨테이너 내부 파일 확인
docker exec a2g-api-gateway ls -la /app/ssl/

# 3. 로그 확인
docker-compose logs api-gateway | head -20
```

## 🔐 보안 권장사항

### 개발 환경
- ✅ 자체 서명 인증서 사용 가능
- ✅ `SSL_ENABLED=false`로 HTTP 사용 가능

### 프로덕션 환경
- ❌ 자체 서명 인증서 사용 금지
- ✅ CA 서명 인증서 사용 필수
- ✅ `SSL_ENABLED=true` 필수
- ✅ 인증서 자동 갱신 설정 (Let's Encrypt)
- ✅ HSTS 헤더 설정
- ✅ TLS 1.2 이상 사용

### 파일 권한
```bash
server.key: -rw------- (600)  # 소유자만 읽기/쓰기
server.crt: -rw-r--r-- (644)  # 모두 읽기 가능
```

### Git 보안
```bash
# .gitignore에 이미 추가됨
*.key
*.crt
*.pem
*.pfx
*.p12
*.p7b

# 실제 인증서는 절대 커밋하지 마세요!
```

## 📚 관련 문서

- [CERTIFICATE_CONVERSION_GUIDE.md](./CERTIFICATE_CONVERSION_GUIDE.md) - 인증서 변환 상세 가이드
- [SSO_INTEGRATION_GUIDE.md](../SSO_INTEGRATION_GUIDE.md) - SSO 통합 가이드
- [Let's Encrypt](https://letsencrypt.org/) - 무료 SSL 인증서

## 💡 팁

### Let's Encrypt 인증서 사용하기

```bash
# Certbot으로 인증서 발급
certbot certonly --standalone -d your-domain.com

# 발급된 인증서 복사
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ./server.crt
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ./server.key

# 권한 설정
chmod 600 server.key
chmod 644 server.crt
```

### 인증서 자동 갱신

```bash
# Cron에 추가 (매일 체크, 30일 이내 만료 시 갱신)
0 0 * * * certbot renew --quiet && docker-compose restart api-gateway
```