# SSO Certificate Configuration

이 디렉토리는 사내 SSO 인증서를 저장하는 곳입니다.

## 설정 방법

1. 사내 SSO 공개키 인증서 파일 (`sso.cer`)을 이 디렉토리에 복사하세요:
   ```bash
   cp /path/to/your/sso.cer ./sso.cer
   ```

2. 파일 권한 확인:
   ```bash
   chmod 644 sso.cer
   ```

## 인증서 형식

- **지원 형식**: PEM (.pem, .crt, .cer) 또는 DER (.der, .cer)
- **자동 감지**: 시스템이 자동으로 PEM과 DER 형식을 감지합니다

## 주의사항

- 이 디렉토리의 파일들은 `.gitignore`에 추가되어 있어야 합니다
- 실제 인증서 파일을 git에 커밋하지 마세요
- 프로덕션 환경에서는 보안 볼트나 시크릿 관리 시스템을 사용하세요

## 테스트

인증서가 제대로 로드되는지 확인:
```bash
openssl x509 -in sso.cer -text -noout
```