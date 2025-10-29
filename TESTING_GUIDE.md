# 🧪 A2G Platform - 테스트 가이드

## 🚀 현재 실행 중인 서비스

### Frontend 애플리케이션
- **URL**: http://localhost:9060
- **상태**: ✅ 실행 중
- **기술**: React 19 + TypeScript + Vite

### Mock API 서버
- **URL**: http://localhost:9050
- **상태**: ✅ 실행 중
- **목적**: Frontend 테스트를 위한 Mock 백엔드 엔드포인트 제공

---

## 📱 Frontend 애플리케이션 테스트

### 1. 애플리케이션 접속

브라우저를 열고 다음 주소로 이동하세요: **http://localhost:9060**

### 2. 인증 흐름 테스트

1. **로그인 프로세스**:
   - "Login with SSO" 버튼 클릭
   - Mock SSO 로그인 페이지로 리다이렉트됨
   - 테스트 사용자 선택:
     - **한승하 (syngha.han)** - 관리자 역할
     - **이병주 (byungju.lee)** - 관리자 역할
   - 로그인되어 다시 리다이렉트됨

2. **인증 확인**:
   - 브라우저 콘솔 열기 (F12)
   - 다음 코드 실행:
   ```javascript
   console.log('Token:', localStorage.getItem('accessToken'));
   ```

### 3. 다양한 모드 테스트

사이드바를 사용하여 3가지 모드 사이를 이동하세요:

#### Workbench 모드 (보라색 테마)
- **URL**: http://localhost:9060/workbench
- **목적**: 에이전트 개발 및 테스트
- **테스트할 기능**:
  - 에이전트 카드 보기
  - 새 에이전트 생성 ("Add New Agent" 클릭)
  - 에이전트 상세정보 편집
  - 에이전트 삭제

#### Hub 모드 (파란색 테마)
- **URL**: http://localhost:9060/hub
- **목적**: 프로덕션 에이전트 마켓플레이스
- **테스트할 기능**:
  - 공개 에이전트 검색
  - 에이전트 검색
  - 에이전트 상세정보 모달 열기
  - Top-K 추천 테스트

#### Flow 모드 (청록색 테마)
- **URL**: http://localhost:9060/flow
- **목적**: 다중 에이전트 오케스트레이션
- **테스트할 기능**:
  - 플로우 생성 인터페이스 보기
  - 에이전트 워크플로우 설계
  - 에이전트 연결 설정

---

## 🧑‍💻 브라우저 콘솔 테스트

### 인증 테스트

```javascript
// 로그인 테스트
const testLogin = async () => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect_uri: window.location.origin + '/callback' })
  });
  const data = await res.json();
  console.log('SSO URL:', data.sso_login_url);
  window.open(data.sso_login_url);
};
testLogin();

// 현재 사용자 확인
const checkUser = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/auth/me', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('현재 사용자:', await res.json());
};
checkUser();
```

### 에이전트 관리 테스트

```javascript
// 새 에이전트 생성
const createAgent = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/agents', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'Test Agent',
      description: 'Created from browser console',
      framework: 'Langchain',
      is_public: true,
      status: 'active',
      capabilities: {
        skills: ['chat', 'search', 'analysis'],
        languages: ['python', 'javascript']
      }
    })
  });
  console.log('생성된 에이전트:', await res.json());
};
createAgent();

// 모든 에이전트 나열
const listAgents = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/agents', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('모든 에이전트:', await res.json());
};
listAgents();

// Top-K 추천 테스트
const testTopK = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/agents/search/top-k', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      query: 'I need help with code generation',
      k: 3
    })
  });
  console.log('Top-K 결과:', await res.json());
};
testTopK();
```

### 상태 관리 테스트

