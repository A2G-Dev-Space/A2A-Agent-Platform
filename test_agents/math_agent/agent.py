import asyncio
import os
from google.adk.agents.llm_agent import Agent
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool

# Set Gemini API key
os.environ["GOOGLE_API_KEY"] = "AIzaSyA88_jZGuybTQ4NYnVFQXemfLSt1utHAkE"

# ===== Math functions =====
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

# ===== Create tools =====
add_tool = FunctionTool(add)
subtract_tool = FunctionTool(subtract)
multiply_tool = FunctionTool(multiply)
divide_tool = FunctionTool(divide)
power_tool = FunctionTool(power)

# ===== Create Math Agent =====
math_agent = Agent(
    model="gemini-2.0-flash-exp",
    name="math_agent",
    description="수학 계산을 수행하는 에이전트",
    instruction="""당신은 전문 수학 계산 에이전트입니다.

사용자의 수학 계산 요청에 대해:
1. 요청된 연산 유형을 파악합니다
2. 적절한 도구를 사용하여 계산합니다
3. 계산 과정과 최종 결과를 명확하게 설명합니다
4. 필요시 단위나 형식을 명시합니다

항상 논리적이고 정확한 계산을 제공하세요.""",
    tools=[add_tool, subtract_tool, multiply_tool, divide_tool, power_tool]
)

# ===== Start A2A server =====
async def start_math_agent():
    """Start Math Agent as A2A server"""
    print("=" * 50)
    print("Math Agent A2A Server Starting...")
    print("=" * 50)

    # Convert Agent to A2A server
    a2a_app = to_a2a(
        math_agent,
        port=8011
    )

    print("\n✓ Math Agent initialized")
    print("✓ Port: 8011")
    print("✓ Agent Card endpoint: http://localhost:8011/.well-known/agent.json")
    print("✓ Task endpoint: http://localhost:8011/tasks/send")
    print("\nStarting agent...\n")

    # Run with Uvicorn
    import uvicorn
    config = uvicorn.Config(
        app=a2a_app,
        host="0.0.0.0",
        port=8011,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()

if __name__ == "__main__":
    try:
        asyncio.run(start_math_agent())
    except KeyboardInterrupt:
        print("\n\nMath Agent server stopped.")
