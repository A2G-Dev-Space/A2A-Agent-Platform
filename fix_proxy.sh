#!/bin/bash

# ============================================
# 사내망 프록시 문제 해결 스크립트
# ============================================

echo "🔧 사내망 프록시 문제 해결 중..."
echo ""

# 1. 시스템 프록시 설정 제거
echo "1️⃣ 시스템 프록시 설정 제거..."
unset HTTP_PROXY
unset HTTPS_PROXY
unset http_proxy
unset https_proxy
echo "   ✅ 완료"

# 2. npm 프록시 설정 제거
echo "2️⃣ NPM 프록시 설정 제거..."
npm config delete proxy
npm config delete https-proxy
npm config delete noproxy
npm config set registry https://registry.npmjs.org/
echo "   ✅ 완료"

# 3. Git 프록시 설정 제거 (있다면)
echo "3️⃣ Git 프록시 설정 제거..."
git config --global --unset http.proxy 2>/dev/null
git config --global --unset https.proxy 2>/dev/null
echo "   ✅ 완료"

# 4. Frontend 환경변수 수정
echo "4️⃣ Frontend 환경변수 수정..."
cat > frontend/.env << 'EOF'
# Frontend Environment Configuration
# 이 파일은 start.sh가 자동으로 관리합니다

# Host IP - Backend API Gateway 주소
VITE_HOST_IP=10.229.95.228
VITE_GATEWAY_PORT=9050

# API URL (프록시 사용)
VITE_API_URL=/api

# 프록시 완전 비활성화 (사내망 직접 연결)
HTTP_PROXY=
HTTPS_PROXY=
http_proxy=
https_proxy=
NO_PROXY=*
no_proxy=*
EOF
echo "   ✅ 완료"

# 5. 브라우저 캐시 클리어 안내
echo ""
echo "5️⃣ 브라우저 설정:"
echo "   • Chrome DevTools 열기 (F12)"
echo "   • Network 탭 → Disable cache 체크"
echo "   • Application 탭 → Storage → Clear site data"
echo "   • 브라우저 재시작"
echo ""

# 6. Frontend 재시작
echo "6️⃣ Frontend 재시작..."
cd frontend
# 기존 프로세스 종료
pkill -f "npm run dev" 2>/dev/null
pkill -f "vite" 2>/dev/null

# node_modules 재설치 (프록시 없이)
echo "   • Dependencies 재설치 중..."
rm -rf node_modules package-lock.json
npm cache clean --force
npm install --no-proxy --registry https://registry.npmjs.org/

echo ""
echo "✅ 프록시 문제 해결 완료!"
echo ""
echo "🚀 이제 다음 명령을 실행하세요:"
echo "   cd frontend && npm run dev"
echo ""
echo "📌 접속 URL:"
echo "   http://10.229.95.228:9060"
echo ""
echo "⚠️  주의사항:"
echo "   1. 브라우저에서 직접 10.229.95.228:9060으로 접속"
echo "   2. localhost나 127.0.0.1 사용하지 마세요"
echo "   3. 브라우저 프록시 설정도 확인하세요"