```javascript
// Zustand 스토어 확인
const checkStores = () => {
  // 인증 스토어 접근
  const authState = window.__authStore?.getState();
  console.log('인증 상태:', authState);

  // 앱 스토어 접근
  const appState = window.__appStore?.getState();
  console.log('앱 상태:', appState);

  // 에이전트 스토어 접근
  const agentState = window.__agentStore?.getState();
  console.log('에이전트 상태:', agentState);
};
checkStores();

// 앱 모드 프로그래밍 방식으로 변경
const changeMode = (mode) => {
  window.__appStore?.getState().setMode(mode);
  console.log(`${mode} 모드로 변경됨`);
};
changeMode('flow'); // 옵션: 'workbench', 'hub', 'flow'
```

---

## 🔍 테스트 체크리스트

### 인증
- [ ] SSO로 로그인 가능
- [ ] 토큰이 localStorage에 저장됨
- [ ] 사용자 정보가 올바르게 표시됨
- [ ] 로그아웃이 세션 제거

### Workbench 모드
- [ ] 에이전트 카드가 올바르게 표시됨
- [ ] 새 에이전트 생성 가능
- [ ] 에이전트 상세정보 편집 가능
- [ ] 에이전트 삭제 가능
- [ ] 에이전트 상태 표시기 작동

### Hub 모드
- [ ] 공개 에이전트가 표시됨
- [ ] 검색 기능 작동
- [ ] 에이전트 상세정보 모달 열림
- [ ] Top-K 추천 표시

### Flow 모드
- [ ] 플로우 디자이너 로드됨
- [ ] 플로우에 에이전트 추가 가능
- [ ] 에이전트 연결 가능
- [ ] 플로우 설정 저장됨

### UI/UX
- [ ] 모드별 테마가 올바르게 적용됨
- [ ] 반응형 디자인이 모바일에서 작동
- [ ] Dark/Light 모드 토글 작동
- [ ] 애니메이션이 부드러움
- [ ] 콘솔에 오류 없음

---

## 🐛 일반적인 문제 및 해결방법

### 문제: 로그인 리다이렉트가 작동하지 않음
**해결책**: http://localhost:9060으로 접속하세요. 127.0.0.1은 사용하지 마세요

### 문제: API 호출이 CORS 오류로 실패
**해결책**: Mock 서버에는 CORS 헤더가 포함되어 있습니다. Mock 서버가 9050 포트에서 실행 중인지 확인하세요

### 문제: 에이전트가 나타나지 않음
**해결책**: 위의 브라우저 콘솔 명령을 사용하여 테스트 에이전트를 생성하세요

### 문제: 토큰 만료
**해결책**: 로그아웃 후 다시 로그인하여 새 토큰을 받으세요

---

## 📊 네트워크 활동 모니터링

1. Chrome DevTools 열기 (F12)
2. Network 탭으로 이동
3. Fetch/XHR로 필터링하여 API 호출 보기
4. 요청/응답 상세정보 확인
5. WS 탭에서 WebSocket 프레임 모니터링

---

## 🚦 서비스 상태 확인 명령어

```bash
# Frontend 실행 중인지 확인
curl -s http://localhost:9060 | head -5

# Mock API 헬스 확인
curl -s http://localhost:9050/api/health

# 실행 중인 프로세스 확인
ps aux | grep -E "vite|node mock-server"

# Frontend 로그 보기
# npm run dev를 실행 중인 터미널 확인

# Mock API 로그 보기
# node mock-server.js를 실행 중인 터미널 확인
```

---

## 💻 서비스 중지

```bash
# 모든 서비스를 중지하려면 실행 중인 터미널에서 Ctrl+C를 누르세요
# 또는 프로세스를 찾아 종료하세요:

# 프로세스 찾기
ps aux | grep -E "vite|node mock-server"

# PID로 종료
kill <PID>
```

---

## 🎉 개발 준비 완료

두 서비스가 실행 중이면, 이제 다음을 수행할 수 있습니다:
1. Frontend 기능 개발 및 테스트
2. 테스트를 위해 백엔드 응답을 모의 처리
3. 이해관계자에게 플랫폼 시연
4. 작동하는 Frontend로 백엔드 서비스 개발 시작

**즐거운 테스트! 🚀**
