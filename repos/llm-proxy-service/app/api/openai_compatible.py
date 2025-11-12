"""
OpenAI Compatible API - Unified LLM interface for all providers
Supports: OpenAI, Gemini, Anthropic, OpenAI-compatible endpoints
"""
from fastapi import APIRouter, HTTPException, Header, Request, Path
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional, Literal, Union
import httpx
import json
import logging
import time
import os
from datetime import datetime
import uuid
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from ..core.redis_client import get_redis_client

logger = logging.getLogger(__name__)

# User Service endpoint for API key validation
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")

# Admin Service database connection for LLM model configurations
ADMIN_DB_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://dev_user:dev_password@postgres:5432/llm_proxy_db").replace("llm_proxy_db", "admin_service_db")
admin_db_engine = create_async_engine(ADMIN_DB_URL, echo=False, pool_size=5, max_overflow=10)
admin_db_session_maker = async_sessionmaker(admin_db_engine, class_=AsyncSession, expire_on_commit=False)

openai_router = APIRouter()


# ===== OpenAI Compatible Request/Response Models =====

class ChatMessage(BaseModel):
    """OpenAI compatible chat message"""
    role: Literal["system", "user", "assistant", "function", "tool"]  # Added 'tool' role for tool responses
    content: Union[str, List[Dict[str, str]], None] = None  # Make content optional with default None
    name: Optional[str] = None
    tool_calls: Optional[List[Dict[str, Any]]] = None  # For assistant messages with tool calls
    tool_call_id: Optional[str] = None  # For tool response messages

    def get_content_as_string(self) -> str:
        """Convert content to string, handling array format from ADK and None"""
        if self.content is None:
            return ""  # Return empty string instead of None
        elif isinstance(self.content, str):
            return self.content
        elif isinstance(self.content, list):
            # Convert array of text objects to single string
            content_parts = []
            for part in self.content:
                if isinstance(part, dict) and "text" in part:
                    content_parts.append(part["text"])
                elif isinstance(part, str):
                    content_parts.append(part)
            return " ".join(content_parts) if content_parts else ""
        return ""


class ChatCompletionRequest(BaseModel):
    """OpenAI compatible chat completion request"""
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = Field(default=0.7, ge=0.0, le=2.0)
    max_tokens: Optional[int] = Field(default=None, ge=1)
    stream: Optional[bool] = False
    top_p: Optional[float] = Field(default=1.0, ge=0.0, le=1.0)
    n: Optional[int] = Field(default=1, ge=1, le=10)
    stop: Optional[Union[str, List[str]]] = None
    presence_penalty: Optional[float] = Field(default=0.0, ge=-2.0, le=2.0)
    frequency_penalty: Optional[float] = Field(default=0.0, ge=-2.0, le=2.0)
    user: Optional[str] = None
    tools: Optional[List[Dict[str, Any]]] = None  # OpenAI tool calling support
    tool_choice: Optional[Union[str, Dict[str, Any]]] = None  # auto, none, or specific tool


class ChatChoice(BaseModel):
    """OpenAI compatible chat choice"""
    index: int
    message: ChatMessage
    finish_reason: Optional[str] = None


class ChatUsage(BaseModel):
    """OpenAI compatible token usage"""
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class ChatCompletionResponse(BaseModel):
    """OpenAI compatible chat completion response"""
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatChoice]
    usage: ChatUsage


class ChatCompletionChunkDelta(BaseModel):
    """OpenAI compatible streaming delta"""
    role: Optional[str] = None
    content: Optional[str] = None


class ChatCompletionChunkChoice(BaseModel):
    """OpenAI compatible streaming choice"""
    index: int
    delta: ChatCompletionChunkDelta
    finish_reason: Optional[str] = None


class ChatCompletionChunk(BaseModel):
    """OpenAI compatible streaming chunk"""
    id: str
    object: str = "chat.completion.chunk"
    created: int
    model: str
    choices: List[ChatCompletionChunkChoice]


# ===== Provider Configuration =====

async def get_model_from_admin_db(model_name: str) -> Optional[Dict[str, Any]]:
    """
    Query Admin Service database for model configuration
    Returns model config if found and active, None otherwise

    Handles hosted_vllm/ prefix: tries exact match first, then strips prefix
    """
    try:
        async with admin_db_session_maker() as session:
            query = text("""
                SELECT name, provider, endpoint, api_key_encrypted, is_active
                FROM llm_models
                WHERE name = :model_name AND is_active = true
            """)

            # Try exact match first
            result = await session.execute(query, {"model_name": model_name})
            row = result.fetchone()

            if row:
                logger.info(f"[Provider Config] Found model '{model_name}' in Admin DB: provider={row[1]}")
                return {
                    "name": row[0],
                    "provider": row[1],
                    "endpoint": row[2],
                    "api_key": row[3],
                    "is_active": row[4]
                }

            # If not found and has hosted_vllm/ prefix, try without prefix
            if model_name.startswith("hosted_vllm/"):
                base_model_name = model_name.replace("hosted_vllm/", "")
                logger.info(f"[Provider Config] Exact match failed, trying with base model name: {base_model_name}")

                result = await session.execute(query, {"model_name": base_model_name})
                row = result.fetchone()

                if row:
                    logger.info(f"[Provider Config] Found model '{base_model_name}' in Admin DB: provider={row[1]}")
                    return {
                        "name": row[0],
                        "provider": row[1],
                        "endpoint": row[2],
                        "api_key": row[3],
                        "is_active": row[4]
                    }

            logger.debug(f"[Provider Config] Model '{model_name}' not found in Admin DB")
            return None
    except Exception as e:
        logger.error(f"[Provider Config] Error querying Admin DB for model '{model_name}': {e}")
        return None


