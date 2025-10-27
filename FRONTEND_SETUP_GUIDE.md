# 🎨 Frontend Setup Guide - Tailwind v4 & React Compiler

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일
**기술 스택**: React 19, Vite, Tailwind CSS v4, React Compiler

---

## 📋 목차

1. [개요](#1-개요)
2. [Tailwind CSS v4 설치](#2-tailwind-css-v4-설치)
3. [React Compiler 설치](#3-react-compiler-설치)
4. [Dark Theme 설정](#4-dark-theme-설정)
5. [프로젝트 구조](#5-프로젝트-구조)
6. [문제 해결](#6-문제-해결)

---

## 1. 개요

### 1.1 신규 기술 스택 변경사항

A2G Platform Frontend는 다음 최신 기술 스택을 사용합니다:

| 기술 | 버전 | 변경 사항 |
|------|------|-----------|
| **Tailwind CSS** | v4 (Alpha) | CSS 기반 설정, `@theme` 지시어, 성능 개선 |
| **React Compiler** | Babel Plugin | 자동 메모이제이션, `useMemo`/`useCallback` 불필요 |
| **React** | 19 | 최신 기능 지원 |
| **Vite** | 5+ | 빠른 빌드 |

### 1.2 주요 개선 사항

**Tailwind CSS v4**:
- ✅ CSS 파일에서 직접 테마 변수 정의 (`@theme`)
- ✅ `tailwind.config.js` 파일 불필요
- ✅ 자동 불투명도 처리 (`text-primary-200/50`)
- ✅ 향상된 다크 모드 지원

**React Compiler**:
- ✅ 자동 메모이제이션으로 성능 최적화
- ✅ `useMemo`, `useCallback` 수동 작성 불필요
- ✅ React 19에서 최적 성능

---

## 2. Tailwind CSS v4 설치

### 2.1 프로젝트 생성 (신규 프로젝트인 경우)

```bash
# Vite + React + TypeScript 프로젝트 생성
npm create vite@latest agent-platform-frontend -- --template react-ts
cd agent-platform-frontend
npm install
```

### 2.2 Tailwind CSS v4 패키지 설치

```bash
# Tailwind CSS v4 및 Vite 플러그인 설치
npm install tailwindcss@next @tailwindcss/vite@next
```

**중요**: `@next` 태그를 사용하여 v4 Alpha 버전을 설치합니다.

### 2.3 Vite 설정 파일 수정

`vite.config.ts` 파일에 Tailwind 플러그인을 추가합니다:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(), // Tailwind v4 Vite 플러그인
  ],
  server: {
    port: 9060,
  },
})
```

### 2.4 CSS 파일 설정

`src/index.css` 파일을 다음과 같이 수정합니다:

```css
/* src/index.css */

/* Tailwind CSS v4 import */
@import "tailwindcss";

/* 기본 스타일 리셋 (선택사항) */
@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

### 2.5 테스트

개발 서버를 실행하고 Tailwind 클래스가 작동하는지 확인합니다:

```bash
npm run dev
```

`src/App.tsx`에서 테스트:

```tsx
function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-500 text-white text-4xl font-bold">
      Tailwind v4 is working!
    </div>
  )
}
```

---

## 3. React Compiler 설치

### 3.1 React Compiler 패키지 설치

```bash
# Babel 플러그인 설치 (개발 의존성)
npm install --save-dev babel-plugin-react-compiler
```

### 3.2 Vite 설정에 통합

**방법 1: @vitejs/plugin-react에 통합 (권장)**

`vite.config.ts`를 수정합니다:

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          'babel-plugin-react-compiler', // React Compiler 추가
        ],
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 9060,
  },
})
```

**방법 2: vite-plugin-babel 사용 (대안)**

```bash
# vite-plugin-babel 설치
npm install --save-dev vite-plugin-babel
```

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import babel from 'vite-plugin-babel'

export default defineConfig({
  plugins: [
    react(),
    babel({
      babelConfig: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
    tailwindcss(),
  ],
  server: {
    port: 9060,
  },
})
```

### 3.3 컴파일러 동작 확인

**React DevTools 확인**:
1. Chrome에서 React DevTools 설치
2. 개발 서버 실행 후 브라우저에서 확인
3. 최적화된 컴포넌트는 "Memo ✨" 배지가 표시됩니다

**빌드 출력 확인**:
```bash
npm run build
```

컴파일된 코드에 다음과 같은 import가 포함됩니다:
```javascript
import { c as _c } from "react/compiler-runtime";
```

### 3.4 중요 사항

1. **실행 순서**: React Compiler는 Babel 플러그인 파이프라인에서 **가장 먼저** 실행되어야 합니다.
2. **호환성**: React 17, 18, 19 모두 지원하지만 React 19에서 최적 성능을 발휘합니다.
3. **자동 최적화**: `useMemo`, `useCallback`을 수동으로 작성할 필요가 없습니다.

---

## 4. Dark Theme 설정

### 4.1 CSS 변수 기반 테마 시스템

