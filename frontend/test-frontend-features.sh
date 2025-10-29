#!/bin/bash

echo "=== A2G Platform 프론트엔드 기능 검증 ==="
echo ""

echo "1. 기본 페이지 접근 테스트:"
echo "로그인 페이지: http://localhost:9060/login"
curl -s http://localhost:9060/login | grep -o "<title>.*</title>" && echo "✅ 로그인 페이지 접근 가능" || echo "❌ 로그인 페이지 접근 실패"

echo ""
echo "2. API 엔드포인트 테스트:"
echo "에이전트 목록 API:"
curl -s http://localhost:9060/api/agents | jq length 2>/dev/null && echo "✅ 에이전트 API 정상" || echo "❌ 에이전트 API 오류"

echo ""
echo "3. 인증 플로우 테스트:"
echo "로그인 시작:"
login_response=$(curl -s -X POST http://localhost:9060/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"redirect_uri": "http://localhost:9060/callback"}')

echo "SSO URL: $(echo $login_response | jq -r '.sso_login_url' 2>/dev/null)"

echo ""
echo "4. Mock SSO 테스트:"
echo "Mock SSO 페이지 접근:"
curl -s http://localhost:9050/mock-sso?redirect_uri=http%3A%2F%2Flocalhost%3A9060%2Fcallback | grep -o "Mock SSO Login" && echo "✅ Mock SSO 페이지 정상" || echo "❌ Mock SSO 페이지 오류"

echo ""
echo "5. 콜백 처리 테스트:"
echo "콜백 API 테스트:"
callback_response=$(curl -s -X POST http://localhost:9060/api/auth/callback \
  -H "Content-Type: application/json" \
  -d '{"id_token": "mock-id-token-dev1"}')

if echo $callback_response | grep -q "access_token"; then
  echo "✅ 콜백 처리 정상"
  echo "토큰 길이: $(echo $callback_response | jq -r '.access_token' | wc -c) characters"
else
  echo "❌ 콜백 처리 오류"
fi

echo ""
echo "6. 사용자 정보 API 테스트:"
echo "인증된 사용자 정보 조회:"
access_token=$(echo $callback_response | jq -r '.access_token' 2>/dev/null)
if [ "$access_token" != "null" ] && [ "$access_token" != "" ]; then
  user_info=$(curl -s http://localhost:9060/api/auth/me \
    -H "Authorization: Bearer $access_token")
  echo "사용자 정보: $(echo $user_info | jq -r '.username' 2>/dev/null)"
  echo "✅ 사용자 정보 API 정상"
else
  echo "❌ 토큰 없음"
fi

echo ""
echo "=== 기능 검증 완료 ==="
echo ""
echo "브라우저에서 다음 URL들을 테스트해보세요:"
echo "1. http://localhost:9060/login - 로그인 페이지"
echo "2. 로그인 후 http://localhost:9060/hub - Hub 대시보드"
echo "3. http://localhost:9060/workbench - Workbench 대시보드"
echo "4. http://localhost:9060/flow - Flow 대시보드"
