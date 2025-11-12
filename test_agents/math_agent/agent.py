"""
Google ADK 다중 에이전트 시스템 - Math Calculation Platform
Platform LLM Proxy를 사용한 Main Agent + Sub-Agent 아키텍처

구조:
- Main Agent (main_orchestrator): 최상위 에이전트, 모든 요청 분석 및 위임
- Sub-Agent 1 (basic_calculator): 기본 산술 연산 (더하기, 빼기)
- Sub-Agent 2 (advanced_calculator): 고급 계산 (곱하기, 나누기, 거듭제곱)

특징:
- 모든 에이전트는 반드시 Tool 또는 Agent Transfer를 사용하도록 명시
- A2A 프로토콜을 통해 모든 Sub-Agent 노출
- Platform LLM Proxy (OpenAI Compatible) 활용
- CORS 미들웨어로 다중 프론트엔드 지원
"""

import asyncio
import os
from typing import Optional

from google.adk.agents.llm_agent import LlmAgent
from google.adk.models.lite_llm import LiteLlm
from google.adk.a2a.utils.agent_to_a2a import to_a2a
from google.adk.tools.function_tool import FunctionTool
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
import uvicorn


# ======================== Platform Configuration ========================
PLATFORM_LLM_ENDPOINT = os.getenv("PLATFORM_LLM_ENDPOINT", "http://localhost:8006/v1")
PLATFORM_API_KEY = os.getenv("PLATFORM_API_KEY", "test-user-api-key")

print("=" * 70)
print("Math Calculation Multi-Agent System Configuration")
print("=" * 70)
print(f"Platform LLM Endpoint: {PLATFORM_LLM_ENDPOINT}")
print(f"Platform API Key: {PLATFORM_API_KEY[:20]}...")
print("=" * 70)


# ======================== Basic Calculator Functions ========================
"""
Basic Calculator Agent가 사용할 수 있는 도구들
더하기와 빼기 연산만 수행
"""

def add(a: float, b: float) -> dict:
    """
    두 수를 더합니다.
    
    Args:
        a: 첫 번째 수
        b: 두 번째 수
    
    Returns:
        결과를 포함한 딕셔너리
    """
    result = a + b
    return {
        "operation": "addition",
        "operand_a": a,
        "operand_b": b,
        "result": result
    }


def subtract(a: float, b: float) -> dict:
    """
    두 수를 뺍니다.
    
    Args:
        a: 첫 번째 수
        b: 두 번째 수
    
    Returns:
        결과를 포함한 딕셔너리
    """
    result = a - b
    return {
        "operation": "subtraction",
        "operand_a": a,
        "operand_b": b,
        "result": result
    }


# ======================== Advanced Calculator Functions ========================
"""
Advanced Calculator Agent가 사용할 수 있는 도구들
곱하기, 나누기, 거듭제곱 연산 수행
"""

def multiply(a: float, b: float) -> dict:
    """
    두 수를 곱합니다.
    
    Args:
        a: 첫 번째 수
        b: 두 번째 수
    
    Returns:
        결과를 포함한 딕셔너리
    """
    result = a * b
    return {
        "operation": "multiplication",
        "operand_a": a,
        "operand_b": b,
        "result": result
    }


def divide(a: float, b: float) -> dict:
    """
    두 수를 나눕니다.
    
    Args:
        a: 첫 번째 수
        b: 두 번째 수
    
    Returns:
        결과를 포함한 딕셔너리
        
    Raises:
        0으로 나눌 수 없습니다.
    """
    if b == 0:
        return {
            "operation": "division",
            "operand_a": a,
            "operand_b": b,
            "error": "0으로 나눌 수 없습니다",
            "result": None
        }
    result = a / b
    return {
        "operation": "division",
        "operand_a": a,
        "operand_b": b,
        "result": result
    }


def power(base: float, exponent: float) -> dict:
    """
    거듭제곱을 계산합니다.
    
    Args:
        base: 밑
        exponent: 지수
    
    Returns:
        결과를 포함한 딕셔너리
    """
    result = base ** exponent
    return {
        "operation": "power",
        "base": base,
        "exponent": exponent,
        "result": result
    }


def square_root(number: float) -> dict:
    """
    제곱근을 계산합니다.
    
    Args:
        number: 제곱근을 구할 수
    
    Returns:
        결과를 포함한 딕셔너리
    """
    if number < 0:
        return {
            "operation": "square_root",
            "number": number,
            "error": "음수의 제곱근은 계산할 수 없습니다",
            "result": None
        }
    result = number ** 0.5
    return {
        "operation": "square_root",
        "number": number,
        "result": result
    }


# ======================== Create Tool Instances ========================
# Basic Calculator 도구들
add_tool = FunctionTool(add)
subtract_tool = FunctionTool(subtract)

# Advanced Calculator 도구들
multiply_tool = FunctionTool(multiply)
divide_tool = FunctionTool(divide)
power_tool = FunctionTool(power)
square_root_tool = FunctionTool(square_root)


# ======================== Create LLM Model Instance ========================
def create_platform_llm(model_name: str = "hosted_vllm/openai/gpt-oss-20b") -> LiteLlm:
    """
    Platform LLM Proxy를 사용하는 LiteLLM 인스턴스를 생성합니다.
    
    Args:
        model_name: 사용할 모델명
    
    Returns:
        LiteLlm 인스턴스
    """
    return LiteLlm(
        model=model_name,
        api_base=PLATFORM_LLM_ENDPOINT,
        api_key=PLATFORM_API_KEY,
    )