Tailwind v4에서는 `@variant`와 `@theme`을 사용하여 다크 모드를 구현합니다.

#### 4.1.1 기본 다크 모드 설정

`src/index.css`에 다크 모드 variant를 추가합니다:

```css
/* src/index.css */
@import "tailwindcss";

/* data-theme 속성 기반 다크 모드 */
@variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
      sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}
```

#### 4.1.2 테마 변수 정의 (고급)

더 세밀한 제어를 위해 `@theme`을 사용합니다:

```css
/* src/index.css */
@import "tailwindcss";

@variant dark (&:where([data-theme="dark"], [data-theme="dark"] *));

/* 테마 변수 정의 */
@theme {
  --color-*: initial;

  /* 라이트 테마 색상 */
  --color-bg-base: #FDFDFD;
  --color-text-primary: #1a1a1a;
  --color-primary: #0A7280;
  --color-secondary: #5E6AD2;

  /* 중립 색상 (라이트) */
  --color-neutral-50: oklch(0.985 0.001 106.423);
  --color-neutral-100: oklch(0.970 0.001 106.424);
  --color-neutral-200: oklch(0.923 0.003 48.717);
  --color-neutral-300: oklch(0.868 0.007 33.665);
  --color-neutral-400: oklch(0.691 0.012 51.682);
  --color-neutral-500: oklch(0.553 0.016 49.371);
  --color-neutral-600: oklch(0.444 0.013 49.250);
  --color-neutral-700: oklch(0.361 0.011 56.043);
  --color-neutral-800: oklch(0.268 0.007 34.298);
  --color-neutral-900: oklch(0.216 0.006 56.043);
}

/* 다크 테마 오버라이드 */
@layer base {
  [data-theme="dark"] {
    --color-bg-base: #1a1a1a;
    --color-text-primary: #FDFDFD;
    --color-primary: #BAD7DB;
    --color-secondary: #8B93FF;

    /* 중립 색상 (다크) - 순서 반전 */
    --color-neutral-50: oklch(0.216 0.006 56.043);
    --color-neutral-100: oklch(0.268 0.007 34.298);
    --color-neutral-200: oklch(0.361 0.011 56.043);
    --color-neutral-300: oklch(0.444 0.013 49.250);
    --color-neutral-400: oklch(0.553 0.016 49.371);
    --color-neutral-500: oklch(0.691 0.012 51.682);
    --color-neutral-600: oklch(0.868 0.007 33.665);
    --color-neutral-700: oklch(0.923 0.003 48.717);
    --color-neutral-800: oklch(0.970 0.001 106.424);
    --color-neutral-900: oklch(0.985 0.001 106.423);
  }
}
```

**사용 예시**:
```tsx
<div className="bg-bg-base text-text-primary">
  <button className="bg-primary text-white hover:bg-primary/80">
    Click me
  </button>
</div>
```

### 4.2 React에서 테마 토글 구현

#### 4.2.1 Zustand Store 생성

```typescript
// src/store/useThemeStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ThemeStore {
  theme: 'light' | 'dark' | 'auto';
  setTheme: (theme: 'light' | 'dark' | 'auto') => void;
  resolvedTheme: 'light' | 'dark';
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: 'light',
      resolvedTheme: 'light',

      setTheme: (theme) => {
        set({ theme });

        // DOM에 적용
        if (theme === 'auto') {
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          const resolved = prefersDark ? 'dark' : 'light';
          document.documentElement.dataset.theme = resolved;
          set({ resolvedTheme: resolved });
        } else {
          document.documentElement.dataset.theme = theme;
          set({ resolvedTheme: theme });
        }
      },
    }),
    {
      name: 'theme-storage',
    }
  )
);
```

#### 4.2.2 ThemeProvider 컴포넌트

```tsx
// src/components/ThemeProvider.tsx
import { useEffect } from 'react';
import { useThemeStore } from '../store/useThemeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // 초기 테마 적용
    setTheme(theme);

    // 시스템 테마 변경 감지 (auto 모드인 경우)
    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        const resolved = e.matches ? 'dark' : 'light';
        document.documentElement.dataset.theme = resolved;
        useThemeStore.setState({ resolvedTheme: resolved });
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, setTheme]);

  return <>{children}</>;
}
```

#### 4.2.3 ThemeToggle 컴포넌트

```tsx
// src/components/ThemeToggle.tsx
import { useThemeStore } from '../store/useThemeStore';

export function ThemeToggle() {
  const { theme, setTheme } = useThemeStore();

  const handleToggle = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  };

  return (
    <button
      onClick={handleToggle}
      className="p-2 rounded-lg bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? '🌙' : '☀️'}
    </button>
  );
}
```

#### 4.2.4 App에 적용

```tsx
// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { ThemeProvider } from './components/ThemeProvider.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

```tsx
// src/App.tsx
import { ThemeToggle } from './components/ThemeToggle'

