# A2G Platform - Frontend

## 📋 개요

A2G Platform의 Frontend는 React 19 + TypeScript + Vite 기반으로 구축되었습니다.

## 🚀 기술 스택

- **React 19**: 최신 React 기능 (Actions API, useFormStatus 등)
- **TypeScript**: 타입 안정성
- **Vite**: 빠른 개발 서버 및 빌드
- **Tailwind CSS 3.4+**: 유틸리티 기반 스타일링 (Dark mode: selector strategy)
- **MUI (Material-UI) 5**: 컴포넌트 라이브러리
- **Zustand 4**: 상태 관리 (TypeScript best practices)
- **React Router 6**: 라우팅
- **Axios**: HTTP 클라이언트
- **Socket.IO Client**: 실시간 WebSocket
- **React Markdown**: Markdown 렌더링
- **Framer Motion**: 애니메이션

## 📁 프로젝트 구조

```
frontend/
├── public/
│   └── logo.svg
├── src/
│   ├── api/                # API 클라이언트
│   │   └── axios.ts
│   ├── components/         # 컴포넌트
│   │   ├── common/         # 공용 컴포넌트
│   │   ├── layout/         # 레이아웃 (Sidebar, Header, Layout)
│   │   ├── workbench/      # Workbench 모드 컴포넌트
│   │   ├── hub/            # Hub 모드 컴포넌트
│   │   ├── flow/           # Flow 모드 컴포넌트
│   │   └── settings/       # Settings 컴포넌트
│   ├── pages/              # 페이지
│   │   ├── WorkbenchDashboard.tsx
│   │   ├── WorkbenchPlayground.tsx
│   │   ├── HubDashboard.tsx
│   │   ├── HubPlayground.tsx
│   │   ├── FlowPage.tsx
│   │   ├── PendingApprovalPage.tsx
│   │   └── settings/       # Settings 페이지
│   ├── store/              # Zustand 스토어
│   │   ├── useAuthStore.ts
│   │   ├── useThemeStore.ts
│   │   └── useApiKeyStore.ts
│   ├── hooks/              # Custom Hooks
│   ├── utils/              # 유틸리티
│   │   ├── theme.ts        # MUI 테마
│   │   └── constants.ts    # 상수
│   ├── types/              # TypeScript 타입
│   │   └── index.ts
│   ├── styles/             # 스타일
│   │   └── index.css       # Tailwind CSS
│   ├── App.tsx             # App 컴포넌트
│   └── main.tsx            # Entry Point
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🎨 3가지 모드

### 1. Workbench (워크벤치) - 개발 모드
- **색상**: 파스텔 퍼플/바이올렛 (`workbench` Tailwind colors)
- **목적**: Agent 개발 및 디버깅
- **주요 기능**:
  - Agent 등록 (+)
  - TraceCapturePanel (설정 + Live Trace)
  - ChatPlayground (메시지 + 스트리밍)
  - WebSocket 실시간 Trace

### 2. Hub (허브) - 운영 모드
- **색상**: 파스텔 블루 (`hub` Tailwind colors)
- **목적**: 공개된 Agent 탐색 및 사용
- **주요 기능**:
  - AI 랭킹 검색
  - Agent 카드 목록
  - ChatPlayground (Trace 없음)

### 3. Flow (플로우) - 통합 모드
- **색상**: 파스텔 그린/틸 (`flow` Tailwind colors)
- **목적**: 복수 Agent 조합 실행
- **주요 기능**:
  - Agent 선택 Dropdown
  - 자동/수동 Agent 선택
  - Claude 스타일 미니멀 UI

## 🛠️ 설치 및 실행

### 1. 의존성 설치
```bash
cd frontend
npm install
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
```

**`.env` 파일:**
```bash
VITE_API_BASE_URL=https://localhost:9050
VITE_WS_BASE_URL=wss://localhost:9050
VITE_ENV=development
```

### 3. 개발 서버 실행
```bash
npm run dev
```

Frontend: http://localhost:9060

### 4. 빌드
```bash
npm run build
```

빌드 결과물: `dist/`

### 5. Lint
```bash
npm run lint
```

## 🔗 Backend API 연동

### API Base URL
- **개발**: `https://localhost:9050`
- **운영**: `https://a2g-platform.company.com:9050`

### 인증
모든 API 요청에 JWT Bearer Token을 포함합니다:
```typescript
Authorization: Bearer {accessToken}
```

Token은 SSO 로그인 후 localStorage에 저장됩니다:
```typescript
localStorage.setItem('accessToken', token);
```

### Axios Interceptor
`src/api/axios.ts`에서 자동으로 Token을 헤더에 추가합니다.

## 🎨 스타일링

### Tailwind CSS Dark Mode
- **Strategy**: `selector` (v3.4.1+)
- **클래스**: `dark:` variant 사용
- **토글**: `useThemeStore`에서 관리
- **적용**: `document.documentElement.classList.add('dark')`

### MUI 테마
- **Light Theme**: `lightTheme` (`src/utils/theme.ts`)
- **Dark Theme**: `darkTheme`
- **동적 전환**: `useThemeStore`와 연동

### 모드별 색상
```typescript
// Workbench
bg-purple-100 dark:bg-purple-800
text-purple-700 dark:text-purple-200

// Hub
bg-sky-100 dark:bg-sky-800
text-sky-700 dark:text-sky-200

// Flow
bg-teal-100 dark:bg-teal-800
text-teal-700 dark:text-teal-200
```

## 🧪 테스트

### E2E 테스트 시나리오
1. SSO 로그인
2. Workbench에서 Agent 생성
3. Agent Playground에서 메시지 전송
4. Live Trace 확인
5. Agent 운영 전환
6. Hub에서 Agent 검색
7. Flow에서 복수 Agent 실행

## 📚 참고 자료

### Backend 연동 가이드
각 Backend 서비스별 가이드 문서:
- [user-service/FRONTEND_GUIDE.md](../repos/user-service/FRONTEND_GUIDE.md)
- [agent-service/FRONTEND_GUIDE.md](../repos/agent-service/FRONTEND_GUIDE.md)
- [chat-service/FRONTEND_GUIDE.md](../repos/chat-service/FRONTEND_GUIDE.md)
- [tracing-service/FRONTEND_GUIDE.md](../repos/tracing-service/FRONTEND_GUIDE.md)
- [admin-service/FRONTEND_GUIDE.md](../repos/admin-service/FRONTEND_GUIDE.md)

### 프로젝트 문서
- [BLUEPRINT.md](../BLUEPRINT.md): UI/UX 디자인 명세서
- [API_CONTRACTS.md](../API_CONTRACTS.md): API 계약서
- [DEVELOPMENT_GUIDE.md](../DEVELOPMENT_GUIDE.md): 개발 가이드

## 📞 문의

- **프로젝트 리더**: 한승하 (syngha.han@samsung.com)
- **GitHub Issues**: [A2G-Dev-Space/Agent-Platform-Development/issues](https://github.com/A2G-Dev-Space/Agent-Platform-Development/issues)