async def get_provider_config(model: str) -> Dict[str, str]:
    """
    Get provider configuration based on model name
    First tries Admin Service database, then falls back to hardcoded env vars
    Returns: {provider: 'openai'|'gemini'|'anthropic', api_key: '...', base_url: '...'}
    """
    # First, try to get model configuration from Admin Service database
    model_config = await get_model_from_admin_db(model)
    if model_config and model_config.get("api_key"):
        logger.info(f"[Provider Config] Using Admin DB config for model '{model}'")
        return {
            "provider": model_config["provider"],
            "api_key": model_config["api_key"],
            "base_url": model_config["endpoint"]
        }

    logger.info(f"[Provider Config] Falling back to hardcoded config for model '{model}'")

    # Fall back to hardcoded configurations
    # OpenAI models
    if model.startswith("gpt-"):
        return {
            "provider": "openai",
            "api_key": os.getenv("OPENAI_API_KEY", ""),
            "base_url": "https://api.openai.com/v1"
        }

    # Gemini models
    elif model.startswith("gemini-"):
        return {
            "provider": "gemini",
            "api_key": os.getenv("GOOGLE_API_KEY", ""),
            "base_url": f"https://generativelanguage.googleapis.com/v1beta/models/{model}"
        }

    # Anthropic models
    elif model.startswith("claude-"):
        return {
            "provider": "anthropic",
            "api_key": os.getenv("ANTHROPIC_API_KEY", ""),
            "base_url": "https://api.anthropic.com/v1"
        }

    # OpenAI-compatible endpoints (custom models)
    else:
        return {
            "provider": "openai-compatible",
            "api_key": os.getenv("CUSTOM_API_KEY", ""),
            "base_url": os.getenv("CUSTOM_BASE_URL", "http://localhost:8000/v1")
        }


# ===== API Key Validation =====

