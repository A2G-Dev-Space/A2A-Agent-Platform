# SSL 인증서 변환 가이드

## 📋 개요

`.pfx` 또는 `.p7b` 형식의 인증서를 Nginx/Apache/Node.js에서 사용 가능한 `.crt`와 `.key` 파일로 변환하는 방법입니다.

## 🔍 파일 형식 설명

| 형식 | 설명 | 포함 내용 |
|------|------|----------|
| `.pfx` / `.p12` | PKCS#12 형식 | ✅ 인증서 + ✅ 개인키 (비밀번호로 보호) |
| `.p7b` / `.p7c` | PKCS#7 형식 | ✅ 인증서만 (개인키 없음) |
| `.crt` / `.pem` | PEM 형식 | 인증서 (공개키) |
| `.key` | PEM 형식 | 개인키 (비공개) |

## 🚀 빠른 시작

### 방법 1: 자동 변환 스크립트 사용 (권장)

```bash
cd repos/infra/ssl

# .pfx 파일 변환
./convert-certificates.sh your-certificate.pfx

# .p7b 파일 변환 (개인키 파일이 있는 경우)
./convert-certificates.sh your-certificate.p7b your-private.key
```

### 방법 2: 수동 변환

#### A. .pfx / .p12 파일 변환

```bash
cd repos/infra/ssl

# 1. 개인키 추출 (암호화된 상태)
openssl pkcs12 -in certificate.pfx -nocerts -out server.key.encrypted
# 비밀번호 입력 필요

# 2. 개인키 복호화 (비밀번호 제거)
openssl rsa -in server.key.encrypted -out server.key
# 비밀번호 입력 필요

# 3. 인증서 추출
openssl pkcs12 -in certificate.pfx -clcerts -nokeys -out server.crt
# 비밀번호 입력 필요

# 4. 임시 파일 삭제
rm server.key.encrypted

# 5. 권한 설정
chmod 600 server.key
chmod 644 server.crt
```

#### B. .p7b 파일 변환

```bash
cd repos/infra/ssl

# 1. 인증서 추출
openssl pkcs7 -print_certs -in certificate.p7b -out server.crt

# 2. 개인키는 별도로 필요
# ⚠️ .p7b 파일에는 개인키가 포함되어 있지 않습니다!
# 다음 중 하나를 수행하세요:

# 옵션 A: 기존 개인키 파일 사용
cp your-existing-private.key server.key

# 옵션 B: CSR 생성 시 사용한 개인키 사용
cp path/to/original/private.key server.key

# 옵션 C: 새로 생성 (권장하지 않음, 인증서와 일치하지 않을 수 있음)
openssl genrsa -out server.key 2048

# 3. 권한 설정
chmod 600 server.key
chmod 644 server.crt
```

## ✅ 변환 확인

### 1. 인증서 내용 확인
```bash
openssl x509 -in server.crt -text -noout
```

확인 항목:
- Subject (주체): 도메인 이름 확인
- Issuer (발급자): CA 확인
- Validity (유효기간): 만료일 확인
- Subject Alternative Name: 추가 도메인 확인

### 2. 개인키 확인
```bash
openssl rsa -in server.key -check
```

### 3. 인증서와 개인키 일치 확인 ⭐ 중요!
```bash
# 인증서의 modulus
openssl x509 -noout -modulus -in server.crt | openssl md5

# 개인키의 modulus
openssl rsa -noout -modulus -in server.key | openssl md5

# ✅ 두 값이 동일하면 OK
# ❌ 다르면 인증서와 개인키가 일치하지 않음
```

## 🔧 트러블슈팅

### 문제 1: "unable to load certificates"
```bash
# 파일 형식 확인
file certificate.pfx
file certificate.p7b

# PEM으로 변환 시도
openssl pkcs12 -in certificate.pfx -out temp.pem -nodes
# 또는
openssl pkcs7 -print_certs -in certificate.p7b -out temp.pem
```

### 문제 2: "bad decrypt" 또는 비밀번호 오류
- 올바른 비밀번호 확인
- 대소문자 구분 확인
- 공백이나 특수문자 확인

### 문제 3: .p7b 파일에 개인키가 없음
```bash
# CSR 생성 시 사용한 개인키를 찾아야 합니다
# 일반적으로 다음 위치에 있을 수 있습니다:
# - CSR 생성 당시 서버
# - 인증서 신청 시 백업한 위치
# - IT 부서 또는 인증서 담당자에게 문의
```

### 문제 4: 중간 인증서(Chain Certificate) 필요
```bash
# .pfx 파일에서 중간 인증서 추출
openssl pkcs12 -in certificate.pfx -cacerts -nokeys -out ca-chain.crt

# server.crt에 중간 인증서 추가
cat ca-chain.crt >> server.crt

# 또는 별도 파일로 유지하고 Nginx 설정에서 지정
# ssl_certificate_key ca-chain.crt;
```

## 📁 최종 파일 구조

변환 완료 후:
```
repos/infra/ssl/
├── server.crt          # 인증서 (공개)
├── server.key          # 개인키 (비공개, 600 권한)
├── ca-chain.crt        # 중간 인증서 (선택사항)
└── convert-certificates.sh
```

## 🔐 보안 주의사항

1. **개인키 보호**
   ```bash
   chmod 600 server.key  # 소유자만 읽기/쓰기 가능
   ```

2. **Git에 커밋하지 않기**
   - `.gitignore`에 이미 `*.key` 패턴 추가됨
   - 실제 인증서는 절대 Git에 올리지 마세요

3. **백업**
   ```bash
   # 원본 파일 백업
   mkdir -p backup
   cp certificate.pfx backup/
   ```

4. **파일 권한 확인**
   ```bash
   ls -l server.*
   # server.crt: -rw-r--r-- (644)
   # server.key: -rw------- (600)
   ```

## 🎯 Docker 환경 적용

변환 완료 후:

```bash
# 1. docker-compose.yml에서 이미 볼륨 마운트 설정됨
volumes:
  - ./ssl:/app/ssl:ro

# 2. .env 파일 확인
SSL_ENABLED=true
SSL_KEYFILE=/app/ssl/server.key
SSL_CERTFILE=/app/ssl/server.crt

# 3. 서비스 재시작
docker-compose restart api-gateway
```

## 📞 도움이 필요한 경우

- **개인키를 분실한 경우**: 인증서를 재발급받아야 합니다
- **비밀번호를 모르는 경우**: IT 부서 또는 인증서 발급 담당자에게 문의
- **인증서가 일치하지 않는 경우**: 인증서 발급 시 사용한 CSR과 개인키를 확인

## 🔗 참고 자료

- [OpenSSL 공식 문서](https://www.openssl.org/docs/)
- [PKCS#12 형식](https://en.wikipedia.org/wiki/PKCS_12)
- [PKCS#7 형식](https://en.wikipedia.org/wiki/PKCS_7)