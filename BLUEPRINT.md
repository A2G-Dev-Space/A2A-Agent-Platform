# 🎨 AGENT PLATFORM (A2G) 디자인 명세서 (UI/UX Blueprint)

**문서 버전**: 3.0
**최종 수정일**: 2025년 10월 27일

---

## 1. 개요 (Introduction)

본 문서는 **A2G Agent Platform**의 사용자 인터페이스(UI) 및 사용자 경험(UX) 설계 명세서입니다. 마이크로서비스 아키텍처 기반의 플랫폼에서 제공하는 **세 가지 운영 모드**와 **리치 콘텐츠 지원**을 중심으로 레이아웃, 컴포넌트, 핵심 사용자 흐름을 정의합니다.

### 1.1. 외부 개발 환경 고려사항

본 프로젝트는 **4명의 개발자가 사외망에서 개발**하는 환경을 지원합니다. Frontend 개발자는 Backend API가 완성되기 전까지 **MSW (Mock Service Worker)** 또는 **json-server**를 사용하여 Mock 데이터로 UI를 개발할 수 있습니다.

**Mock 데이터 준비**:
- Mock 데이터 경로: `frontend/src/mocks/data/` (agents.json, sessions.json 등)
- API Contracts 준수: [API_CONTRACTS.md](./API_CONTRACTS.md)에 정의된 응답 포맷과 정확히 일치해야 함

**상세 내용**: [DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md) 참조

---

## 2. 전역 스타일 (Global Styles)

### 2.1. 디자인 레퍼런스

**Gemini UI**: Google의 Gemini UI를 최우선 디자인 레퍼런스로 삼습니다.

**핵심 원칙**:
- 간결함 (Simplicity)
- 정보 중심적 레이아웃 (Information-centric)
- 세련된 아이코노그래피 (Polished iconography)
- 명확한 상호작용 (Clear interactions)

**컴포넌트 라이브러리**: MUI (Material-UI) 또는 Radix UI를 사용하여 Gemini 스타일을 일관되게 구현합니다.

### 2.2. 색상 팔레트

#### 기본 테마 (Light/Dark)
- **Tailwind CSS** slate 계열을 기반으로 Light/Dark 모드를 완벽하게 지원합니다.
- `dark:` Variant를 사용하여 다크 모드 스타일을 정의합니다.

#### 모드별 강조 색상

플랫폼의 현재 모드(운영/개발)를 시각적으로 명확히 구분하기 위해 `useWorkspaceStore`의 `activeMode` 상태와 연동된 동적 테마를 적용합니다.

| 모드 | 색상 계열 | 적용 예시 |
|------|----------|----------|
| **운영 모드** | 파스텔 블루 | `bg-sky-100`, `text-sky-700`, `border-sky-300` |
| **개발 모드** | 파스텔 레드/핑크 | `bg-rose-100`, `text-rose-700`, `border-rose-300` |

**적용 요소**: 헤더, 활성 탭, 카드 하이라이트, 버튼, 활성 링크 등 주요 상호작용 요소

### 2.3. 타이포그래피 (Typography)

**기본 글꼴**: `'Pretendard'` 웹 폰트를 플랫폼 전체의 기본 글꼴로 사용합니다.

```css
@font-face {
  font-family: 'Pretendard';
  src: url('/fonts/Pretendard-Variable.woff2') format('woff2');
}

body {
  font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
```

**코드 표시**: API 키, 엔드포인트 URL, 코드 블록 등은 모노스페이스 글꼴을 사용합니다.

```css
.font-mono {
  font-family: 'JetBrains Mono', 'Fira Code', 'Courier New', monospace;
}
```

### 2.4. 브랜딩

**플랫폼 로고**:
- 로고 파일 위치: `frontend/public/logo.svg` 또는 `frontend/src/assets/logo.svg`
- 헤더 좌측 상단에 표시
- 로고 크기: 32x32px (모바일), 40x40px (데스크톱)

**브라우저 탭**:
- **Favicon**: `frontend/public/favicon.ico`
- **제목**: "A2G Platform" (index.html `<title>` 태그)

---

