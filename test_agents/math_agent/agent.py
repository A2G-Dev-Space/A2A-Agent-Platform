"""
Math Agent using Platform LLM Proxy
Demonstrates how to use Platform's OpenAI Compatible endpoint for trace debugging
"""
import asyncio
import os
from google.adk.agents.llm_agent import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request

# Platform Configuration
# User gets these from Platform:
# 1. LLM Proxy endpoint: http://localhost:8006/v1
# 2. API Key: Generated from Platform Admin page
PLATFORM_LLM_ENDPOINT = os.getenv("PLATFORM_LLM_ENDPOINT", "http://localhost:8006/v1")
PLATFORM_API_KEY = os.getenv("PLATFORM_API_KEY", "test-user-api-key")
AGENT_ID = os.getenv("AGENT_ID", "math-agent")

print("=" * 60)
print("Math Agent Configuration")
print("=" * 60)
print(f"Platform LLM Endpoint: {PLATFORM_LLM_ENDPOINT}")
print(f"Platform API Key: {PLATFORM_API_KEY[:20]}...")
print(f"Agent ID: {AGENT_ID}")
print("=" * 60)

# ===== Math Tool Functions =====
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

# ===== Create Tools =====
add_tool = FunctionTool(add)
subtract_tool = FunctionTool(subtract)
multiply_tool = FunctionTool(multiply)
divide_tool = FunctionTool(divide)
power_tool = FunctionTool(power)

# ===== Create Math Agent using Platform LLM Proxy =====
math_agent = LlmAgent(
    model=LiteLlm(
        # Use hosted_vllm provider for custom endpoints
        # LiteLLM will append /chat/completions automatically
        model="hosted_vllm/gemini-2.0-flash-exp",
        api_base=PLATFORM_LLM_ENDPOINT,
        api_key=PLATFORM_API_KEY,
        # Disable streaming for internal LLM calls (UI->Agent uses A2A streaming)
        stream=False,
        # Send Agent ID in headers for trace routing
        extra_headers={
            "X-Agent-ID": AGENT_ID
        }
    ),
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

# ===== Start A2A Server =====
async def start_math_agent():
    """Start Math Agent as A2A server"""
    print("\n" + "=" * 60)
    print("Starting Math Agent A2A Server...")
    print("=" * 60)

    # Convert Agent to A2A server
    a2a_app = to_a2a(
        math_agent,
        port=8011
    )

    # Add trace_id capture middleware
    @a2a_app.middleware("http")
    async def trace_middleware(request: Request, call_next):
        # Extract X-Trace-Id from request headers
        trace_id = request.headers.get("x-trace-id")
        if trace_id:
            # Dynamically update LiteLLM extra_headers to forward trace_id
            if hasattr(math_agent.model, 'extra_headers'):
                math_agent.model.extra_headers["X-Trace-Id"] = trace_id
                print(f"[Trace Middleware] Forwarding trace_id to LLM Proxy: {trace_id}")

        response = await call_next(request)
        return response

    # Add CORS middleware
    a2a_app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:9060",  # Frontend dev server
            "http://localhost:9050",  # API Gateway
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    print("\n✓ Math Agent initialized")
    print(f"✓ Using Platform LLM Proxy: {PLATFORM_LLM_ENDPOINT}")
    print("✓ Port: 8011")
    print("✓ CORS enabled for frontend origins")
    print("✓ Agent Card: http://localhost:8011/.well-known/agent.json")
    print("\n🚀 Agent ready for connections!")
    print("=" * 60)

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
        print("\n\n✓ Math Agent server stopped.")
