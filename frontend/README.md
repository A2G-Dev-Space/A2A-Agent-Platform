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

**Well-known vs Custom Framework 선택 로직 포함**

```tsx
// src/components/agent/AddAgentModal.tsx
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

type Framework = 'Google ADK' | 'Agno OS' | 'Langchain' | 'Custom';

interface FrameworkConfig {
  name: Framework;
  label: string;
  type: 'a2a_native' | 'well_known' | 'custom';  // 3가지 유형 구분
  endpointPattern?: string;
  a2aEndpointPattern?: string;
  requiresProxy: boolean;
  requiresAgentId: boolean;
}

// 1. A2A Native Frameworks (Direct A2A Call - Proxy 불필요)
const A2A_NATIVE_FRAMEWORKS: FrameworkConfig[] = [
  {
    name: 'Google ADK',
    label: 'Google ADK (A2A Native)',
    type: 'a2a_native',
    endpointPattern: '{base_url}',  // Original endpoint pattern
    a2aEndpointPattern: '{base_url}/.well-known/agent-card.json',  // A2A discovery
    requiresProxy: false,  // Proxy 불필요!
    requiresAgentId: true
  }
];

// 2. Well-known Non-A2A Frameworks (Proxy 필요)
const WELL_KNOWN_FRAMEWORKS: FrameworkConfig[] = [
  {
    name: 'Agno OS',
    label: 'Agno OS (Well-known)',
    type: 'well_known',
    endpointPattern: '{base_url}/agents/{agent_id}/runs',
    requiresProxy: true,  // Proxy 필요
    requiresAgentId: true
  }
];

// 3. Custom Frameworks (Proxy 필요)
const CUSTOM_FRAMEWORKS: FrameworkConfig[] = [
  {
    name: 'Langchain',
    label: 'Langchain',
    type: 'custom',
    requiresProxy: true,
    requiresAgentId: false
  },
  {
    name: 'Custom',
    label: 'Custom (A2A-compliant)',
    type: 'custom',
    requiresProxy: true,
    requiresAgentId: false
  }
];

// 전체 프레임워크 목록
const ALL_FRAMEWORKS = [
  ...A2A_NATIVE_FRAMEWORKS,
  ...WELL_KNOWN_FRAMEWORKS,
  ...CUSTOM_FRAMEWORKS
];

export function AddAgentModal({ isOpen, onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    framework: 'Google ADK' as Framework,  // 기본값: A2A Native
    card_color: '#E9D5FF',
    // A2A Native / Well-known framework fields
    base_url: '',
    agent_id: '',
    // Custom framework fields
    original_endpoint: ''
  });

  // 현재 선택된 framework 정보
  const currentFramework = ALL_FRAMEWORKS.find(f => f.name === formData.framework);
  const isA2ANative = currentFramework?.type === 'a2a_native';
  const isWellKnown = currentFramework?.type === 'well_known';
  const isCustom = currentFramework?.type === 'custom';

  const handleSubmit = () => {
    let requestData: any = {
      title: formData.title,
      description: formData.description,
      framework: formData.framework,
      card_color: formData.card_color
    };

    if (isA2ANative && currentFramework) {
      // A2A Native: Agent Card Discovery endpoint 생성
      const a2aEndpoint = currentFramework.a2aEndpointPattern!
        .replace('{base_url}', formData.base_url);

      requestData.a2a_endpoint = a2aEndpoint;  // A2A Discovery endpoint
      requestData.base_url = formData.base_url;
      requestData.agent_id = formData.agent_id;
      requestData.requires_proxy = false;  // Proxy 불필요!
    } else if (isWellKnown && currentFramework) {
      // Well-known: 자동 endpoint 생성 (Proxy 필요)
      const generatedEndpoint = currentFramework.endpointPattern!
        .replace('{base_url}', formData.base_url)
        .replace('{agent_id}', formData.agent_id);

      requestData.original_endpoint = generatedEndpoint;
      requestData.base_url = formData.base_url;
      requestData.agent_id = formData.agent_id;
      requestData.requires_proxy = true;  // Proxy 필요
    } else if (isCustom) {
      // Custom: 사용자가 입력한 전체 URL (Proxy 필요)
      requestData.original_endpoint = formData.original_endpoint;
      requestData.requires_proxy = true;  // Proxy 필요
    }

    onSubmit(requestData);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="modal-overlay"
    >
      <div className="modal-content">
        <h2>새 에이전트 등록</h2>

        {/* 기본 정보 */}
        <input
          placeholder="Agent 이름"
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
        />
        <textarea
          placeholder="설명"
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
        />

        {/* Framework 선택 */}
        <label>Framework</label>
        <select
          value={formData.framework}
          onChange={e => setFormData({
            ...formData,
            framework: e.target.value as Framework
          })}
        >
          <optgroup label="Well-known Frameworks">
            {WELL_KNOWN_FRAMEWORKS.map(f => (
              <option key={f.name} value={f.name}>
                {f.label} (자동 endpoint 생성)
              </option>
            ))}
          </optgroup>
          <optgroup label="Custom Frameworks">
            {CUSTOM_FRAMEWORKS.map(f => (
              <option key={f} value={f}>
                {f} (수동 endpoint 입력)
              </option>
            ))}
          </optgroup>
        </select>

        {/* Well-known Framework 입력 필드 */}
        {isWellKnown && wellKnownInfo && (
          <div className="well-known-fields">
            <label>Base URL</label>
            <input
              placeholder="http://localhost:7777"
              value={formData.base_url}
              onChange={e => setFormData({ ...formData, base_url: e.target.value })}
            />

            {wellKnownInfo.requiresAgentId && (
              <>
                <label>Agent ID</label>
                <input
                  placeholder="my-agent-123"
                  value={formData.agent_id}
                  onChange={e => setFormData({ ...formData, agent_id: e.target.value })}
                />
              </>
            )}

            {/* 자동 생성 endpoint 미리보기 */}
            {formData.base_url && formData.agent_id && (
              <div className="endpoint-preview">
                <label>생성될 Endpoint (자동)</label>
                <code>
                  {wellKnownInfo.endpointPattern
                    .replace('{base_url}', formData.base_url)
                    .replace('{agent_id}', formData.agent_id)}
                </code>
              </div>
            )}
          </div>
        )}

        {/* Custom Framework 입력 필드 */}
        {!isWellKnown && (
          <div className="custom-fields">
            <label>Endpoint URL</label>
            <input
              placeholder="http://my-server.com/api/v1/chat"
              value={formData.original_endpoint}
              onChange={e => setFormData({ ...formData, original_endpoint: e.target.value })}
            />
            <p className="text-sm text-gray-500">
              전체 endpoint URL을 입력하세요
            </p>
          </div>
        )}

        {/* 제출 버튼 */}
        <div className="modal-actions">
          <button onClick={onClose}>취소</button>
          <button onClick={handleSubmit}>생성</button>
        </div>
      </div>
    </motion.div>
  );
}
```

