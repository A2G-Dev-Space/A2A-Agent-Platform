# A2A Platform Quick Start

## 🚀 1분 설정

### 1. HOST_IP 설정 (한 번만!)
```bash
# repos/infra/.env 편집
HOST_IP=10.229.95.228  # 원하는 IP로 변경
```

### 2. 시작
```bash
./start.sh        # 서비스 시작 (HOST_IP 자동 적용됨)
cd frontend && npm run dev  # 프론트엔드 시작
```

### 3. 접속
- Frontend: `http://10.229.95.228:9060`
- API Gateway: `http://10.229.95.228:9050`

## 📝 관리

### HOST IP 변경하기
1. `repos/infra/.env`에서 `HOST_IP` 수정
2. `./start.sh` 재실행 (자동으로 모든 설정 업데이트)

### 서비스 관리
```bash
./start.sh         # 시작
./start.sh stop    # 중지
./start.sh setup   # 초기 설정 (DB 초기화)
./start.sh update  # 마이그레이션 업데이트
```

## ⚙️ 동작 원리

1. **repos/infra/.env**가 마스터 설정
2. **./start.sh**가 실행될 때마다:
   - HOST_IP 읽기
   - frontend/.env 자동 업데이트
   - vite.config.ts 자동 업데이트
   - 모든 백엔드 서비스 config.py 업데이트
   - Docker 환경변수로 전달

## 🌐 지원되는 내부 네트워크
- 10.* (10.0.0.0/8) - ✅ 자동 NO_PROXY
- 172.* (172.16.0.0/12) - ✅ 자동 NO_PROXY
- 192.168.* (192.168.0.0/16) - ✅ 자동 NO_PROXY
- localhost/127.0.0.1 - ✅ 자동 NO_PROXY

모든 것이 자동화되어 있어 HOST_IP만 변경하면 됩니다!