## 3. 전체 레이아웃 (Overall Layout)

플랫폼의 핵심 UI는 **헤더(Header)**와 **컨텐츠(Main Content)**로 구성된 2단 구조를 채택합니다.

```
┌─────────────────────────────────────────────────────┐
│          WorkspaceHeader (상단 고정)                │
│  [Logo] A2G Platform    [운영 ↔ 개발]    [Profile] │
└─────────────────────────────────────────────────────┘
│                                                     │
│              Main Content Area                      │
│           (react-router <Outlet>)                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 3.1. WorkspaceHeader (상단 헤더)

**레이아웃**: `flex justify-between items-center px-6 py-3 border-b`

#### 좌측 영역
- **A2G 플랫폼 로고** + **이름** ("A2G Platform")
- 클릭 시 메인 대시보드 (`/`)로 이동
- Hover 효과: `opacity-80`

#### 중앙 영역
- **모드 전환 토글**: 운영(Production) ↔ 워크스페이스(Workspace) 스위치
- MUI Switch 또는 Radix Toggle 사용
- 현재 모드에 따라 배경색 변경:
  - 운영: `bg-sky-500`
  - 개발: `bg-rose-500`

#### 우측 영역
- **사용자 프로필 드롭다운**:
  - 로그인 시: 사용자 ID (username) 표시 버튼
  - 클릭 시 드롭다운 메뉴:
    ```
    ┌──────────────────────────┐
    │ 한승하 (ADMIN)           │
    │ syngha.han@samsung.com   │
    │ AI Platform Team         │
    ├──────────────────────────┤
    │ 🔑 Key 생성              │
    │ ⚙️ 설정                  │
    ├──────────────────────────┤
    │ 🚪 로그아웃              │
    └──────────────────────────┘
    ```
  - 로그아웃 상태: "로그인" 버튼 표시

---

## 4. 메인 대시보드 (/ 경로)

`activeMode`에 따라 뷰를 조건부 렌더링합니다 (role='PENDING' 사용자는 접근 불가).

### 4.1. 운영 모드 뷰 (AgentCardProduction)

**타이틀**: "운영 에이전트" (파스텔 블루 계열 `text-sky-700`)

**AI 랭킹 기반 정렬**:
- 사용자 검색 쿼리(선택 사항)와 Agent의 임베딩 벡터를 비교
- Top-K RAG 기반 유사도 점수로 정렬
- 검색창: `<SearchInput placeholder="어떤 에이전트를 찾고 있나요?" />`

**Agent 카드 목록**:
- Grid 레이아웃: `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- 카드 디자인: [4.3. AgentCard 컴포넌트](#43-agentcard-컴포넌트-디자인) 참조

### 4.2. 워크스페이스 모드 뷰 (AgentCardWorkspace)

**타이틀**: "내 에이전트" (파스텔 레드 계열 `text-rose-700`)

**'새 에이전트 만들기' (+) 카드**:
- 점선 테두리 카드: `border-2 border-dashed border-rose-300`
- 중앙 정렬된 '+' 아이콘 및 "새 에이전트 만들기" 텍스트
- 클릭 시 `AddAgentModal` 표시

**개발 Agent 카드 목록**:
- 사용자가 생성한 Agent 목록 (status=DEVELOPMENT)
- 카드 디자인: [4.3. AgentCard 컴포넌트](#43-agentcard-컴포넌트-디자인) 참조

### 4.3. AgentCard 컴포넌트 디자인

**카드 구조**:
```
┌──────────────────────────────────────┐
│ [Logo]  Agent 제목           [⚙️ ✖️]│  ← 상단 (워크스페이스만 수정/삭제)
│                                      │
│ Agent 설명 텍스트...                 │  ← 본문
│ #태그1 #태그2 #태그3                 │
├──────────────────────────────────────┤
│ 생성자: syngha.han  |  팀: AI Team   │  ← 하단
│                          🟢 Healthy  │  ← 헬스 상태 (운영만)
└──────────────────────────────────────┘
```

**카드 배경**:
- 사용자가 설정한 `card_color` (Hex) 또는 모드별 기본 파스텔 색상
- 인라인 스타일: `style={{ backgroundColor: agent.card_color }}`

**카드 상단**:
- **좌측**: 로고 (`logo_url`) - 없을 시 기본 아이콘 (🤖)
  - 원형 또는 사각형: `w-12 h-12 rounded-full`
- **중앙**: Agent 제목 (`title`)
  - 굵게 표시: `font-bold text-lg`
  - 2줄 제한: `line-clamp-2`
- **우측** (워크스페이스만):
  - Hover 시 '수정'(⚙️) / '삭제'(✖️) 아이콘 버튼 표시
- **우측** (운영):
  - 헬스 상태: 🟢 (healthy) / 🔴 (unhealthy) / ⚪️ (unknown)

**카드 본문**:
- **설명** (`description`)
  - 3-4줄 제한: `line-clamp-4`
  - 색상: `text-gray-700 dark:text-gray-300`
- **기능 태그** (`capabilities` / `skill_kr` / `skill_en`)
  - #태그 형식: `#고객지원 #챗봇 #Q&A`
  - 최대 2줄까지 표시: `line-clamp-2`

**카드 하단** (경계선 위):
- **좌측**: 생성자 ID (`owner_username`)
- **우측**: 팀(부서)명 (`owner_deptname_kr`)

**비활성 상태** (status=DISABLED):
- 카드 전체에 `opacity-60 grayscale` 적용
- "비활성화됨" 배지 표시

### 4.4. AddAgentModal 컴포넌트

**모달 트리거**: '새 에이전트 만들기' 카드 클릭 또는 Agent 카드 수정 버튼 클릭

**모달 구조**:
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

**입력 필드**:
1. **이름 (Name)** *: 필수, 최대 100자
2. **설명 (Description)** *: 필수, 최대 500자
3. **프레임워크 (Framework)** *: 드롭다운
   - 옵션: Agno, ADK, Langchain, Custom
4. **스킬 (ko/en)**: 쉼표로 구분된 태그
5. **로고 URL**: 이미지 URL
6. **카드 색상**: Hex 입력 또는 색상 팔레트 선택
7. **공개 범위 (Visibility)**: 라디오 버튼
   - 전체 공개 (ALL)
   - 팀 공개 (TEAM)
   - 비공개 (PRIVATE, 기본값)

**버튼**:
- **생성** / **저장**: 클릭 시 `MyAgentViewSet` API 호출
- **취소**: 모달 닫기

---

## 5. Agent Playground (상세 페이지)

### 5.1. URL 경로

- **개발 모드**: `/workspace/:id`
- **운영 모드**: `/production/:id`

### 5.2. 레이아웃 구조

**2~3단 레이아웃**:
```
┌──────────┬─────────────────────┬─────────────────┐
│          │                     │                 │
│ Sidebar  │  TraceCapturePanel  │ ChatPlayground  │
│          │  (워크스페이스만)   │                 │
│          │                     │                 │
└──────────┴─────────────────────┴─────────────────┘
```

**운영 모드**:
```
┌──────────┬─────────────────────────────────────────┐
│          │                                         │
│ Sidebar  │       ChatPlayground                    │
│          │                                         │
│          │                                         │
└──────────┴─────────────────────────────────────────┘
```

### 5.3. PlaygroundSidebar (좌측)

**Width**: `w-64` (256px)

**구성**:
1. **'새 대화' 버튼**
   - 전체 폭: `w-full`
   - 아이콘: ➕
   - 클릭 시: 새 `ChatSession` 생성 API 호출, 우측 패널 초기화

2. **'대화 히스토리' 목록**
   - 세션 목록 표시 (최신순)
   - 각 항목:
     ```
     ┌────────────────────────────┐
     │ 💬 대화 제목               │
     │    2025-10-27 10:30       │
     │    12개 메시지        [🗑️]│
     └────────────────────────────┘
     ```
   - 클릭 시: `loadSessionDetails()` 호출
     - Chat History 로드
     - Trace History 로드 (워크스페이스만)
     - WebSocket 자동 재연결 (워크스페이스만)
   - Hover 시 '삭제' 아이콘 표시

3. **스크롤**: `overflow-y-auto max-h-[calc(100vh-200px)]`

### 5.4. TraceCapturePanel (중앙 - 워크스페이스 전용)

**Width**: `w-96` (384px)

**패널 스크롤**: 설정 영역이 길어질 경우, 패널 전체가 스크롤됩니다 (`overflow-y-auto`).

#### 5.4.1. 설정 영역 (접기 가능)

**프레임워크별 동적 UI**:

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

**ADK / Langchain Framework**:
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

#### 5.4.2. Trace/LLM 설정

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

#### 5.4.3. Live Trace 로그

```
┌────────────────────────────────────┐
│ 📊 Live Trace       [🗑️] [🔄]     │
├────────────────────────────────────┤
│                                    │
│ 🟦 LLM Call                        │
│    main-agent | gpt-4 | 850ms     │
│    Input: "안녕하세요"             │
│    Output: "안녕하세요! 무엇을..." │
│                                    │
│ 🟩 Tool Call                       │
│    analysis-agent | search_db     │
│    Input: {"query": "..."}        │
│    Output: [...]                   │
│                                    │
│ 🟦 LLM Call                        │
│    analysis-agent | gpt-4 | 1.2s │
│    ...                             │
│                                    │
└────────────────────────────────────┘
```

**TraceLogItem 컴포넌트**:
- **로그 타입별 색상**:
  - LLM: 파란색 (`bg-blue-50 border-blue-300`)
  - Tool: 초록색 (`bg-green-50 border-green-300`)
- **Agent ID 태그**: 우상단에 Agent ID 표시 (`bg-gray-800 text-white px-2 py-1 rounded`)
- **Multi-Agent 배경색 구분**: Agent ID별로 배경색 미세 조정

**버튼**:
- **로그 지우기** (🗑️): DB에서 영구 삭제
- **재연결** (🔄): WebSocket 재연결

**스크롤**: `overflow-y-auto max-h-96`

### 5.5. ChatPlayground (우측)

**Width**: `flex-1` (나머지 공간 차지)

#### 5.5.1. ChatMessageList

**메시지 렌더링**:

**1) text (일반 텍스트)**:
```tsx
<div className="whitespace-pre-wrap">
  {message.content}
</div>
```

**2) markdown (Markdown 렌더링)**:
```tsx
import ReactMarkdown from 'react-markdown';

<ReactMarkdown
  components={{
    table: ({ node, ...props }) => (
      <table className="border-collapse border" {...props} />
    ),
    // ... 기타 커스텀 컴포넌트
  }}
>
  {message.content}
</ReactMarkdown>
```

