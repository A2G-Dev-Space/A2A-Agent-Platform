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
12. [Sprint 체크리스트](#sprint-체크리스트)

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
- **한글**: Pretendard
- **영문**: -apple-system, BlinkMacSystemFont
- **코드**: JetBrains Mono

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

### API 서비스

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

### Agent API

```typescript
// src/services/agentService.ts
import api from './api';

export const agentService = {
  getAll: () => api.get('/api/agents/'),
  getById: (id: number) => api.get(`/api/agents/${id}/`),
  create: (data: CreateAgentData) => api.post('/api/agents/', data),
  update: (id: number, data: UpdateAgentData) =>
    api.put(`/api/agents/${id}/`, data),
  delete: (id: number) => api.delete(`/api/agents/${id}/`),
  recommend: (query: string, k: number) =>
    api.post('/api/agents/recommend/', { query, k })
};
```

### React Query 사용

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

// API 테스트
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
- [UI_UX_Design.md](../UI_UX_Design.md) - 상세 디자인 가이드
- [User Service README](../repos/user-service/README.md) - 인증 API
- [Agent Service README](../repos/agent-service/README.md) - 에이전트 API
- [Chat Service README](../repos/chat-service/README.md) - 채팅 WebSocket

---

**© 2025 A2G Platform Team - Frontend**
