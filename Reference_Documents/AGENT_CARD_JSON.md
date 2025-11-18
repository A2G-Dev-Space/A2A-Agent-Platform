## A2A Protocol Agent Card 필수 Schema 및 전체 요소

### Agent Card 개요

**Agent Card**는 A2A(Agent2Agent) 프로토콜에서 Agent의 "디지털 명함"으로 작동하는 JSON 문서입니다. 클라이언트 또는 다른 Agent가 Agent의 기능을 발견하고 상호작용하는 방식을 이해하기 위해 사용됩니다.[1][2]

Agent Card는 일반적으로 `/.well-known/agent.json` 엔드포인트에서 HTTP GET을 통해 노출되어 다른 Agent들이 쉽게 검색할 수 있습니다.[3][1]

### 필수 필드 (Required)

Agent Card를 구성하기 위해 반드시 포함해야 하는 5가지 필수 필드는 다음과 같습니다.[4]

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `name` | string | Agent의 이름 (예: 'Recipe Agent')[1] |
| `url` | string | Agent가 호스팅되는 서비스의 기본 URL[1] |
| `version` | string | Agent의 버전 정보[1] |
| `capabilities` | AgentCapabilities | Agent가 지원하는 기능 선언[1] |
| `skills` | AgentSkill[] | Agent가 수행 가능한 작업 단위 목록[1] |

### 선택 필드 (Optional)

#### 기본 정보

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `description` | string \| null | Agent의 기능에 대한 인간 친화적 설명[1] |
| `provider` | object | 서비스 제공자 정보 (organization, url)[1] |
| `documentationUrl` | string | Agent 문서 링크[1] |

#### 상호작용 모드

| 필드명 | 타입 | 기본값 | 설명 |
|--------|------|-------|------|
| `defaultInputModes` | string[] | ['text'] | 모든 스킬에서 지원하는 기본 입력 MIME 타입[1] |
| `defaultOutputModes` | string[] | ['text'] | 모든 스킬에서 지원하는 기본 출력 MIME 타입[1] |

#### 인증 및 보안

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `authentication` | object | 인증 요구사항 (schemes, credentials)[1] |
| `supportsAuthenticatedExtendedCard` | boolean | 인증된 확장 Agent Card 지원 여부[5] |

### AgentCapabilities 요소

**AgentCapabilities**는 Agent가 지원하는 선택적 A2A 기능을 선언합니다.[1]

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `streaming` | boolean | Agent가 스트리밍을 지원하는지 여부[1] |
| `pushNotifications` | boolean | Agent가 푸시 알림을 지원하는지 여부[1] |
| `stateTransitionHistory` | boolean | Agent가 작업 상태 변화 이력을 노출하는지 여부[1] |

### AgentSkill 구조

각 **AgentSkill**은 Agent가 수행할 수 있는 작업 단위를 나타냅니다.[1]

#### 필수 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `id` | string | 스킬의 고유 식별자[1] |
| `name` | string | 스킬의 인간 친화적 이름[1] |
| `description` | string | 스킬의 기능 설명[1] |
| `tags` | string[] | 스킬의 카테고리 태그 (예: 'cooking', 'customer support')[1] |

#### 선택 필드

| 필드명 | 타입 | 설명 |
|--------|------|------|
| `examples` | string[] \| null | 사용 예시 시나리오 (예: 'I need a recipe for bread')[1] |
| `inputModes` | string[] \| null | 스킬별 입력 MIME 타입 (정의되지 않으면 defaultInputModes 사용)[1] |
| `outputModes` | string[] \| null | 스킬별 출력 MIME 타입 (정의되지 않으면 defaultOutputModes 사용)[1] |

### 인증 스키마 (Authentication Schemes)

A2A는 OpenAPI 인증 구조를 따르며, 다음과 같은 인증 방식을 지원합니다.[6]

- **Bearer**: OAuth 2.0 토큰
- **Basic**: 기본 인증
- **ApiKey**: API 키 기반 인증
- **OAuth 2.0**
- **OpenID Connect Discovery**

인증 정보는 HTTP 헤더를 통해 전달되며, 일반적으로 Agent Card에 평문 시크릿 키를 포함하지 않는 것이 권장됩니다.[6]

### Agent Card 구현 예시

```javascript
interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  
  capabilities: {
    streaming?: boolean;
    pushNotifications?: boolean;
    stateTransitionHistory?: boolean;
  };
  
  authentication?: {
    schemes: string[];
    credentials?: string;
  };
  
  defaultInputModes: string[];
  defaultOutputModes: string[];
  
  provider?: {
    organization: string;
    url: string;
  };
  
  skills: {
    id: string;
    name: string;
    description: string;
    tags: string[];
    examples?: string[];
    inputModes?: string[];
    outputModes?: string[];
  }[];
  
  supportsAuthenticatedExtendedCard?: boolean;
}
```

### Agent Card 호스팅

Agent Card는 다음 방식으로 노출될 수 있습니다.[7]

- **Well-Known URI**: `https://<base_url>/.well-known/agent.json` (권장)
- **레지스트리/카탈로그**: 공개 또는 프라이빗 Agent 레지스트리 쿼리
- **직접 구성**: 클라이언트가 Agent Card URL 또는 내용으로 사전 구성

### 보안 고려사항

Agent Card가 민감한 정보를 포함하는 경우, 엔드포인트는 적절한 접근 제어(mTLS, 네트워크 제한, 인증 필요)로 보호되어야 합니다. 또한 평문 API 키 같은 정적 시크릿을 Agent Card에 직접 포함하지 않는 것이 권장됩니다.[7]