**지원 요소**:
- 표 (Table)
- 목록 (Ordered/Unordered List)
- 인용구 (Blockquote)
- 링크 (Link)
- 강조 (Bold, Italic)

**3) code (코드 블록 + Syntax Highlighting)**:
```tsx
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

<div className="relative">
  <button
    className="absolute top-2 right-2"
    onClick={() => navigator.clipboard.writeText(message.content)}
  >
    📋 복사
  </button>
  <SyntaxHighlighter
    language="python"
    style={vscDarkPlus}
  >
    {message.content}
  </SyntaxHighlighter>
</div>
```

**4) image (이미지 표시)**:
```tsx
<img
  src={message.content}  // URL 또는 Base64
  alt="Uploaded image"
  className="max-w-full rounded-lg"
  onClick={() => openImagePreview(message.content)}
/>
```

**5) file (파일 다운로드 링크)**:
```tsx
<a
  href={message.content}
  download
  className="flex items-center gap-2 text-blue-600 hover:underline"
>
  📎 {message.attachments[0].filename}
  <span className="text-sm text-gray-500">
    ({formatFileSize(message.attachments[0].size)})
  </span>
</a>
```

#### 5.5.2. ChatInput

**레이아웃**:
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

**기능**:
1. **메시지 입력**: `<textarea>` (자동 높이 조절)
2. **파일 업로드 버튼**: 클릭 시 파일 선택 대화상자
   - 업로드 후 Chat Service에 저장
   - 반환된 URL을 메시지에 첨부
