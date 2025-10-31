# Google ADK를 사용한 A2A 프로토콜 Sub-Agent 예제

이 가이드는 A2A 프로토콜을 사용하여 2개의 sub-agent A2A 서버와 1개의 A2A 클라이언트를 구현하는 방법을 설명합니다.

## 아키텍처 개요

```
┌─────────────────────────┐
│   Root Agent Client     │
│  (localhost:8000)       │
│  RemoteA2aAgent 사용    │
└────────┬────────────────┘
         │
         ├──────────────────────────┐
         │                          │
         ▼                          ▼
    ┌─────────────────┐        ┌──────────────────┐
    │ Sub-Agent 1     │        │  Sub-Agent 2     │
    │ Math Agent      │        │  Text Agent      │
    │ (port 8001)     │        │  (port 8002)     │
    │ /.well-known/   │        │ /.well-known/    │
    │ agent.json      │        │ agent.json       │
    │ /tasks/send     │        │ /tasks/send      │
    └─────────────────┘        └──────────────────┘
```

## 프로젝트 구조

```
a2a_multi_agent/
├── sub_agents/
│   ├── math_agent/
│   │   ├── __init__.py
│   │   ├── agent.json
│   │   └── agent.py
│   └── text_agent/
│       ├── __init__.py
│       ├── agent.json
│       └── agent.py
├── client_agent/
│   ├── __init__.py
│   └── agent.py
└── requirements.txt
```

## 설치 및 준비

```bash
# 필요한 패키지 설치
pip install google-adk[a2a]
pip install uvicorn
pip install starlette
pip install pydantic
```

## 1단계: Sub-Agent 1 - Math Agent (port 8001)

### sub_agents/math_agent/agent.json

```json
{
  "name": "math_agent",
  "description": "수학 계산을 수행하는 에이전트 (더하기, 빼기, 곱하기, 나누기)",
  "url": "http://localhost:8001/a2a/math_agent",
  "version": "1.0.0",
  "capabilities": {
    "streaming": false
  },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "skills": [
    {
      "id": "math_operations",
      "name": "Math Operations",
      "description": "기본 수학 연산 수행",
      "tags": ["math", "calculation"]
    }
  ]
}
```

### sub_agents/math_agent/agent.py

```python
import asyncio
import json
from typing import Any, Dict
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool
from google.genai import types as genai_types

# 수학 함수 정의
def add(a: float, b: float) -> float:
    """두 수를 더합니다"""
    return a + b

def subtract(a: float, b: float) -> float:
    """두 수를 뺍니다"""
    return a - b

def multiply(a: float, b: float) -> float:
    """두 수를 곱합니다"""
    return a * b

def divide(a: float, b: float) -> float:
    """두 수를 나눕니다"""
    if b == 0:
        raise ValueError("0으로 나눌 수 없습니다")
    return a / b

# 도구 정의
add_tool = FunctionTool(add)
subtract_tool = FunctionTool(subtract)
multiply_tool = FunctionTool(multiply)
divide_tool = FunctionTool(divide)

# Math Agent 생성
math_agent = Agent(
    model="gemini-2.0-flash",
    name="math_agent",
    description="수학 계산을 수행하는 에이전트",
    instructions="""당신은 수학 계산 에이전트입니다.
    
사용자의 수학 계산 요청에 대해:
1. 요청된 연산을 파악합니다
2. 적절한 도구를 사용하여 계산합니다
3. 결과를 명확하게 설명합니다

항상 계산 과정과 최종 결과를 명시적으로 표시하세요.""",
    tools=[add_tool, subtract_tool, multiply_tool, divide_tool]
)

# A2A 서버로 변환
async def start_math_agent():
    a2a_app = to_a2a(
        math_agent,
        port=8001,
        agent_card="./sub_agents/math_agent/agent.json"
    )
    print("Math Agent A2A 서버가 포트 8001에서 시작되었습니다...")
    
    import uvicorn
    await asyncio.to_thread(
        uvicorn.run,
        a2a_app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )

if __name__ == "__main__":
    asyncio.run(start_math_agent())
```

## 2단계: Sub-Agent 2 - Text Agent (port 8002)

### sub_agents/text_agent/agent.json

```json
{
  "name": "text_agent",
  "description": "텍스트 처리를 수행하는 에이전트 (문자열 변환, 분석)",
  "url": "http://localhost:8002/a2a/text_agent",
  "version": "1.0.0",
  "capabilities": {
    "streaming": false
  },
  "defaultInputModes": ["text/plain"],
  "defaultOutputModes": ["text/plain"],
  "skills": [
    {
      "id": "text_operations",
      "name": "Text Operations",
      "description": "텍스트 처리 및 분석 수행",
      "tags": ["text", "processing"]
    }
  ]
}
```

### sub_agents/text_agent/agent.py

```python
import asyncio
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool

# 텍스트 함수 정의
def uppercase_text(text: str) -> str:
    """텍스트를 대문자로 변환합니다"""
    return text.upper()

def lowercase_text(text: str) -> str:
    """텍스트를 소문자로 변환합니다"""
    return text.lower()

def reverse_text(text: str) -> str:
    """텍스트를 역순으로 변환합니다"""
    return text[::-1]

def count_words(text: str) -> int:
    """텍스트의 단어 수를 셉니다"""
    return len(text.split())

# 도구 정의
uppercase_tool = FunctionTool(uppercase_text)
lowercase_tool = FunctionTool(lowercase_text)
reverse_tool = FunctionTool(reverse_text)
count_words_tool = FunctionTool(count_words)

# Text Agent 생성
text_agent = Agent(
    model="gemini-2.0-flash",
    name="text_agent",
    description="텍스트 처리를 수행하는 에이전트",
    instructions="""당신은 텍스트 처리 에이전트입니다.
    
사용자의 텍스트 처리 요청에 대해:
1. 요청된 작업을 파악합니다
2. 적절한 도구를 사용하여 처리합니다
3. 결과를 명확하게 설명합니다

항상 원본 텍스트와 처리된 결과를 표시하세요.""",
    tools=[uppercase_tool, lowercase_tool, reverse_tool, count_words_tool]
)

# A2A 서버로 변환
async def start_text_agent():
    a2a_app = to_a2a(
        text_agent,
        port=8002,
        agent_card="./sub_agents/text_agent/agent.json"
    )
    print("Text Agent A2A 서버가 포트 8002에서 시작되었습니다...")
    
    import uvicorn
    await asyncio.to_thread(
        uvicorn.run,
        a2a_app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )

if __name__ == "__main__":
    asyncio.run(start_text_agent())
```

## 3단계: Root Client Agent (port 8000)

### client_agent/agent.py

