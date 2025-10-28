# UI/UX 설계 문서 (UI/UX Design Document)

**문서 버전**: 1.0
**작성일**: 2025년 10월 28일
**담당자**: 한승하 (DEV1)

---

## 목차
1. [소개](#1-소개)
2. [전역 스타일](#2-전역-스타일)
3. [레이아웃 구조](#3-레이아웃-구조)
4. [모드별 색상 테마](#4-모드별-색상-테마)
5. [메인 대시보드](#5-메인-대시보드)
6. [컴포넌트 상세 설계](#6-컴포넌트-상세-설계)
7. [Playground 화면](#7-playground-화면)
8. [Flow 모드](#8-flow-모드)
9. [설정 페이지](#9-설정-페이지)
10. [반응형 디자인](#10-반응형-디자인)
11. [애니메이션](#11-애니메이션)

---

## 1. 소개

A2G Agent Platform의 UI/UX 설계 문서입니다. 본 문서는 Google Gemini UI와 Claude UI를 레퍼런스로 하며, 다음과 같은 특징을 가집니다:

- **간결함**: 미니멀한 인터페이스
- **정보 중심**: 사용자가 필요한 정보 우선 표시
- **세련된 아이콘**: Polished iconography
- **명확한 상호작용**: Clear interaction patterns

### 기술 스택
- **CSS Framework**: Tailwind CSS (light/dark 모드 완벽 지원)
- **컴포넌트 라이브러리**: MUI (Material-UI) 또는 Radix UI
- **폰트**: Pretendard (웹 폰트)
- **코드 폰트**: JetBrains Mono, Fira Code

---

## 2. 전역 스타일

### 2.1 색상 팔레트

#### Light/Dark 모드 기본 색상
```
Light 모드:
- 배경: #FFFFFF (white)
- 텍스트: #1F2937 (gray-900)
- 보더: #E5E7EB (gray-200)

Dark 모드:
- 배경: #111827 (gray-900)
- 텍스트: #F3F4F6 (gray-100)
- 보더: #374151 (gray-700)
```

#### Tailwind CSS 색상 설정
```css
body {
  @apply bg-white dark:bg-gray-900;
  @apply text-gray-900 dark:text-gray-100;
}
```

### 2.2 타이포그래피

#### 기본 글꼴 (Pretendard)
```css
@font-face {
  font-family: 'Pretendard';
  src: url('/fonts/Pretendard-Variable.woff2') format('woff2');
  font-weight: 100 900;
}

body {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
```

#### 코드 블록용 모노스페이스 폰트
```css
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
```

#### 타이포그래피 스케일

| 용도 | 크기 | 굵기 | 라인높이 |
|------|------|------|---------|
| H1 (페이지 제목) | 32px | Bold (700) | 40px |
| H2 (섹션 제목) | 24px | Bold (700) | 32px |
| H3 (서브 제목) | 20px | SemiBold (600) | 28px |
| Body (본문) | 14px | Regular (400) | 20px |
| Caption (작은 텍스트) | 12px | Regular (400) | 16px |

### 2.3 브랜딩

#### 로고
- **위치**: Header 좌측 상단
- **크기**: 32x32px (모바일), 40x40px (데스크톱)
- **경로**: `/public/logo.svg` 또는 `/src/assets/logo.svg`
- **클릭 시**: 현재 모드의 메인 대시보드로 이동

#### 브라우저 탭
- **Favicon**: `/public/favicon.ico`
- **제목**: "A2G Platform"

### 2.4 간격 및 크기

```css
/* Spacing (Tailwind 기본값 사용) */
- xs: 0.25rem (4px)
- sm: 0.5rem (8px)
- md: 1rem (16px)
- lg: 1.5rem (24px)
- xl: 2rem (32px)

/* Border Radius */
- none: 0
- sm: 0.125rem (2px)
- base: 0.25rem (4px)
- md: 0.375rem (6px)
- lg: 0.5rem (8px)
- xl: 0.75rem (12px)
```

---

## 3. 레이아웃 구조

### 3.1 전체 구조

A2G Platform은 3영역 구조를 사용합니다:

```
┌────────┬──────────────────────────────────────────┐
│        │          Header (상단 고정)              │
│        │  [Logo] A2G Platform      [Profile]      │
│ Side   ├──────────────────────────────────────────┤
│ bar    │                                          │
│        │         Main Content Area                │
│ [🔧]   │       (react-router <Outlet>)            │
│ [🏢]   │                                          │
│ [⚡]   │                                          │
│        │                                          │
└────────┴──────────────────────────────────────────┘
```

### 3.2 Sidebar (좌측 고정)

#### 구조
- **너비**: `w-16` (64px)
- **높이**: `h-screen` (전체 높이)
- **CSS 클래스**: `flex flex-col h-screen bg-gray-100 dark:bg-gray-900 border-r`
- **위치**: 좌측에 고정, 스크롤되지 않음

#### 상단 모드 메뉴

```
┌────────┐
│  🔧    │  ← Workbench (워크벤치)
│        │
│  🏢    │  ← Hub (허브)
│        │
│  ⚡    │  ← Flow (플로우)
│        │
└────────┘
```

**구현 코드**:
```tsx
<div className="flex flex-col gap-2 p-2">
  <SidebarButton
    icon={<Wrench />}
    label="Workbench"
    active={mode === 'workbench'}
    color="purple"
    onClick={() => navigate('/workbench')}
  />
  <SidebarButton
    icon={<Building />}
    label="Hub"
    active={mode === 'hub'}
    color="sky"
    onClick={() => navigate('/hub')}
  />
  <SidebarButton
    icon={<Zap />}
    label="Flow"
    active={mode === 'flow'}
    color="teal"
    onClick={() => navigate('/flow')}
  />
</div>
```

#### 활성 상태 스타일

| 모드 | 배경색 (Light) | 배경색 (Dark) |
|------|---|---|
| **Workbench** | `bg-purple-200` | `bg-purple-800` |
| **Hub** | `bg-sky-200` | `bg-sky-800` |
| **Flow** | `bg-teal-200` | `bg-teal-800` |

#### 하단 설정 버튼

```
┌────────┐
│        │
│   ⚙️   │  ← Settings
│        │
└────────┘
```

### 3.3 Header (상단 헤더)

#### 레이아웃
- **CSS**: `flex justify-between items-center px-6 py-3 border-b`
- **높이**: 60px
- **배경**: Light 모드 `bg-white`, Dark 모드 `bg-gray-800`

#### 좌측 영역 (Logo + 제목)

```
[Logo] A2G Platform
```

- **로고**: 32x32px 또는 40x40px
- **제목**: "A2G Platform"
- **폰트**: Bold, 18px
- **클릭 시**: 현재 모드의 메인 대시보드로 이동
- **Hover 효과**: `opacity-80` (0.8)

#### 우측 영역 (사용자 프로필)

```
[username ▼]
```

**로그인 상태**:
```
┌──────────────────────────┐
│ 한승하 (ADMIN)           │
│ syngha.han               │
│ AI Platform Team         │
├──────────────────────────┤
│ 🔑 API Keys              │
│ ⚙️ 설정                  │
├──────────────────────────┤
│ 🚪 로그아웃              │
└──────────────────────────┘
```

**로그아웃 상태**:
- "로그인" 버튼 표시

---

## 4. 모드별 색상 테마

### 4.1 Workbench 모드 (워크벤치)

**용도**: Agent 개발 및 디버깅
**색상 계열**: 파스텔 퍼플/바이올렛

| 요소 | 색상 | Tailwind 클래스 |
|------|------|---|
| 강조 배경 | `#E9D5FF` (Light), `#6B21A8` (Dark) | `bg-purple-100` / `dark:bg-purple-800` |
| 강조 텍스트 | `#7E22CE` | `text-purple-700` |
| 강조 보더 | `#D8B4FE` | `border-purple-300` |
| 활성 버튼 | `#A78BFA` | `bg-purple-400` |

### 4.2 Hub 모드 (허브)

**용도**: Agent 탐색 및 사용
**색상 계열**: 파스텔 블루

| 요소 | 색상 | Tailwind 클래스 |
|------|------|---|
| 강조 배경 | `#E0F2FE` (Light), `#082F49` (Dark) | `bg-sky-100` / `dark:bg-sky-800` |
| 강조 텍스트 | `#0369A1` | `text-sky-700` |
| 강조 보더 | `#BAE6FD` | `border-sky-300` |
| 활성 버튼 | `#38BDF8` | `bg-sky-400` |

### 4.3 Flow 모드 (플로우)

**용도**: 복수 Agent 조합 실행
**색상 계열**: 파스텔 그린/틸

| 요소 | 색상 | Tailwind 클래스 |
|------|------|---|
| 강조 배경 | `#CCFBF1` (Light), `#134E4A` (Dark) | `bg-teal-100` / `dark:bg-teal-800` |
| 강조 텍스트 | `#0D9488` | `text-teal-700` |
| 강조 보더 | `#99F6E4` | `border-teal-300` |
| 활성 버튼 | `#14B8A6` | `bg-teal-400` |

### 4.4 색상 적용 위치

- Sidebar 활성 메뉴
- 활성 탭
- 카드 하이라이트
- 버튼 (활성 상태)
- 활성 링크
- 페이지 제목 색상

---

## 5. 메인 대시보드

### 5.1 Hub 모드 대시보드 (/hub)

#### 레이아웃

```
┌────────────────────────────────────────────┐
│ Agent Hub (파스텔 블루 - text-sky-700)     │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────────────────────────────────┐ │
│  │ 어떤 에이전트를 찾고 있나요?          │ │
│  └──────────────────────────────────────┘ │
│                                            │
│  ┌──────────┐  ┌──────────┐ ┌──────────┐ │
│  │ Agent 1  │  │ Agent 2  │ │ Agent 3  │ │
│  └──────────┘  └──────────┘ └──────────┘ │
│                                            │
│  ┌──────────┐  ┌──────────┐ ┌──────────┐ │
│  │ Agent 4  │  │ Agent 5  │ │ Agent 6  │ │
│  └──────────┘  └──────────┘ └──────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

#### 검색 기능
- **입력창**: `<SearchInput placeholder="어떤 에이전트를 찾고 있나요?" />`
- **정렬**: AI 랭킹 기반 (Top-K RAG 유사도 점수)
- **알고리즘**:
  1. 사용자 검색 쿼리 → 임베딩 벡터 생성
  2. 등록된 Agent 임베딩과 유사도 계산
  3. 점수 순으로 정렬 및 표시

#### 카드 그리드
- **CSS**: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- **반응형**:
  - 모바일: 1열
  - 태블릿: 2열
  - 데스크톱: 3열

### 5.2 Workbench 모드 대시보드 (/workbench)

#### 레이아웃

```
┌────────────────────────────────────────────┐
│ My Workbench (파스텔 퍼플 - text-purple-700) │
├────────────────────────────────────────────┤
│                                            │
│  ┌──────────┐  ┌──────────┐ ┌──────────┐ │
│  │    +     │  │ Agent 1  │ │ Agent 2  │ │
│  │새 에이전│  │          │ │          │ │
│  │트 만들기│  │          │ │          │ │
│  └──────────┘  └──────────┘ └──────────┘ │
│                                            │
└────────────────────────────────────────────┘
```

#### '+' 카드 (새 에이전트 생성)
- **스타일**: 점선 테두리, 중앙 정렬
- **CSS**: `border-2 border-dashed border-purple-300`
- **콘텐츠**: '+' 아이콘 + "새 에이전트 만들기" 텍스트
- **클릭 시**: `AddAgentModal` 표시

#### Agent 카드 목록
- **필터**: `status=DEVELOPMENT` (개발 중인 Agent만 표시)
- **카드 디자인**: [6.3 AgentCard 참조](#63-agentcard-컴포넌트)

---

## 6. 컴포넌트 상세 설계

### 6.1 WorkspaceHeader

#### 용도
- 모든 페이지 최상단에 표시
- 로고, 제목, 사용자 프로필 관리

#### 구현

```tsx
<header className="flex justify-between items-center px-6 py-3 border-b bg-white dark:bg-gray-800">
  {/* 좌측: 로고 + 제목 */}
  <div className="flex items-center gap-3 cursor-pointer hover:opacity-80">
    <img src="/logo.svg" alt="A2G" className="w-10 h-10" />
    <h1 className="text-xl font-bold">A2G Platform</h1>
  </div>

  {/* 우측: 사용자 프로필 */}
  <div className="relative">
    <button className="flex items-center gap-2 px-4 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
      <span>{user.username}</span>
      <span>▼</span>
    </button>

    {/* 드롭다운 메뉴 */}
    {isOpen && (
      <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
        <div className="px-4 py-3 border-b">
          <p className="font-semibold">{user.full_name}</p>
          <p className="text-sm text-gray-500">{user.username}</p>
          <p className="text-sm text-gray-500">{user.dept_name_kr}</p>
        </div>
        <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
          🔑 API Keys
        </button>
        <button className="w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700">
          ⚙️ 설정
        </button>
        <button className="w-full px-4 py-2 text-left border-t hover:bg-gray-100 dark:hover:bg-gray-700">
          🚪 로그아웃
        </button>
      </div>
    )}
  </div>
</header>
```

### 6.2 ModeSwitcher

#### 용도
- Sidebar에서 3가지 모드(Workbench, Hub, Flow) 전환

#### SidebarButton 컴포넌트

```tsx
interface SidebarButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  color: 'purple' | 'sky' | 'teal';
  onClick: () => void;
}

export function SidebarButton({
  icon,
  label,
  active,
  color,
  onClick
}: SidebarButtonProps) {
  const bgColorMap = {
    purple: active ? 'bg-purple-200 dark:bg-purple-800' : 'bg-transparent',
    sky: active ? 'bg-sky-200 dark:bg-sky-800' : 'bg-transparent',
    teal: active ? 'bg-teal-200 dark:bg-teal-800' : 'bg-transparent',
  };

  return (
    <button
      onClick={onClick}
      className={`
        w-12 h-12 rounded-lg flex items-center justify-center
        transition-colors duration-200
        ${bgColorMap[color]}
        hover:bg-gray-200 dark:hover:bg-gray-700
      `}
      title={label}
    >
      <span className="text-2xl">{icon}</span>
    </button>
  );
}
```

#### Sidebar 레이아웃

```tsx
<aside className="w-16 h-screen flex flex-col bg-gray-100 dark:bg-gray-900 border-r">
  {/* 상단: 모드 메뉴 */}
  <div className="flex flex-col gap-2 p-2">
    <SidebarButton icon="🔧" label="Workbench" active={mode === 'workbench'} />
    <SidebarButton icon="🏢" label="Hub" active={mode === 'hub'} />
    <SidebarButton icon="⚡" label="Flow" active={mode === 'flow'} />
  </div>

  {/* Spacer */}
  <div className="flex-1" />

  {/* 하단: 설정 버튼 */}
  <div className="flex flex-col gap-2 p-2 border-t">
    <SidebarButton icon="⚙️" label="Settings" active={false} />
  </div>
</aside>
```

### 6.3 AgentCard 컴포넌트

#### 카드 구조

```
┌──────────────────────────────────────┐
│ [Logo]  Agent 제목           [⚙️ ✖️]│  ← 상단
│                                      │
│ Agent 설명 텍스트...                 │  ← 본문
│ #태그1 #태그2 #태그3                 │
├──────────────────────────────────────┤
│ 생성자: syngha.han  |  팀: AI Team   │  ← 하단
│                          🟢 Healthy  │  ← 헬스 상태 (운영만)
└──────────────────────────────────────┘
```

#### CSS 스타일

```tsx
interface AgentCardProps {
  agent: Agent;
  mode: 'workbench' | 'hub' | 'production';
}

export function AgentCard({ agent, mode }: AgentCardProps) {
  const defaultColors = {
    workbench: '#E9D5FF', // 파스텔 퍼플
    hub: '#E0F2FE',       // 파스텔 블루
    production: '#E0F2FE'
  };

  const cardBgColor = agent.card_color || defaultColors[mode];

  return (
    <div
      style={{ backgroundColor: cardBgColor }}
      className="rounded-lg p-4 hover:shadow-lg transition-shadow duration-200"
    >
      {/* 상단 행 */}
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-start gap-3 flex-1">
          {/* 로고 */}
          <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0">
            {agent.logo_url ? (
              <img src={agent.logo_url} alt={agent.title} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span>🤖</span>
            )}
          </div>

          {/* 제목 */}
          <h3 className="font-bold text-lg line-clamp-2 flex-1">
            {agent.title}
          </h3>
        </div>

        {/* 우측 아이콘 (Workbench만) */}
        {mode === 'workbench' && (
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button className="p-1 hover:bg-white rounded" title="수정">
              ⚙️
            </button>
            <button className="p-1 hover:bg-white rounded" title="삭제">
              ✖️
            </button>
          </div>
        )}

        {/* 우측 헬스 상태 (운영만) */}
        {mode === 'production' && (
          <div className="text-sm">
            {agent.health_status === 'healthy' && '🟢 Healthy'}
            {agent.health_status === 'unhealthy' && '🔴 Unhealthy'}
            {agent.health_status === 'unknown' && '⚪️ Unknown'}
          </div>
        )}
      </div>

      {/* 본문 */}
      <p className="text-gray-700 dark:text-gray-300 text-sm line-clamp-4 mb-2">
        {agent.description}
      </p>

      {/* 태그 */}
      <div className="flex flex-wrap gap-2 mb-3 line-clamp-2">
        {agent.capabilities?.map(cap => (
          <span key={cap} className="text-xs text-gray-600 dark:text-gray-400">
            #{cap}
          </span>
        ))}
      </div>

      {/* 하단 정보 */}
      <div className="border-t pt-2 flex justify-between text-xs text-gray-600 dark:text-gray-400">
        <span>생성자: {agent.owner_username}</span>
        <span>{agent.owner_deptname_kr}</span>
      </div>

      {/* 비활성 상태 */}
      {agent.status === 'DISABLED' && (
        <div className="absolute inset-0 bg-gray-500 opacity-30 rounded-lg flex items-center justify-center">
          <span className="bg-gray-700 text-white px-3 py-1 rounded">비활성화됨</span>
        </div>
      )}
    </div>
  );
}
```

### 6.4 AddAgentModal 컴포넌트

#### 모달 구조

```
┌────────────────────────────────────────┐
│  새 에이전트 만들기                [✖]│
├────────────────────────────────────────┤
│                                        │
│  이름 *                                │
│  ┌──────────────────────────────────┐ │
│  │ Customer Support Agent           │ │
│  └──────────────────────────────────┘ │
│                                        │
│  설명 *                                │
│  ┌──────────────────────────────────┐ │
│  │ 고객 문의를 처리하는 에이전트    │ │
│  └──────────────────────────────────┘ │
│                                        │
│  프레임워크 *                          │
│  [Agno ▼]                             │
│                                        │
│  스킬 (한국어)                         │
│  ┌──────────────────────────────────┐ │
│  │ 고객지원, 챗봇                   │ │
│  └──────────────────────────────────┘ │
│                                        │
│  로고 URL                              │
│  ┌──────────────────────────────────┐ │
│  │ https://...                       │ │
│  └──────────────────────────────────┘ │
│                                        │
│  카드 색상                             │
│  [#E3F2FD] [색상 선택기]              │
│                                        │
│  공개 범위                             │
│  ( ) 전체 공개  (●) 팀 공개  ( ) 비공개│
│                                        │
├────────────────────────────────────────┤
│              [취소]  [생성]            │
└────────────────────────────────────────┘
```

#### 입력 필드 명세

| 필드 | 타입 | 필수 | 제약 | 설명 |
|------|------|------|------|------|
| 이름 | Text | ✅ | 최대 100자 | Agent 제목 |
| 설명 | TextArea | ✅ | 최대 500자 | Agent 설명 |
| 프레임워크 | Dropdown | ✅ | Agno/ADK/Langchain/Custom | - |
| 스킬 (KO) | Text | ❌ | 쉼표 구분 | 한국어 스킬 태그 |
| 스킬 (EN) | Text | ❌ | 쉼표 구분 | 영어 스킬 태그 |
| 로고 URL | URL | ❌ | 유효한 이미지 URL | - |
| 카드 색상 | Color | ❌ | Hex 형식 | 기본값: 모드별 파스텔 색상 |
| 공개 범위 | Radio | ✅ | ALL/TEAM/PRIVATE | 기본값: PRIVATE |

#### 구현 예시

```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';

export function AddAgentModal({ isOpen, onClose, onSubmit }: AddAgentModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    framework: 'Agno',
    skill_kr: '',
    skill_en: '',
    logo_url: '',
    card_color: '#E9D5FF',
    visibility: 'PRIVATE'
  });

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-96 overflow-y-auto"
      >
        {/* 헤더 */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">새 에이전트 만들기</h2>
          <button onClick={onClose} className="text-2xl hover:text-gray-600">✖</button>
        </div>

        {/* 폼 */}
        <div className="p-6 space-y-4">
          {/* 이름 */}
          <div>
            <label className="block text-sm font-semibold mb-1">이름 *</label>
            <input
              type="text"
              maxLength={100}
              placeholder="Customer Support Agent"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-semibold mb-1">설명 *</label>
            <textarea
              maxLength={500}
              placeholder="고객 문의를 처리하는 에이전트"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              rows={4}
            />
          </div>

          {/* 프레임워크 */}
          <div>
            <label className="block text-sm font-semibold mb-1">프레임워크 *</label>
            <select
              value={formData.framework}
              onChange={(e) => setFormData({ ...formData, framework: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option>Agno</option>
              <option>ADK</option>
              <option>Langchain</option>
              <option>Custom</option>
            </select>
          </div>

          {/* 스킬 */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">스킬 (한국어)</label>
              <input
                type="text"
                placeholder="고객지원, 챗봇"
                value={formData.skill_kr}
                onChange={(e) => setFormData({ ...formData, skill_kr: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">스킬 (영어)</label>
              <input
                type="text"
                placeholder="support, chatbot"
                value={formData.skill_en}
                onChange={(e) => setFormData({ ...formData, skill_en: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {/* 로고 URL */}
          <div>
            <label className="block text-sm font-semibold mb-1">로고 URL</label>
            <input
              type="url"
              placeholder="https://..."
              value={formData.logo_url}
              onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>

          {/* 카드 색상 */}
          <div>
            <label className="block text-sm font-semibold mb-1">카드 색상</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={formData.card_color}
                onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                className="w-12 h-10 rounded cursor-pointer"
              />
              <input
                type="text"
                value={formData.card_color}
                onChange={(e) => setFormData({ ...formData, card_color: e.target.value })}
                className="flex-1 px-3 py-2 border rounded-lg font-mono"
              />
            </div>
          </div>

          {/* 공개 범위 */}
          <div>
            <label className="block text-sm font-semibold mb-3">공개 범위</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="visibility"
                  value="ALL"
                  checked={formData.visibility === 'ALL'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                />
                <span>전체 공개</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="visibility"
                  value="TEAM"
                  checked={formData.visibility === 'TEAM'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                />
                <span>팀 공개</span>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="visibility"
                  value="PRIVATE"
                  checked={formData.visibility === 'PRIVATE'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                />
                <span>비공개 (기본값)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => onSubmit(formData)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold"
          >
            생성
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
```

---

## 7. Playground 화면

### 7.1 Workbench Playground (/workbench/:id)

#### 레이아웃 (3단)

```
┌──────────┬──────────────────┬──────────────────┐
│          │                  │                  │
│Sidebar   │ TraceCapturePanel│ ChatPlayground   │
│ (w-64)   │ (w-96)           │ (flex-1)         │
│          │                  │                  │
└──────────┴──────────────────┴──────────────────┘
```

### 7.2 PlaygroundSidebar

#### 구조

```
┌─────────────────────────┐
│ ➕ 새 대화              │
├─────────────────────────┤
│                         │
│ 대화 히스토리           │
│                         │
│ 💬 대화 제목     [🗑️]    │
│    2025-10-27 10:30     │
│    12개 메시지          │
│                         │
│ 💬 대화 제목     [🗑️]    │
│    2025-10-27 09:15     │
│    8개 메시지           │
│                         │
│ (스크롤 가능)           │
│                         │
└─────────────────────────┘
```

#### 구현

```tsx
export function PlaygroundSidebar({ sessions, onSelectSession, onNewChat }: PlaygroundSidebarProps) {
  return (
    <div className="w-64 h-screen flex flex-col bg-gray-50 dark:bg-gray-800 border-r">
      {/* 새 대화 버튼 */}
      <button
        onClick={onNewChat}
        className="m-4 px-4 py-2 w-full bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center justify-center gap-2 font-semibold"
      >
        ➕ 새 대화
      </button>

      {/* 대화 히스토리 */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="p-3 bg-white dark:bg-gray-700 rounded-lg cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-semibold text-sm truncate">💬 {session.title}</p>
                  <p className="text-xs text-gray-500 mt-1">{formatDate(session.created_at)}</p>
                  <p className="text-xs text-gray-500">{session.message_count}개 메시지</p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 7.3 TraceCapturePanel (Workbench 전용)

#### 너비 및 레이아웃
- **너비**: `w-96` (384px)
- **높이**: `h-screen` (전체)
- **스크롤**: `overflow-y-auto`

#### 섹션 1: 프레임워크별 설정

**Agno Framework**:
```
┌────────────────────────────────────┐
│ 📡 Agno Agent 설정                 │
├────────────────────────────────────┤
│ Agno Base URL                      │
│ ┌────────────────────────────────┐ │
│ │ http://localhost:9080          │ │
│ └────────────────────────────────┘ │
│               [불러오기]           │
│                                    │
│ 채팅 대상                          │
│ [Agent: main-agent ▼]             │
│                                    │
│ ⚠️ CORS 가이드                     │
│ Agno main.py에 다음 코드 추가:    │
│ ```python                          │
│ from fastapi.middleware.cors       │
│ import CORSMiddleware              │
│ app.add_middleware(...)            │
│ ```                                │
└────────────────────────────────────┘
```

**ADK/Langchain Framework**:
```
┌────────────────────────────────────┐
│ 🔗 A2A Agent 설정                  │
├────────────────────────────────────┤
│ A2A Endpoint URL                   │
│ ┌────────────────────────────────┐ │
│ │ http://localhost:8080/rpc      │ │
│ └────────────────────────────────┘ │
│               [연결 확인]          │
│                                    │
│ ✅ Agent Card 발견됨:              │
│   - Name: My Agent                 │
│   - Skills: qa, summarization      │
│                                    │
│ 📘 A2A 연동 가이드                 │
│ [Langchain A2A 가이드 보기]        │
│ [ADK A2A 가이드 보기]              │
└────────────────────────────────────┘
```

**Custom Framework**:
```
┌────────────────────────────────────┐
│ ⚙️ Custom Agent 설정               │
├────────────────────────────────────┤
│ Agent Endpoint (실행 주소)         │
│ ┌────────────────────────────────┐ │
│ │ https://my-agent.com/run       │ │
│ └────────────────────────────────┘ │
│               [연결 확인]          │
└────────────────────────────────────┘
```

#### 섹션 2: Trace 설정

```
┌────────────────────────────────────┐
│ 🔍 Trace 설정                      │
├────────────────────────────────────┤
│ Trace Endpoint                     │
│ /api/log-proxy/{trace_id}/...  [📋]│
│                                    │
│ Platform API Key                   │
│ a2g_abc123***def               [📋]│
│                                    │
│ 사용 가능한 LLM                    │
│ [GPT-4] [Claude-3] [Gemini-Pro]   │
│                                    │
│ 📘 환경 변수 설정 가이드           │
│ ```bash                            │
│ export AGENT_LLM_ENDPOINT="..."    │
│ export AGENT_LLM_API_KEY="..."     │
│ ```                                │
└────────────────────────────────────┘
```

#### 섹션 3: Live Trace 로그

```
┌────────────────────────────────────┐
│ 📊 Live Trace    [Reset] [🔄]     │
├────────────────────────────────────┤
│                                    │
│ 🟦 LLM Call           10:30:01    │
│    main-agent | gpt-4 | 850ms     │
│    Input: "안녕하세요"             │
│    Output: "안녕하세요! 무엇을..." │
│                                    │
│ ⚡ Agent Transfer     10:30:05    │
│  ┌──────────────────────────────┐ │
│  │ 🔄 main-agent                │ │
│  │      ↓                       │ │
│  │ 🤖 analysis-agent            │ │
│  │                              │ │
│  │ Reason: 데이터 분석 필요     │ │
│  │ Tool: transfer_to_agent      │ │
│  └──────────────────────────────┘ │
│                                    │
│ 🟩 Tool Call          10:30:06    │
│    analysis-agent | search_db     │
│    Input: {"query": "..."}        │
│    Output: [...]                   │
│                                    │
└────────────────────────────────────┘
```

### 7.4 LiveTrace 로그 타입별 렌더링

#### 1) LLM Call (`log_type="LLM"`)

```tsx
<div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-300 p-3 mb-2">
  <div className="flex justify-between items-center mb-2">
    <span className="font-bold">🟦 LLM Call</span>
    <span className="text-sm text-gray-500">{formatTime(log.timestamp)}</span>
  </div>
  <div className="text-sm mb-2">
    <span className="font-semibold text-blue-700">{log.agent_id}</span>
    <span> | </span>
    <span className="font-semibold">{log.model}</span>
    <span> | </span>
    <span>{log.latency_ms}ms</span>
  </div>
  <details className="text-xs">
    <summary className="cursor-pointer font-semibold">Input</summary>
    <pre className="bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
      {log.prompt}
    </pre>
  </details>
  <details className="text-xs mt-1">
    <summary className="cursor-pointer font-semibold">Output</summary>
    <pre className="bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
      {log.completion}
    </pre>
  </details>
</div>
```

#### 2) Tool Call (`log_type="TOOL"`)

```tsx
<div className="bg-green-50 dark:bg-green-900 border-l-4 border-green-300 p-3 mb-2">
  <div className="flex justify-between items-center mb-2">
    <span className="font-bold">🟩 Tool Call</span>
    <span className="text-sm text-gray-500">{formatTime(log.timestamp)}</span>
  </div>
  <div className="text-sm mb-2">
    <span className="font-semibold text-green-700">{log.agent_id}</span>
    <span> | </span>
    <span className="font-semibold">{log.tool_name}</span>
  </div>
  <details className="text-xs">
    <summary className="cursor-pointer font-semibold">Input</summary>
    <pre className="bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
      {JSON.stringify(log.tool_input, null, 2)}
    </pre>
  </details>
  <details className="text-xs mt-1">
    <summary className="cursor-pointer font-semibold">Output</summary>
    <pre className="bg-white dark:bg-gray-800 p-2 rounded mt-1 overflow-x-auto">
      {log.tool_output}
    </pre>
  </details>
</div>
```

#### 3) Agent Transfer (`log_type="AGENT_TRANSFER"`)

```tsx
<div className="bg-orange-50 dark:bg-orange-900 border-l-4 border-orange-300 p-3 mb-2">
  <div className="flex justify-between items-center mb-3">
    <span className="font-bold">⚡ Agent Transfer</span>
    <span className="text-sm text-gray-500">{formatTime(log.timestamp)}</span>
  </div>

  <div className="bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
    <div className="flex flex-col items-center space-y-2">
      {/* From Agent */}
      <div className="flex items-center space-x-2">
        <span className="text-lg">🔄</span>
        <span className="font-semibold text-blue-600">{log.from_agent_id}</span>
      </div>

      {/* Arrow */}
      <div className="text-2xl text-orange-500">↓</div>

      {/* To Agent */}
      <div className="flex items-center space-x-2">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-green-600">{log.to_agent_id}</span>
      </div>
    </div>

    {/* Transfer Details */}
    <div className="mt-4 text-sm text-gray-700 dark:text-gray-300 space-y-1">
      <div>
        <strong>Reason:</strong> {log.transfer_reason}
      </div>
      <div>
        <strong>Tool:</strong>
        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded ml-2 font-mono">
          {log.tool_name}
        </code>
      </div>
    </div>
  </div>
</div>
```

### 7.5 ChatPlayground

#### ChatMessageList

메시지 타입별 렌더링:

**1) Text 메시지**:
```tsx
<div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
  {message.content}
</div>
```

**2) Markdown 메시지**:
```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  className="prose dark:prose-invert"
  components={{
    table: ({ node, ...props }) => (
      <table className="border-collapse border dark:border-gray-600" {...props} />
    ),
    code: ({ node, inline, ...props }) => (
      inline ? (
        <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded" {...props} />
      ) : null
    ),
  }}
>
  {message.content}
</ReactMarkdown>
```

**3) Code 메시지 (Syntax Highlighting)**:
```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

<div className="relative">
  <button
    className="absolute top-2 right-2 px-2 py-1 bg-gray-600 hover:bg-gray-700 text-white rounded text-xs"
    onClick={() => navigator.clipboard.writeText(message.content)}
  >
    📋 복사
  </button>
  <SyntaxHighlighter
    language={message.language || 'python'}
    style={vscDarkPlus}
  >
    {message.content}
  </SyntaxHighlighter>
</div>
```

**4) Image 메시지**:
```tsx
<img
  src={message.content}
  alt="Uploaded image"
  className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90"
  onClick={() => openImagePreview(message.content)}
/>
```

**5) File 메시지**:
```tsx
<a
  href={message.content}
  download
  className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
>
  📎 {message.attachments[0].filename}
  <span className="text-sm text-gray-500">
    ({formatFileSize(message.attachments[0].size)})
  </span>
</a>
```

#### Streaming 응답 구현

```tsx
export function ChatMessageList({ messages, traceId }: ChatMessageListProps) {
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource(`/api/chat/stream/${traceId}`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === 'content') {
        setStreamingContent(prev => prev + data.content);
      } else if (data.type === 'done') {
        setIsStreaming(false);
        eventSource.close();
      }
    };

    return () => eventSource.close();
  }, [traceId]);

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* 기존 메시지들 */}
      {messages.map((msg) => (
        <ChatMessage key={msg.id} message={msg} />
      ))}

      {/* 스트리밍 중인 메시지 */}
      {isStreaming && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <ReactMarkdown>{streamingContent}</ReactMarkdown>
          <span className="animate-pulse ml-2">▊</span>
        </div>
      )}
    </div>
  );
}
```

#### ChatInput

```
┌──────────────────────────────────────────────────┐
│                                                  │
│  메시지를 입력하세요...                          │
│                                                  │
│                                                  │
├──────────────────────────────────────────────────┤
│  [📎 파일]  [🖼️ 이미지]              [전송 ➤]  │
└──────────────────────────────────────────────────┘
```

**구현**:
```tsx
export function ChatInput({ onSendMessage, isStreaming }: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    if (message.trim() && !isStreaming) {
      onSendMessage(message);
      setMessage('');
      adjustTextareaHeight();
    }
  };

  const adjustTextareaHeight = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="border-t p-4 space-y-3">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          adjustTextareaHeight();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        placeholder="메시지를 입력하세요..."
        className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none max-h-48"
        rows={3}
      />

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            📎 파일
          </button>
          <button
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            onClick={() => document.getElementById('image-input')?.click()}
          >
            🖼️ 이미지
          </button>
        </div>

        <button
          onClick={handleSend}
          disabled={!message.trim() || isStreaming}
          className={`
            px-4 py-2 rounded-lg font-semibold flex items-center gap-2
            ${isStreaming || !message.trim()
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
            }
          `}
        >
          전송 ➤
        </button>
      </div>

      {/* Hidden file inputs */}
      <input id="file-input" type="file" hidden onChange={handleFileUpload} />
      <input
        id="image-input"
        type="file"
        hidden
        accept="image/*"
        onChange={handleImageUpload}
      />
    </div>
  );
}
```

---

## 8. Flow 모드

### 8.1 경로 및 목적

- **URL**: `/flow`
- **목적**: 복수 Agent 조합 실행
- **스타일**: Claude 초기화면과 유사한 미니멀 인터페이스

### 8.2 레이아웃

```
┌────────┬─────────────────────────────────────────────┐
│        │                                             │
│        │         [Agent Flow 로고/제목]              │
│ Side   │                                             │
│ bar    │        ┌─────────────────────┐             │
│        │        │ Select Agents ▼     │             │
│        │        └─────────────────────┘             │
│        │                                             │
│        │        ┌───────────────────────────────┐   │
│        │        │                               │   │
│        │        │ What would you like to do?    │   │
│        │        │                               │   │
│        │        └───────────────────────────┬───┘   │
│        │                                 [➤]       │
│        │                                             │
└────────┴─────────────────────────────────────────────┘
```

### 8.3 Agent 선택 Dropdown

**기본 상태**:
```
┌─────────────────────────────┐
│ Select Agents ▼             │
└─────────────────────────────┘
```

**펼쳐진 상태**:
```
┌─────────────────────────────────────────┐
│ Select Agents ▲                         │
├─────────────────────────────────────────┤
│ [ ] Auto-select (AI recommends)         │
├─────────────────────────────────────────┤
│ Agent List (multi-select)               │
│                                         │
│ ┌─────────────────────────────────────┐│
│ │ [✓] 📊 Customer Data Agent         ││
│ │     Extract customer data           ││
│ │     Status: PRODUCTION             ││
│ │                                     ││
│ │ [ ] 📈 Analysis Agent               ││
│ │     Analyze data patterns           ││
│ │     Status: PRODUCTION              ││
│ │                                     ││
│ │ [✓] 📝 Report Generator             ││
│ │     Generate reports                ││
│ │     Status: PRODUCTION              ││
│ └─────────────────────────────────────┘│
│                                         │
│ Selected: 2 agents                      │
│                          [Apply]        │
└─────────────────────────────────────────┘
```

### 8.4 실행 및 결과

**실행 중**:
```
┌─────────────────────────────────────┐
│ 🔄 Running Flow...                  │
│                                     │
│ ✅ Customer Data Agent (completed)  │
│ ⏳ Report Generator (in progress...) │
└─────────────────────────────────────┘
```

**결과 표시 (스트리밍)**:
```
┌─────────────────────────────────────┐
│ 📊 Customer Data Agent:             │
│                                     │
│ Extracted 1,234 customer inquiries  │
│                                     │
├─────────────────────────────────────┤
│ 📝 Report Generator:                │
│                                     │
│ ## Customer Satisfaction Report     │
│                                     │
│ - Overall satisfaction: 87%         │
│ - Main complaints: Delivery (32%)   │
│ ...▊                                │
└─────────────────────────────────────┘
```

---

## 9. 설정 페이지

### 9.1 레이아웃 (/settings/*)

```
┌──────────────────┬─────────────────────────────────┐
│                  │                                 │
│  탭 메뉴         │        설정 컨텐츠              │
│                  │         (<Outlet>)              │
│                  │                                 │
└──────────────────┴─────────────────────────────────┘
```

### 9.2 좌측 탭 메뉴

```
┌────────────────────────┐
│ ⚙️ 일반 (General)       │  ← 모든 사용자
│ 🔑 API Keys            │  ← 모든 사용자
│                        │
│ ─────────────────────  │
│ 관리자 메뉴            │  ← ADMIN만 표시
│ ─────────────────────  │
│                        │
│ 👤 사용자 관리         │  ← ADMIN만
│ 📊 LLM 사용량 통계     │  ← ADMIN만
│ 📈 Agent 사용량 통계   │  ← ADMIN만
│ 🤖 LLM 모델 관리       │  ← ADMIN만
└────────────────────────┘
```

### 9.3 /settings/general

**테마 설정**:
```
┌────────────────────────────────────┐
│ 테마                               │
│ ( ) 라이트  (●) 다크  ( ) 시스템  │
└────────────────────────────────────┘
```

**언어 설정**:
```
┌────────────────────────────────────┐
│ 언어 (Language)                    │
│ ( ) 한국어  (●) English            │
└────────────────────────────────────┘
```

### 9.4 /settings/api-keys

```
┌──────────────────────────────────────┐
│ [+ 새 API Key 생성]                  │
└──────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│ Key              │ 생성일     │ 마지막 사용  │ 액션  │
├─────────────────────────────────────────────────────────┤
│ a2g_***abc       │ 2025-10-20 │ 2025-10-27 │ [삭제] │
│ a2g_***def       │ 2025-10-15 │ 2025-10-25 │ [삭제] │
└─────────────────────────────────────────────────────────┘
```

### 9.5 /settings/admin/users

```
부서: [전체 ▼]  역할: [전체 ▼]

┌─────────────┬──────────┬──────────┬──────────┬──────────┐
│ 사용자 ID   │ 이름     │ 역할     │ 부서     │ 액션     │
├─────────────┼──────────┼──────────┼──────────┼──────────┤
│ syngha.han  │ 한승하   │ ADMIN    │ AI Team  │ [삭제]   │
│ test.user   │ 테스트   │ PENDING  │ Dev Team │ [승인][거절]│
└─────────────┴──────────┴──────────┴──────────┴──────────┘
```

### 9.6 /settings/admin/llm-usage

```
기간: [2025-10-01] ~ [2025-10-27]
뷰: [개인별 ▼]  (개인별/부서별/Agent별)

[개인별] [부서별] [Agent별]

┌──────────────────────────────────┐
│  GPT-4: ████████ 45k tokens      │
│  Claude-3: ███ 12k tokens        │
│  Gemini: █████ 28k tokens        │
└──────────────────────────────────┘

┌──────────────┬──────────┬──────────┬─────┐
│ 사용자       │ 모델     │ 토큰     │ 비용│
├──────────────┼──────────┼──────────┼─────┤
│ syngha.han   │ GPT-4    │ 45,000   │$2.50│
│ test.user    │ Claude-3 │ 12,000   │$0.80│
└──────────────┴──────────┴──────────┴─────┘

[Export CSV] [Export Excel]
```

### 9.7 /settings/admin/agent-usage

```
기간: [2025-10-01] ~ [2025-10-27]
뷰: [개인별 ▼]  (개인별/부서별/Agent별)
상태: [전체 ▼]  (전체/DEVELOPMENT/PRODUCTION)

[개인별] [부서별] [Agent별]

┌──────────────────────────────────┐
│  Customer Agent: ████████ 1,234  │
│  Analysis Agent: ███ 567 calls   │
│  Report Gen: █████ 890 calls     │
└──────────────────────────────────┘

┌────────────┬─────────┬────────┬──────────┐
│ Agent      │ 상태    │ 호출수 │ 평균응답│
├────────────┼─────────┼────────┼──────────┤
│ Customer   │ PROD    │ 1,234  │ 2.3s    │
│ Analysis   │ PROD    │ 567    │ 4.1s    │
│ Report Gen │ DEV     │ 890    │ 3.2s    │
└────────────┴─────────┴────────┴──────────┘

[Export CSV] [Export Excel]
```

### 9.8 /settings/admin/llm-models

```
┌──────────────────────────────────────────────────────────┐
│ [+ 새 LLM 등록]                                          │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ 🟢 GPT-4                                                 │
│    Endpoint: https://api.openai.com/v1                  │
│    상태: Healthy | 마지막 체크: 2025-10-27 10:00        │
│    [활성/비활성] [수정] [삭제]                           │
│                                                          │
│ 🔴 Claude-3                                              │
│    Endpoint: https://api.anthropic.com/v1               │
│    상태: Unhealthy | 마지막 체크: 2025-10-27 09:50      │
│    [활성/비활성] [수정] [삭제]                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 10. 반응형 디자인

### 10.1 Tailwind CSS 브레이크포인트

| 브레이크포인트 | 크기 | 사용 예 |
|---|---|---|
| `sm` | 640px | 모바일 가로 |
| `md` | 768px | 태블릿 세로 |
| `lg` | 1024px | 태블릿 가로 |
| `xl` | 1280px | 데스크톱 |

### 10.2 모바일 대응 (< 768px)

**숨길 요소**:
- TraceCapturePanel: `hidden lg:block`
- PlaygroundSidebar: 햄버거 메뉴로 변환

**모바일 레이아웃**:
```
┌────────────────────────┐
│ [☰] A2G  [운영↔개발]   │
├────────────────────────┤
│                        │
│   ChatPlayground       │
│   (전체 화면)          │
│                        │
└────────────────────────┘
```

### 10.3 태블릿 대응 (768px ~ 1024px)

- Sidebar 유지
- TraceCapturePanel 너비 축소 또는 숨김
- 카드 그리드: 2열

### 10.4 데스크톱 대응 (≥ 1024px)

- 모든 요소 표시
- 카드 그리드: 3열

---

## 11. 애니메이션

### 11.1 모달 애니메이션 (Framer Motion)

```tsx
import { motion } from 'framer-motion';

<motion.div
  initial={{ opacity: 0, scale: 0.95 }}
  animate={{ opacity: 1, scale: 1 }}
  exit={{ opacity: 0, scale: 0.95 }}
  transition={{ duration: 0.2 }}
>
  <AddAgentModal />
</motion.div>
```

### 11.2 페이지 전환 애니메이션

```tsx
<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  exit={{ opacity: 0, x: -20 }}
  transition={{ duration: 0.3 }}
>
  <Dashboard />
</motion.div>
```

### 11.3 실시간 로그 애니메이션

새 로그 항목이 추가될 때:
```tsx
<motion.div
  initial={{ opacity: 0, y: -10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <TraceLogItem log={newLog} />
</motion.div>
```

### 11.4 Hover 효과

```css
/* 카드 Hover */
.card:hover {
  @apply shadow-lg transition-shadow duration-200;
}

/* 버튼 Hover */
.button:hover {
  @apply opacity-80 transition-opacity duration-150;
}

/* 로고 Hover */
.logo:hover {
  @apply opacity-80;
}
```

### 11.5 스트리밍 커서 애니메이션

```tsx
<span className="animate-pulse">▊</span>
```

---

## 12. 컴포넌트 트리 구조

```
App.tsx
├── Layout.tsx
│   ├── WorkspaceHeader
│   │   ├── Logo
│   │   ├── ModeToggle
│   │   └── UserProfileDropdown
│   └── <Outlet>
│       ├── Dashboard (/)
│       │   ├── AgentCardProduction (Hub 모드)
│       │   │   ├── SearchInput
│       │   │   └── AgentCard[]
│       │   └── AgentCardWorkspace (Workbench 모드)
│       │       ├── AddAgentCard
│       │       └── AgentCard[]
│       ├── AgentPlayground (/workbench/:id, /hub/:id)
│       │   ├── PlaygroundSidebar
│       │   │   ├── NewChatButton
│       │   │   └── SessionList
│       │   ├── TraceCapturePanel (Workbench만)
│       │   │   ├── FrameworkSettings
│       │   │   ├── TraceSettings
│       │   │   └── LiveTrace
│       │   │       └── TraceLogItem[]
│       │   └── ChatPlayground
│       │       ├── ChatMessageList
│       │       │   └── ChatMessage[]
│       │       └── ChatInput
│       ├── FlowPlayground (/flow)
│       │   ├── AgentSelectionPanel
│       │   └── ChatPlayground
│       ├── SettingsLayout (/settings/*)
│       │   ├── SettingsTabs
│       │   └── <Outlet>
│       └── PendingApprovalPage (role=PENDING)
└── AddAgentModal (전역 모달)
```

---

## 13. 프레임워크별 UI 설정

### 13.1 Agno Framework

- **표시 아이콘**: 📡
- **설정 항목**: Agno Base URL, Agent 선택
- **추가 안내**: CORS 가이드 포함
- **연결 버튼**: "불러오기"

### 13.2 ADK/Langchain Framework

- **표시 아이콘**: 🔗
- **설정 항목**: A2A Endpoint URL
- **추가 안내**: 가이드 링크 제공
- **연결 버튼**: "연결 확인"

### 13.3 Custom Framework

- **표시 아이콘**: ⚙️
- **설정 항목**: Agent Endpoint
- **추가 안내**: 없음
- **연결 버튼**: "연결 확인"

---

## 14. 색상 참조 가이드

### Light 모드 색상 코드

| 모드 | Hex | RGB | Tailwind |
|------|-----|-----|----------|
| Workbench | #E9D5FF | 233, 213, 255 | purple-100 |
| Hub | #E0F2FE | 224, 242, 254 | sky-100 |
| Flow | #CCFBF1 | 204, 251, 241 | teal-100 |

### Dark 모드 색상 코드

| 모드 | Hex | RGB | Tailwind |
|------|-----|-----|----------|
| Workbench | #6B21A8 | 107, 33, 168 | purple-800 |
| Hub | #082F49 | 8, 47, 73 | sky-800 |
| Flow | #134E4A | 19, 78, 74 | teal-800 |

---

## 참고사항

- 모든 색상 코드는 Tailwind CSS 공식 색상표 기반
- CSS 클래스명은 변경하지 않을 것
- 기술적 용어 (API, LLM, Agent 등)는 영문 그대로 표기
- 구현 시 접근성(ARIA) 속성 반드시 포함
- 모든 인터랙티브 요소는 키보드 네비게이션 지원

---

**작성자**: 한승하 (DEV1)
**마지막 수정**: 2025년 10월 28일
**버전**: 1.0