async def validate_platform_key(authorization: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Validate Platform API key with user-service
    Returns user info if valid, None if invalid
    """
    if not authorization:
        logger.warning("[API Key] No authorization header provided")
        return None

    if not authorization.startswith("Bearer "):
        logger.warning(f"[API Key] Invalid authorization format: {authorization[:20]}")
        return None

    api_key = authorization.replace("Bearer ", "")

    # Check if it's a valid platform key format
    if not api_key.startswith("a2g_"):
        logger.warning(f"[API Key] Invalid key format (should start with 'a2g_'): {api_key[:20]}")
        return None

    # Validate with user-service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            # Call user-service validation endpoint
            response = await client.get(
                f"{USER_SERVICE_URL}/api/v1/platform-keys/validate",
                headers={"Authorization": authorization}
            )

            if response.status_code == 200:
                user_info = response.json()
                logger.info(f"[API Key] Validated successfully for user_id={user_info.get('user_id')}")
                return user_info
            else:
                logger.warning(f"[API Key] Validation failed: status={response.status_code}")
                return None

    except Exception as e:
        logger.error(f"[API Key] Validation error: {e}")
        return None


# ===== Trace Events =====

async def emit_trace_event(
    agent_id: str,
    event_type: str,
    data: Any,
    metadata: Optional[Dict] = None,
    trace_id: Optional[str] = None
):
    """
    Emit a trace event to Tracing Service
    Sends trace events to Tracing Service via HTTP for display in Trace panel

    Event types:
    - llm_request → LLM type
    - llm_response → LLM type
    - llm_stream_token → LLM type (not sent to Tracing Service, too frequent)
    - llm_error → LLM type
    - tool_call → TOOL_CALL type
    - tool_response → TOOL_RESPONSE type
    - agent_transfer → AGENT_TRANSFER type
    """
    logger.info(f"[Trace Event] *** EMITTING {event_type} ***")
    logger.info(f"[Trace Event] Agent ID: {agent_id}")
    logger.info(f"[Trace Event] Trace ID: {trace_id}")
    logger.info(f"[Trace Event] Data: {json.dumps(data)[:500]}")
    if metadata:
        logger.info(f"[Trace Event] Metadata: {json.dumps(metadata)[:200]}")

    # Don't send stream tokens to Tracing Service (too frequent)
    if event_type == "llm_stream_token":
        logger.debug(f"[Trace Event] Skipping llm_stream_token (too frequent)")
        return

    # Send to Tracing Service if trace_id is available
    if not trace_id:
        logger.warning(f"[Trace Event] WARNING: No trace_id provided, event will NOT be sent to Tracing Service")
        return

    if trace_id:
        try:
            # Map event_type to log_type and human-readable message
            event_config = {
                "llm_request": {
                    "log_type": "LLM",
                    "message": f"LLM Request: {data.get('model', 'unknown')}"
                },
                "llm_response": {
                    "log_type": "LLM",
                    "message": f"LLM Response: {len(data.get('content', ''))} characters"
                },
                "llm_error": {
                    "log_type": "LLM",
                    "message": f"LLM Error: {data.get('error', 'unknown')}"
                },
                "tool_call": {
                    "log_type": "TOOL_CALL",
                    "message": f"Tool Call: {data.get('tool_name', 'unknown')}"
                },
                "tool_response": {
                    "log_type": "TOOL_RESPONSE",
                    "message": f"Tool Response: {data.get('tool_name', 'unknown')}"
                },
                "agent_transfer": {
                    "log_type": "AGENT_TRANSFER",
                    "message": f"Agent Transfer: {data.get('target_agent', 'unknown')}"
                }
            }

            config = event_config.get(event_type, {
                "log_type": "LLM",
                "message": f"{event_type}: agent={agent_id}"
            })

            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    "http://tracing-service:8004/api/tracing/logs",
                    json={
                        "trace_id": trace_id,
                        "service_name": "llm-proxy-service",
                        "level": "ERROR" if event_type == "llm_error" else "INFO",
                        "log_type": config["log_type"],
                        "message": config["message"],
                        "metadata": {
                            "agent_id": agent_id,
                            "event_type": event_type,
                            **data,
                            **(metadata or {})
                        }
                    },
                    headers={
                        "X-Service-Name": "llm-proxy-service"
                    }
                )
                logger.debug(f"[Trace] Sent to Tracing Service for trace_id={trace_id}")
        except Exception as e:
            logger.error(f"[Trace] Failed to send to Tracing Service: {e}")
    else:
        logger.warning(f"[Trace] No trace_id provided, event will not appear in Trace panel")


async def process_tool_calls(
    agent_id: str,
    tool_calls: List[Dict[str, Any]],
    trace_id: Optional[str] = None
):
    """
    Process tool calls from LLM response and emit trace events
    Detects regular tool calls and agent transfers

    Agent Transfer detection:
    - ADK: transfer_to_agent
    - Agno: transfer_task_to_member, delegate_task_to_member
    """
    if not tool_calls or not trace_id:
        return

    # Agent transfer tool names
    TRANSFER_TOOLS = {
        "transfer_to_agent",  # ADK
        "transfer_task_to_member",  # Agno
        "delegate_task_to_member"  # Agno
    }

    for tool_call in tool_calls:
        tool_id = tool_call.get("id", "unknown")
        tool_type = tool_call.get("type", "function")

        if tool_type == "function":
            function = tool_call.get("function", {})
            tool_name = function.get("name", "unknown")
            arguments = function.get("arguments", "{}")

            # Check if this is an agent transfer
            is_transfer = tool_name in TRANSFER_TOOLS

            if is_transfer:
                # Parse arguments to get target agent
                try:
                    args_dict = json.loads(arguments) if isinstance(arguments, str) else arguments
                    target_agent = (
                        args_dict.get("agent_name") or
                        args_dict.get("member_id") or
                        args_dict.get("agent_id") or
                        "unknown"
                    )
                except:
                    target_agent = "unknown"

                # For UI: Emit agent transfer event (not tool_call)
                await emit_trace_event(
                    agent_id,
                    "agent_transfer",
                    {
                        "tool_id": tool_id,
                        "tool_name": tool_name,
                        "target_agent": target_agent,
                        "arguments": arguments
                    },
                    trace_id=trace_id
                )
                logger.info(f"[Trace] Detected agent transfer to {target_agent} via {tool_name}")
            else:
                # Emit regular tool call event
                await emit_trace_event(
                    agent_id,
                    "tool_call",
                    {
                        "tool_id": tool_id,
                        "tool_name": tool_name,
                        "arguments": arguments
                    },
                    trace_id=trace_id
                )
                logger.info(f"[Trace] Detected tool call: {tool_name}")


# ===== Generic OpenAI Compatible Endpoint =====

@openai_router.post("/chat/completions")
async def create_chat_completion(
    request: ChatCompletionRequest,
    authorization: Optional[str] = Header(None),
    x_agent_id: Optional[str] = Header(None),
    x_trace_id: Optional[str] = Header(None, alias="X-Trace-ID")
):
    """
    Generic OpenAI Compatible Chat Completion Endpoint

    Accepts X-Trace-ID header for trace context. Agents can forward trace_id
    received from Chat Service to enable trace logging.

    Usage:
    - Set Authorization header with Platform API key (Bearer a2g_...)
    - Set X-Agent-ID header for agent identification
    - Optionally set X-Trace-ID header for trace context

    Example:
        curl -X POST http://localhost:8006/v1/chat/completions \\
          -H "Content-Type: application/json" \\
          -H "Authorization: Bearer a2g_..." \\
          -H "X-Agent-ID: agent-123" \\
          -H "X-Trace-ID: trace-abc-123" \\
          -d '{
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello!"}],
            "stream": false
          }'
    """
    # Extract agent_id and trace_id from headers
    agent_id = x_agent_id or "unknown"
    trace_id = x_trace_id

    # Comprehensive logging
    logger.info("="*80)
    logger.info("[LLM Proxy] NEW REQUEST - /v1/chat/completions")
    logger.info(f"[LLM Proxy] Headers:")
    logger.info(f"  - Authorization: {authorization[:50] if authorization else 'None'}...")
    logger.info(f"  - X-Agent-ID: {agent_id}")
    logger.info(f"  - X-Trace-ID: {trace_id}")
    logger.info(f"[LLM Proxy] Request:")
    logger.info(f"  - Model: {request.model}")
    logger.info(f"  - Messages count: {len(request.messages)}")
    logger.info(f"  - Has tools: {bool(request.tools)}")
    logger.info(f"  - Tool count: {len(request.tools) if request.tools else 0}")
    logger.info(f"  - Stream: {request.stream}")

    # Log first few messages for debugging
    for i, msg in enumerate(request.messages[:3]):
        logger.info(f"  - Message[{i}]: role={msg.role}, content_len={len(str(msg.content)) if msg.content else 0}")
        if msg.tool_calls:
            logger.info(f"    - Has {len(msg.tool_calls)} tool calls")
        if msg.tool_call_id:
            logger.info(f"    - Tool call ID: {msg.tool_call_id}")

    logger.info("="*80)

    # Validate Platform API key
    user_info = await validate_platform_key(authorization)
    if not user_info:
        logger.error(f"[LLM Proxy] Unauthorized request - invalid or missing API key")
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Platform API key. Please provide a valid key in the Authorization header."
        )

    logger.info(f"[LLM Proxy] Authorized request from user_id={user_info.get('user_id')}")

    # Get provider configuration
    config = await get_provider_config(request.model)
    provider = config["provider"]
    api_key = config["api_key"]
    base_url = config["base_url"]

    logger.info(f"[LLM Proxy] Using provider={provider}, base_url={base_url}")

    if not api_key:
        logger.error(f"[LLM Proxy] No API key configured for provider={provider}")
        raise HTTPException(status_code=500, detail=f"No API key configured for provider: {provider}")

    # Detect and emit tool response events from request messages
    for msg in request.messages:
        if msg.role in ["tool", "function"]:
            # This is a tool response message
            tool_call_id = getattr(msg, 'tool_call_id', None) or getattr(msg, 'name', 'unknown')
            await emit_trace_event(
                agent_id,
                "tool_response",
                {
                    "tool_call_id": tool_call_id,
                    "tool_name": getattr(msg, 'name', 'unknown'),
                    "content": msg.content
                },
                trace_id=trace_id
            )

    # Emit trace event: LLM request
    await emit_trace_event(
        agent_id,
        "llm_request",
        {
            "provider": provider,
            "model": request.model,
            "messages": [msg.model_dump() for msg in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": request.stream
        },
        trace_id=trace_id
    )

    try:
        # Route to appropriate provider
        if provider == "openai" or provider == "openai-compatible" or provider == "openai_compatible":
            return await proxy_openai_compatible(
                agent_id=agent_id,
                api_key=api_key,
                base_url=base_url,
                request=request,
                provider=provider,
                trace_id=trace_id
            )

        elif provider == "gemini":
            return await proxy_gemini(
                agent_id=agent_id,
                api_key=api_key,
                request=request,
                trace_id=trace_id
            )

        elif provider == "anthropic":
            return await proxy_anthropic(
                agent_id=agent_id,
                api_key=api_key,
                request=request,
                trace_id=trace_id
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    except Exception as e:
        logger.error(f"[LLM Proxy] Error in chat completion: {e}", exc_info=True)

        # Emit trace event: error
        await emit_trace_event(
            agent_id,
            "llm_error",
            {"error": str(e), "provider": provider, "model": request.model},
            trace_id=trace_id
        )

        raise HTTPException(status_code=500, detail=str(e))


# ===== Session-Specific OpenAI Compatible Endpoint =====

@openai_router.post("/session/{session_id}/chat/completions")
async def create_chat_completion_with_session(
    session_id: str = Path(..., description="Chat session ID for trace context"),
    request: ChatCompletionRequest = ...,
    authorization: Optional[str] = Header(None),
    x_agent_id: Optional[str] = Header(None)
):
    """
    Session-Specific OpenAI Compatible Chat Completion Endpoint

    This endpoint automatically resolves trace_id from session_id via Redis.
    Agents using session-specific endpoints don't need to manage trace headers.

    Usage:
    - Set Authorization header with Platform API key (Bearer a2g_...)
    - Set X-Agent-ID header for trace event routing
    - Use session-specific URL: /v1/session/{session_id}/chat/completions
    - trace_id is automatically resolved from session_id

    Example:
        curl -X POST http://localhost:8006/v1/session/abc-123/chat/completions \\
          -H "Content-Type: application/json" \\
          -H "Authorization: Bearer a2g_..." \\
          -H "X-Agent-ID: agent-123" \\
          -d '{
            "model": "gpt-3.5-turbo",
            "messages": [{"role": "user", "content": "Hello!"}],
            "stream": false
          }'
    """
    # Extract agent_id from header
    agent_id = x_agent_id or "unknown"

    logger.info(f"[LLM Proxy] Session-specific chat completion - session_id={session_id}, agent_id={agent_id}, model={request.model}")

    # Resolve trace_id from session_id via Redis
    redis_client = await get_redis_client()
    trace_id = await redis_client.get_session_trace(session_id)

    if not trace_id:
        logger.warning(f"[LLM Proxy] No trace_id found for session_id={session_id}, traces may not appear")
    else:
        logger.info(f"[LLM Proxy] Resolved trace_id={trace_id} from session_id={session_id}")

    # Validate Platform API key
    user_info = await validate_platform_key(authorization)
    if not user_info:
        logger.error(f"[LLM Proxy] Unauthorized request - invalid or missing API key")
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing Platform API key. Please provide a valid key in the Authorization header."
        )

    logger.info(f"[LLM Proxy] Authorized request from user_id={user_info.get('user_id')}")

    # Get provider configuration
    config = await get_provider_config(request.model)
    provider = config["provider"]
    api_key = config["api_key"]
    base_url = config["base_url"]

    logger.info(f"[LLM Proxy] Using provider={provider}, base_url={base_url}")

    if not api_key:
        logger.error(f"[LLM Proxy] No API key configured for provider={provider}")
        raise HTTPException(status_code=500, detail=f"No API key configured for provider: {provider}")

    # Detect and emit tool response events from request messages
    for msg in request.messages:
        if msg.role in ["tool", "function"]:
            # This is a tool response message
            tool_call_id = getattr(msg, 'tool_call_id', None) or getattr(msg, 'name', 'unknown')
            await emit_trace_event(
                agent_id,
                "tool_response",
                {
                    "tool_call_id": tool_call_id,
                    "tool_name": getattr(msg, 'name', 'unknown'),
                    "content": msg.content
                },
                trace_id=trace_id
            )

    # Emit trace event: LLM request
    await emit_trace_event(
        agent_id,
        "llm_request",
        {
            "provider": provider,
            "model": request.model,
            "messages": [msg.model_dump() for msg in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
            "stream": request.stream,
            "session_id": session_id
        },
        trace_id=trace_id
    )

    try:
        # Route to appropriate provider
        if provider == "openai" or provider == "openai-compatible" or provider == "openai_compatible":
            return await proxy_openai_compatible(
                agent_id=agent_id,
                api_key=api_key,
                base_url=base_url,
                request=request,
                provider=provider,
                trace_id=trace_id
            )

        elif provider == "gemini":
            return await proxy_gemini(
                agent_id=agent_id,
                api_key=api_key,
                request=request,
                trace_id=trace_id
            )

        elif provider == "anthropic":
            return await proxy_anthropic(
                agent_id=agent_id,
                api_key=api_key,
                request=request,
                trace_id=trace_id
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {provider}")

    except Exception as e:
        logger.error(f"[LLM Proxy] Error in chat completion: {e}", exc_info=True)

        # Emit trace event: error
        await emit_trace_event(
            agent_id,
            "llm_error",
            {"error": str(e), "provider": provider, "model": request.model, "session_id": session_id},
            trace_id=trace_id
        )

        raise HTTPException(status_code=500, detail=str(e))


# ===== Provider Implementations =====

async def proxy_openai_compatible(
    agent_id: str,
    api_key: str,
    base_url: str,
    request: ChatCompletionRequest,
    provider: str,
    trace_id: Optional[str] = None
):
    """
    Proxy request to OpenAI or OpenAI-compatible endpoint
    Returns OpenAI-compatible response
    """
    # Strip trailing slash from base_url to avoid double slashes
    base_url = base_url.rstrip('/')

    logger.info(f"[OpenAI Proxy] Calling {base_url}/chat/completions for agent {agent_id}, trace_id={trace_id}")

    # Prepare request payload (OpenAI format)
    # Process messages and convert array content from ADK to string
    processed_messages = []
    for msg in request.messages:
        # Get content, ensuring it's never None
        content = msg.get_content_as_string()
        if content is None:
            content = ""  # Default to empty string if None

        # IMPORTANT: Always include content field, even for messages with tool_calls
        # Some providers require content to be present (can be empty string)
        msg_dict = {
            "role": msg.role,
            "content": content  # Always include, even if empty string
        }

        # Add optional fields
        if msg.name:
            msg_dict["name"] = msg.name
        if msg.tool_calls:
            msg_dict["tool_calls"] = msg.tool_calls
            # Ensure content field exists for tool_calls messages
            if "content" not in msg_dict or msg_dict["content"] is None:
                msg_dict["content"] = ""
        if msg.tool_call_id:
            msg_dict["tool_call_id"] = msg.tool_call_id

        processed_messages.append(msg_dict)

    # Only include non-None values to avoid sending null to providers that don't accept it
    payload = {
        "model": request.model,
        "messages": processed_messages
    }

    # Add optional fields only if they have values
    if request.temperature is not None:
        payload["temperature"] = request.temperature
    if request.stream is not None:
        payload["stream"] = request.stream
    if request.max_tokens:
        payload["max_tokens"] = request.max_tokens
    if request.top_p:
        payload["top_p"] = request.top_p
    if request.presence_penalty:
        payload["presence_penalty"] = request.presence_penalty
    if request.frequency_penalty:
        payload["frequency_penalty"] = request.frequency_penalty
    if request.stop:
        payload["stop"] = request.stop
    # Add tool calling support
    if request.tools:
        payload["tools"] = request.tools
    if request.tool_choice:
        payload["tool_choice"] = request.tool_choice

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}"
    }

    logger.info(f"[OpenAI Proxy] Request payload: {json.dumps(payload)[:500]}")

    async with httpx.AsyncClient(timeout=300.0) as client:
        if request.stream:
            # Streaming response
            return StreamingResponse(
                stream_openai_response(
                    agent_id=agent_id,
                    client=client,
                    url=f"{base_url}/chat/completions",
                    headers=headers,
                    payload=payload,
                    model=request.model,
                    trace_id=trace_id
                ),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            logger.info(f"[OpenAI Proxy] Making non-streaming request to {base_url}/chat/completions")
            response = await client.post(
                f"{base_url}/chat/completions",
                headers=headers,
                json=payload
            )

            logger.info(f"[OpenAI Proxy] Response status: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"[OpenAI Proxy] Error response: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=error_text)

            data = response.json()
            logger.info(f"[OpenAI Proxy] Response data (truncated): {json.dumps(data)[:500]}")

            # ===== RAW RESPONSE LOGGING =====
            logger.info(f"[OpenAI Proxy] ===== FULL RAW RESPONSE START =====")
            logger.info(f"[OpenAI Proxy] Complete JSON response:\n{json.dumps(data, indent=2)}")

            # Extract and log specific fields for debugging
            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content", "")
                tool_calls = message.get("tool_calls", [])

                logger.info(f"[OpenAI Proxy] Message content: {repr(content)}")
                logger.info(f"[OpenAI Proxy] Message content length: {len(content) if content else 0} characters")
                logger.info(f"[OpenAI Proxy] Tool calls present: {len(tool_calls) > 0}")
                logger.info(f"[OpenAI Proxy] Tool calls count: {len(tool_calls)}")

                if tool_calls:
                    logger.info(f"[OpenAI Proxy] Tool calls detail:\n{json.dumps(tool_calls, indent=2)}")
                else:
                    logger.info(f"[OpenAI Proxy] No tool calls in response")

            logger.info(f"[OpenAI Proxy] ===== FULL RAW RESPONSE END =====")
            # ===== END RAW RESPONSE LOGGING =====

            # Process response and emit trace events
            if "choices" in data and len(data["choices"]) > 0:
                message = data["choices"][0].get("message", {})
                content = message.get("content", "")
                tool_calls = message.get("tool_calls", [])
                usage = data.get("usage", {})

                # IMPORTANT: Always ensure content field exists for messages with tool_calls
                # This is required by OpenAI API spec - some clients strip empty content fields
                if tool_calls:
                    # Force content to exist, even if empty
                    if "content" not in message or message.get("content") is None or message.get("content") == "":
                        message["content"] = ""
                    data["choices"][0]["message"] = message
                    logger.info(f"[OpenAI Proxy] Ensured content field for tool_calls message: content={repr(message.get('content'))}")

                # Emit LLM response event
                await emit_trace_event(
                    agent_id,
                    "llm_response",
                    {
                        "content": content,
                        "provider": provider,
                        "model": request.model,
                        "usage": usage,
                        "has_tool_calls": len(tool_calls) > 0
                    },
                    trace_id=trace_id
                )

                # Process tool calls if present
                if tool_calls:
                    await process_tool_calls(agent_id, tool_calls, trace_id)

            return data


async def stream_openai_response(
    agent_id: str,
    client: httpx.AsyncClient,
    url: str,
    headers: Dict,
    payload: Dict,
    model: str,
    trace_id: Optional[str] = None
):
    """Stream OpenAI response and emit trace events"""
    logger.info(f"[OpenAI Proxy] Starting streaming request to {url}, trace_id={trace_id}")

    accumulated_content = ""
    chunk_count = 0
    # Accumulate tool calls from streaming chunks
    accumulated_tool_calls: Dict[int, Dict] = {}  # index -> tool_call data

    try:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            logger.info(f"[OpenAI Proxy] Stream response status: {response.status_code}")

            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"[OpenAI Proxy] Stream error: {error_text.decode()}")
                yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                return

            async for line in response.aiter_lines():
                if not line or line.strip() == "":
                    continue

                if line.startswith("data: "):
                    data_str = line[6:]

                    # Handle [DONE] signal
                    if data_str.strip() == "[DONE]":
                        logger.info(f"[OpenAI Proxy] Stream completed - chunks={chunk_count}, content_length={len(accumulated_content)}, tool_calls={len(accumulated_tool_calls)}")

                        # Emit trace event: complete response
                        await emit_trace_event(
                            agent_id,
                            "llm_response",
                            {
                                "content": accumulated_content,
                                "provider": "openai",
                                "model": model,
                                "chunks": chunk_count,
                                "has_tool_calls": len(accumulated_tool_calls) > 0
                            },
                            trace_id=trace_id
                        )

                        # Process accumulated tool calls
                        if accumulated_tool_calls:
                            tool_calls_list = list(accumulated_tool_calls.values())
                            await process_tool_calls(agent_id, tool_calls_list, trace_id)

                        yield f"data: [DONE]\n\n"
                        return

                    try:
                        chunk_data = json.loads(data_str)
                        chunk_count += 1

                        # Extract content and tool_calls from delta
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            delta = chunk_data["choices"][0].get("delta", {})
                            content = delta.get("content", "")
                            tool_calls_delta = delta.get("tool_calls", [])

                            # Accumulate content
                            if content:
                                accumulated_content += content

                                # Emit trace event: stream token
                                await emit_trace_event(
                                    agent_id,
                                    "llm_stream_token",
                                    {
                                        "token": content,
                                        "index": chunk_count,
                                        "accumulated_length": len(accumulated_content)
                                    },
                                    trace_id=trace_id
                                )

                            # Accumulate tool calls from streaming chunks
                            for tool_call_chunk in tool_calls_delta:
                                idx = tool_call_chunk.get("index", 0)
                                if idx not in accumulated_tool_calls:
                                    accumulated_tool_calls[idx] = {
                                        "id": tool_call_chunk.get("id", ""),
                                        "type": tool_call_chunk.get("type", "function"),
                                        "function": {
                                            "name": "",
                                            "arguments": ""
                                        }
                                    }

                                # Update tool call data
                                if "id" in tool_call_chunk:
                                    accumulated_tool_calls[idx]["id"] = tool_call_chunk["id"]
                                if "type" in tool_call_chunk:
                                    accumulated_tool_calls[idx]["type"] = tool_call_chunk["type"]

                                if "function" in tool_call_chunk:
                                    func_chunk = tool_call_chunk["function"]
                                    if "name" in func_chunk:
                                        accumulated_tool_calls[idx]["function"]["name"] = func_chunk["name"]
                                    if "arguments" in func_chunk:
                                        accumulated_tool_calls[idx]["function"]["arguments"] += func_chunk["arguments"]

                        # IMPORTANT: If chunk has tool_calls but no content, add empty content
                        # This ensures compatibility with OpenAI API spec
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            choice = chunk_data["choices"][0]
                            if "delta" in choice:
                                delta = choice["delta"]
                                # If there are tool_calls but no content field, add empty content
                                if "tool_calls" in delta and "content" not in delta:
                                    delta["content"] = ""
                                    chunk_data["choices"][0]["delta"] = delta
                                    # Reconstruct the data line with modified chunk
                                    yield f"data: {json.dumps(chunk_data)}\n\n"
                                    continue

                        # Forward chunk to client
                        yield f"{line}\n\n"

                    except json.JSONDecodeError as e:
                        logger.warning(f"[OpenAI Proxy] Failed to parse chunk: {e}")
                        continue

    except Exception as e:
        logger.error(f"[OpenAI Proxy] Stream error: {e}", exc_info=True)

        # Emit trace event: error
        await emit_trace_event(
            agent_id,
            "llm_error",
            {"error": str(e), "provider": "openai", "model": model}
        )

        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def proxy_gemini(
    agent_id: str,
    api_key: str,
    request: ChatCompletionRequest,
    trace_id: Optional[str] = None
):
    """
    Proxy request to Google Gemini
    Converts OpenAI format to Gemini format, then converts response back
    """
    logger.info(f"[Gemini Proxy] Processing request for agent {agent_id}, model={request.model}, trace_id={trace_id}")

    # Convert OpenAI messages to Gemini contents format
    contents = []
    for msg in request.messages:
        # Gemini uses "user" and "model" roles (not "assistant")
        role = "model" if msg.role == "assistant" else msg.role

        # Skip system messages for now (Gemini doesn't support them directly)
        if msg.role == "system":
            logger.warning(f"[Gemini Proxy] Skipping system message: {msg.content[:100]}")
            continue

        contents.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })

    # Prepare Gemini API request
    gemini_payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": request.temperature or 0.7,
            "maxOutputTokens": request.max_tokens or 2048,
            "topP": request.top_p or 1.0,
        }
    }

    if request.stop:
        stops = request.stop if isinstance(request.stop, list) else [request.stop]
        gemini_payload["generationConfig"]["stopSequences"] = stops

    # Construct Gemini API URL
    base_url = f"https://generativelanguage.googleapis.com/v1beta/models/{request.model}"

    if request.stream:
        url = f"{base_url}:streamGenerateContent?key={api_key}&alt=sse"
    else:
        url = f"{base_url}:generateContent?key={api_key}"

    logger.info(f"[Gemini Proxy] Request URL: {url}")
    logger.info(f"[Gemini Proxy] Payload: {json.dumps(gemini_payload)[:500]}")

    headers = {
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=300.0) as client:
        if request.stream:
            # Streaming response
            return StreamingResponse(
                stream_gemini_response(
                    agent_id=agent_id,
                    client=client,
                    url=url,
                    headers=headers,
                    payload=gemini_payload,
                    model=request.model
                ),
                media_type="text/event-stream"
            )
        else:
            # Non-streaming response
            logger.info(f"[Gemini Proxy] Making non-streaming request")
            response = await client.post(url, headers=headers, json=gemini_payload)

            logger.info(f"[Gemini Proxy] Response status: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"[Gemini Proxy] Error response: {error_text}")
                raise HTTPException(status_code=response.status_code, detail=error_text)

            gemini_data = response.json()
            logger.info(f"[Gemini Proxy] Response data: {json.dumps(gemini_data)[:500]}")

            # Convert Gemini response to OpenAI format
            openai_response = convert_gemini_to_openai(gemini_data, request.model)

            # Emit trace event: LLM response
            if openai_response["choices"] and len(openai_response["choices"]) > 0:
                content = openai_response["choices"][0]["message"]["content"]
                usage = openai_response["usage"]

                await emit_trace_event(
                    agent_id,
                    "llm_response",
                    {
                        "content": content,
                        "provider": "gemini",
                        "model": request.model,
                        "usage": usage
                    },
                    trace_id=trace_id
                )

            return openai_response


def convert_gemini_to_openai(gemini_data: Dict, model: str) -> Dict:
    """Convert Gemini API response to OpenAI format"""
    # Extract content from Gemini response
    content = ""
    finish_reason = "stop"

    if "candidates" in gemini_data and len(gemini_data["candidates"]) > 0:
        candidate = gemini_data["candidates"][0]

        # Extract text from parts
        if "content" in candidate and "parts" in candidate["content"]:
            parts = candidate["content"]["parts"]
            content = "".join(part.get("text", "") for part in parts)

        # Map finish reason
        gemini_finish = candidate.get("finishReason", "STOP")
        finish_reason_map = {
            "STOP": "stop",
            "MAX_TOKENS": "length",
            "SAFETY": "content_filter",
            "RECITATION": "content_filter",
            "OTHER": "stop"
        }
        finish_reason = finish_reason_map.get(gemini_finish, "stop")

    # Extract usage metadata
    usage_metadata = gemini_data.get("usageMetadata", {})
    usage = {
        "prompt_tokens": usage_metadata.get("promptTokenCount", 0),
        "completion_tokens": usage_metadata.get("candidatesTokenCount", 0),
        "total_tokens": usage_metadata.get("totalTokenCount", 0)
    }

    # Construct OpenAI-compatible response
    return {
        "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": model,
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": content
                },
                "finish_reason": finish_reason
            }
        ],
        "usage": usage
    }


async def stream_gemini_response(
    agent_id: str,
    client: httpx.AsyncClient,
    url: str,
    headers: Dict,
    payload: Dict,
    model: str
):
    """Stream Gemini response and convert to OpenAI format"""
    logger.info(f"[Gemini Proxy] Starting streaming request")

    accumulated_content = ""
    chunk_count = 0

    try:
        async with client.stream("POST", url, headers=headers, json=payload) as response:
            logger.info(f"[Gemini Proxy] Stream response status: {response.status_code}")

            if response.status_code != 200:
                error_text = await response.aread()
                logger.error(f"[Gemini Proxy] Stream error: {error_text.decode()}")
                yield f"data: {json.dumps({'error': error_text.decode()})}\n\n"
                return

            async for line in response.aiter_lines():
                if not line or line.strip() == "":
                    continue

                # Gemini SSE format: "data: {...}"
                if line.startswith("data: "):
                    data_str = line[6:]

                    try:
                        gemini_chunk = json.loads(data_str)

                        # Extract content from Gemini chunk
                        content = ""
                        finish_reason = None

                        if "candidates" in gemini_chunk and len(gemini_chunk["candidates"]) > 0:
                            candidate = gemini_chunk["candidates"][0]

                            # Extract text from parts
                            if "content" in candidate and "parts" in candidate["content"]:
                                parts = candidate["content"]["parts"]
                                content = "".join(part.get("text", "") for part in parts)

                            # Check finish reason
                            if "finishReason" in candidate:
                                gemini_finish = candidate["finishReason"]
                                finish_reason_map = {
                                    "STOP": "stop",
                                    "MAX_TOKENS": "length",
                                    "SAFETY": "content_filter",
                                    "RECITATION": "content_filter",
                                    "OTHER": "stop"
                                }
                                finish_reason = finish_reason_map.get(gemini_finish, "stop")

                        # Convert to OpenAI streaming format
                        if content or finish_reason:
                            chunk_count += 1
                            accumulated_content += content

                            openai_chunk = {
                                "id": f"chatcmpl-{uuid.uuid4().hex[:8]}",
                                "object": "chat.completion.chunk",
                                "created": int(time.time()),
                                "model": model,
                                "choices": [
                                    {
                                        "index": 0,
                                        "delta": {
                                            "content": content
                                        } if content else {},
                                        "finish_reason": finish_reason
                                    }
                                ]
                            }

                            if content:
                                # Emit trace event: stream token
                                await emit_trace_event(
                                    agent_id,
                                    "llm_stream_token",
                                    {
                                        "token": content,
                                        "index": chunk_count,
                                        "accumulated_length": len(accumulated_content)
                                    }
                                )

                            # Send chunk to client
                            yield f"data: {json.dumps(openai_chunk)}\n\n"

                            # If finished, send [DONE]
                            if finish_reason:
                                logger.info(f"[Gemini Proxy] Stream completed - chunks={chunk_count}, content_length={len(accumulated_content)}")

                                # Emit trace event: complete response
                                await emit_trace_event(
                                    agent_id,
                                    "llm_response",
                                    {
                                        "content": accumulated_content,
                                        "provider": "gemini",
                                        "model": model,
                                        "chunks": chunk_count
                                    }
                                )

                                yield f"data: [DONE]\n\n"
                                return

                    except json.JSONDecodeError as e:
                        logger.warning(f"[Gemini Proxy] Failed to parse chunk: {e}")
                        continue

        # If stream ends without finish_reason, send [DONE]
        if chunk_count > 0:
            logger.info(f"[Gemini Proxy] Stream ended - chunks={chunk_count}")

            # Emit trace event
            await emit_trace_event(
                agent_id,
                "llm_response",
                {
                    "content": accumulated_content,
                    "provider": "gemini",
                    "model": model,
                    "chunks": chunk_count
                }
            )

            yield f"data: [DONE]\n\n"

    except Exception as e:
        logger.error(f"[Gemini Proxy] Stream error: {e}", exc_info=True)

        # Emit trace event: error
        await emit_trace_event(
            agent_id,
            "llm_error",
            {"error": str(e), "provider": "gemini", "model": model}
        )

        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def proxy_anthropic(
    agent_id: str,
    api_key: str,
    request: ChatCompletionRequest,
    trace_id: Optional[str] = None
):
    """
    Proxy request to Anthropic Claude
    Converts OpenAI format to Anthropic format, then converts response back
    """
    # TODO: Implement Anthropic proxy with format conversion
    raise HTTPException(status_code=501, detail="Anthropic provider not yet implemented")
