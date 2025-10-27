# A2G Platform - Backend Services Repository 가이드

## 📋 개요

이 폴더는 A2G Platform의 **7개 Backend 서비스**에 대한 초기 구조 및 Frontend 연동 가이드를 포함합니다.

## 📁 폴더 구조

```
repos/
├── user-service/          # 사용자 인증, API Key 관리
├── agent-service/         # Agent CRUD, AI 랭킹
├── chat-service/          # Chat 세션/메시지, 스트리밍
├── tracing-service/       # LLM 로그 프록시, Trace 데이터
├── admin-service/         # LLM 모델 관리, 사용량 통계
├── worker-service/        # Celery 비동기 작업
├── infra-service/         # Mock SSO, Infrastructure
└── README.md              # 이 파일
```

## 🔗 서비스별 역할

| 서비스 | 담당자 | 역할 | 포트 |
|--------|--------|------|------|
| **user-service** | DEV3-4 | SSO 인증, API Key, 사용자 관리 | 8001 |
| **agent-service** | DEV1 | Agent CRUD, A2A, AI 랭킹 | 8002 |
| **chat-service** | DEV3 | Chat 세션/메시지, 스트리밍 | 8003 |
| **tracing-service** | DEV1 | LLM 로그 프록시, Trace WebSocket | 8004 |
| **admin-service** | DEV2 | LLM 모델 관리, 통계 | 8005 |
| **worker-service** | DEV4 | Celery 비동기 작업 | - |
| **infra-service** | DEV4 | Mock SSO, Docker Compose | 9999 |

## 📖 각 서비스별 가이드 문서

### 1. user-service/FRONTEND_GUIDE.md
- SSO 로그인/로그아웃 API
- API Key CRUD
- 사용자 관리 (ADMIN)
- 테스트 시나리오
- 초기 폴더 구조

### 2. agent-service/FRONTEND_GUIDE.md
- Agent CRUD API
- AI 랭킹 검색
- Agent 운영 전환
- Health Check
- 테스트 시나리오

### 3. chat-service/FRONTEND_GUIDE.md
- Chat Session CRUD
- 메시지 전송 (스트리밍)
- 파일 업로드
- History 조회
- 테스트 시나리오

### 4. tracing-service/FRONTEND_GUIDE.md
- Trace History 조회
- WebSocket 실시간 Trace
- LLM 로그 프록시
- Agent Transfer 표시
- 테스트 시나리오

### 5. admin-service/FRONTEND_GUIDE.md
- LLM 모델 관리
- LLM 사용량 통계
- Agent 사용량 통계
- CSV/Excel Export
- 테스트 시나리오

### 6. worker-service/FRONTEND_GUIDE.md
- Agent Health Check (정기 작업)
- Embedding 생성
- 알림 전송
- 통계 집계

### 7. infra-service/FRONTEND_GUIDE.md
- Mock SSO (사외망)
- Docker Compose 설정
- Health Check

## 🚀 개발 시작 가이드

### 1. Repository 생성
각 서비스별로 개별 GitHub Repository를 생성합니다:
```bash
gh repo create A2G-Dev-Space/user-service --private
gh repo create A2G-Dev-Space/agent-service --private
gh repo create A2G-Dev-Space/chat-service --private
gh repo create A2G-Dev-Space/tracing-service --private
gh repo create A2G-Dev-Space/admin-service --private
gh repo create A2G-Dev-Space/worker-service --private
gh repo create A2G-Dev-Space/infra-service --private
```

### 2. 초기 구조 복사
```bash
# 예시: user-service
cd repos/user-service
git init
git remote add origin https://github.com/A2G-Dev-Space/user-service.git

# 가이드 문서 포함하여 초기 커밋
git add .
git commit -m "Initial commit: Frontend integration guide"
git push -u origin main
```

### 3. 개발 환경 설정
각 서비스의 FRONTEND_GUIDE.md에 명시된 환경 변수를 `.env` 파일로 설정합니다.

### 4. API 구현
FRONTEND_GUIDE.md에 명시된 API 스펙에 따라 엔드포인트를 구현합니다.

### 5. Frontend 연동 테스트
FRONTEND_GUIDE.md의 테스트 시나리오를 따라 Frontend와 연동 테스트를 진행합니다.

## 📚 참고 문서

- [API_CONTRACTS.md](../../API_CONTRACTS.md): 전체 API 계약서
- [ARCHITECTURE.md](../../ARCHITECTURE.md): 시스템 아키텍처
- [DEVELOPMENT_GUIDE.md](../../DEVELOPMENT_GUIDE.md): 개발 가이드
- [SSO_GUIDE.md](../../SSO_GUIDE.md): SSO 연동 가이드
- [MOCK_SERVICES.md](../../MOCK_SERVICES.md): Mock 서비스 구현 가이드

## 🐛 문제 해결

### Mock Services 실행 오류
```bash
# Docker Compose 재시작
cd infra-service
docker-compose -f docker-compose.external.yml down
docker-compose -f docker-compose.external.yml up -d
```

### API 연동 오류
1. CORS 설정 확인
2. 환경 변수 확인 (.env 파일)
3. Frontend의 API Base URL 확인
4. JWT Token 유효성 확인

## 📞 문의

- **프로젝트 리더**: 한승하 (syngha.han@samsung.com)
- **GitHub Issues**: [A2G-Dev-Space/Agent-Platform-Development/issues](https://github.com/A2G-Dev-Space/Agent-Platform-Development/issues)
