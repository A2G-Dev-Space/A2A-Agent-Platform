# 🚀 A2G Agent Platform Development

AI 에이전트를 개발, 테스트, 배포 및 모니터링할 수 있는 통합 플랫폼

## 📚 프로젝트 문서

### 핵심 문서
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - 프로젝트 전체 개요 (먼저 읽으세요!)
- **[PROJECT_INTEGRATED_GUIDE.md](./PROJECT_INTEGRATED_GUIDE.md)** - 상세 통합 가이드
- **[WSL_DEVELOPMENT_SETUP.md](./WSL_DEVELOPMENT_SETUP.md)** - WSL 개발환경 설정 가이드

### 서비스별 개발 가이드
각 서비스의 상세 개발 가이드는 해당 서비스 폴더의 README.md를 참조하세요:

- [API Gateway](./repos/api-gateway/README.md) - Port 9050
- [User Service](./repos/user-service/README.md) - Port 8001
- [Agent Service](./repos/agent-service/README.md) - Port 8002
- [Chat Service](./repos/chat-service/README.md) - Port 8003
- [Tracing Service](./repos/tracing-service/README.md) - Port 8004
- [Admin Service](./repos/admin-service/README.md) - Port 8005
- [Worker Service](./repos/worker-service/README.md) - Background Worker

## 🚀 빠른 시작

```bash
# 1. 프로젝트 클론
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 2. 개발 환경 초기 설정 (최초 1회만 실행)
./start-dev.sh setup

# 3. 모든 서비스 시작
./start-dev.sh full

# 4. Frontend 실행 (별도 터미널)
cd frontend
npm install
npm run dev

# 5. 브라우저에서 접속
# Frontend: http://localhost:9060
# API Gateway: http://localhost:9050
```

### 개발 환경 관리 명령어

```bash
# 초기 데이터베이스 설정 (처음 한번만)
./start-dev.sh setup

# 모든 서비스 시작
./start-dev.sh full

# 최소 서비스만 시작 (API Gateway + Mock SSO + DB)
./start-dev.sh minimal

# API Gateway와 데이터베이스만 시작
./start-dev.sh gateway

# 모든 서비스 중지
./start-dev.sh stop
```

## 🏗️ 프로젝트 구조

```
Agent-Platform-Development/
├── frontend/               # React 19 + TypeScript Frontend
├── repos/                  # 백엔드 마이크로서비스들
│   ├── api-gateway/       # API 게이트웨이
│   ├── user-service/      # 사용자 인증 서비스
│   ├── agent-service/     # 에이전트 관리 서비스
│   ├── chat-service/      # 채팅 서비스
│   ├── tracing-service/   # 로그 추적 서비스
│   ├── admin-service/     # 관리자 서비스
│   ├── worker-service/    # 백그라운드 작업 서비스
│   ├── infra/            # Docker Compose 및 인프라 설정
│   └── shared/           # 공유 라이브러리
├── PROJECT_OVERVIEW.md    # 프로젝트 개요
├── PROJECT_INTEGRATED_GUIDE.md  # 통합 가이드
├── WSL_DEVELOPMENT_SETUP.md     # WSL 설정 가이드
└── README.md             # 이 파일

```

## 👥 팀 구성

| 개발자 | 담당 영역 | 연락처 |
|--------|-----------|--------|
| **한승하** | Frontend + Infra | syngha.han@company.com |
| **이병주** | Admin/Worker Service | byungju.lee@company.com |
| **김영섭** | Chat/Tracing Service | youngsub.kim@company.com |
| **안준형** | Agent Service | junhyung.ahn@company.com |

## 📞 지원

- **Slack**: #a2g-platform-dev
- **GitHub**: https://github.com/A2G-Dev-Space

---

**© 2025 A2G Platform Development Team**