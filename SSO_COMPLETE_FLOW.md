# SSO 통합 완전 가이드

## 🔄 전체 인증 플로우

### 1. 로그인 버튼 클릭
- 사용자가 프론트엔드에서 "SSO 로그인" 버튼 클릭
- Frontend: `/api/auth/login` API 호출

### 2. SSO URL 생성 및 리다이렉트
- Backend: SSO 로그인 URL 생성
```
https://IDP_ENTITY_ID/?client_id=41211cae-1fda-49f7-a462-f01d51ed4b6d
&redirect_uri=https://HOST:9050/callback
&response_mode=form_post
&response_type=code+id_token
&scope=openid+profile
&nonce=xxx
&client-request-id=xxx
&pullStatus=0
```
- Frontend: SSO URL로 사용자 리다이렉트

### 3. SSO 인증
- 사용자가 SSO 페이지에서 인증 수행
- SSO가 암호화된 id_token을 form_post로 전송:
  - Target: `https://HOST:9050/callback`
  - Method: POST (form_post)
  - Data: `id_token=<encrypted_jwt>`

### 4. Callback 처리
- API Gateway (`/callback`):
  - form_post 데이터 수신
  - User Service의 `/api/auth/callback/sso`로 전달

### 5. 토큰 디코딩 및 검증
- User Service (`/api/auth/callback/sso`):
  - .cer 파일로 id_token 디코딩 (RS256)
  - 사용자 정보 추출 (loginid, username, mail, deptid, deptname 등)
  - DB에서 사용자 확인

### 6. 응답 및 리다이렉트
- 사용자 상태에 따른 처리:
  - **신규 사용자**: role="NEW" → `/signup-request`로 리다이렉트
  - **승인 대기**: role="PENDING" → `/pending-approval`로 리다이렉트
  - **정상 사용자**: role="USER/ADMIN" → `/hub`로 리다이렉트

- HTML 응답 반환:
```html
<script>
  // 토큰을 localStorage에 저장
  const authData = {
    state: {
      accessToken: "jwt_token",
      user: { ... }
    }
  };
  localStorage.setItem('auth-storage', JSON.stringify(authData));

  // 적절한 페이지로 리다이렉트
  window.location.href = '/hub';
</script>
```

### 7. 로그인 완료
- 사용자가 `/hub`로 리다이렉트됨
- localStorage에 저장된 토큰으로 인증 상태 유지
- 모든 API 요청에 Bearer 토큰 자동 포함

## 📋 필수 설정

### 1. SSO 인증서 설치
```bash
cp /path/to/your/sso.cer repos/infra/certs/sso.cer
```

### 2. 환경 변수 설정 (.env)
```bash
# SSO 활성화
ENABLE_MOCK_SSO=false
SSO_ENABLED=true

# SSO 설정
SSO_CLIENT_ID=41211cae-1fda-49f7-a462-f01d51ed4b6d
IDP_ENTITY_ID=https://your-actual-sso-domain.com
SP_REDIRECT_URL=https://${HOST_IP}:9050/callback
SP_LOGOUT_URL=https://your-sso-domain.com/logout

# HTTPS 활성화
SSL_ENABLED=true
```

### 3. SSL 인증서 생성
```bash
cd repos/infra/ssl
./generate-certificates.sh
```

### 4. 서비스 시작
```bash
cd repos/infra
docker-compose up -d
```

## 🔐 보안 체크리스트

- ✅ form_post로 전송된 id_token은 서버에서만 처리
- ✅ RS256 알고리즘으로 공개키 검증
- ✅ 검증된 토큰만 localStorage에 저장
- ✅ HTTPS로 모든 통신 암호화
- ✅ 자동 리다이렉트로 사용자 경험 개선

## 🧪 테스트 방법

### 1. Mock SSO로 테스트
```bash
# .env 수정
ENABLE_MOCK_SSO=true
SSO_ENABLED=false
SSL_ENABLED=false

# 서비스 재시작
docker-compose restart
```

### 2. 실제 SSO로 테스트
```bash
# .env 수정
ENABLE_MOCK_SSO=false
SSO_ENABLED=true
SSL_ENABLED=true

# 서비스 재시작
docker-compose restart
```

### 3. 로그인 플로우 확인
1. https://localhost:9060 접속
2. 로그인 버튼 클릭
3. SSO 페이지로 리다이렉트 확인
4. 인증 후 /hub로 자동 이동 확인
5. 개발자 도구에서 localStorage의 auth-storage 확인

## 🔧 트러블슈팅

### "Certificate not found" 오류
- `repos/infra/certs/sso.cer` 파일 존재 확인
- 파일 권한 확인: `chmod 644 sso.cer`

### "Invalid token" 오류
- SSO에서 받은 토큰이 만료되지 않았는지 확인
- .cer 파일이 올바른 공개키인지 확인

### HTTPS 연결 오류
- SSL 인증서 생성 확인
- 자체 서명 인증서의 경우 브라우저에서 예외 추가

## 📝 주요 파일 위치

- **SSO 인증서**: `repos/infra/certs/sso.cer`
- **SSL 인증서**: `repos/infra/ssl/server.crt`, `server.key`
- **환경 설정**: `repos/infra/.env`
- **Callback 처리**:
  - Gateway: `repos/api-gateway/app/main.py` - `/callback`
  - User Service: `repos/user-service/app/api/v1/auth.py` - `/callback/sso`

## ✨ 완료된 기능

- ✅ SSO 로그인 URL 생성
- ✅ form_post callback 처리
- ✅ 공개키로 JWT 검증
- ✅ 토큰 자동 저장
- ✅ 역할별 리다이렉트
- ✅ HTTPS 지원
- ✅ Mock/Real SSO 전환 가능