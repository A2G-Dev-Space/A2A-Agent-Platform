#!/bin/bash

echo "=== A2G Platform 로그인 테스트 ==="
echo ""

echo "1. 서비스 상태 확인:"
echo "Frontend: http://localhost:9060"
curl -s http://localhost:9060 > /dev/null && echo "✅ Frontend 실행 중" || echo "❌ Frontend 실행 안됨"

echo "Mock API: http://localhost:9050"
curl -s http://localhost:9050/api/health > /dev/null && echo "✅ Mock API 실행 중" || echo "❌ Mock API 실행 안됨"

echo ""
echo "2. 로그인 API 테스트:"
echo "POST /api/auth/login"
response=$(curl -s -X POST http://localhost:9060/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}')

echo "응답: $response"

echo ""
echo "3. Mock SSO 페이지 테스트:"
echo "GET /mock-sso"
curl -s http://localhost:9050/mock-sso?redirect_uri=http%3A%2F%2Flocalhost%3A9060%2Fcallback | head -5

echo ""
echo "4. 콜백 API 테스트:"
echo "POST /api/auth/callback"
callback_response=$(curl -s -X POST http://localhost:9050/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "mock-id-token-dev1"}')

echo "응답 길이: ${#callback_response} characters"
echo "토큰 포함 여부: $(echo $callback_response | grep -o 'access_token' | wc -l)개"

echo ""
echo "=== 테스트 완료 ==="
echo ""
echo "브라우저에서 http://localhost:9060/login 으로 이동하여 로그인 버튼을 클릭해보세요."
echo "F12를 눌러 개발자 도구를 열고 Console 탭에서 에러 메시지를 확인하세요."
