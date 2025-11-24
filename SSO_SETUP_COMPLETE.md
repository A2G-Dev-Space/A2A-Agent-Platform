# ✅ SSO 통합 완료

## 🎉 구현 완료 내용

### 1. **통합 start.sh 스크립트**
- 단일 명령어로 모든 서비스 시작
- Docker 없이 로컬에서 직접 실행
- HTTPS 자동 감지 및 활성화
- 프로세스 모니터링 및 자동 재시작

### 2. **Mock SSO (form_post 방식)**
- OpenID Connect form_post response mode 구현
- 실제 SSO와 동일한 방식으로 동작
- JWT id_token 생성 및 전송
- 여러 테스트 사용자 제공

### 3. **HTTPS 지원**
- 자체 서명 인증서 자동 생성
- SSL_ENABLED=true 설정 시 자동 HTTPS 활성화
- .pfx/.p7b 인증서 변환 스크립트 제공

### 4. **Playwright 테스트**
- 전체 SSO 로그인 플로우 자동 검증
- HTTPS 모드 테스트 지원
- localStorage 토큰 저장 확인
- API 호출 검증

## 📦 파일 구조

```
A2A-Agent-Platform/
├── start.sh                    # 🚀 통합 시작 스크립트 (모든 서비스)
├── test.sh                     # 🧪 Playwright 테스트 실행
├── test-sso-flow.js            # SSO 플로우 테스트 코드
├── SSO_SETUP_COMPLETE.md       # 📄 이 문서
└── repos/
    ├── infra/
    │   ├── .env                # 환경 설정 (SSL_ENABLED, SSO 설정)
    │   ├── ssl/
    │   │   ├── server.crt      # SSL 인증서 (자체 서명)
    │   │   ├── server.key      # SSL 개인키
    │   │   ├── generate-certificates.sh
    │   │   └── convert-certificates.sh
    │   └── mock-sso/
    │       └── main.py         # Mock SSO 서버 (form_post 구현)
    ├── api-gateway/            # API Gateway (HTTPS 지원)
    ├── user-service/           # 사용자 서비스 (SSO callback 처리)
    └── ...
```

## 🚀 사용 방법

### 1. 기본 실행 (개발 환경)

```bash
# 모든 서비스 시작 (HTTP 모드)
./start.sh

# 다른 터미널에서 프론트엔드 시작
cd frontend && npm run dev
```

### 2. HTTPS 모드로 실행

```bash
# .env에서 SSL 활성화
echo "SSL_ENABLED=true" >> repos/infra/.env

# 인증서가 이미 생성되어 있으므로 바로 시작
./start.sh

# 브라우저에서 https://localhost:9050 접속
```

### 3. SSO 플로우 테스트

```bash
# start.sh 실행 후
./test.sh

# 자동으로 Playwright가 브라우저를 열고 전체 플로우 테스트
```

## 🔄 실제 SSO로 교체 방법

### 1단계: 인증서 교체

```bash
# 실제 인증서 파일 복사
cp /path/to/real/certificate.crt repos/infra/ssl/server.crt
cp /path/to/real/private.key repos/infra/ssl/server.key

# 또는 .pfx 파일 변환
cd repos/infra/ssl
./convert-certificates.sh /path/to/certificate.pfx
```

### 2단계: SSO 설정 변경

```bash
# repos/infra/.env 수정
vim repos/infra/.env

# 다음 값들 변경:
IDP_ENTITY_ID=https://실제-sso-서버-주소
SSO_CLIENT_ID=실제-client-id
PUBLIC_KEY_PATH=/path/to/sso-public.cer  # SSO 공개키
```

### 3단계: 서비스 시작

```bash
# 단순히 실행
./start.sh

# 이제 https://your-domain:9050/login 접속 시
# 실제 SSO로 리다이렉트됨
```

## 🧪 테스트 시나리오

### Mock SSO 테스트 사용자

| 사용자 | ID | 역할 | 설명 |
|--------|-----|------|------|
| dev1 | syngha.han | ADMIN | 한승하 (AI 플랫폼팀) |
| dev2 | byungju.lee | ADMIN | 이병주 (AI 플랫폼팀) |
| dev3 | youngsub.kim | ADMIN | 김영섭 (AI 플랫폼팀) |
| dev4 | junhyung.ahn | ADMIN | 안준형 (AI 플랫폼팀) |
| testuser | test.user | USER | 테스트유저 |
| pending | pending.user | PENDING | 승인대기 사용자 |

### 테스트 플로우

1. **로그인 시작**: `https://localhost:9050/login` 접속
2. **SSO 리다이렉트**: Mock SSO 로그인 페이지로 이동
3. **사용자 선택**: 테스트 사용자 중 하나 선택
4. **Form Post**: id_token이 POST로 `/callback` 전송
5. **토큰 저장**: localStorage에 토큰 저장
6. **Hub 리다이렉트**: `/hub`로 자동 이동
7. **API 호출**: 토큰으로 인증된 API 호출 가능

## ⚠️ 주의사항

### 개발 환경
- 자체 서명 인증서 사용 시 브라우저 경고 무시 필요
- Chrome: "고급" → "안전하지 않은 사이트로 계속 이동" 클릭
- Firefox: "고급" → "위험을 감수하고 계속" 클릭

### 프로덕션 환경
- 반드시 CA 서명 인증서 사용
- Mock SSO 제거 또는 비활성화
- 실제 SSO 서버 설정 필수
- HTTPS 필수 (SSL_ENABLED=true)

## 📝 로그 확인

```bash
# 실시간 로그 모니터링
tail -f logs/api-gateway.log
tail -f logs/mock-sso.log
tail -f logs/user-service.log

# 전체 로그 확인
ls -la logs/
```

## 🔧 트러블슈팅

### 문제: "Address already in use"
```bash
# 기존 프로세스 종료
pkill -f "uvicorn"
pkill -f "python main.py"

# 다시 시작
./start.sh
```

### 문제: "SSL certificate not found"
```bash
# 인증서 생성
cd repos/infra/ssl
./generate-certificates.sh

# 다시 시작
cd ../../../
./start.sh
```

### 문제: "Module not found"
```bash
# 의존성 설치
cd repos/api-gateway && uv pip install -r requirements.txt
cd ../user-service && uv pip install -r requirements.txt
cd ../infra/mock-sso && pip install -r requirements.txt

# 다시 시작
cd ../../../
./start.sh
```

## 🎯 완료 상태

✅ **구현 완료:**
- 통합 start.sh 스크립트
- Mock SSO with form_post
- HTTPS 자동 활성화
- SSO 로그인 플로우
- localStorage 토큰 저장
- /hub 리다이렉트
- Playwright 테스트

✅ **테스트 완료:**
- HTTP 모드 동작
- HTTPS 모드 동작
- Mock SSO 로그인
- 토큰 검증
- API 호출

## 📌 다음 단계

1. **실제 인증서 적용**
   ```bash
   cp /path/to/real/*.crt repos/infra/ssl/
   cp /path/to/real/*.key repos/infra/ssl/
   ```

2. **실제 SSO URL 설정**
   ```bash
   # repos/infra/.env
   IDP_ENTITY_ID=https://your-real-sso.com
   ```

3. **시작**
   ```bash
   ./start.sh
   ```

이제 모든 준비가 완료되었습니다! 🎉