3. **이미지 업로드 버튼**: 이미지 파일만 선택 가능
4. **전송 버튼**:
   - `isWaitingForResponse` 시 비활성화
   - 아이콘 디자인: ➤ 또는 ✈️

---

## 6. 통합 Playground (/unified) ⭐ 신규

### 6.1. URL 경로

`/unified`

### 6.2. 레이아웃 구조

**2단 레이아웃**:
```
┌──────────────────────┬─────────────────────────────┐
│                      │                             │
│  Agent 선택 패널     │   ChatPlayground            │
│                      │                             │
│                      │                             │
└──────────────────────┴─────────────────────────────┘
```

### 6.3. Agent 선택 패널 (좌측)

**Width**: `w-80` (320px)

**구성**:
```
┌────────────────────────────────────┐
│ 🎯 통합 Playground                 │
├────────────────────────────────────┤
│                                    │
│ [ ] 자동 Agent 선택 (AI 추천)     │
│                                    │
│ 또는 수동으로 선택:                │
│                                    │
│ Agent 선택 (복수 가능)             │
│ ┌────────────────────────────────┐│
│ │ [✓] Customer Data Agent       ││
│ │ [ ] Analysis Agent            ││
│ │ [✓] Report Generator Agent    ││
│ │ [ ] Translation Agent         ││
│ └────────────────────────────────┘│
│                                    │
│ 실행 모드                          │
│ ( ) 순차 (Sequential)             │
│ (●) 병렬 (Parallel)               │
│ ( ) 하이브리드 (Auto)             │
│                                    │
│            [실행]                  │
│                                    │
├────────────────────────────────────┤
│ 실행 중...                         │
│ ✅ Customer Data Agent (완료)     │
│ ⏳ Report Generator Agent (진행중)│
└────────────────────────────────────┘
```

