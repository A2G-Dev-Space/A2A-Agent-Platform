#!/bin/bash

# A2A Platform Docker Compose 시작 스크립트
# .env 파일의 설정으로 모든 서비스를 Docker Compose로 시작

set -e

# 색상 코드
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 스크립트 디렉토리
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 도움말
show_help() {
    echo "사용법: $0 [COMMAND]"
    echo ""
    echo "명령어:"
    echo "  start   - 모든 서비스 시작 (기본)"
    echo "  stop    - 모든 서비스 중지"
    echo "  restart - 모든 서비스 재시작"
    echo "  logs    - 로그 확인"
    echo "  status  - 서비스 상태 확인"
    echo "  clean   - 모든 컨테이너 및 볼륨 삭제"
    echo ""
}

# 환경변수 확인
check_env() {
    if [ ! -f ".env" ]; then
        echo -e "${RED}✗ .env 파일을 찾을 수 없습니다!${NC}"
        echo -e "${YELLOW}repos/infra/.env 파일을 생성하고 설정을 확인하세요.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓${NC} 환경변수 파일 확인됨"
}

# 서비스 시작
start_services() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}   A2A Agent Platform 시작${NC}"
    echo -e "${BLUE}========================================${NC}\n"

    check_env

    # .env 로드하여 설정 확인
    source .env

    echo -e "${BLUE}설정 확인:${NC}"
    echo -e "  HOST_IP: ${HOST_IP}"
    echo -e "  SSL_ENABLED: ${SSL_ENABLED}"
    echo -e "  ENABLE_MOCK_SSO: ${ENABLE_MOCK_SSO}"
    echo ""

    # SSL 인증서 확인
    if [ "$SSL_ENABLED" = "true" ]; then
        if [ ! -f "./ssl/server.key" ] || [ ! -f "./ssl/server.crt" ]; then
            echo -e "${YELLOW}⚠ SSL 활성화되었으나 인증서가 없습니다${NC}"
            echo -e "${YELLOW}  ./ssl/server.key 또는 ./ssl/server.crt가 없습니다${NC}"
            echo -e "${YELLOW}  계속하려면 SSL_ENABLED=false로 설정하세요${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓${NC} SSL 인증서 확인됨"
    fi

    # SSO 인증서 확인 (Real SSO 사용 시)
    if [ "$ENABLE_MOCK_SSO" = "false" ]; then
        if [ ! -f "./certs/sso.cer" ]; then
            echo -e "${YELLOW}⚠ 실제 SSO 모드이지만 SSO 인증서가 없습니다${NC}"
            echo -e "${YELLOW}  ./certs/sso.cer 파일을 배치하세요${NC}"
            exit 1
        fi
        echo -e "${GREEN}✓${NC} SSO 인증서 확인됨"
    fi

    echo -e "\n${BLUE}Docker Compose로 서비스 시작 중...${NC}\n"

    # Docker Compose로 시작
    docker compose up -d

    echo -e "\n${BLUE}서비스 상태 확인 중...${NC}"
    sleep 5

    # 서비스 상태 확인
    docker compose ps

    echo -e "\n${GREEN}========================================${NC}"
    echo -e "${GREEN}✓ 서비스가 시작되었습니다!${NC}"
    echo -e "${GREEN}========================================${NC}\n"

    # 접속 정보
    PROTOCOL="https"
    if [ "$SSL_ENABLED" != "true" ]; then
        PROTOCOL="http"
    fi

    echo -e "${BLUE}📌 접속 정보:${NC}"
    echo -e "  Frontend:      http://${HOST_IP}:${FRONTEND_PORT}"
    echo -e "  API Gateway:   ${PROTOCOL}://${HOST_IP}:${GATEWAY_PORT}"
    if [ "$ENABLE_MOCK_SSO" = "true" ]; then
        echo -e "  Mock SSO:      http://${HOST_IP}:9999"
    fi
    echo ""
    echo -e "${BLUE}📝 로그 확인:${NC}"
    echo -e "  docker compose logs -f [service-name]"
    echo -e "  docker compose logs -f api-gateway"
    echo -e "  docker compose logs -f user-service"
    echo ""
    echo -e "${BLUE}🛑 서비스 중지:${NC}"
    echo -e "  ./start.sh stop"
    echo ""
}

# 서비스 중지
stop_services() {
    echo -e "${YELLOW}서비스 중지 중...${NC}\n"
    docker compose down
    echo -e "\n${GREEN}✓ 모든 서비스가 중지되었습니다.${NC}"
}

# 서비스 재시작
restart_services() {
    echo -e "${YELLOW}서비스 재시작 중...${NC}\n"
    docker compose down
    sleep 2
    start_services
}

# 로그 확인
show_logs() {
    docker compose logs -f
}

# 상태 확인
show_status() {
    echo -e "${BLUE}서비스 상태:${NC}\n"
    docker compose ps
    echo ""
    echo -e "${BLUE}컨테이너 리소스 사용:${NC}\n"
    docker stats --no-stream $(docker compose ps -q)
}

# 완전 삭제
clean_all() {
    echo -e "${RED}⚠️  경고: 모든 컨테이너, 볼륨, 네트워크가 삭제됩니다!${NC}"
    echo -e "${RED}데이터베이스 데이터도 모두 삭제됩니다.${NC}"
    read -p "계속하시겠습니까? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        echo -e "\n${YELLOW}모든 리소스 삭제 중...${NC}\n"
        docker compose down -v
        echo -e "\n${GREEN}✓ 모든 리소스가 삭제되었습니다.${NC}"
    else
        echo -e "${BLUE}취소되었습니다.${NC}"
    fi
}

# 명령어 처리
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    logs)
        show_logs
        ;;
    status)
        show_status
        ;;
    clean)
        clean_all
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        echo -e "${RED}✗ 알 수 없는 명령어: $1${NC}\n"
        show_help
        exit 1
        ;;
esac
