import asyncio
import os
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool

# Set Gemini API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyA88_jZGuybTQ4NYnVFQXemfLSt1utHAkE"

# ===== Text processing functions =====
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

# ===== Create tools =====
uppercase_tool = FunctionTool(uppercase_text)
lowercase_tool = FunctionTool(lowercase_text)
reverse_tool = FunctionTool(reverse_text)
count_words_tool = FunctionTool(count_words)
count_chars_tool = FunctionTool(count_chars)
replace_tool = FunctionTool(replace_text)

# ===== Create Text Agent =====
text_agent = Agent(
    model="gemini-2.0-flash-exp",
    name="text_agent",
    description="텍스트 처리를 수행하는 에이전트",
    instruction="""당신은 전문 텍스트 처리 에이전트입니다.

사용자의 텍스트 처리 요청에 대해:
1. 요청된 작업 유형을 파악합니다 (변환, 분석, 대체 등)
2. 적절한 도구를 사용하여 처리합니다
3. 원본 텍스트와 처리된 결과를 명확하게 표시합니다
4. 필요시 통계 정보를 포함합니다

항상 정확하고 명확한 결과를 제공하세요.""",
    tools=[uppercase_tool, lowercase_tool, reverse_tool,
           count_words_tool, count_chars_tool, replace_tool]
)

# ===== Start A2A server =====
async def start_text_agent():
    """Start Text Agent as A2A server"""
    print("=" * 50)
    print("Text Agent A2A Server Starting...")
    print("=" * 50)

    # Convert Agent to A2A server
    a2a_app = to_a2a(
        text_agent,
        port=8012
    )

    print("\n✓ Text Agent initialized")
    print("✓ Port: 8012")
    print("✓ Agent Card endpoint: http://localhost:8012/.well-known/agent.json")
    print("✓ Task endpoint: http://localhost:8012/tasks/send")
    print("\nStarting agent...\n")

    # Run with Uvicorn
    import uvicorn
    config = uvicorn.Config(
        app=a2a_app,
        host="0.0.0.0",
        port=8012,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(start_text_agent())
    except KeyboardInterrupt:
        print("\n\nText Agent server stopped.")