```python
import asyncio
from google.adk.agents.llm_agent import Agent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.genai import types
from google.adk import Runner
from google.adk.runners.memory_runner.memory_session_service import InMemorySessionService
from google.adk.runners.memory_runner.memory_memory_service import InMemoryMemoryService
from google.adk.runners.memory_runner.memory_artifact_service import InMemoryArtifactService

# Sub-Agent를 RemoteA2aAgent로 정의
math_agent = RemoteA2aAgent(
    name="math_agent",
    description="수학 계산을 수행하는 에이전트",
    agent_card=f"http://localhost:8001/a2a/math_agent{AGENT_CARD_WELL_KNOWN_PATH}"
)

text_agent = RemoteA2aAgent(
    name="text_agent",
    description="텍스트 처리를 수행하는 에이전트",
    agent_card=f"http://localhost:8002/a2a/text_agent{AGENT_CARD_WELL_KNOWN_PATH}"
)

# Root/Client Agent 생성
root_agent = Agent(
    model="gemini-2.0-flash",
    name="root_agent",
    description="수학 및 텍스트 작업을 조율하는 루트 에이전트",
    instructions="""당신은 여러 전문 에이전트를 관리하는 루트 에이전트입니다.

사용자의 요청을 분석하고:

1. 수학 관련 요청 (계산, 연산): math_agent에 위임
2. 텍스트 관련 요청 (변환, 분석): text_agent에 위임
3. 복합 요청: 두 에이전트를 순차적으로 활용

각 작업의 결과를 정리하여 사용자에게 종합적인 답변을 제공하세요.""",
    global_instruction="당신은 전문 에이전트들을 조율하는 능력이 뛰어난 에이전트입니다.",
    sub_agents=[math_agent, text_agent]
)

# Runner 생성
runner = Runner(
    app_name="root_agent",
    agent=root_agent,
    session_service=InMemorySessionService(),
    memory_service=InMemoryMemoryService(),
    artifact_service=InMemoryArtifactService()
)

async def call_agent_async(query: str, user_id: str = "user1", session_id: str = "session1"):
    """에이전트 호출"""
    print(f"\n>>> 사용자 질의: {query}")
    
    content = types.Content(role='user', parts=[types.Part(text=query)])
    final_response_text = "에이전트가 최종 응답을 생성하지 못했습니다."
    
    async for event in runner.run_async(
        user_id=user_id,
        session_id=session_id,
        new_message=content
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                final_response_text = event.content.parts[0].text
            break
    
    print(f"<<< 에이전트 응답: {final_response_text}")
    return final_response_text

async def main():
    """메인 함수"""
    print("Root Agent 클라이언트가 시작되었습니다.")
    print("Sub-Agent들이 준비될 때까지 기다리는 중...\n")
    
    # Sub-Agent 준비를 위해 잠시 대기
    await asyncio.sleep(2)
    
    # 테스트 쿼리
    test_queries = [
        "15와 3을 더하시오",
        "hello world를 대문자로 변환하시오",
        "100을 5로 나누고 결과를 역순으로 표시하시오"
    ]
    
    for query in test_queries:
        try:
            await call_agent_async(query)
            await asyncio.sleep(1)
        except Exception as e:
            print(f"오류 발생: {e}")

if __name__ == "__main__":
    asyncio.run(main())
```

## 실행 방법

### 터미널 1 - Math Agent 시작
```bash
cd a2a_multi_agent
python sub_agents/math_agent/agent.py
```

### 터미널 2 - Text Agent 시작
```bash
cd a2a_multi_agent
python sub_agents/text_agent/agent.py
```

### 터미널 3 - Root Client Agent 시작
```bash
cd a2a_multi_agent
python client_agent/agent.py
```

## A2A 프로토콜 주요 개념

### 1. **Agent Card** (`.well-known/agent.json`)
- 에이전트의 메타데이터 제공
- 에이전트 발견(Discovery)을 위한 정보
- 기능(Skills), 입출력 형식 정의

### 2. **RemoteA2aAgent**
- 원격 A2A 서버에 연결
- agent_card URL 필요
- 네트워크를 통해 통신

### 3. **Sub-Agents**
- Root Agent의 작업 위임 대상
- 각자의 포트에서 A2A 서버로 실행
- 독립적인 LLM 모델 사용 가능

### 4. **Tasks/Send Endpoint**
- A2A 클라이언트가 작업 요청
- 에이전트가 처리 후 응답
- JSON-RPC 형식 사용

## 확장 방법

### 더 많은 Sub-Agent 추가
1. 새로운 포트 할당 (8003, 8004, ...)
2. `sub_agents/[new_agent]/agent.py` 생성
3. Root Agent의 `sub_agents` 리스트에 추가

### 다양한 도구 추가
```python
from google.adk.tools.function_tool import FunctionTool

def custom_function(param: str) -> str:
    # 커스텀 로직
    return result

custom_tool = FunctionTool(custom_function)
agent = Agent(..., tools=[custom_tool, ...])
```

### 스트리밍 응답 활성화
agent.json에서 `"streaming": true` 설정 (고급 사용)

## 트러블슈팅

### 포트 충돌
```bash
# 포트 8001 사용 중인 프로세스 찾기
lsof -i :8001
# 프로세스 종료
kill -9 <PID>
```

### Agent Card 불일치
- Agent Card URL이 실제 서버 주소와 일치하는지 확인
- localhost vs 127.0.0.1 구분

### 연결 타임아웃
- 모든 Sub-Agent가 실행 중인지 확인
- 방화벽 설정 확인
- 각 포트의 헬스 체크: `curl http://localhost:8001/a2a/math_agent/.well-known/agent.json`

## 참고 자료

