# 🎨 A2G Platform Frontend

**담당자**: DEV1 (한승하, syngha.han@company.com)
**기술**: React 19 + TypeScript + Vite
**포트**: 9060

---

## 📋 목차

1. [서비스 개요](#서비스-개요)
2. [기술 스택](#기술-스택)
3. [프로젝트 구조](#프로젝트-구조)
4. [주요 기능](#주요-기능)
5. [UI/UX 디자인 시스템](#uiux-디자인-시스템)
6. [모드 시스템](#모드-시스템)
7. [컴포넌트 가이드](#컴포넌트-가이드)
8. [상태 관리](#상태-관리)
9. [API 통합](#api-통합)
10. [개발 환경 설정](#개발-환경-설정)
11. [테스트 가이드](#테스트-가이드)
12. [성능 최적화](#성능-최적화)
13. [접근성 (WCAG 2.1 AA)](#접근성-wcag-21-aa)
14. [성능 모니터링](#성능-모니터링)
15. [배포 전 체크리스트](#배포-전-체크리스트)
16. [Sprint 체크리스트](#sprint-체크리스트)

---

## 서비스 개요

A2G Platform의 **React 기반 Frontend 애플리케이션**입니다.

### 핵심 역할
- **사용자 인터페이스**: 에이전트 관리, 채팅, 통계 등 전체 UI
- **3가지 모드**: Workbench (개발), Hub (사용), Flow (워크플로우)
- **실시간 통신**: WebSocket 기반 실시간 채팅
- **Top-K 추천**: AI 기반 에이전트 추천

### 특징
- **React 19**: 최신 React 기능 사용
- **TypeScript**: 타입 안전성
- **Tailwind CSS**: 유틸리티 기반 스타일링
- **Zustand**: 경량 상태 관리
- **React Query**: 서버 상태 관리

### 최근 업데이트 (v2.0.0 - 2025-10-29)

#### ✨ 새로운 기능
- **신규 디자인 시스템**: Tailwind CSS v4 기반 전체 UI 재디자인
- **라이트/다크 모드**: 모든 페이지 라이트/다크 모드 완벽 지원
- **다국어 지원**: `i18next`를 사용한 한국어/영어 지원
- **신규 설정 페이지**: 사용자 관리, LLM 모델 관리, 통계 대시보드 등 4종 추가
- **워크벤치 UI 개편**: 에이전트 목록, 채팅 플레이그라운드, 트레이스 뷰 3단 레이아웃
- **허브 UI 개편**: Top-K 추천 및 전체 에이전트 목록 새 디자인
- **플로우 페이지**: 새로운 플로우 페이지 기본 UI 구현

#### 🎨 디자인 개선
- 모든 핵심 UI 컴포넌트 재작성 (버튼, 카드, 모달, 테이블 등)
- 사이드바, 헤더 등 레이아웃 통일
- `lucide-react` 아이콘으로 교체

#### 🛠️ 기술적 변경
- Tailwind CSS v4 마이그레이션
- `i18next`, `react-i18next` 라이브러리 추가
- 새로운 설정 페이지용 API 스텁 추가
- Zustand 스토어 리팩토링

---

## 기술 스택

### Core
- **React**: 19.0.0
- **TypeScript**: 5.6.3
- **Vite**: 6.0.5
- **React Router**: 7.1.1

### Styling
- **Tailwind CSS**: v4
- **MUI (Material-UI)**: 선택적 컴포넌트

### State Management
- **Zustand**: 경량 상태 관리
- **React Query**: 서버 상태 및 캐싱

### HTTP & WebSocket
- **Axios**: HTTP 클라이언트
- **Socket.IO Client**: WebSocket 통신

### 기타
- **Framer Motion**: 애니메이션
- **React Hook Form**: 폼 관리
- **Zod**: 스키마 검증

---

## 프로젝트 구조

```
frontend/
├── src/
│   ├── components/        # 재사용 가능한 컴포넌트
│   │   ├── common/       # 공통 컴포넌트 (Button, Input 등)
│   │   ├── layout/       # 레이아웃 (Header, Sidebar 등)
│   │   ├── agent/        # 에이전트 관련 컴포넌트
│   │   └── chat/         # 채팅 관련 컴포넌트
│   ├── pages/            # 페이지 컴포넌트
│   │   ├── Workbench/    # 워크벤치 모드
│   │   ├── Hub/          # 허브 모드
│   │   ├── Flow/         # 플로우 모드
│   │   └── Settings/     # 설정
│   ├── hooks/            # Custom Hooks
│   ├── stores/           # Zustand stores
│   ├── services/         # API 서비스
│   ├── types/            # TypeScript 타입
│   ├── utils/            # 유틸리티 함수
│   ├── styles/           # 전역 스타일
│   ├── App.tsx          # 메인 App 컴포넌트
│   └── main.tsx         # 진입점
├── public/              # 정적 파일
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

## 주요 기능

### 1. SSO 로그인
- Mock SSO (개발 환경)
- JWT 토큰 기반 인증
- 자동 로그인 유지

### 2. 에이전트 관리
- CRUD 작업
- Top-K AI 추천
- 상태 관리 (DEVELOPMENT/STAGING/PRODUCTION)

### 3. 실시간 채팅
- WebSocket 기반
- 스트리밍 응답
- Agent Transfer 감지

### 4. 통계 대시보드
- 사용자/에이전트 통계
- LLM 사용량
- 시각화 (차트)

---

## UI/UX 디자인 시스템

### 색상 팔레트

#### Light/Dark 모드
```css
/* Light 모드 */
배경: #FFFFFF
텍스트: #1F2937 (gray-900)
보더: #E5E7EB (gray-200)

/* Dark 모드 */
배경: #111827 (gray-900)
텍스트: #F3F4F6 (gray-100)
보더: #374151 (gray-700)
```

#### 모드별 강조 색상
- **Workbench**: 파스텔 퍼플 (#E9D5FF)
- **Hub**: 파스텔 블루 (#E0F2FE)
- **Flow**: 파스텔 틸 (#CCFBF1)

### 타이포그래피
- **한글/영문**: Noto Sans KR (Google Fonts)
- **코드**: JetBrains Mono (Google Fonts)

### 레이아웃
```
┌────────┬──────────────────────────────┐
│ Side   │          Header              │
│ bar    ├──────────────────────────────┤
│        │                              │
│ [🔧]   │      Main Content Area       │
│ [🏢]   │                              │
│ [⚡]   │                              │
│        │                              │
└────────┴──────────────────────────────┘
```

---

## 모드 시스템

### Workbench 모드 (/workbench)
**용도**: 에이전트 개발 및 디버깅

**기능**:
- 개인 에이전트 CRUD
- Playground (채팅 테스트)
- 실시간 로그 추적
- 상태: DEVELOPMENT만 표시

### Hub 모드 (/hub)
**용도**: 프로덕션 에이전트 탐색 및 사용

**기능**:
- Top-K AI 추천
- 에이전트 검색
- 카드 그리드 뷰
- 상태: PRODUCTION만 표시

### Flow 모드 (/flow)
**용도**: 다중 에이전트 워크플로우

**기능**:
- 비주얼 플로우 빌더
- 순차/병렬 실행
- Agent Transfer 시각화

---

## 컴포넌트 가이드

### Layout Components

#### Header
```tsx
// src/components/layout/Header.tsx
<header className="flex justify-between items-center px-6 py-3 border-b">
  <div>
    <img src="/logo.svg" />
    <h1>A2G Platform</h1>
  </div>
  <UserProfile />
</header>
```

#### Sidebar
```tsx
// src/components/layout/Sidebar.tsx
<aside className="w-16 h-screen flex flex-col bg-gray-100 dark:bg-gray-900">
  <SidebarButton icon="🔧" label="Workbench" active={mode === 'workbench'} />
  <SidebarButton icon="🏢" label="Hub" active={mode === 'hub'} />
  <SidebarButton icon="⚡" label="Flow" active={mode === 'flow'} />
</aside>
```

### Agent Components

#### AgentCard
```tsx
// src/components/agent/AgentCard.tsx
interface AgentCardProps {
  agent: Agent;
  mode: 'workbench' | 'hub';
}

export function AgentCard({ agent, mode }: AgentCardProps) {
  return (
    <div style={{ backgroundColor: agent.card_color }}>
      <div className="flex items-start gap-3">
        <img src={agent.logo_url} className="w-12 h-12 rounded-full" />
        <h3>{agent.title}</h3>
      </div>
      <p>{agent.description}</p>
      <div className="flex flex-wrap gap-2">
        {agent.capabilities.map(cap => (
          <span>#{cap}</span>
        ))}
      </div>
    </div>
  );
}
```

#### AddAgentModal
```tsx
// src/components/agent/AddAgentModal.tsx
export function AddAgentModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    framework: 'Agno',
    card_color: '#E9D5FF'
  });

  return (
    <motion.div>
      {/* 모달 컨텐츠 */}
      <input placeholder="Agent 이름" />
      <textarea placeholder="설명" />
      <select>{/* 프레임워크 */}</select>
      <button onClick={() => onSubmit(formData)}>생성</button>
    </motion.div>
  );
}
```

---

## 상태 관리

### Zustand Store 예시

```typescript
// src/stores/authStore.ts
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  login: (token, user) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token, user });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ accessToken: null, user: null });
  }
}));
```

```typescript
// src/stores/agentStore.ts
export const useAgentStore = create<AgentState>((set) => ({
  agents: [],
  selectedAgent: null,
  setAgents: (agents) => set({ agents }),
  selectAgent: (agent) => set({ selectedAgent: agent })
}));
```

---

## API 통합

### API Gateway 라우팅

모든 Frontend API 요청은 API Gateway(`http://localhost:9050`)를 통해 백엔드 서비스로 전달됩니다. Gateway는 요청 경로의 접두사(prefix)를 기준으로 담당 서비스를 결정하여 요청을 프록시합니다.

- **`http://localhost:9050/api/auth/**` -> `user-service`
- **`http://localhost:9050/api/users/**` -> `user-service`
- **`http://localhost:9050/api/agents/**` -> `agent-service`
- **`http://localhost:9050/api/admin/**` -> `admin-service`

따라서 Frontend에서 API를 호출할 때는 전체 경로(예: `/api/users/me`)를 사용해야 합니다.

### API 서비스 (`api.ts`)

`src/services/api.ts` 파일은 모든 API 요청의 기반이 되는 `axios` 인스턴스를 설정합니다. JWT 토큰을 자동으로 헤더에 추가하고, 401 에러 발생 시 로그인 페이지로 리디렉션하는 인터셉터가 포함되어 있습니다.

```typescript
// src/services/api.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9050';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 인터셉터: 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 인터셉터: 401 에러 시 로그아웃
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('accessToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### 서비스별 API 모듈

각각의 백엔드 서비스 API는 `src/services/` 디렉토리 아래에 별도의 모듈로 관리합니다.

#### 인증 API (`authService.ts`)

```typescript
// src/services/authService.ts
import api from './api';

export const authService = {
  // SSO 로그인 프로세스 시작
  login: (redirectUri: string) => 
    api.post('/api/auth/login', { redirect_uri: redirectUri }),

  // SSO 콜백 처리 및 JWT 토큰 발급
  handleCallback: (idToken: string) => 
    api.post('/api/auth/callback', { id_token: idToken }),

  // 로그아웃
  logout: () => api.post('/api/auth/logout'),
};
```

#### 사용자 API (`userService.ts`)

```typescript
// src/services/userService.ts
import api from './api';

export const userService = {
  // 현재 사용자 정보 조회
  getMe: () => api.get('/api/users/me'),

  // 현재 사용자 정보 업데이트
  updateMe: (data: UpdateUserData) => api.put('/api/users/me', data),
};
```

#### 에이전트 API (`agentService.ts`)

```typescript
// src/services/agentService.ts
import api from './api';

export const agentService = {
  // 에이전트 목록 조회
  getAgents: (filters) => api.get('/api/agents/', { params: filters }),
  
  // ID로 단일 에이전트 조회
  getAgentById: (id) => api.get(`/api/agents/${id}/`),
  
  // 쿼리로 에이전트 검색 (추천)
  searchAgents: (query) => api.post('/api/agents/search', { query }),
  
  // 새 에이전트 생성
  createAgent: (data) => api.post('/api/agents/', data),
};
```

### React Query 사용

서버 상태 관리는 `React Query`를 사용합니다. `useQuery`로 데이터를 조회하고 `useMutation`으로 데이터를 변경합니다.

```typescript
// src/hooks/useAgents.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { agentService } from '@/services/agentService';

export function useAgents() {
  return useQuery({
    queryKey: ['agents'],
    queryFn: agentService.getAll
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: agentService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
    }
  });
}
```

---

## 개발 환경 설정

### 일반 사용 (권장)

```bash
# 1. 백엔드 서비스 시작
cd ~/projects/Agent-Platform-Development
./start-dev.sh full

# 2. Frontend 실행
cd frontend
npm install
npm run dev

# 3. 브라우저에서 접속
# http://localhost:9060
```

### 환경 변수 설정

```bash
# frontend/.env.development
VITE_API_BASE_URL=http://localhost:9050
VITE_WS_BASE_URL=ws://localhost:9050
```

### 빌드

```bash
# 개발 빌드
npm run build

# 프로덕션 빌드
npm run build --mode production

# 빌드 프리뷰
npm run preview
```

---

## 테스트 가이드

### 브라우저 콘솔 테스트

```javascript
// 로그인 확인
localStorage.getItem('accessToken');

// API 테스트 (user-service)
fetch('/api/users/me', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(console.log);

// API 테스트 (agent-service)
fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
}).then(r => r.json()).then(console.log);

// Zustand Store 확인
window.__ZUSTAND_STORES__ // 디버깅용
```

### WebSocket 테스트

```javascript
const token = localStorage.getItem('accessToken');
const ws = new WebSocket(`ws://localhost:9050/ws/chat/session-123?token=${token}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', JSON.parse(e.data));
ws.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
```

---

## 성능 최적화

**환경**: 사내망 (외부 노출 없음), 데스크톱 전용

### Core Web Vitals 목표

| 지표 | 목표 | 설명 |
|------|------|------|
| **LCP** | < 2.5s | Largest Contentful Paint (가장 큰 콘텐츠 로딩) |
| **INP** | < 200ms | Interaction to Next Paint (인터랙션 응답) |
| **CLS** | < 0.1 | Cumulative Layout Shift (레이아웃 이동) |
| **FCP** | < 1.8s | First Contentful Paint (첫 콘텐츠 표시) |

### 이미지 최적화

```tsx
// 권장: 최적화된 이미지 컴포넌트 사용
<img
  src="/images/agent-logo.webp"
  alt="Agent logo"
  width="200"
  height="200"
  loading="lazy"  // Below-the-fold 이미지
  decoding="async"
/>

// LCP 이미지는 우선 로딩
<img
  src="/images/hero-banner.webp"
  alt="Hero banner"
  width="1200"
  height="600"
  loading="eager"  // 우선 로딩
  fetchpriority="high"
/>
```

**가이드라인:**
- WebP 포맷 사용 (30% 더 작음)
- Lazy loading: `loading="lazy"` 속성
- 명시적 width/height로 CLS 방지
- 모든 이미지에 alt 텍스트 (접근성)

### 폰트 최적화

```html
<!-- index.html: Google Fonts 사용 -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
```

```css
/* Tailwind CSS 설정 */
@import '@tailwind/base';
@import '@tailwind/components';
@import '@tailwind/utilities';

@layer base {
  body {
    font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  code, pre {
    font-family: 'JetBrains Mono', monospace;
  }
}
```

**가이드라인:**
- Google Fonts 사용 (`display=swap` 자동 적용)
- preconnect로 DNS 조회 시간 단축
- 필요한 font-weight만 로드 (400, 500, 700)
- System font fallback 설정

### JavaScript 최적화

```typescript
// 무거운 컴포넌트 동적 임포트
import { lazy, Suspense } from 'react';

const SalesChart = lazy(() => import('@/components/charts/SalesChart'));

function Dashboard() {
  return (
    <Suspense fallback={<div>Loading chart...</div>}>
      <SalesChart data={data} />
    </Suspense>
  );
}
```

**가이드라인:**
- Route-based code splitting (자동)
- 무거운 컴포넌트 lazy loading (차트, 테이블)
- Tree-shaking 활성화
- 번들 크기: < 500KB (first load)

### Bundle 분석

```bash
# Bundle analyzer 실행
npm run build
npx vite-bundle-visualizer

# 또는 rollup-plugin-visualizer 사용
```

---

## 접근성 (WCAG 2.1 AA)

### Semantic HTML

```tsx
// 올바른 구조
<main id="main-content">
  <article>
    <h1>Dashboard</h1>  {/* 페이지당 정확히 1개 */}
    <section>
      <h2>Statistics</h2>
      <h3>User Count</h3>
    </section>
  </article>
</main>
```

**규칙:**
- H1: 페이지당 정확히 1개
- H2, H3: 계층적 구조
- Semantic tags: `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`

### 키보드 네비게이션

```tsx
// 접근 가능한 Modal
function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement as HTMLElement;
      modalRef.current?.focus();
    } else {
      previousFocus.current?.focus();
    }
  }, [isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="modal-overlay"
    >
      <div className="modal-content">
        <h2 id="modal-title">Modal Title</h2>
        {children}
        <button onClick={onClose} aria-label="Close modal">
          닫기
        </button>
      </div>
    </div>
  );
}
```

**가이드라인:**
- Tab으로 모든 인터랙티브 요소 접근
- Enter/Space로 버튼 실행
- Escape로 모달 닫기
- Focus 시각적 표시 필수
- aria-labels 적절히 사용

### 색상 대비

```css
/* 텍스트: 4.5:1 이상 */
.text-primary {
  color: #1F2937;  /* gray-900 */
  background: #FFFFFF;
}

/* 큰 텍스트 (18pt+): 3:1 이상 */
.text-large {
  color: #4B5563;  /* gray-600 */
  background: #FFFFFF;
}

/* UI 요소: 3:1 이상 */
.button-primary {
  background: #3B82F6;  /* blue-500 */
  color: #FFFFFF;
}
```

**도구:**
- Chrome DevTools > Lighthouse > Accessibility
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)

---

## 성능 모니터링

### Lighthouse 감사

```bash
# 프로덕션 빌드 후 실행
npm run build
npm run preview

# Lighthouse 실행 (Chrome DevTools)
# F12 > Lighthouse > Generate report
```

**목표 점수:**
- Performance: 90+
- Accessibility: 100
- Best Practices: 90+

### Web Vitals 측정

```typescript
// src/utils/webVitals.ts
import { onCLS, onFCP, onINP, onLCP } from 'web-vitals';

export function reportWebVitals() {
  onCLS(console.log);  // Cumulative Layout Shift
  onFCP(console.log);  // First Contentful Paint
  onINP(console.log);  // Interaction to Next Paint
  onLCP(console.log);  // Largest Contentful Paint
}

// src/main.tsx
import { reportWebVitals } from './utils/webVitals';

reportWebVitals();
```

---

## 배포 전 체크리스트

### 성능
- [ ] LCP < 2.5s 달성
- [ ] INP < 200ms 달성
- [ ] CLS < 0.1 달성
- [ ] 이미지: WebP 포맷 + lazy loading
- [ ] 폰트: WOFF2 포맷 + preload
- [ ] JavaScript 번들 < 500KB
- [ ] Lighthouse 성능 점수 90+

### 접근성
- [ ] WCAG 2.1 AA 준수
- [ ] 키보드 네비게이션 완전
- [ ] 스크린 리더 테스트 (NVDA)
- [ ] 색상 대비 4.5:1
- [ ] Focus 표시 가시적
- [ ] Lighthouse 접근성 점수 100

### 코드 품질
- [ ] Semantic HTML 구조
- [ ] H1 페이지당 정확히 1개
- [ ] aria-labels 적절히 사용
- [ ] 브라우저 콘솔 오류 없음
- [ ] TypeScript strict mode
- [ ] ESLint 경고 없음

### 보안
- [ ] HTTPS 설정 (사내 인증서)
- [ ] CSP 헤더 설정
- [ ] XSS 취약점 없음
- [ ] SSO 통합 완료
- [ ] JWT 토큰 안전하게 저장

### 기능
- [ ] SSO 로그인 작동
- [ ] 에이전트 CRUD 작동
- [ ] WebSocket 연결 성공
- [ ] Top-K 추천 표시
- [ ] 3가지 모드 전환 가능
- [ ] 다크 모드 정상 작동

---

## Sprint 체크리스트

### 한승하 (syngha.han@company.com)

#### Sprint 1 (1주차)
- [ ] 프로젝트 초기화 (React + Vite + TypeScript)
- [ ] Tailwind CSS 설정
- [ ] 기본 레이아웃 (Header, Sidebar) 구현
- [ ] React Router 설정
- [ ] SSO 로그인 연동

#### Sprint 2 (2주차)
- [ ] Zustand Store 설정
- [ ] API 서비스 레이어 구현
- [ ] Agent CRUD UI 구현
- [ ] AgentCard 컴포넌트
- [ ] AddAgentModal 구현

#### Sprint 3 (3주차)
- [ ] 3가지 모드 UI 구현
- [ ] Workbench Playground
- [ ] WebSocket 채팅 UI
- [ ] Top-K 추천 UI
- [ ] 실시간 로그 뷰어

#### Sprint 4 (4주차)
- [ ] Flow 모드 플로우 빌더
- [ ] 통계 대시보드
- [ ] 다크 모드 완성
- [ ] 반응형 디자인
- [ ] 통합 테스트 및 버그 수정

---

## 관련 문서

- [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [User Service README](../repos/user-service/README.md) - 인증 API
- [Agent Service README](../repos/agent-service/README.md) - 에이전트 API
- [Chat Service README](../repos/chat-service/README.md) - 채팅 WebSocket

---

**© 2025 A2G Platform Team - Frontend**