### Workbench Playground Component

**Endpoint 모드 선택 및 Streaming 지원**

Workbench Playground는 에이전트를 실시간으로 테스트할 수 있는 인터페이스입니다. **A2A Proxy Endpoint**와 **Direct Original Endpoint** 양쪽을 선택하여 테스트할 수 있으며, **Streaming 응답**을 완벽 지원합니다.

```tsx
// src/pages/Workbench/PlaygroundPage.tsx
import { useState, useRef, useEffect } from 'react';
import api from '@/services/api';

type EndpointMode = 'proxy' | 'direct';
type StreamingMode = 'blocking' | 'streaming';

interface Agent {
  id: number;
  title: string;
  framework: string;
  original_endpoint: string;
}

export function PlaygroundPage({ agent }: { agent: Agent }) {
  const [mode, setMode] = useState<EndpointMode>('proxy');
  const [streamingMode, setStreamingMode] = useState<StreamingMode>('streaming');
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Endpoint URL 결정
  const getEndpointUrl = () => {
    if (mode === 'proxy') {
      return `/api/a2a/proxy/${agent.id}/tasks/send`;
    } else {
      return agent.original_endpoint;
    }
  };

  // A2A 프로토콜 요청 생성 (Proxy 모드)
  const buildA2ARequest = (messageText: string) => {
    return {
      jsonrpc: "2.0",
      method: "sendMessage",
      params: {
        message: {
          messageId: `msg-${Date.now()}`,
          role: "user",
          parts: [
            {
              kind: "text",
              text: messageText
            }
          ],
          kind: "message",
          contextId: `ctx-${Date.now()}`,
          taskId: `task-${Date.now()}`
        },
        configuration: {
          blocking: streamingMode === 'blocking',  // false = streaming
          acceptedOutputModes: ["text/plain"]
        }
      },
      id: `request-${Date.now()}`
    };
  };

  // Framework 네이티브 요청 생성 (Direct 모드)
  const buildNativeRequest = (messageText: string) => {
    switch (agent.framework) {
      case 'Agno':
        return {
          input: messageText,
          session_id: `session-${Date.now()}`,
          stream: streamingMode === 'streaming'
        };
      case 'Langchain':
        return {
          input: { question: messageText },
          config: { metadata: { session_id: `session-${Date.now()}` } }
        };
      default:
        // Custom: A2A 프로토콜 사용
        return buildA2ARequest(messageText);
    }
  };

  // Blocking 모드: 전체 응답 한 번에 받기
  const sendBlockingMessage = async () => {
    setIsLoading(true);
    setResponse('');

    try {
      const endpoint = getEndpointUrl();
      const requestBody = mode === 'proxy'
        ? buildA2ARequest(message)
        : buildNativeRequest(message);

      const res = await api.post(endpoint, requestBody);

      // A2A 응답 파싱 (Proxy 모드)
      if (mode === 'proxy') {
        const result = res.data.result;
        const text = result.parts
          .filter((p: any) => p.kind === 'text')
          .map((p: any) => p.text)
          .join('');
        setResponse(text);
      } else {
        // Framework 네이티브 응답 파싱
        if (agent.framework === 'Agno') {
          setResponse(res.data.output || JSON.stringify(res.data));
        } else if (agent.framework === 'Langchain') {
          setResponse(res.data.output || JSON.stringify(res.data));
        } else {
          setResponse(JSON.stringify(res.data, null, 2));
        }
      }
    } catch (error: any) {
      setResponse(`Error: ${error.message}\n${JSON.stringify(error.response?.data, null, 2)}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Streaming 모드: Server-Sent Events (SSE)로 청크 단위 수신
  const sendStreamingMessage = async () => {
    setIsLoading(true);
    setResponse('');

    // Abort controller for cancellation
    abortControllerRef.current = new AbortController();

    try {
      const endpoint = getEndpointUrl();
      const requestBody = mode === 'proxy'
        ? buildA2ARequest(message)
        : buildNativeRequest(message);

      const res = await fetch(`${api.defaults.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${await res.text()}`);
      }

      // SSE 스트림 읽기
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // 청크를 텍스트로 디코딩
        buffer += decoder.decode(value, { stream: true });

        // 줄 단위로 분리
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';  // 마지막 불완전한 줄은 buffer에 보관

        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data: ')) continue;

          const data = line.slice(6);  // "data: " 제거

          // [DONE] 신호
          if (data.trim() === '[DONE]') {
            setIsLoading(false);
            return;
          }

          try {
            const chunk = JSON.parse(data);

            // A2A 프로토콜 응답 파싱 (Proxy 모드)
            if (mode === 'proxy') {
              const result = chunk.result;
              if (result && result.parts) {
                const text = result.parts
                  .filter((p: any) => p.kind === 'text')
                  .map((p: any) => p.text)
                  .join('');

                // 응답에 청크 추가 (누적)
                setResponse(prev => prev + text);
              }
            } else {
              // Framework 네이티브 스트리밍 응답
              if (agent.framework === 'Agno') {
                const output = chunk.output || '';
                setResponse(prev => prev + output);
                if (chunk.done) {
                  setIsLoading(false);
                  return;
                }
              } else if (agent.framework === 'Langchain') {
                const output = chunk.output || '';
                setResponse(prev => prev + output);
              } else {
                // Custom: A2A 스트리밍
                const result = chunk.result;
                if (result && result.parts) {
                  const text = result.parts
                    .filter((p: any) => p.kind === 'text')
                    .map((p: any) => p.text)
                    .join('');
                  setResponse(prev => prev + text);
                }
              }
            }
          } catch (e) {
            console.error('Failed to parse chunk:', data, e);
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setResponse(prev => prev + '\n\n[중단됨]');
      } else {
        setResponse(`Error: ${error.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 메시지 전송
  const handleSend = () => {
    if (!message.trim() || isLoading) return;

    if (streamingMode === 'blocking') {
      sendBlockingMessage();
    } else {
      sendStreamingMessage();
    }
  };

  // Streaming 중단
  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  return (
    <div className="playground-container">
      <div className="playground-header">
        <h2>Playground: {agent.title}</h2>

        {/* Endpoint 모드 선택 */}
        <div className="endpoint-selector">
          <label>Endpoint 모드</label>
          <select
            value={mode}
            onChange={e => setMode(e.target.value as EndpointMode)}
            disabled={isLoading}
          >
            <option value="proxy">A2A Proxy (통합 endpoint)</option>
            <option value="direct">Direct (원본 endpoint)</option>
          </select>
          <span className="text-sm text-gray-500">
            {mode === 'proxy'
              ? `URL: /api/a2a/proxy/${agent.id}/tasks/send`
              : `URL: ${agent.original_endpoint}`
            }
          </span>
        </div>

        {/* Streaming 모드 선택 */}
        <div className="streaming-selector">
          <label>응답 모드</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="streaming"
                checked={streamingMode === 'streaming'}
                onChange={e => setStreamingMode(e.target.value as StreamingMode)}
                disabled={isLoading}
              />
              Streaming (실시간)
            </label>
            <label>
              <input
                type="radio"
                value="blocking"
                checked={streamingMode === 'blocking'}
                onChange={e => setStreamingMode(e.target.value as StreamingMode)}
                disabled={isLoading}
              />
              Blocking (전체 응답)
            </label>
          </div>
        </div>
      </div>

      {/* 메시지 입력 */}
      <div className="chat-input">
        <textarea
          placeholder="메시지를 입력하세요..."
          value={message}
          onChange={e => setMessage(e.target.value)}
          disabled={isLoading}
          rows={4}
        />
        <div className="chat-actions">
          {isLoading ? (
            <button onClick={handleStop} className="btn-stop">
              중단
            </button>
          ) : (
            <button onClick={handleSend} className="btn-send">
              전송
            </button>
          )}
        </div>
      </div>

      {/* 응답 출력 */}
      <div className="chat-response">
        <h3>응답</h3>
        <pre className="response-content">
          {response || (isLoading ? '응답을 기다리는 중...' : '여기에 응답이 표시됩니다')}
        </pre>
      </div>
    </div>
  );
}
```

**주요 기능:**

1. **Endpoint 모드 전환**
   - Proxy 모드: A2A 표준 프로토콜 사용
   - Direct 모드: Framework 네이티브 프로토콜 사용

2. **Streaming 지원**
   - SSE (Server-Sent Events) 기반
   - 실시간 청크 수신 및 화면 업데이트
   - 중단(abort) 기능

3. **Framework 별 프로토콜 변환**
   - Agno OS: `input`, `session_id`, `stream`
   - Langchain: `input.question`, `config`
   - Custom: A2A 프로토콜

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
- **`http://localhost:9050/api/a2a/proxy/**` -> `agent-service` (A2A Universal Proxy)
- **`http://localhost:9050/api/admin/**` -> `admin-service`

따라서 Frontend에서 API를 호출할 때는 전체 경로(예: `/api/users/me`)를 사용해야 합니다.

### A2A Universal Proxy 통합

Agent Service는 **A2A Universal Proxy**를 제공하여 다양한 프레임워크로 개발된 에이전트들을 표준화된 A2A 프로토콜로 통신할 수 있게 합니다.

#### Framework 분류 체계

에이전트 등록 시 Framework 종류에 따라 **3가지 방식**으로 처리됩니다:

**1. A2A Native Frameworks (Direct A2A Call - Proxy 불필요) ⭐**

A2A Protocol을 네이티브로 지원하는 프레임워크입니다. **Proxy를 거치지 않고** 직접 A2A endpoint를 호출할 수 있습니다.

| Framework | Base URL 예시 | A2A Endpoint 패턴 | Proxy 필요? |
|-----------|---------------|------------------|------------|
| **Google ADK** | `http://localhost:8080` | `{base_url}/.well-known/agent-card.json` | ❌ 불필요 (Direct Call) |
| **Agno OS** (미래) | `http://localhost:7777` | `{base_url}/.well-known/agent-card.json` | ❌ 불필요 (A2A 지원 완료 시) |

**예시: Google ADK 에이전트 등록**
```typescript
// 사용자 입력
const agentData = {
  title: "My ADK Agent",
  framework: "Google ADK",
  base_url: "http://localhost:8080",  // base URL만 입력
  agent_id: "my-adk-agent"
};

// 시스템 동작
// 1. Agent Card Discovery: http://localhost:8080/.well-known/agent-card.json
// 2. Direct A2A Call: Frontend → Agent Endpoint (Proxy 불필요!)
// 3. 플랫폼 등록: 메타데이터 및 검색용으로만 저장
```

**⚠️ 중요**: Google ADK는 A2A를 네이티브로 지원하므로 **플랫폼 proxy를 거치지 않고** 직접 호출합니다. 플랫폼은 Agent Card 메타데이터와 검색을 위해서만 등록 정보를 저장합니다.

**2. Well-known Non-A2A Frameworks (Proxy 필요) 🔄**

표준 endpoint 패턴을 가지지만 A2A를 네이티브로 지원하지 않는 프레임워크입니다. **Proxy를 통한 프로토콜 변환**이 필요합니다.

| Framework | Base URL 예시 | 원본 Endpoint 패턴 | Proxy 필요? |
|-----------|---------------|-------------------|------------|
| **Agno OS** (현재) | `http://localhost:7777` | `{base_url}/agents/{agent_id}/runs` | ✅ 필요 (프로토콜 변환) |

**예시: Agno OS 에이전트 등록**
```typescript
// 사용자 입력
const agentData = {
  title: "My Agno Agent",
  framework: "Agno OS",
  base_url: "http://localhost:7777",
  agent_id: "my-agent-123"
};

// 시스템 동작
// 1. 원본 endpoint 생성: http://localhost:7777/agents/my-agent-123/runs
// 2. Proxy endpoint 생성: /api/a2a/proxy/{db_agent_id}/tasks/send
// 3. Frontend → A2A Proxy → Agno Adapter → Agno Endpoint
//    (A2A Protocol → Agno 프로토콜 변환)
```

**📝 참고**: Agno OS가 향후 A2A를 네이티브로 지원하면 **Google ADK와 동일한 방식**으로 직접 호출할 수 있게 됩니다.

**3. Custom Frameworks (Proxy 필요) 🔄**

표준 패턴이 없는 프레임워크입니다. 사용자는 **전체 endpoint URL**을 입력하고, **Proxy를 통한 변환**이 필요합니다.

| Framework | Endpoint 입력 방식 | Proxy 필요? |
|-----------|------------------|------------|
| **Langchain** | 전체 URL (예: `http://my-server.com/langchain/invoke`) | ✅ 필요 |
| **Custom** | 전체 URL (예: `http://my-custom-agent.com/api/v1/chat`) | ✅ 필요 |

**예시: Custom 에이전트 등록**
```typescript
// 사용자 입력
const agentData = {
  title: "My Custom Agent",
  framework: "Custom",
  original_endpoint: "http://my-server.com/api/v1/chat"  // 전체 URL 입력
};

// 시스템 동작
// 1. Proxy endpoint 생성: /api/a2a/proxy/{db_agent_id}/tasks/send
// 2. Frontend → A2A Proxy → Custom Adapter → Custom Endpoint
```

#### Endpoint 호출 방식

Workbench Playground에서는 Framework 유형에 따라 **다른 방식**으로 테스트할 수 있습니다:

**1. A2A Native Frameworks (Google ADK)**

```typescript
// Google ADK는 Direct A2A Call 지원
const modes = [
  {
    name: 'A2A Direct',
    url: agent.a2a_endpoint,  // http://localhost:8080 (Agent Card Discovery)
    description: 'A2A 네이티브 직접 호출 (권장)'
  },
  {
    name: 'Original Endpoint',
    url: agent.original_endpoint,  // Framework 고유 프로토콜
    description: '프레임워크 네이티브 테스트'
  }
];
```

**2. Well-known Non-A2A Frameworks (Agno OS)**

```typescript
// Agno OS는 Proxy를 통한 변환 필요
const modes = [
  {
    name: 'A2A Proxy',
    url: `/api/a2a/proxy/${agent.id}/tasks/send`,
    description: 'A2A 표준 프로토콜 (권장)'
  },
  {
    name: 'Direct Original',
    url: agent.original_endpoint,  // http://localhost:7777/agents/my-agent/runs
    description: 'Agno 네이티브 프로토콜 테스트'
  }
];
```

**3. Custom Frameworks (Langchain, Custom)**

```typescript
// Custom은 Proxy를 통한 변환 필요
const modes = [
  {
    name: 'A2A Proxy',
    url: `/api/a2a/proxy/${agent.id}/tasks/send`,
    description: 'A2A 표준 프로토콜 (권장)'
  },
  {
    name: 'Direct Original',
    url: agent.original_endpoint,  // http://my-server.com/api/v1/chat
    description: '원본 endpoint 직접 테스트'
  }
];
```

**호출 방식 비교:**

| Framework | A2A 지원 | 권장 호출 방식 | Proxy 필요? | Access Control | Monitoring |
|-----------|---------|--------------|------------|----------------|-----------|
| **Google ADK** | ✅ Native | Direct A2A | ❌ 불필요 | Agent 자체 처리 | Agent 자체 처리 |
| **Agno OS** (현재) | ❌ | A2A Proxy | ✅ 필요 | 플랫폼 처리 | 플랫폼 처리 |
| **Agno OS** (미래) | ✅ Native | Direct A2A | ❌ 불필요 | Agent 자체 처리 | Agent 자체 처리 |
| **Langchain** | ❌ | A2A Proxy | ✅ 필요 | 플랫폼 처리 | 플랫폼 처리 |
| **Custom** | ❌ | A2A Proxy | ✅ 필요 | 플랫폼 처리 | 플랫폼 처리 |

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

  // 에이전트 업데이트
  updateAgent: (id, data) => api.put(`/api/agents/${id}/`, data),

  // 에이전트 삭제
  deleteAgent: (id) => api.delete(`/api/agents/${id}/`),

  // ===== A2A Universal Proxy API =====

  /**
   * A2A Proxy를 통해 에이전트에게 메시지 전송 (Blocking 모드)
   * @param agentId - DB에 등록된 에이전트 ID
   * @param message - 전송할 메시지
   * @param config - A2A 설정
   */
  sendMessageViaProxy: (agentId: number, message: string, config?: any) => {
    const request = {
      jsonrpc: "2.0",
      method: "sendMessage",
      params: {
        message: {
          messageId: `msg-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text: message }],
          kind: "message",
          contextId: `ctx-${Date.now()}`,
          taskId: `task-${Date.now()}`
        },
        configuration: {
          blocking: true,  // Blocking 모드
          acceptedOutputModes: ["text/plain"],
          ...config
        }
      },
      id: `request-${Date.now()}`
    };

    return api.post(`/api/a2a/proxy/${agentId}/tasks/send`, request);
  },

  /**
   * A2A Proxy를 통해 에이전트에게 메시지 전송 (Streaming 모드)
   * SSE를 사용하므로 fetch API로 직접 호출해야 함
   * @param agentId - DB에 등록된 에이전트 ID
   * @param message - 전송할 메시지
   * @param onChunk - 청크 수신 시 호출될 콜백
   */
  streamMessageViaProxy: async (
    agentId: number,
    message: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal
  ) => {
    const request = {
      jsonrpc: "2.0",
      method: "sendMessage",
      params: {
        message: {
          messageId: `msg-${Date.now()}`,
          role: "user",
          parts: [{ kind: "text", text: message }],
          kind: "message",
          contextId: `ctx-${Date.now()}`,
          taskId: `task-${Date.now()}`
        },
        configuration: {
          blocking: false,  // Streaming 모드
          acceptedOutputModes: ["text/plain"]
        }
      },
      id: `request-${Date.now()}`
    };

    const token = localStorage.getItem('accessToken');
    const response = await fetch(
      `${api.defaults.baseURL}/api/a2a/proxy/${agentId}/tasks/send`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request),
        signal
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    // SSE 스트림 파싱
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim() || !line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data.trim() === '[DONE]') return;

        try {
          const chunk = JSON.parse(data);
          const result = chunk.result;
          if (result && result.parts) {
            const text = result.parts
              .filter((p: any) => p.kind === 'text')
              .map((p: any) => p.text)
              .join('');
            if (text) onChunk(text);
          }
        } catch (e) {
          console.error('Failed to parse SSE chunk:', e);
        }
      }
    }
  }
};
```

**사용 예시:**

```typescript
// Blocking 모드 (전체 응답 한 번에 수신)
const response = await agentService.sendMessageViaProxy(agentId, "안녕하세요");
const text = response.data.result.parts
  .filter(p => p.kind === 'text')
  .map(p => p.text)
  .join('');
console.log(text);

// Streaming 모드 (실시간 청크 수신)
await agentService.streamMessageViaProxy(
  agentId,
  "안녕하세요",
  (chunk) => {
    console.log('Received chunk:', chunk);
    setResponse(prev => prev + chunk);
  }
);
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