- [Google ADK 공식 문서](https://google.github.io/adk-docs/)
- [A2A 프로토콜 사양](https://github.com/google/A2A)
- [ADK A2A 샘플](https://github.com/google/adk-python)


#math_agent.py
import asyncio
import json
from typing import Any, Dict
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool
from google.genai import types as genai_types

# ===== 수학 함수 정의 =====
def add(a: float, b: float) -> float:
    """두 수를 더합니다"""
    return a + b

def subtract(a: float, b: float) -> float:
    """두 수를 뺍니다"""
    return a - b

def multiply(a: float, b: float) -> float:
    """두 수를 곱합니다"""
    return a * b

def divide(a: float, b: float) -> float:
    """두 수를 나눕니다"""
    if b == 0:
        raise ValueError("0으로 나눌 수 없습니다")
    return a / b

def power(base: float, exponent: float) -> float:
    """거듭제곱을 계산합니다"""
    return base ** exponent

# ===== 도구 생성 =====
add_tool = FunctionTool(add)
subtract_tool = FunctionTool(subtract)
multiply_tool = FunctionTool(multiply)
divide_tool = FunctionTool(divide)
power_tool = FunctionTool(power)

# ===== Math Agent 생성 =====
math_agent = Agent(
    model="gemini-2.0-flash",
    name="math_agent",
    description="수학 계산을 수행하는 에이전트",
    instructions="""당신은 전문 수학 계산 에이전트입니다.

사용자의 수학 계산 요청에 대해:
1. 요청된 연산 유형을 파악합니다
2. 적절한 도구를 사용하여 계산합니다
3. 계산 과정과 최종 결과를 명확하게 설명합니다
4. 필요시 단위나 형식을 명시합니다

항상 논리적이고 정확한 계산을 제공하세요.""",
    tools=[add_tool, subtract_tool, multiply_tool, divide_tool, power_tool]
)

# ===== A2A 서버 시작 =====
async def start_math_agent():
    """Math Agent를 A2A 서버로 시작합니다"""
    print("=" * 50)
    print("Math Agent A2A 서버 시작 중...")
    print("=" * 50)
    
    # to_a2a를 사용하여 Agent를 A2A 서버로 변환
    a2a_app = to_a2a(
        math_agent,
        port=8001
    )
    
    print("\n✓ Math Agent 초기화 완료")
    print("✓ 포트: 8001")
    print("✓ Agent Card 엔드포인트: http://localhost:8001/.well-known/agent.json")
    print("✓ Task 엔드포인트: http://localhost:8001/tasks/send")
    print("\nAgent 시작 중...\n")
    
    # Uvicorn으로 서버 실행
    import uvicorn
    config = uvicorn.Config(
        app=a2a_app,
        host="0.0.0.0",
        port=8001,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(start_math_agent())
    except KeyboardInterrupt:
        print("\n\nMath Agent 서버가 종료되었습니다.")

#text_agent.py
import asyncio
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool

# ===== 텍스트 처리 함수 정의 =====
def uppercase_text(text: str) -> str:
    """텍스트를 대문자로 변환합니다"""
    return text.upper()

def lowercase_text(text: str) -> str:
    """텍스트를 소문자로 변환합니다"""
    return text.lower()

def reverse_text(text: str) -> str:
    """텍스트를 역순으로 변환합니다"""
    return text[::-1]

def count_words(text: str) -> int:
    """텍스트의 단어 수를 셉니다"""
    return len(text.split())

def count_chars(text: str) -> int:
    """텍스트의 문자 수를 셉니다"""
    return len(text)

def replace_text(text: str, old: str, new: str) -> str:
    """텍스트의 일부를 바꿉니다"""
    return text.replace(old, new)

# ===== 도구 생성 =====
uppercase_tool = FunctionTool(uppercase_text)
lowercase_tool = FunctionTool(lowercase_text)
reverse_tool = FunctionTool(reverse_text)
count_words_tool = FunctionTool(count_words)
count_chars_tool = FunctionTool(count_chars)
replace_tool = FunctionTool(replace_text)

# ===== Text Agent 생성 =====
text_agent = Agent(
    model="gemini-2.0-flash",
    name="text_agent",
    description="텍스트 처리를 수행하는 에이전트",
    instructions="""당신은 전문 텍스트 처리 에이전트입니다.

사용자의 텍스트 처리 요청에 대해:
1. 요청된 작업 유형을 파악합니다 (변환, 분석, 대체 등)
2. 적절한 도구를 사용하여 처리합니다
3. 원본 텍스트와 처리된 결과를 명확하게 표시합니다
4. 필요시 통계 정보를 포함합니다

항상 정확하고 명확한 결과를 제공하세요.""",
    tools=[uppercase_tool, lowercase_tool, reverse_tool, 
           count_words_tool, count_chars_tool, replace_tool]
)

# ===== A2A 서버 시작 =====
async def start_text_agent():
    """Text Agent를 A2A 서버로 시작합니다"""
    print("=" * 50)
    print("Text Agent A2A 서버 시작 중...")
    print("=" * 50)
    
    # to_a2a를 사용하여 Agent를 A2A 서버로 변환
    a2a_app = to_a2a(
        text_agent,
        port=8002
    )
    
    print("\n✓ Text Agent 초기화 완료")
    print("✓ 포트: 8002")
    print("✓ Agent Card 엔드포인트: http://localhost:8002/.well-known/agent.json")
    print("✓ Task 엔드포인트: http://localhost:8002/tasks/send")
    print("\nAgent 시작 중...\n")
    
    # Uvicorn으로 서버 실행
    import uvicorn
    config = uvicorn.Config(
        app=a2a_app,
        host="0.0.0.0",
        port=8002,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(start_text_agent())
    except KeyboardInterrupt:
        print("\n\nText Agent 서버가 종료되었습니다.")

#root_client.py
import asyncio
import uuid
from google.adk.agents.llm_agent import Agent
from google.adk.agents.remote_a2a_agent import RemoteA2aAgent, AGENT_CARD_WELL_KNOWN_PATH
from google.genai import types
from google.adk import Runner
from google.adk.runners.memory_runner.memory_session_service import InMemorySessionService
from google.adk.runners.memory_runner.memory_memory_service import InMemoryMemoryService
from google.adk.runners.memory_runner.memory_artifact_service import InMemoryArtifactService

# ===== Sub-Agent 정의 =====
# Math Agent (port 8001)를 원격 A2A 에이전트로 설정
math_agent = RemoteA2aAgent(
    name="math_agent",
    description="수학 계산을 수행하는 에이전트",
    agent_card=f"http://localhost:8001{AGENT_CARD_WELL_KNOWN_PATH}"
)

# Text Agent (port 8002)를 원격 A2A 에이전트로 설정
text_agent = RemoteA2aAgent(
    name="text_agent",
    description="텍스트 처리를 수행하는 에이전트",
    agent_card=f"http://localhost:8002{AGENT_CARD_WELL_KNOWN_PATH}"
)

# ===== Root/Client Agent 생성 =====
root_agent = Agent(
    model="gemini-2.0-flash",
    name="root_agent",
    description="수학 및 텍스트 작업을 조율하는 루트 에이전트",
    instructions="""당신은 여러 전문 에이전트를 관리하고 조율하는 루트 에이전트입니다.

사용자의 요청을 받으면:

1. 요청 내용을 분석합니다
2. 수학 관련 요청 (계산, 연산, 수치): math_agent에 위임
3. 텍스트 관련 요청 (문자열 변환, 분석, 처리): text_agent에 위임
4. 복합 요청 (두 가지 이상의 작업 필요): 
   - 먼저 필요한 에이전트를 순차적으로 호출
   - 각 결과를 정리하여 최종 답변 제공

각 sub-agent의 응답을 명확하게 정리하고, 최종 결과를 사용자에게 종합적으로 제공하세요.""",
    global_instruction="당신은 전문 에이전트들을 효과적으로 조율하고 활용하는 능력이 뛰어난 메인 에이전트입니다.",
    sub_agents=[math_agent, text_agent]
)

# ===== Runner 생성 =====
runner = Runner(
    app_name="root_agent",
    agent=root_agent,
    session_service=InMemorySessionService(),
    memory_service=InMemoryMemoryService(),
    artifact_service=InMemoryArtifactService()
)

# ===== 에이전트 호출 함수 =====
async def call_agent_async(
    query: str, 
    user_id: str = "user1", 
    session_id: str = "session1"
) -> str:
    """
    Root Agent를 호출하여 쿼리를 처리합니다
    
    Args:
        query: 사용자 쿼리
        user_id: 사용자 ID
        session_id: 세션 ID
    
    Returns:
        에이전트의 최종 응답
    """
    print(f"\n{'='*60}")
    print(f">>> 사용자 질의: {query}")
    print('='*60)
    
    # 사용자 메시지를 ADK 형식으로 변환
    content = types.Content(
        role='user', 
        parts=[types.Part(text=query)]
    )
    
    final_response_text = "에이전트가 최종 응답을 생성하지 못했습니다."
    
    try:
        # 에이전트 실행 (비동기)
        async for event in runner.run_async(
            user_id=user_id,
            session_id=session_id,
            new_message=content
        ):
            # 최종 응답 이벤트 확인
            if event.is_final_response():
                if event.content and event.content.parts:
                    final_response_text = event.content.parts[0].text
                elif event.error_message:
                    final_response_text = f"오류 발생: {event.error_message}"
                break
    
    except Exception as e:
        final_response_text = f"에러: {str(e)}"
        print(f"오류 발생: {e}")
    
    print(f"\n<<< 에이전트 응답:")
    print(final_response_text)
    print('='*60)
    
    return final_response_text

# ===== 메인 함수 =====
async def main():
    """메인 클라이언트 함수"""
    print("\n")
    print("█" * 60)
    print("█  Google ADK A2A Protocol - Root Client Agent")
    print("█" * 60)
    print("\n✓ Sub-Agent들이 준비될 때까지 기다리는 중...")
    print("   - Math Agent: http://localhost:8001 (포트 8001)")
    print("   - Text Agent: http://localhost:8002 (포트 8002)")
    
    # Sub-Agent 준비를 위해 잠시 대기
    print("\n⏳ 2초 대기 중...")
    await asyncio.sleep(2)
    
    print("\n✓ Root Client Agent 준비 완료!\n")
    
    # 테스트 쿼리
    test_queries = [
        # 수학 연산 요청
        "15와 3을 더해주고 그 결과를 설명해주세요",
        
        # 텍스트 처리 요청
        "'Hello World'를 대문자로 변환해주세요",
        
        # 복합 요청
        "100을 5로 나누고, 그 결과를 텍스트로 표현해서 역순으로 나타내주세요",
        
        # 추가 요청
        "2의 10제곱을 계산하고, '결과는 ' 앞에 붙여서 표현해주세요"
    ]
    
    print("█" * 60)
    print("█  테스트 쿼리 실행")
    print("█" * 60)
    
    # 각 쿼리 실행
    for idx, query in enumerate(test_queries, 1):
        try:
            print(f"\n[테스트 {idx}/{len(test_queries)}]")
            
            # 고유한 세션 ID 생성 (각 쿼리마다)
            session_id = f"session_{uuid.uuid4().hex[:8]}"
            
            await call_agent_async(
                query=query,
                user_id="user1",
                session_id=session_id
            )
            
            # 쿼리 사이의 대기
            if idx < len(test_queries):
                print("\n⏳ 다음 쿼리 준비 중 (1초 대기)...")
                await asyncio.sleep(1)
        
        except Exception as e:
            print(f"❌ 오류 발생: {e}")
    
    print("\n" + "█" * 60)
    print("█  모든 테스트 완료!")
    print("█" * 60)
    print("\n✓ Root Client Agent가 정상적으로 종료되었습니다.\n")

# ===== 대화형 모드 =====
async def interactive_mode():
    """사용자 입력을 받아 대화형으로 진행"""
    print("\n")
    print("█" * 60)
    print("█  Google ADK A2A Protocol - Interactive Mode")
    print("█" * 60)
    print("\n✓ 준비 완료. '종료' 또는 'exit'를 입력하여 종료하세요.\n")
    
    await asyncio.sleep(2)
    
    session_id = f"session_{uuid.uuid4().hex[:8]}"
    
    while True:
        try:
            # 사용자 입력
            user_input = input("\n🔹 당신의 질문: ").strip()
            
            # 종료 조건
            if user_input.lower() in ['종료', 'exit', 'quit', '끝']:
                print("\n✓ 프로그램을 종료합니다.")
                break
            
            # 빈 입력 무시
            if not user_input:
                print("⚠️  질문을 입력해주세요.")
                continue
            
            # 에이전트 호출
            await call_agent_async(
                query=user_input,
                user_id="user1",
                session_id=session_id
            )
        
        except KeyboardInterrupt:
            print("\n\n✓ 프로그램이 종료되었습니다.")
            break
        except Exception as e:
            print(f"❌ 오류 발생: {e}")

# ===== 프로그램 시작점 =====
if __name__ == "__main__":
    import sys
    
    print("\n" + "=" * 60)
    print("Root Client Agent 시작")
    print("=" * 60)
    
    # 명령어 라인 인자 확인
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        # 대화형 모드
        try:
            asyncio.run(interactive_mode())
        except KeyboardInterrupt:
            print("\n\n프로그램이 종료되었습니다.")
    else:
        # 일반 테스트 모드
        try:
            asyncio.run(main())
        except KeyboardInterrupt:
            print("\n\n프로그램이 중단되었습니다.")
        except Exception as e:
            print(f"\n오류 발생: {e}")


# Custom Endpoint to A2A Server with python A2A Endpoint
# A2A Python SDK를 사용한 LLM Agent Endpoint 통합 가이드

## 개요

외부 LLM Agent Endpoint (예: `/run` endpoint)를 호출하는 A2A 서버를 만드는 방법을 설명합니다. A2A Client가 이 서버를 호출할 수 있게 됩니다.

## 아키텍처

```
┌─────────────┐                    ┌──────────────┐                 ┌─────────────────┐
│  A2A Client │ ────────────────→  │   A2A Server │ ───────────→  │  LLM Agent      │
│             │  A2A Protocol      │  (Your Code) │  HTTP/Async   │  Endpoint       │
│             │  (JSON-RPC)        │              │  Request      │  (/run)         │
└─────────────┘                    └──────────────┘                 └─────────────────┘
                                          ↓
                                   (Parse & Forward)
                                          ↓
                                  (Call LLM Endpoint)
                                          ↓
                                  (Format Response)
```

## 사전 요구사항

```bash
# 설치
pip install a2a-sdk
pip install fastapi uvicorn httpx
```

## 구현 방법

### 1단계: 기본 A2A 서버 구조

```python
# server.py
import os
import httpx
import json
from typing import Any
from uuid import uuid4

from a2a.server import A2AServer, AgentCard, AgentCapabilities, AgentSkill
from a2a.server.apps import A2AStarletteApplication
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import Message, TextContent, MessageRole

# LLM Agent endpoint 설정
LLM_AGENT_ENDPOINT = os.getenv("LLM_AGENT_URL", "http://localhost:8000")
```

### 2단계: A2AServer 상속하여 커스텀 에이전트 구현

```python
class LLMAgentServer(A2AServer):
    """
    외부 LLM Agent Endpoint를 호출하는 A2A 서버
    """
    
    def __init__(self, agent_card: AgentCard):
        super().__init__(agent_card=agent_card)
    
    async def handle_message(self, message: Message) -> Message:
        """
        들어오는 메시지를 처리하고 LLM 에이전트를 호출합니다.
        """
        try:
            # 사용자 메시지 추출
            if message.content.type == "text":
                user_text = message.content.text
            else:
                user_text = str(message.content)
            
            # 외부 LLM 에이전트 호출
            response_text = await self.call_llm_endpoint(user_text)
            
            # A2A 포맷으로 응답 반환
            return Message(
                content=TextContent(text=response_text),
                role=MessageRole.AGENT,
                parent_message_id=message.message_id,
                conversation_id=message.conversation_id
            )
        except Exception as e:
            error_message = f"Error processing message: {str(e)}"
            return Message(
                content=TextContent(text=error_message),
                role=MessageRole.AGENT,
                parent_message_id=message.message_id,
                conversation_id=message.conversation_id
            )
    
    async def call_llm_endpoint(self, input_text: str) -> str:
        """
        LLM 에이전트의 /run endpoint를 호출합니다.
        """
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {
                "input": input_text,
                "session_id": str(uuid4())
            }
            
            try:
                response = await client.post(
                    f"{LLM_AGENT_ENDPOINT}/run",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                
                result = response.json()
                
                # 응답 형식에 따라 조정 필요
                if isinstance(result, dict):
                    return result.get("output", str(result))
                else:
                    return str(result)
                    
            except httpx.HTTPError as e:
                raise Exception(f"LLM endpoint error: {str(e)}")
```

### 3단계: 에이전트 카드 및 스킬 정의

```python
def create_agent_card() -> AgentCard:
    """A2A 에이전트 카드 정의"""
    
    host = os.getenv("HOST", "127.0.0.1")
    port = os.getenv("PORT", 9999)
    agent_url = f"http://{host}:{port}/"
    
    # 에이전트 스킬 정의
    skill = AgentSkill(
        id="query_llm",
        name="Query LLM Agent",
        description="Query the external LLM agent endpoint for responses",
        tags=["llm", "query", "agent"],
        examples=[
            "What is the capital of France?",
            "Explain quantum computing",
            "Help me with Python"
        ]
    )
    
    # 에이전트 카드 생성
    agent_card = AgentCard(
        name="LLM Agent Server",
        description="A2A server that forwards requests to an external LLM agent endpoint",
        url=agent_url,
        version="1.0.0",
        defaultInputModes=["text"],
        defaultOutputModes=["text"],
        capabilities=AgentCapabilities(streaming=False),
        skills=[skill]
    )
    
    return agent_card
```

### 4단계: A2A 서버 실행

```python
def run_server():
    """A2A 서버 실행"""
    
    # 에이전트 카드 생성
    agent_card = create_agent_card()
    
    # 커스텀 에이전트 초기화
    agent = LLMAgentServer(agent_card=agent_card)
    
    # 요청 핸들러 및 작업 저장소 설정
    request_handler = DefaultRequestHandler(
        agent_executor=agent,
        task_store=InMemoryTaskStore()
    )
    
    # A2A Starlette 애플리케이션 생성
    server = A2AStarletteApplication(
        agent_card=agent_card,
        http_handler=request_handler
    )
    
    # 서버 시작
    import uvicorn
    
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 9999))
    
    print(f"🚀 A2A Server starting on http://{host}:{port}")
    print(f"📍 Agent Card: http://{host}:{port}/.well-known/agent-card.json")
    print(f"🔗 LLM Endpoint: {LLM_AGENT_ENDPOINT}")
    
    uvicorn.run(
        server.build(),
        host=host,
        port=port
    )

if __name__ == "__main__":
    run_server()
```

## 클라이언트 측 구현

### A2A 클라이언트로 서버 호출

```python
# client.py
import asyncio
import httpx
from uuid import uuid4

from a2a.client import A2AClient, A2ACardResolver
from a2a.types import (
    SendMessageRequest, 
    MessageSendParams,
    SendMessageResponse
)

async def test_a2a_server():
    """A2A 서버 테스트"""
    
    server_url = "http://localhost:9999"
    
    async with httpx.AsyncClient() as httpx_client:
        # 에이전트 카드 조회
        resolver = A2ACardResolver(
            httpx_client=httpx_client,
            base_url=server_url
        )
        agent_card = await resolver.get_agent_card()
        print(f"✅ Connected to: {agent_card.name}")
        
        # A2A 클라이언트 생성
        client = A2AClient(
            httpx_client=httpx_client,
            agent_card=agent_card
        )
        
        # 메시지 전송
        user_message = "What is machine learning?"
        
        send_message_payload = {
            "message": {
                "role": "user",
                "parts": [
                    {
                        "kind": "text",
                        "text": user_message
                    }
                ],
                "messageId": uuid4().hex
            }
        }
        
        request = SendMessageRequest(
            id=str(uuid4()),
            params=MessageSendParams(**send_message_payload)
        )
        
        # 요청 전송 및 응답 수신
        print(f"\n📤 Sending: {user_message}")
        response: SendMessageResponse = await client.send_message(request)
        
        print(f"📥 Response:")
        print(response.model_dump(mode="json", exclude_none=True))

# 실행
if __name__ == "__main__":
    asyncio.run(test_a2a_server())
```

## 고급 구현 예시

### 스트리밍 응답 지원

```python
class StreamingLLMAgentServer(A2AServer):
    """스트리밍을 지원하는 LLM 에이전트 서버"""
    
    async def handle_message(self, message: Message) -> Message:
        """스트리밍 응답 처리"""
        
        if message.content.type == "text":
            user_text = message.content.text
        else:
            user_text = str(message.content)
        
        # 스트리밍 응답 처리
        collected_response = ""
        
        async with httpx.AsyncClient(timeout=60.0) as client:
            payload = {
                "input": user_text,
                "stream": True,
                "session_id": str(uuid4())
            }
            
            async with client.stream(
                "POST",
                f"{LLM_AGENT_ENDPOINT}/run",
                json=payload
            ) as response:
                async for line in response.aiter_lines():
                    if line:
                        # 스트리밍 청크 처리
                        chunk = json.loads(line) if line.startswith("{") else line
                        collected_response += str(chunk)
        
        return Message(
            content=TextContent(text=collected_response),
            role=MessageRole.AGENT,
            parent_message_id=message.message_id,
            conversation_id=message.conversation_id
        )
```

### 캐싱 및 에러 처리

```python
from functools import lru_cache
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class RobustLLMAgentServer(A2AServer):
    """에러 처리와 재시도 로직을 포함한 서버"""
    
    MAX_RETRIES = 3
    TIMEOUT = 30.0
    
    async def call_llm_endpoint_with_retry(self, input_text: str) -> str:
        """재시도 로직을 포함한 LLM 호출"""
        
        for attempt in range(self.MAX_RETRIES):
            try:
                async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
                    payload = {
                        "input": input_text,
                        "session_id": str(uuid4())
                    }
                    
                    response = await client.post(
                        f"{LLM_AGENT_ENDPOINT}/run",
                        json=payload
                    )
                    response.raise_for_status()
                    
                    result = response.json()
                    logger.info(f"LLM request successful: {input_text[:50]}...")
                    
                    return result.get("output", str(result))
                    
            except httpx.TimeoutException:
                logger.warning(f"Timeout on attempt {attempt + 1}/{self.MAX_RETRIES}")
                if attempt == self.MAX_RETRIES - 1:
                    raise Exception("LLM endpoint timeout after multiple retries")
            except httpx.HTTPError as e:
                logger.error(f"HTTP error on attempt {attempt + 1}: {str(e)}")
                if attempt == self.MAX_RETRIES - 1:
                    raise Exception(f"LLM endpoint error after {self.MAX_RETRIES} retries")
            
            # 재시도 전 대기
            if attempt < self.MAX_RETRIES - 1:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
```

## 환경 설정

### .env 파일

```bash
# A2A 서버 설정
HOST=127.0.0.1
PORT=9999

# 외부 LLM 에이전트 엔드포인트
LLM_AGENT_URL=http://localhost:8000
```

### Docker Compose로 실행

```yaml
version: '3.8'

services:
  llm-agent:
    image: your-llm-agent:latest
    ports:
      - "8000:8000"
    environment:
      - PORT=8000

  a2a-server:
    build: .
    ports:
      - "9999:9999"
    environment:
      - HOST=0.0.0.0
      - PORT=9999
      - LLM_AGENT_URL=http://llm-agent:8000
    depends_on:
      - llm-agent
```

## 테스트 및 검증

### 에이전트 카드 확인

```bash
curl http://localhost:9999/.well-known/agent-card.json
```

### A2A 클라이언트 테스트

```bash
python client.py
```

### cURL로 직접 테스트

```bash
curl -X POST http://localhost:9999/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "1",
    "method": "sendMessage",
    "params": {
      "message": {
        "role": "user",
        "parts": [{"kind": "text", "text": "Hello"}],
        "messageId": "msg-123"
      }
    }
  }'
```

## 핵심 포인트

1. **`handle_message()` 메서드**: 들어오는 A2A 메시지를 처리합니다
2. **`call_llm_endpoint()`**: 외부 LLM 에이전트의 `/run` endpoint를 호출합니다
3. **비동기 처리**: `httpx.AsyncClient`를 사용하여 고성능을 유지합니다
4. **에러 처리**: 타임아웃, HTTP 에러 등을 적절히 처리합니다
5. **응답 변환**: LLM endpoint의 응답을 A2A 메시지 포맷으로 변환합니다

## 설명 자료

- **A2A 프로토콜 문서**: https://a2a-protocol.org
- **Python SDK 저장소**: https://github.com/a2aproject/a2a-python
- **샘플 코드**: https://github.com/a2aproject/a2a-samples

이 구조를 통해 A2A Client에서 A2A Server를 호출하고, A2A Server가 외부 LLM Agent Endpoint를 호출하는 완전한 통합이 가능합니다.

# how to use A2A js sdk
이제 A2A JS SDK를 사용하여 원격 엔드포인트를 호출하는 실제 예제를 만들어드리겠습니다.

## A2A JS SDK로 원격 Endpoint 호출 예제

### 1. 기본 클라이언트 예제 (Blocking 방식)

```typescript
import { A2AClient, SendMessageSuccessResponse } from "@a2a-js/sdk/client";
import { Message, MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

// 원격 에이전트 엔드포인트 호출
async function callRemoteAgent() {
  try {
    // 1. Agent Card URL을 통해 클라이언트 생성
    const client = await A2AClient.fromCardUrl(
      "http://remote-agent-server:4000/.well-known/agent-card.json"
    );

    // 2. 전송할 메시지 구성
    const messageParams: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "안녕하세요! 도움이 필요합니다." }],
        kind: "message",
      },
      configuration: {
        blocking: true, // 응답을 기다림
        acceptedOutputModes: ["text/plain"],
      },
    };

    // 3. 메시지 전송
    const response = await client.sendMessage(messageParams);

    // 4. 응답 처리
    if ("error" in response) {
      console.error("에러:", response.error.message);
    } else {
      const result = (response as SendMessageSuccessResponse).result as Message;
      console.log("원격 에이전트 응답:", result.parts[0].text);
    }
  } catch (error) {
    console.error("호출 중 오류:", error);
  }
}

await callRemoteAgent();
```

### 2. 스트리밍 방식 예제

```typescript
import { A2AClient } from "@a2a-js/sdk/client";
import { MessageSendParams } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

// 스트리밍으로 원격 에이전트 호출
async function streamRemoteAgent() {
  try {
    const client = await A2AClient.fromCardUrl(
      "http://remote-agent-server:4000/.well-known/agent-card.json"
    );

    const streamParams: MessageSendParams = {
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "긴 작업을 시작해주세요" }],
        kind: "message",
      },
      configuration: {
        blocking: false, // 스트리밍 모드
        acceptedOutputModes: ["text/plain"],
      },
    };

    console.log("스트리밍 시작...");
    const stream = client.sendMessageStream(streamParams);

    for await (const event of stream) {
      if (event.kind === "task") {
        console.log(`✓ 작업 생성됨: [${event.id}] 상태: ${event.status.state}`);
      } else if (event.kind === "status-update") {
        console.log(`📡 상태 업데이트: ${event.status.state}`);
        
        // 에이전트의 메시지 출력
        if (event.status.message?.parts[0]?.text) {
          console.log(`메시지: ${event.status.message.parts[0].text}`);
        }
      } else if (event.kind === "artifact-update") {
        console.log(`📎 아티팩트 수신: ${event.artifact.artifactId}`);
      }
    }

    console.log("--- 스트리밍 완료 ---");
  } catch (error) {
    console.error("스트리밍 중 오류:", error);
  }
}

await streamRemoteAgent();
```

### 3. Task 응답 처리 예제

```typescript
import { A2AClient, SendMessageSuccessResponse } from "@a2a-js/sdk/client";
import { Message, Task } from "@a2a-js/sdk";
import { v4 as uuidv4 } from "uuid";

// Task 기반 응답 처리
async function handleTaskResponse() {
  try {
    const client = await A2AClient.fromCardUrl(
      "http://remote-agent-server:4000/.well-known/agent-card.json"
    );

    const response = await client.sendMessage({
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "문서 분석을 시작해주세요" }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    });

    if ("error" in response) {
      console.error("에러:", response.error.message);
      return;
    }

    const result = (response as SendMessageSuccessResponse).result;

    // Task vs Message 구분
    if (result.kind === "task") {
      const task = result as Task;
      console.log(`작업 [${task.id}] 상태: ${task.status.state}`);

      // 아티팩트가 있으면 처리
      if (task.artifacts && task.artifacts.length > 0) {
        task.artifacts.forEach((artifact) => {
          console.log(`📎 아티팩트: ${artifact.name}`);
          console.log(`내용: ${artifact.parts[0].text}`);
        });
      }
    } else {
      const message = result as Message;
      console.log("직접 메시지:", message.parts[0].text);
    }
  } catch (error) {
    console.error("Task 처리 중 오류:", error);
  }
}

await handleTaskResponse();
```

### 4. Context 유지 예제 (상태 관리)

```typescript
import { A2AClient } from "@a2a-js/sdk/client";
import { v4 as uuidv4 } from "uuid";

// 같은 Context에서 여러 메시지 주고받기
async function multiTurnConversation() {
  try {
    const client = await A2AClient.fromCardUrl(
      "http://remote-agent-server:4000/.well-known/agent-card.json"
    );

    const contextId = uuidv4(); // 같은 대화 세션용
    let taskId: string | undefined;

    // 첫 번째 메시지
    console.log("=== 메시지 1 ===");
    const response1 = await client.sendMessage({
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "프로젝트에 대해 설명해주세요" }],
        kind: "message",
        contextId,
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    });

    if ("error" not in response1 && response1.result.kind === "task") {
      taskId = response1.result.id;
      console.log(`받은 Task ID: ${taskId}`);
    }

    // 두 번째 메시지 (같은 Context 유지, 이전 taskId 참조)
    console.log("\n=== 메시지 2 (follow-up) ===");
    const response2 = await client.sendMessage({
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "더 자세히 설명해주세요" }],
        kind: "message",
        contextId, // 같은 context 사용
        taskId, // 이전 작업 참조
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    });

    if ("error" in response2) {
      console.error("에러:", response2.error.message);
    } else {
      console.log("응답 수신");
    }
  } catch (error) {
    console.error("대화 중 오류:", error);
  }
}

await multiTurnConversation();
```

### 5. 타임아웃 및 커스텀 설정 예제

```typescript
import { A2AClient } from "@a2a-js/sdk/client";
import { v4 as uuidv4 } from "uuid";

// 타임아웃 설정이 있는 클라이언트
async function clientWithTimeout() {
  try {
    // 커스텀 fetch 함수로 타임아웃 설정 (5초)
    const fetchWithTimeout: typeof fetch = async (url, init) => {
      return fetch(url, {
        ...init,
        signal: AbortSignal.timeout(5000), // 5초 타임아웃
      });
    };

    const client = await A2AClient.fromCardUrl(
      "http://remote-agent-server:4000/.well-known/agent-card.json",
      { fetchImpl: fetchWithTimeout }
    );

    console.log "타임아웃이 설정된 클라이언트로 호출 중...";
    
    const response = await client.sendMessage({
      message: {
        messageId: uuidv4(),
        role: "user",
        parts: [{ kind: "text", text: "빠르게 응답해주세요" }],
        kind: "message",
      },
      configuration: {
        blocking: true,
        acceptedOutputModes: ["text/plain"],
      },
    });

    console.log("응답 수신:", response);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      console.error("요청 타임아웃 (5초 초과)");
    } else {
      console.error("오류:", error);
    }
  }
}

await clientWithTimeout();
```

### 주요 포인트

**A2AClient 사용 흐름:**
1. **Client 초기화**: `A2AClient.fromCardUrl()` 또는 생성자로 클라이언트 생성
2. **메시지 구성**: 원격 에이전트로 보낼 메시지 정의
3. **전송 방식 선택**: 
   - `blocking: true` → 응답 기다리기 (일반 호출)
   - `blocking: false` → 스트리밍 모드
4. **응답 처리**: Task 또는 Message 형태로 응답 받음

**중요 파라미터:**
- `contextId`: 같은 대화 세션 유지
- `taskId`: 이전 작업 추적
- `acceptedOutputModes`: 예상 응답 형식
- `blocking`: 응답 대기 여부

이러한 예제들을 활용하여 원격 A2A 엔드포인트를 효과적으로 호출할 수 있습니다.

# js google adk example with a2a
 TypeScript/JavaScript Client 구현

### 프로젝트 설정

```bash
npm init -y
npm install @google/adk axios
npm install --save-dev typescript ts-node @types/node
```

### TypeScript 설정 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

### Main Agent 구현 (`src/agent.ts`)

```typescript
import { Agent, LlmAgent } from "@google/adk";
import axios from "axios";

// RemoteA2aAgent를 시뮬레이트하는 클래스
class RemoteA2aAgent {
  private name: string;
  private description: string;
  private agentCardUrl: string;
  private baseUrl: string;

  constructor(
    name: string,
    description: string,
    agentCardUrl: string
  ) {
    this.name = name;
    this.description = description;
    this.agentCardUrl = agentCardUrl;
    // Agent card URL에서 base URL 추출
    this.baseUrl = agentCardUrl.split("/.well-known")[0];
  }

  async callRemoteAgent(message: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/a2a/${this.name}`,
        {
          id: `req-${Date.now()}`,
          jsonrpc: "2.0",
          method: "execute",
          params: {
            message: {
              messageId: `msg-${Date.now()}`,
              parts: [{ text: message }],
              role: "user"
            }
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error(`Error calling remote agent ${this.name}:`, error);
      throw error;
    }
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }
}

// 사용 예제
async function createMainAgent() {
  // 원격 에이전트 정의
  const weatherAgent = new RemoteA2aAgent(
    "weather_agent",
    "Provides weather information for Korean cities",
    "http://localhost:8001/a2a/weather_agent/.well-known/agent.json"
  );

  const restaurantAgent = new RemoteA2aAgent(
    "restaurant_agent",
    "Recommends restaurants in Korean cities",
    "http://localhost:8001/a2a/restaurant_agent/.well-known/agent.json"
  );

  // Local tool
  function getLocationInfo(location: string): string {
    const info = {
      "Seoul": "Capital of South Korea, population 10 million",
      "Busan": "Major port city in south, population 3.4 million",
      "Daegu": "Metropolitan city, known for textiles and electronics"
    };
    return info[location] || `Information about ${location}`;
  }

  // Main orchestrator agent
  const mainAgent = new LlmAgent({
    name: "trip_planner",
    model: "gemini-2.0-flash",
    description: "Trip planning assistant that coordinates weather and restaurant agents",
    instruction: `You are a helpful trip planning assistant. 
    You have access to weather and restaurant information agents.
    When asked about a trip:
    1. Provide location information
    2. Get weather information from the weather agent
    3. Get restaurant recommendations from the restaurant agent
    4. Synthesize all information into a helpful trip plan`,
    tools: [getLocationInfo],
    subAgents: [
      // Note: 실제 ADK-JS에서는 subAgents 배열에 RemoteA2aAgent를 직접 추가할 수 있어야 함
      // 현재는 에이전트 호출 로직을 수동으로 구현
    ]
  });

  return { mainAgent, weatherAgent, restaurantAgent };
}

// 테스트 함수
async function runExample() {
  console.log("=== ADK JS with A2A Server Example ===\n");

  try {
    const { mainAgent, weatherAgent, restaurantAgent } = await createMainAgent();

    // 원격 에이전트 호출 예제
    console.log("1. Calling Weather Agent:");
    const weatherResult = await weatherAgent.callRemoteAgent("What's the weather in Seoul?");
    console.log("Weather Result:", JSON.stringify(weatherResult, null, 2));

    console.log("\n2. Calling Restaurant Agent:");
    const restaurantResult = await restaurantAgent.callRemoteAgent(
      "Find Korean restaurants in Busan"
    );
    console.log("Restaurant Result:", JSON.stringify(restaurantResult, null, 2));

    console.log("\n3. Main Agent Information:");
    console.log(`- Name: ${mainAgent.name}`);
    console.log(`- Description: ${mainAgent.description}`);

  } catch (error) {
    console.error("Error in example:", error);
  }
}

// 실행
runExample();
```

---

## 3단계: 실행 방법

### 원격 서버 시작

```bash
# 터미널 1
cd a2a_example
adk api_server --a2a --port 8001 remote_a2a
```

### Client 실행

```bash
# 터미널 2
npm run ts-node src/agent.ts
```

### 또는 컴파일 후 실행

```bash
npm run build
node dist/agent.js
```

---

## 4단계: 실제 ADK-JS RemoteA2aAgent 사용 (향후)

ADK-JS가 Python ADK처럼 완전한 `RemoteA2aAgent` 지원을 하게 되면:

```typescript
import { RemoteA2aAgent, LlmAgent, Agent } from "@google/adk";

// 원격 에이전트 정의
const weatherAgent = new RemoteA2aAgent({
  name: "weather_agent",
  description: "Provides weather information",
  agentCard: "http://localhost:8001/a2a/weather_agent/.well-known/agent.json"
});

const restaurantAgent = new RemoteA2aAgent({
  name: "restaurant_agent",
  description: "Recommends restaurants",
  agentCard: "http://localhost:8001/a2a/restaurant_agent/.well-known/agent.json"
});

// 메인 에이전트에서 subagent로 사용
const mainAgent = new LlmAgent({
  name: "trip_planner",
  model: "gemini-2.0-flash",
  description: "Trip planning assistant",
  instruction: "You are a helpful trip planning assistant...",
  subAgents: [weatherAgent, restaurantAgent]  // RemoteA2aAgent를 직접 포함
});
```

---

## 핵심 개념

### 1. RemoteA2aAgent
- 원격 에이전트를 로컬 프록시로 표현
- A2A 프로토콜을 통해 HTTP 통신
- Agent card URL로 원격 에이전트 발견

### 2. Agent Card
- 에이전트의 메타데이터와 기능 설명
- `/.well-known/agent.json` 엔드포인트에서 제공
- 다른 에이전트가 기능을 발견하고 호출할 때 사용

### 3. Sub-Agents
- 메인 에이전트가 특정 작업을 위임하는 전문 에이전트들
- 로컬 또는 원격 모두 가능
- LLM이 자동으로 적절한 sub-agent 선택

### 4. A2A Protocol
- HTTP/JSON 기반의 에이전트 간 통신 표준
- JSON-RPC 2.0 사용
- 실시간 스트리밍 지원

---

## 장점

1. **모듈화**: 각 에이전트를 독립적으로 개발 및 배포 가능
2. **확장성**: 새로운 에이전트 쉽게 추가 가능
3. **재사용성**: 다른 프로젝트에서 같은 에이전트 재사용
4. **분산 처리**: 여러 서버에서 병렬 처리 가능
5. **표준화**: A2A 프로토콜로 상호 운용성 보장

---

## 문제 해결

### 연결 실패
```bash
# A2A 서버가 실행 중인지 확인
curl http://localhost:8001/a2a/weather_agent/.well-known/agent.json
```

### CORS 문제
A2A 서버가 CORS 헤더를 제공하는지 확인

### 타임아웃
agent card 또는 timeout 설정 확인


#Agent card.json 예시 
{
  "name": "Recipe Agent",
  "description": "An intelligent agent that helps with recipe discovery and cooking instructions",
  "url": "https://recipe-agent.example.com",
  "provider": {
    "organization": "Culinary AI Inc.",
    "url": "https://culinary-ai.example.com"
  },
  "version": "1.0.0",
  "documentationUrl": "https://recipe-agent.example.com/docs",
  "capabilities": {
    "streaming": true,
    "pushNotifications": false,
    "stateTransitionHistory": true
  },
  "authentication": {
    "schemes": ["Bearer"],
    "credentials": "Optional-API-Key"
  },
  "defaultInputModes": [
    "text/plain",
    "application/json"
  ],
  "defaultOutputModes": [
    "text/plain",
    "application/json"
  ],
  "skills": [
    {
      "id": "search_recipes",
      "name": "Recipe Search",
      "description": "Search for recipes by ingredients, cuisine type, or dietary requirements",
      "tags": [
        "cooking",
        "search",
        "recipes"
      ],
      "examples": [
        "Find recipes with chicken and garlic",
        "Show me vegetarian pasta recipes",
        "What can I make with eggs and bread?"
      ],
      "inputModes": [
        "text/plain",
        "application/json"
      ],
      "outputModes": [
        "application/json"
      ]
    },
    {
      "id": "get_recipe_details",
      "name": "Recipe Details",
      "description": "Get detailed information about a specific recipe including ingredients, steps, and nutritional information",
      "tags": [
        "cooking",
        "details",
        "nutrition"
      ],
      "examples": [
        "Give me details for the chicken parmesan recipe",
        "Show nutritional info for this lasagna recipe"
      ],
      "inputModes": [
        "application/json"
      ],
      "outputModes": [
        "application/json"
      ]
    },
    {
      "id": "generate_shopping_list",
      "name": "Shopping List Generator",
      "description": "Generate a shopping list based on selected recipes",
      "tags": [
        "shopping",
        "planning"
      ],
      "examples": [
        "Create a shopping list for 4 pasta recipes",
        "Generate a meal plan shopping list for a week"
      ],
      "inputModes": [
        "application/json"
      ],
      "outputModes": [
        "application/json",
        "text/plain"
      ]
    }
  ]
}