**기능**:
1. **자동 Agent 선택 체크박스**:
   - 체크 시: Agent 선택 목록 비활성화
   - AI가 사용자 요청을 분석하여 적합한 Agent 자동 선택

2. **수동 Agent 선택**:
   - 공개된 Agent 목록 (status=PRODUCTION, visibility=ALL 또는 TEAM)
   - 복수 선택 가능 (Checkbox)

3. **실행 모드 선택**:
   - **순차 (Sequential)**: Agent를 순차 실행, 이전 결과를 다음 Agent에 전달
   - **병렬 (Parallel)**: Agent를 동시 실행, 결과를 통합
   - **하이브리드 (Auto)**: 자동 최적화된 실행 전략

4. **실행 버튼**: `POST /api/orchestrate` API 호출

5. **실행 상태 표시**:
   - 각 Agent의 실행 상태 실시간 표시
   - ✅ 완료, ⏳ 진행 중, ❌ 실패

### 6.4. ChatPlayground (우측)

**동일한 ChatPlayground 컴포넌트 사용** (5.5 참조)

**차이점**:
- **응답 포맷**: 복수 Agent의 결과가 통합되어 표시됨
- **예시**:
  ```
  📊 Customer Data Agent 결과:
  고객 문의 데이터를 추출했습니다. 총 1,234건의 문의가 발견되었습니다.

  📈 Report Generator Agent 결과:
  ## 고객 만족도 분석 보고서

  ### 요약
  - 전체 만족도: 87%
  - 주요 불만 사항: 배송 지연 (32%)

  ...
  ```

---

## 7. 설정 페이지 (/settings/*)

### 7.1. 레이아웃 구조

**2단 레이아웃** (SettingsLayout):
```
┌──────────────┬─────────────────────────────────┐
│              │                                 │
│  탭 메뉴     │        설정 컨텐츠              │
│              │         (<Outlet>)              │
│              │                                 │
└──────────────┴─────────────────────────────────┘
```

### 7.2. 좌측 탭 메뉴 (SettingsLayout)

**역할(role)에 따라 동적 표시**:

```
┌────────────────────┐
│ ⚙️ 일반             │  ← 모든 사용자
│ 👤 사용자 관리      │  ← ADMIN만
│ 🤖 LLM 모델 관리    │  ← ADMIN만
│ 📊 사용량 통계      │  ← ADMIN만
└────────────────────┘
```

