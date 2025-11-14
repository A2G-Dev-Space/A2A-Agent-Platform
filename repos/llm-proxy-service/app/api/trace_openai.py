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
    authorization: Optional[str] = Header(None)
):
    """
    Trace-based OpenAI Compatible Chat Completion Endpoint

    URL Pattern: /trace/{trace_id}/v1/chat/completions

    The trace_id is embedded in the URL - agents don't need any headers except API key!
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

    How it works:
    1. Workbench generates deterministic trace_id = MD5(user_id + agent_id)
    2. Workbench updates agent.trace_id in Agent Service
    3. User uses this URL in their agent code
    4. LLM proxy automatically looks up agent_id from trace_id
    5. Token usage tracked by agent_id
    6. Trace events appear in Workbench trace panel
    """
    logger.info("="*80)
    logger.info(f"[Traced LLM] NEW REQUEST via /trace/{trace_id}/v1/chat/completions")
    logger.info(f"[Traced LLM] Trace ID from URL: {trace_id}")
    logger.info(f"[Traced LLM] Model: {request.model}")
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

    # Lookup agent_id from trace_id via Agent Service
    # Agent doesn't need to provide this - we resolve it automatically!
    resolved_agent_id = "unknown"
    agent_status = None

    import httpx
    import os
    agent_service_url = os.getenv('AGENT_SERVICE_URL', 'http://agent-service:8002')
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{agent_service_url}/api/internal/agents/by-trace-id/{trace_id}")
            if response.status_code == 200:
                data = response.json()
                if data.get("agent") and data["agent"].get("id"):
                    resolved_agent_id = str(data["agent"]["id"])
                    agent_status = data["agent"].get("status")
                    logger.info(f"[Traced LLM] ✅ Resolved agent_id={resolved_agent_id}, status={agent_status} from trace_id={trace_id}")

                    # Check if agent is deployed - if so, don't collect trace
                    deployed_statuses = ["DEPLOYED_TEAM", "DEPLOYED_ALL", "DEPLOYED_DEPT", "PRODUCTION"]
                    if agent_status in deployed_statuses:
                        logger.info(f"[Traced LLM] 🚫 Agent is deployed ({agent_status}), skipping trace collection")
                        # Clear trace_id to prevent trace collection
                        trace_id = None
                else:
                    logger.warning(f"[Traced LLM] ⚠️  No agent found for trace_id={trace_id}")
            else:
                logger.warning(f"[Traced LLM] ⚠️  Agent Service returned {response.status_code} for trace_id={trace_id}")
    except Exception as e:
        logger.error(f"[Traced LLM] ❌ Failed to lookup agent_id from trace_id={trace_id}: {e}")

    # Inject trace_id and agent_id into the request
    logger.info(f"[Traced LLM] FORWARDING to main handler - trace_id={trace_id}, agent_id={resolved_agent_id}")

    # Call the original function with trace_id and agent_id automatically set
    return await create_chat_completion(
        request=request,
        authorization=authorization,
        x_agent_id=resolved_agent_id,  # Auto-resolved from trace_id
        x_trace_id=trace_id  # From URL path
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
