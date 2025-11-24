#!/bin/bash

# A2A Platform 통합 시작 스크립트 (Docker 없이 로컬 실행)
# 모든 필요한 서비스를 한번에 시작

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 디렉토리 (프로젝트 루트)
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   A2A Agent Platform 시작${NC}"
echo -e "${BLUE}========================================${NC}"

# 환경변수 로드
if [ -f "repos/infra/.env" ]; then
    echo -e "${GREEN}✓${NC} 환경변수 로드 중..."
    set -a
    source repos/infra/.env
    set +a
else
    echo -e "${RED}✗${NC} .env 파일을 찾을 수 없습니다!"
    exit 1
fi

# SSL 설정
SSL_ENABLED=${SSL_ENABLED:-false}
SSL_KEYFILE="$PROJECT_ROOT/repos/infra/ssl/server.key"
SSL_CERTFILE="$PROJECT_ROOT/repos/infra/ssl/server.crt"

# PID 파일 경로
PID_DIR="$PROJECT_ROOT/.pids"
mkdir -p "$PID_DIR"

# 정리 함수
cleanup() {
    echo -e "\n${YELLOW}서비스 종료 중...${NC}"

    # 모든 서비스 종료
    for pid_file in "$PID_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            if kill -0 $PID 2>/dev/null; then
                SERVICE_NAME=$(basename "$pid_file" .pid)
                echo -e "${YELLOW}  - $SERVICE_NAME 종료${NC}"
                kill -TERM $PID 2>/dev/null || true

                # 프로세스가 종료될 때까지 대기 (최대 5초)
                WAIT_COUNT=0
                while kill -0 $PID 2>/dev/null && [ $WAIT_COUNT -lt 50 ]; do
                    sleep 0.1
                    WAIT_COUNT=$((WAIT_COUNT + 1))
                done

                # 여전히 실행 중이면 강제 종료
                if kill -0 $PID 2>/dev/null; then
                    kill -KILL $PID 2>/dev/null || true
                fi
            fi
            rm -f "$pid_file"
        fi
    done

    echo -e "${GREEN}✓${NC} 모든 서비스가 종료되었습니다."
    exit 0
}

# Ctrl+C 처리
trap cleanup INT TERM EXIT

# 서비스 시작 함수
start_service() {
    local SERVICE_NAME=$1
    local SERVICE_DIR=$2
    local SERVICE_CMD=$3
    local PID_FILE="$PID_DIR/$SERVICE_NAME.pid"

    echo -e "${BLUE}▶ $SERVICE_NAME 시작${NC}"

    # 이미 실행 중인지 확인
    if [ -f "$PID_FILE" ]; then
        OLD_PID=$(cat "$PID_FILE")
        if kill -0 $OLD_PID 2>/dev/null; then
            echo -e "${YELLOW}  ! $SERVICE_NAME이(가) 이미 실행 중입니다 (PID: $OLD_PID)${NC}"
            return
        fi
    fi

    # 서비스 시작
    cd "$PROJECT_ROOT/$SERVICE_DIR"
    eval "$SERVICE_CMD" > "$PROJECT_ROOT/logs/${SERVICE_NAME}.log" 2>&1 &
    local PID=$!
    echo $PID > "$PID_FILE"

    # 시작 확인 (짧게 대기)
    sleep 1
    if kill -0 $PID 2>/dev/null; then
        echo -e "${GREEN}  ✓ $SERVICE_NAME 시작됨 (PID: $PID)${NC}"
    else
        echo -e "${RED}  ✗ $SERVICE_NAME 시작 실패${NC}"
        rm -f "$PID_FILE"
        return 1
    fi

    cd "$PROJECT_ROOT"
}

# 로그 디렉토리 생성
mkdir -p "$PROJECT_ROOT/logs"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}서비스 시작 순서:${NC}"
echo -e "  1. Mock SSO (포트 9999)"
echo -e "  2. API Gateway (포트 9050 - HTTPS/HTTP)"
echo -e "  3. User Service (포트 9001)"
echo -e "  4. Agent Service (포트 9002)"
echo -e "  5. Realtime Service (포트 9003)"
echo -e "${BLUE}========================================${NC}\n"

# 1. Mock SSO 서비스 시작
start_service "mock-sso" "repos/infra/mock-sso" "python main.py"

