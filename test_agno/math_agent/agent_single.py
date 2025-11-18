"""
Agno 다중 에이전트 시스템 - Math Calculation Platform
Platform LLM Proxy를 사용한 Team + Agent 아키텍처

구조:
- Math Team (math_team): 최상위 팀, 모든 요청 분석 및 위임
- Agent 1 (basic_calculator): 기본 산술 연산 (더하기, 빼기)
- Agent 2 (advanced_calculator): 고급 계산 (곱하기, 나누기, 거듭제곱)

특징:
- 모든 에이전트는 반드시 Tool 또는 Agent Transfer를 사용하도록 명시
- A2A 프로토콜을 통해 모든 Agent 노출
- Platform LLM Proxy (OpenAI Compatible) 활용
- CORS 미들웨어로 다중 프론트엔드 지원
"""

import os
from typing import Union

from agno.agent import Agent
from agno.team import Team
from agno.os import AgentOS
from agno.models.openai.like import OpenAILike
from fastapi.middleware.cors import CORSMiddleware


# ======================== Platform Configuration ========================
# Use trace-specific endpoint for proper agent tracking
# Format: http://localhost:9050/api/llm/trace/{trace_id}/v1
# This enables:
# - Agent identification via trace_id lookup
# - Token usage tracking by agent
# - Trace events in Workbench UI
PLATFORM_LLM_ENDPOINT = "http://localhost:9050/api/llm/trace/999c92a6-9468-4662-885c-fed69de0d95b/v1"
PLATFORM_API_KEY = os.getenv("PLATFORM_API_KEY", "a2g_75a669be0d569905e08cf51b53ff3f8723a0027a6db653706a0a6dd8f07f5490")

print("=" * 70)
print("Math Calculation Multi-Agent System Configuration (Agno)")
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
    print(f"\n[Tool Call: add] {a} + {b} = {result}\n")
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
    print(f"\n[Tool Call: subtract] {a} - {b} = {result}\n")
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
    print(f"\n[Tool Call: multiply] {a} * {b} = {result}\n")
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
    print(f"\n[Tool Call: divide] {a} / {b} = {result}\n")
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
    print(f"\n[Tool Call: power] {base} ** {exponent} = {result}\n")
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
    print(f"\n[Tool Call: square_root] √{number} = {result}\n")
    return {
        "operation": "square_root",
        "number": number,
        "result": result
    }


# ======================== Create LLM Model Instance ========================
def create_platform_llm(model_name: str = "qwen/qwen3-14b") -> OpenAILike:
    """
    Platform LLM Proxy를 사용하는 OpenAILike 인스턴스를 생성합니다.

    Args:
        model_name: 사용할 모델명

    Returns:
        OpenAILike 인스턴스
    """
    return OpenAILike(
        id=model_name,
        api_key=PLATFORM_API_KEY,
        base_url=PLATFORM_LLM_ENDPOINT,
    )


# ======================== Create Agents ========================

# Agent 1: Basic Calculator
# 기본 산술 연산만 수행 (더하기, 빼기)
basic_calculator = Agent(
    name="basic_calculator",
    role="기본 산술 연산 전문가",
    description="기본 산술 연산(더하기, 빼기)을 수행하는 에이전트",
    model=create_platform_llm(),
    tools=[add, subtract],
    instructions="""당신은 기본 산술 계산을 담당하는 전문 에이전트입니다.

당신의 책임:
1. 더하기와 빼기 연산만 수행
2. 복잡한 계산이 필요하면 반드시 advanced_calculator 에이전트로 위임
3. 사용자의 요청을 분석하여 자신이 처리할 수 있는지 판단

중요한 지침:
- 반드시 add 또는 subtract 도구를 사용하세요
- 곱하기, 나누기, 거듭제곱이 필요하면 반드시 transfer_to_agent를 사용하여 advanced_calculator로 위임하세요
- 스스로 계산하지 말고 항상 도구를 사용하세요""",
    add_history_to_context=True,
    markdown=True,
)


# Agent 2: Advanced Calculator
# 곱하기, 나누기, 거듭제곱, 제곱근 수행
advanced_calculator = Agent(
    name="advanced_calculator",
    role="고급 산술 연산 전문가",
    description="고급 산술 연산(곱하기, 나누기, 거듭제곱, 제곱근)을 수행하는 에이전트",
    model=create_platform_llm(),
    tools=[multiply, divide, power, square_root],
    instructions="""당신은 고급 산술 계산을 담당하는 전문 에이전트입니다.

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
    add_history_to_context=True,
    markdown=True,
)


# ======================== Create Math Team ========================

# Math Team: 최상위 팀
# 모든 요청을 분석하고 적절한 Agent로 위임
math_team = Team(
    name="math_team",
    members=[basic_calculator, advanced_calculator],
    model=create_platform_llm(),
    instructions="""당신은 수학 계산 플랫폼의 마스터 오케스트레이터입니다.

당신의 책임:
1. 사용자의 수학 계산 요청을 받습니다
2. 요청 유형을 분석합니다:
   - 더하기, 빼기만 필요 → basic_calculator로 위임
   - 곱하기, 나누기, 거듭제곱, 제곱근 필요 → advanced_calculator로 위임
   - 복합 계산 → 적절한 에이전트로 순차 위임
3. 최종 결과를 사용자에게 제시합니다

중요한 지침:
- 반드시 팀원(basic_calculator, advanced_calculator)에게 작업을 위임하세요
- 직접 계산하지 마세요
- 모든 계산 요청을 반드시 팀원에게 위임하세요
- 사용자의 의도를 정확히 파악한 후 올바른 에이전트를 선택하세요
- 계산 과정을 명확하게 설명하고 최종 답을 강조하세요

팀원 설명:
- basic_calculator: 더하기와 빼기만 처리
- advanced_calculator: 곱하기, 나누기, 거듭제곱, 제곱근 처리

요청받은 계산을 분석하고 적절한 팀원으로 위임하세요.""",
)


# ======================== Create AgentOS and Expose via A2A ========================

# AgentOS 생성 및 Math Team 등록
agent_os = AgentOS(
    agents=[basic_calculator,advanced_calculator],
    a2a_interface=True,  # A2A 프로토콜 활성화
)

# FastAPI 앱 가져오기
app = agent_os.get_app()

# CORS 미들웨어 추가
app.add_middleware(
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


# ======================== Main Entry Point ========================

if __name__ == "__main__":
    print("\n" + "=" * 70)
    print("Exposing Math Team via AgentOS A2A...")
    print("=" * 70)
    print("✓ Math Team initialized")
    print(f"✓ Platform LLM Proxy: {PLATFORM_LLM_ENDPOINT}")
    print("✓ Port: 6020")
    print("✓ Agent Card: http://localhost:6020/.well-known/agent.json")
    print("\n🚀 Math Team ready for connections!")
    print("=" * 70)

    # AgentOS 서버 시작
    agent_os.serve(app="math_agent.agent_single:app", host="0.0.0.0", port=6030)
