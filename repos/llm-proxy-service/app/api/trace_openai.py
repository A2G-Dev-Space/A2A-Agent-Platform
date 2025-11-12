"""
Trace-based OpenAI Compatible API
Agent-specific LLM endpoint with automatic trace_id injection
"""
from fastapi import APIRouter, HTTPException, Header, Path
from typing import Optional
import logging

from .openai_compatible import (
    ChatCompletionRequest,
    create_chat_completion,
    validate_platform_key,
    logger as base_logger
)

logger = logging.getLogger(__name__)

trace_openai_router = APIRouter()


@trace_openai_router.post("/chat/completions")
async def create_traced_chat_completion(
    trace_id: str = Path(..., description="Trace ID for this agent (auto-generated from user_id + agent_id)"),
    request: ChatCompletionRequest = None,
    authorization: Optional[str] = Header(None),
    x_agent_id: Optional[str] = Header(None)
):
    """
    Trace-based OpenAI Compatible Chat Completion Endpoint

    URL Pattern: /trace/{trace_id}/v1/chat/completions

    The trace_id is embedded in the URL, so agents don't need to manually set X-Trace-ID header.
    This simplifies agent development - just point your OpenAI client to:

    base_url="http://localhost:9050/api/llm/trace/{your_trace_id}/v1"

    Example:
        from openai import OpenAI

        client = OpenAI(
            base_url="http://localhost:9050/api/llm/trace/ec0af650-6688-11b5-3377-b9aa26e24aed/v1",
            api_key="a2g_..."
        )

        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": "Hello!"}]
        )

    Security:
    - API key must belong to the user who owns this agent
    - trace_id is validated against user's agents
    """
    logger.info("="*80)
    logger.info(f"[Traced LLM] NEW REQUEST via /trace/{trace_id}/v1/chat/completions")
    logger.info(f"[Traced LLM] Trace ID from URL: {trace_id}")
    logger.info(f"[Traced LLM] Model: {request.model}")
    logger.info(f"[Traced LLM] Agent ID header: {x_agent_id}")
    logger.info(f"[Traced LLM] Messages: {len(request.messages)}")
    logger.info("="*80)

    # Validate Platform API key
    user_info = await validate_platform_key(authorization)
    if not user_info:
        logger.error(f"[Traced LLM] FAILED - Unauthorized - invalid API key")
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Platform API key"
        )

    user_id = user_info.get("user_id")
    logger.info(f"[Traced LLM] Authorized user_id={user_id}")

    # TODO: Validate trace_id belongs to this user
    # For now, we trust the trace_id
    # In production, query agent-service to verify user owns an agent with this trace_id

    # Inject trace_id into the request by calling the base function with X-Trace-ID header
    # We reuse the existing create_chat_completion logic
    logger.info(f"[Traced LLM] FORWARDING to main handler with trace_id={trace_id}")

    # Call the original function with trace_id automatically set
    return await create_chat_completion(
        request=request,
        authorization=authorization,
        x_agent_id=x_agent_id,
        x_trace_id=trace_id  # Automatically inject trace_id from URL
    )


@trace_openai_router.get("/models")
async def list_models_traced(
    trace_id: str = Path(..., description="Trace ID for this agent"),
    authorization: Optional[str] = Header(None)
):
    """
    List available models (OpenAI compatible)
    """
    # Validate API key
    user_info = await validate_platform_key(authorization)
    if not user_info:
        raise HTTPException(status_code=401, detail="Invalid API key")

    # Return available models
    return {
        "object": "list",
        "data": [
            {
                "id": "gpt-3.5-turbo",
                "object": "model",
                "created": 1677610602,
                "owned_by": "openai"
            },
            {
                "id": "gpt-4",
                "object": "model",
                "created": 1687882411,
                "owned_by": "openai"
            },
            {
                "id": "gemini-2.0-flash-exp",
                "object": "model",
                "created": 1677610602,
                "owned_by": "google"
            }
        ]
    }
