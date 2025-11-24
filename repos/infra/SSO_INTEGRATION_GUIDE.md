# SSO Integration Guide

이 가이드는 A2A Platform을 사내 SSO (OpenID Connect)와 통합하는 방법을 설명합니다.

## 1. 사전 준비

### 1.1 SSO 인증서 준비
사내 SSO 공개키 인증서 (.cer) 파일을 준비합니다:
```bash
# SSO 인증서를 certs 디렉토리에 복사
cp /path/to/your/sso-public-key.cer ./certs/sso.cer

# 파일 권한 확인
chmod 644 ./certs/sso.cer
```

### 1.2 SSL 인증서 생성 (HTTPS 활성화)
```bash
cd ssl/
./generate-certificates.sh
```

## 2. 환경 변수 설정

`.env` 파일에서 다음 변수들을 실제 값으로 업데이트합니다:

```bash
# SSO Configuration
ENABLE_MOCK_SSO=false  # Mock SSO 비활성화
SSO_ENABLED=true       # 실제 SSO 활성화

# Real SSO Configuration
SSO_CLIENT_ID=41211cae-1fda-49f7-a462-f01d51ed4b6d  # 실제 Client ID
IDP_ENTITY_ID=https://your-company-sso.com          # 실제 SSO 로그인 URL
SP_REDIRECT_URL=https://${HOST_IP}:${GATEWAY_PORT}/callback
SP_LOGOUT_URL=https://your-company-sso.com/logout   # 실제 로그아웃 URL

# SSL Configuration
SSL_ENABLED=true  # HTTPS 활성화
```

## 3. SSO 인증 플로우

### 3.1 로그인 프로세스
1. 사용자가 로그인 버튼 클릭
2. Frontend가 `/api/auth/login` 호출
3. Backend가 SSO 로그인 URL 생성 및 반환:
   ```
   https://IDP_ENTITY_ID/?client_id=xxx&redirect_uri=https://HOST:9050/callback&response_mode=form_post&response_type=code+id_token&scope=openid+profile&nonce=xxx&client-request-id=xxx&pullStatus=0
   ```
4. 사용자가 SSO 페이지로 리다이렉트
5. SSO 인증 완료 후 `form_post`로 callback URL로 암호화된 id_token 전송
6. Backend가 id_token을 .cer 인증서로 디코딩 (RS256)
7. 디코딩된 JWT에서 사용자 정보(user id, dept id 등) 직접 획득
8. 자체 access_token 발급

### 3.2 토큰 검증
```python
# 실제 SSO에서는 RS256 알고리즘과 공개키 인증서로 검증
cert_obj = x509.load_pem_x509_certificate(cert_data, default_backend())
public_key = cert_obj.public_key()

decoded = jwt.decode(
    id_token,
    public_key,
    algorithms=["RS256"],
    options={"verify_signature": True, "verify_exp": True}
)
```

### 3.3 로그아웃 프로세스
- `/api/auth/logout` 호출 시 SSO 로그아웃 URL로 리다이렉트

## 4. 서비스 시작

### 4.1 Docker Compose로 시작
```bash
# 모든 서비스를 HTTPS로 시작
docker-compose up -d

# 로그 확인
docker-compose logs -f api-gateway user-service
```

### 4.2 연결 확인
```bash
# HTTPS로 API Gateway 상태 확인
curl -k https://localhost:9050/health

# SSO 로그인 URL 확인
curl -k -X POST https://localhost:9050/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "https://localhost:9050/callback"}'
```

## 5. 트러블슈팅

### 5.1 인증서 오류
- **문제**: "Certificate file not found"
- **해결**: `./certs/sso.cer` 파일이 존재하는지 확인

### 5.2 JWT 검증 실패
- **문제**: "Invalid ID token"
- **해결**:
  - 인증서가 올바른지 확인
  - 토큰 만료 시간 확인
  - RS256 알고리즘 사용 확인

### 5.3 HTTPS 연결 실패
- **문제**: SSL 인증서 오류
- **해결**:
  - `./ssl/server.crt`, `./ssl/server.key` 파일 존재 확인
  - 자체 서명 인증서인 경우 브라우저에서 예외 추가

## 6. 개발/테스트 환경 전환

Mock SSO로 전환하려면:
```bash
# .env 파일 수정
ENABLE_MOCK_SSO=true
SSO_ENABLED=false
SSL_ENABLED=false  # 선택사항

# 서비스 재시작
docker-compose restart
```

## 7. 프로덕션 체크리스트

- [ ] 실제 SSO 인증서 (.cer 파일) 설치 완료
- [ ] SSO_CLIENT_ID 설정 완료
- [ ] 프로덕션용 SSL 인증서 (CA 서명) 사용
- [ ] IDP_ENTITY_ID를 실제 SSO URL로 변경
- [ ] SP_LOGOUT_URL 설정 완료
- [ ] JWT_SECRET_KEY를 강력한 값으로 변경
- [ ] 환경 변수를 시크릿 관리 시스템으로 이동
- [ ] CORS 설정을 실제 도메인으로 제한
- [ ] 로그 레벨을 프로덕션 수준으로 조정

## 8. 주의사항

1. **보안**: 인증서 파일과 시크릿을 Git에 커밋하지 마세요
2. **네트워크**: SSO 서버와의 네트워크 연결 확인 필요
3. **방화벽**: 9050 포트 (HTTPS) 접근 허용 필요
4. **브라우저**: 자체 서명 인증서 사용 시 브라우저 보안 경고 발생

## 9. 참고 문서

- [OpenID Connect 스펙](https://openid.net/connect/)
- [JWT 토큰 검증](https://jwt.io/)
- [Python cryptography 문서](https://cryptography.io/)

## 10. 지원

문제가 발생하면 다음을 확인하세요:
1. Docker 로그: `docker-compose logs -f`
2. 환경 변수: `docker-compose config`
3. 네트워크 연결: `curl -k https://localhost:9050/health`