### 7.3. 우측 컨텐츠 (Outlet)

#### 7.3.1. /settings/general (일반)

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
│ 언어                               │
│ [한국어 ▼]                         │
└────────────────────────────────────┘
```

#### 7.3.2. /settings/users (사용자 관리)

**필터**:
```
부서: [전체 ▼]  역할: [전체 ▼]
```

**사용자 목록 테이블**:
```
┌─────────────┬──────────┬──────────┬──────────┬──────────┐
│ 사용자 ID   │ 이름     │ 역할     │ 부서     │ 액션     │
├─────────────┼──────────┼──────────┼──────────┼──────────┤
│ syngha.han  │ 한승하   │ ADMIN    │ AI Team  │ [삭제]   │
│ test.user   │ 테스트   │ PENDING  │ Dev Team │ [승인][거절]│
└─────────────┴──────────┴──────────┴──────────┴──────────┘
```

**정렬**: PENDING > ADMIN > USER 순, 가입일 순

#### 7.3.3. /settings/models (LLM 모델 관리)

**LLM 모델 목록**:
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

**헬스 상태 표시**:
- 🟢 Healthy
- 🔴 Unhealthy
- ⚪️ Unknown

#### 7.3.4. /settings/stats-usage (LLM 사용량 통계)

**필터**:
```
기간: [2025-10-01] ~ [2025-10-27]
그룹: [사용자별 ▼]
```

**누적 막대 차트**:
```
┌────────────────────────────────────────┐
│  GPT-4: ████████ 45k tokens            │
│  Claude-3: ███ 12k tokens              │
│  Gemini: █████ 28k tokens              │
└────────────────────────────────────────┘
```

**테이블**:
```
┌──────────────┬──────────┬──────────┬──────────┐
│ 사용자       │ 모델     │ 토큰     │ 비용($)  │
├──────────────┼──────────┼──────────┼──────────┤
│ syngha.han   │ GPT-4    │ 45,000   │ $2.50    │
│ test.user    │ Claude-3 │ 12,000   │ $0.80    │
└──────────────┴──────────┴──────────┴──────────┘
```

---

## 8. 승인 대기 페이지 (PendingApprovalPage)

**조건**: `role === 'PENDING'`인 사용자가 로그인 시 전체 화면으로 렌더링

**레이아웃**:
```
┌────────────────────────────────────────┐
│                                        │
│                                        │
│         🔒                             │
│                                        │
│      승인 대기 중입니다                │
│                                        │
│   안녕하세요, 한승하님                 │
│   (syngha.han@samsung.com)            │
│                                        │
│   관리자가 승인할 때까지 기다려주세요. │
│                                        │
│          [로그아웃]                    │
│                                        │
│                                        │
└────────────────────────────────────────┘
```

---

## 9. 핵심 사용자 흐름 (Key User Flow)

### 9.1. 신규 사용자 진입

1. 로그인 → SSO 인증
2. `role=PENDING` → PendingApprovalPage 표시
3. 관리자가 /settings/users에서 승인
4. 사용자가 재로그인 → 메인 앱 진입

### 9.2. Agent 생성 (Agno)

1. 메인 대시보드 (워크스페이스 모드)
2. '+' 카드 클릭 → AddAgentModal
3. 정보 입력:
   - Name: "Customer Support Agent"
   - Description: "고객 문의 처리"
   - Framework: Agno
   - Skill: "고객지원, 챗봇"
4. '생성' 클릭
5. Agent 카드 생성됨

### 9.3. Agent 개발 및 테스트 (Agno)

1. Agno 카드 클릭 → `/workspace/:id` 진입
2. TraceCapturePanel:
   - 'Agno Base URL' 입력: `http://localhost:9080`
   - '불러오기' 클릭
   - '채팅 대상' 선택: `Agent: main-agent`
3. 'Trace Endpoint'와 'Platform API Key' 복사
4. 로컬 Agno 에이전트 환경변수 설정:
   ```bash
   export AGENT_LLM_ENDPOINT="https://a2g.company.com/api/log-proxy/{trace_id}/chat/completions"
   export AGENT_LLM_API_KEY="a2g_abc123..."
   ```