function App() {
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <nav className="p-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">A2G Platform</h1>
          <ThemeToggle />
        </div>
      </nav>

      <main className="container mx-auto p-8">
        <h2 className="text-3xl font-bold mb-4">Welcome to A2G Platform</h2>
        <p className="text-neutral-600 dark:text-neutral-400">
          Tailwind v4 dark mode is working perfectly!
        </p>
      </main>
    </div>
  )
}

export default App
```

### 4.3 next-themes 라이브러리 사용 (대안)

더 간단한 방법으로 `next-themes` 라이브러리를 사용할 수 있습니다:

```bash
npm install next-themes
```

```tsx
// src/main.tsx
import { ThemeProvider } from 'next-themes'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider attribute="data-theme">
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)
```

```tsx
// src/components/ThemeToggle.tsx
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  )
}
```

---

## 5. 프로젝트 구조

### 5.1 권장 디렉토리 구조

```
agent-platform-frontend/
├── src/
│   ├── components/           # 공통 컴포넌트
│   │   ├── ThemeProvider.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── layout/
│   │       ├── Layout.tsx
│   │       └── WorkspaceHeader.tsx
│   ├── pages/                # 페이지 컴포넌트
│   │   ├── Dashboard.tsx
│   │   ├── AgentPlayground.tsx
│   │   └── ProductionPage.tsx
│   ├── store/                # Zustand 스토어
│   │   ├── useAuthStore.ts
│   │   ├── useThemeStore.ts
│   │   └── useWorkspaceStore.ts
│   ├── services/             # API 서비스
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── hooks/                # 커스텀 훅
│   │   └── useTraceLogSocket.ts
│   ├── types/                # TypeScript 타입
│   │   └── index.ts
│   ├── index.css             # Tailwind v4 CSS
│   ├── main.tsx
│   └── App.tsx
├── public/
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### 5.2 package.json 예시

```json
{
  "name": "agent-platform-frontend",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-router-dom": "^6.20.0",
    "zustand": "^4.4.7",
    "axios": "^1.6.2",
    "socket.io-client": "^4.6.0",
    "next-themes": "^0.2.1"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.8",
    "typescript": "^5.3.3",
    "tailwindcss": "^4.0.0-alpha.1",
    "@tailwindcss/vite": "^4.0.0-alpha.1",
    "babel-plugin-react-compiler": "^0.0.0-experimental-1234567-20241027"
  }
}
```

---

## 6. 문제 해결

### 6.1 Tailwind 클래스가 작동하지 않음

**증상**: CSS 클래스가 적용되지 않음

**해결 방법**:
1. `@import "tailwindcss"` 구문이 `src/index.css` 최상단에 있는지 확인
2. `vite.config.ts`에 `@tailwindcss/vite` 플러그인이 추가되었는지 확인
3. Dev 서버 재시작: `npm run dev`

### 6.2 React Compiler 적용 안 됨

**증상**: React DevTools에 "Memo ✨" 배지가 표시되지 않음

**해결 방법**:
1. `babel-plugin-react-compiler`가 설치되었는지 확인
2. `vite.config.ts`의 Babel 설정 확인
3. 빌드 후 컴파일된 코드에 `react/compiler-runtime` import 확인

### 6.3 다크 모드가 적용되지 않음

**증상**: `dark:` 클래스가 작동하지 않음

**해결 방법**:
1. `@variant dark` 구문이 `src/index.css`에 있는지 확인
2. `data-theme` 속성이 `<html>` 또는 `<body>`에 설정되는지 확인
3. 브라우저 DevTools에서 DOM 확인:
   ```html
   <html data-theme="dark">
   ```

### 6.4 Vite 빌드 오류

**증상**: `Uncaught SyntaxError: The requested module does not provide an export named 'default'`

**해결 방법**:
```typescript
// vite.config.ts에서 named import 사용
import tailwindcss from '@tailwindcss/vite'

// ❌ 잘못된 방법
// import * as tailwindcss from '@tailwindcss/vite'
```

### 6.5 TypeScript 타입 오류

**증상**: `Property 'dataset' does not exist on type 'HTMLElement'`

**해결 방법**:
```typescript
// tsconfig.json에 DOM 타입 추가
{
  "compilerOptions": {
    "lib": ["ES2020", "DOM", "DOM.Iterable"]
  }
}
```

---

## 📚 참고 자료

- [Tailwind CSS v4 Alpha Documentation](https://tailwindcss.com/docs/v4-beta)
- [React Compiler Documentation](https://react.dev/learn/react-compiler)
- [Vite Plugin Documentation](https://vitejs.dev/guide/api-plugin.html)
- [Zustand Documentation](https://docs.pmnd.rs/zustand/getting-started/introduction)

---

## 🎯 다음 단계

1. **MUI 통합**: Google Gemini 스타일 컴포넌트 구현
2. **WebSocket 통합**: 실시간 Trace Log 수신
3. **라우팅 설정**: React Router 설정
4. **상태 관리**: Zustand 스토어 구현
5. **API 연동**: Axios 인터셉터 및 인증 처리

---

**Contact**: syngha.han@samsung.com
**Repository**: [agent-platform-frontend](https://github.com/A2G-Dev-Space/agent-platform-frontend)