# 2. API Gateway 시작 (HTTPS 지원)
echo -e "\n${BLUE}API Gateway 설정 확인${NC}"
if [ "$SSL_ENABLED" = "true" ] && [ -f "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ]; then
    echo -e "${GREEN}✓${NC} HTTPS 모드로 시작 (SSL 활성화)"
    echo -e "  인증서: ${SSL_CERTFILE#$PROJECT_ROOT/}"
    echo -e "  개인키: ${SSL_KEYFILE#$PROJECT_ROOT/}"
    GATEWAY_CMD="uv run uvicorn app.main:app --host 0.0.0.0 --port 9050 --reload --ssl-keyfile $SSL_KEYFILE --ssl-certfile $SSL_CERTFILE"
else
    echo -e "${YELLOW}⚠${NC} HTTP 모드로 시작 (SSL 비활성화 또는 인증서 없음)"
    if [ "$SSL_ENABLED" = "true" ]; then
        [ ! -f "$SSL_KEYFILE" ] && echo -e "${RED}  ✗ 키 파일 없음: ${SSL_KEYFILE#$PROJECT_ROOT/}${NC}"
        [ ! -f "$SSL_CERTFILE" ] && echo -e "${RED}  ✗ 인증서 없음: ${SSL_CERTFILE#$PROJECT_ROOT/}${NC}"
    fi
    GATEWAY_CMD="uv run uvicorn app.main:app --host 0.0.0.0 --port 9050 --reload"
fi
start_service "api-gateway" "repos/api-gateway" "$GATEWAY_CMD"

# 3. User Service 시작
start_service "user-service" "repos/user-service" "uv run uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload"

# 4. Agent Service 시작
start_service "agent-service" "repos/agent-service" "uv run uvicorn app.main:app --host 0.0.0.0 --port 9002 --reload"

# 5. Realtime Service 시작
start_service "realtime-service" "repos/realtime-service" "uv run uvicorn app.main:app --host 0.0.0.0 --port 9003 --reload"

# 접속 정보 표시
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✓ 모든 서비스가 시작되었습니다!${NC}"
echo -e "${GREEN}========================================${NC}"

# 접속 URL 표시
if [ "$SSL_ENABLED" = "true" ] && [ -f "$SSL_KEYFILE" ] && [ -f "$SSL_CERTFILE" ]; then
    PROTOCOL="https"
else
    PROTOCOL="http"
fi

HOST_IP=${HOST_IP:-localhost}

echo -e "\n${BLUE}📌 접속 정보:${NC}"
echo -e "  API Gateway:   ${PROTOCOL}://${HOST_IP}:9050"
echo -e "  Mock SSO:      http://${HOST_IP}:9999"
echo -e "  Health Check:  ${PROTOCOL}://${HOST_IP}:9050/health"
echo -e ""
echo -e "  ${BLUE}SSO 로그인 테스트:${NC}"
echo -e "  ${PROTOCOL}://${HOST_IP}:9050/login"
echo -e ""
if [ "$PROTOCOL" = "https" ]; then
    echo -e "  ${YELLOW}⚠️  자체 서명 인증서 사용 시:${NC}"
    echo -e "     브라우저에서 경고가 표시되면 '고급' → '계속 진행' 클릭"
fi

echo -e "\n${BLUE}📝 로그 확인:${NC}"
echo -e "  tail -f logs/api-gateway.log"
echo -e "  tail -f logs/mock-sso.log"
echo -e "  tail -f logs/user-service.log"

echo -e "\n${YELLOW}종료하려면 Ctrl+C를 누르세요${NC}"

# 서비스 상태 모니터링
echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}서비스 모니터링 중...${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 초기 헬스 체크 (서비스 시작 대기)
sleep 3

# 헬스 체크
echo -e "${BLUE}헬스 체크 중...${NC}"
if curl -k -s -o /dev/null -w "%{http_code}" ${PROTOCOL}://${HOST_IP}:9050/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓ API Gateway 정상 작동${NC}"
else
    echo -e "${YELLOW}⚠ API Gateway 아직 준비 중...${NC}"
fi

if curl -s -o /dev/null -w "%{http_code}" http://${HOST_IP}:9999/ 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓ Mock SSO 정상 작동${NC}"
else
    echo -e "${YELLOW}⚠ Mock SSO 아직 준비 중...${NC}"
fi

echo ""

# 서비스가 실행 중인 동안 대기
while true; do
    # 모든 서비스가 실행 중인지 확인
    ALL_RUNNING=true
    for pid_file in "$PID_DIR"/*.pid; do
        if [ -f "$pid_file" ]; then
            PID=$(cat "$pid_file")
            if ! kill -0 $PID 2>/dev/null; then
                SERVICE_NAME=$(basename "$pid_file" .pid)
                echo -e "${RED}✗ $SERVICE_NAME이(가) 중지되었습니다${NC}"
                ALL_RUNNING=false
            fi
        fi
    done

    # 하나라도 중지되면 재시작 시도
    if [ "$ALL_RUNNING" = false ]; then
        echo -e "${YELLOW}서비스 재시작을 시도합니다...${NC}"

        # Mock SSO 재시작
        if [ ! -f "$PID_DIR/mock-sso.pid" ] || ! kill -0 $(cat "$PID_DIR/mock-sso.pid") 2>/dev/null; then
            start_service "mock-sso" "repos/infra/mock-sso" "python main.py"
        fi

        # API Gateway 재시작
        if [ ! -f "$PID_DIR/api-gateway.pid" ] || ! kill -0 $(cat "$PID_DIR/api-gateway.pid") 2>/dev/null; then
            start_service "api-gateway" "repos/api-gateway" "$GATEWAY_CMD"
        fi

        # 다른 서비스들도 재시작
        if [ ! -f "$PID_DIR/user-service.pid" ] || ! kill -0 $(cat "$PID_DIR/user-service.pid") 2>/dev/null; then
            start_service "user-service" "repos/user-service" "uv run uvicorn app.main:app --host 0.0.0.0 --port 9001 --reload"
        fi
    fi

    sleep 5
done