5. CORS 가이드 확인 및 Agno `main.py`에 적용
6. Agno 에이전트 재시작
7. ChatPlayground에서 메시지 입력: "테스트"
8. '전송' 클릭
9. AgentPlayground가 `http://localhost:9080/agents/main-agent/runs`로 POST 요청
10. Agno 에이전트가 Platform Log Proxy를 통해 LLM 호출
11. LiveTrace에 실시간 로그 표시:
    - LLM Call
    - Model: gpt-4
    - Input: "테스트"
    - Output: "안녕하세요! 무엇을 도와드릴까요?"
    - Latency: 850ms
12. ChatPlayground에 Agno 응답 표시

### 9.4. History 복구

1. PlaygroundSidebar에서 과거 세션 클릭
2. `loadSessionDetails()` 호출
3. ChatPlayground에 해당 세션의 메시지 복구
4. LiveTrace에 해당 세션의 Trace 로그 복구
5. WebSocket 자동 재연결 (이미 저장된 로그 표시)

### 9.5. 운영 전환

1. Agent 개발 완료
2. '운영 배포' 버튼 클릭
3. 공개 범위 선택: [✓] 팀 공개 (TEAM)
4. 운영용 Endpoint URL 입력
5. Platform이 엔드포인트 검증
6. 성공 시 `status → PRODUCTION`
7. 팀 멤버들에게 Agent 카드 표시됨

### 9.6. 운영 Agent 사용

1. 헤더 토글 → '운영' 모드
2. 메인 대시보드에 AI 랭킹으로 정렬된 운영 Agent 카드 목록
3. Agent 카드 클릭 → `/production/:id` 진입
4. ChatPlayground만 표시 (TraceCapturePanel 없음)
5. 메시지 전송 및 응답 수신
6. History 자동 저장

### 9.7. 통합 Playground 사용

**옵션 1: 수동 선택**
1. `/unified` 진입
2. Agent 선택:
   - [✓] Customer Data Agent
   - [✓] Analysis Agent
   - [✓] Report Generator Agent
3. 실행 모드 선택: 순차 (Sequential)
4. 메시지 입력: "고객 만족도 분석 보고서 만들어줘"
5. '실행' 클릭
6. 실행 상태 표시:
   - ✅ Customer Data Agent (완료)
   - ✅ Analysis Agent (완료)
   - ✅ Report Generator Agent (완료)
7. ChatPlayground에 통합된 결과 표시

**옵션 2: 자동 선택**
1. `/unified` 진입
2. [✓] 자동 Agent 선택 (AI 추천)
3. 메시지 입력: "고객 문의 데이터를 분석해서 보고서 만들어줘"
4. '실행' 클릭
5. Platform이 적합한 Agent 자동 선택:
   - Customer Data Agent
   - Analysis Agent
   - Report Generator Agent
6. 순차/병렬 실행 전략 자동 결정
7. ChatPlayground에 통합된 결과 표시

---

## 10. 핵심 차이점 정리

| 항목 | 개인 공간 | 운영 공간 | 통합 Playground |
|------|----------|----------|-----------------|
| **목적** | Agent 개발/디버깅 | Agent 사용 | 복수 Agent 조합 |
| **Trace** | ✅ Live Trace | ❌ 없음 | ⚠️ 선택적 (논의 필요) |
| **History** | Chat + Trace | Chat만 | Chat만 |
| **WebSocket** | ✅ 자동 재연결 | ❌ 없음 | ❌ 없음 |
| **Agent 수** | 1개 | 1개 | **복수** |
| **공개 범위** | 본인만 | 전체/팀 | 전체/팀 (공개된 것만) |
| **URL** | `/workspace/:id` | `/production/:id` | `/unified` |

---

## 11. 컴포넌트 트리 (Component Tree)