# ======================== Create Sub-Agents ========================

# Sub-Agent 1: Basic Calculator
# 기본 산술 연산만 수행 (더하기, 빼기)
basic_calculator = LlmAgent(
    model=create_platform_llm(),
    name="basic_calculator",
    description="기본 산술 연산(더하기, 빼기)을 수행하는 에이전트",
    instruction="""당신은 기본 산술 계산을 담당하는 전문 에이전트입니다.

당신의 책임:
1. 더하기와 빼기 연산만 수행
2. 복잡한 계산이 필요하면 반드시 advanced_calculator 에이전트로 위임
3. 사용자의 요청을 분석하여 자신이 처리할 수 있는지 판단

중요한 지침:
- 반드시 add 또는 subtract 도구를 사용하세요
- 곱하기, 나누기, 거듭제곱이 필요하면 반드시 transfer_to_agent를 사용하여 advanced_calculator로 위임하세요
- 스스로 계산하지 말고 항상 도구를 사용하세요""",
    tools=[add_tool, subtract_tool]
)


# Sub-Agent 2: Advanced Calculator
# 곱하기, 나누기, 거듭제곱, 제곱근 수행
advanced_calculator = LlmAgent(
    model=create_platform_llm(),
    name="advanced_calculator",
    description="고급 산술 연산(곱하기, 나누기, 거듭제곱, 제곱근)을 수행하는 에이전트",
    instruction="""당신은 고급 산술 계산을 담당하는 전문 에이전트입니다.

당신의 책임:
1. 곱하기, 나누기, 거듭제곱, 제곱근 연산 수행
2. 간단한 더하기/빼기만 필요하면 basic_calculator 에이전트로 위임 가능
3. 복잡한 계산 결과를 명확하게 설명

중요한 지침:
- 반드시 multiply, divide, power, square_root 도구를 사용하세요
- 스스로 계산하지 말고 항상 도구를 사용하세요
- 간단한 덧셈/뺄셈만 필요한 경우 basic_calculator로 위임할 수 있습니다
- 모든 계산 과정과 결과를 단계별로 설명하세요
- 오류가 발생하면 명확하게 보고하세요""",
    tools=[multiply_tool, divide_tool, power_tool, square_root_tool]
)


# ======================== Create Main Orchestrator Agent ========================

# Main Agent: 최상위 오케스트레이터
# 모든 요청을 분석하고 적절한 Sub-Agent로 위임
main_orchestrator = LlmAgent(
    model=create_platform_llm(),
    name="main_orchestrator",
    description="수학 계산 요청을 분석하고 적절한 에이전트에게 위임하는 마스터 오케스트레이터",
    instruction="""당신은 수학 계산 플랫폼의 마스터 오케스트레이터 에이전트입니다.

당신의 책임:
1. 사용자의 수학 계산 요청을 받습니다
2. 요청 유형을 분석합니다:
   - 더하기, 빼기만 필요 → basic_calculator로 위임
   - 곱하기, 나누기, 거듭제곱, 제곱근 필요 → advanced_calculator로 위임
   - 복합 계산 → 적절한 에이전트로 순차 위임
3. 최종 결과를 사용자에게 제시합니다

중요한 지침:
- 반드시 transfer_to_agent를 사용하여 작업을 위임하세요
- 직접 계산하지 마세요
- 모든 계산 요청을 반드시 Sub-Agent에게 위임하세요
- 사용자의 의도를 정확히 파악한 후 올바른 에이전트를 선택하세요
- 계산 과정을 명확하게 설명하고 최종 답을 강조하세요

Sub-Agent 설명:
- basic_calculator: 더하기와 빼기만 처리
- advanced_calculator: 곱하기, 나누기, 거듭제곱, 제곱근 처리

요청받은 계산을 분석하고 transfer_to_agent 함수를 호출하여 적절한 에이전트로 위임하세요.""",
    sub_agents=[basic_calculator, advanced_calculator]
)


async def expose_main_orchestrator():
    """Main Orchestrator를 A2A 서버로 노출합니다."""
    print("\n" + "=" * 70)
    print("Exposing Main Orchestrator Agent via A2A...")
    print("=" * 70)
    
    a2a_app = to_a2a(main_orchestrator, port=8010)
    
    # Add CORS middleware
    a2a_app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:9060",  # Frontend dev server
            "http://localhost:9050",  # API Gateway
            "*"  # Development only
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    print("\n✓ Main Orchestrator Agent initialized")
    print(f"✓ Platform LLM Proxy: {PLATFORM_LLM_ENDPOINT}")
    print("✓ Port: 8010")
    print("✓ Agent Card: http://localhost:8010/.well-known/agent.json")
    print("\n🚀 Main Orchestrator Agent ready for connections!")
    print("=" * 70)
    
    config = uvicorn.Config(
        app=a2a_app,
        host="0.0.0.0",
        port=8010,
        log_level="info"
    )
    server = uvicorn.Server(config)
    await server.serve()


# ======================== Main Entry Point ========================

if __name__ == "__main__":
    asyncio.run(expose_main_orchestrator())