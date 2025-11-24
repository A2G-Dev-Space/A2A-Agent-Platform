#!/bin/bash

# SSO Flow 테스트 스크립트

set -e

# 색상 코드
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}   SSO Flow 테스트 시작${NC}"
echo -e "${BLUE}========================================${NC}"

# 프로젝트 루트로 이동
cd "$(dirname "${BASH_SOURCE[0]}")"

# 환경변수 로드
if [ -f "repos/infra/.env" ]; then
    set -a
    source repos/infra/.env
    set +a
fi

# Playwright 설치 확인
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo -e "${YELLOW}Playwright 설치 중...${NC}"
    npm install @playwright/test
    npx playwright install chromium
fi

# 서비스 상태 확인
echo -e "\n${BLUE}서비스 상태 확인${NC}"

# SSL 모드 확인
if [ "$SSL_ENABLED" = "true" ]; then
    PROTOCOL="https"
    echo -e "${GREEN}✓${NC} HTTPS 모드"
else
    PROTOCOL="http"
    echo -e "${YELLOW}⚠${NC} HTTP 모드"
fi

# API Gateway 확인
if curl -k -s -o /dev/null -w "%{http_code}" ${PROTOCOL}://localhost:9050/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓${NC} API Gateway 실행 중"
else
    echo -e "${RED}✗${NC} API Gateway가 실행되지 않음"
    echo -e "  ${YELLOW}./start.sh를 먼저 실행하세요${NC}"
    exit 1
fi

# Mock SSO 확인
if curl -s -o /dev/null -w "%{http_code}" http://localhost:9999/health 2>/dev/null | grep -q "200"; then
    echo -e "${GREEN}✓${NC} Mock SSO 실행 중"
else
    echo -e "${RED}✗${NC} Mock SSO가 실행되지 않음"
    echo -e "  ${YELLOW}./start.sh를 먼저 실행하세요${NC}"
    exit 1
fi

# 테스트 실행
echo -e "\n${BLUE}Playwright 테스트 실행${NC}"
echo -e "${BLUE}========================================${NC}\n"

node test-sso-flow.js

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}   테스트 완료${NC}"
echo -e "${BLUE}========================================${NC}"