```
App.tsx
├── Layout.tsx
│   ├── WorkspaceHeader
│   │   ├── Logo
│   │   ├── ModeToggle
│   │   └── UserProfileDropdown
│   └── <Outlet>
│       ├── Dashboard (/)
│       │   ├── AgentCardProduction (운영 모드)
│       │   │   ├── SearchInput
│       │   │   └── AgentCard[]
│       │   └── AgentCardWorkspace (개발 모드)
│       │       ├── AddAgentCard
│       │       └── AgentCard[]
│       ├── AgentPlayground (/workspace/:id, /production/:id)
│       │   ├── PlaygroundSidebar
│       │   │   ├── NewChatButton
│       │   │   └── SessionList
│       │   ├── TraceCapturePanel (워크스페이스만)
│       │   │   ├── FrameworkSettings (Agno/ADK/Langchain/Custom)
│       │   │   ├── TraceSettings
│       │   │   └── LiveTrace
│       │   │       └── TraceLogItem[]
│       │   └── ChatPlayground
│       │       ├── ChatMessageList
│       │       │   └── ChatMessage[]
│       │       │       ├── TextMessage
│       │       │       ├── MarkdownMessage
│       │       │       ├── CodeMessage
│       │       │       ├── ImageMessage
│       │       │       └── FileMessage
│       │       └── ChatInput
│       ├── UnifiedPlayground (/unified)
│       │   ├── AgentSelectionPanel
│       │   │   ├── AutoSelectCheckbox
│       │   │   ├── AgentCheckboxList
│       │   │   ├── ExecutionModeRadio
│       │   │   ├── ExecuteButton
│       │   │   └── ExecutionStatus
│       │   └── ChatPlayground
│       ├── SettingsLayout (/settings/*)
│       │   ├── SettingsTabs
│       │   └── <Outlet>
│       │       ├── GeneralSettings
│       │       ├── UsersManagement
│       │       ├── ModelsManagement
│       │       └── UsageStats
│       └── PendingApprovalPage (role=PENDING)
└── AddAgentModal (전역 모달)
```

---

## 12. 반응형 디자인 (Responsive Design)

### 12.1. 브레이크포인트

Tailwind CSS 기본 브레이크포인트 사용:
- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px

### 12.2. 모바일 대응

**모바일에서 숨김**:
- TraceCapturePanel: `hidden lg:block`
- PlaygroundSidebar: 햄버거 메뉴로 오버레이 표시

**모바일 레이아웃**:
```
┌────────────────────────┐
│ [☰] A2G  [운영↔개발]  │
├────────────────────────┤
│                        │
│   ChatPlayground       │
│   (전체 화면)          │
│                        │
└────────────────────────┘
```

---

## 13. 접근성 (Accessibility)

### 13.1. 키보드 네비게이션

- 모든 인터랙티브 요소는 Tab 키로 접근 가능
- Enter/Space 키로 버튼 활성화
- Esc 키로 모달 닫기

### 13.2. ARIA 속성

```tsx
<button
  aria-label="새 대화 시작"
  aria-pressed={false}
>
  ➕ 새 대화
</button>

<div role="alert" aria-live="polite">
  메시지 전송 중...
</div>
```

### 13.3. 색상 대비

- WCAG AA 기준 준수 (최소 4.5:1 대비율)
- 라이트/다크 모드 모두에서 충분한 대비 확보

---

## 14. 애니메이션 및 전환 효과

### 14.1. 모달 애니메이션

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

### 14.2. 페이지 전환

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

### 14.3. 실시간 로그 애니메이션

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

---

## 15. 참고 문서

- **[SRS.md](./SRS.md)**: 소프트웨어 요구사항 명세서
- **[GLOSSARY.md](./GLOSSARY.md)**: 용어 사전 (A2A, 3가지 모드)
- **[API_CONTRACTS.md](./API_CONTRACTS.md)**: 서비스 간 API 계약
- **[DEVELOPMENT_GUIDE.md](./DEVELOPMENT_GUIDE.md)**: 4인 팀 Sprint 계획

---

## 16. 문의

- **책임 개발자**: 한승하 (syngha.han@samsung.com)
- **디자인 제안**: GitHub Issues에 `[Design]` 태그로 등록

---

**문서 작성일**: 2025년 10월 27일
**다음 검토 예정일**: Sprint 0 종료 시
