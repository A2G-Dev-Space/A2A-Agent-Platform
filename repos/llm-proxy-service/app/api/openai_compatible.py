"""
OpenAI Compatible API - Unified LLM interface for all providers
Supports: OpenAI, Gemini, Anthropic, OpenAI-compatible endpoints
"""
from fastapi import APIRouter, HTTPException, Header, Request
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

from ..websocket.manager import trace_manager

logger = logging.getLogger(__name__)

# User Service endpoint for API key validation
USER_SERVICE_URL = os.getenv("USER_SERVICE_URL", "http://localhost:8001")

openai_router = APIRouter()


# ===== OpenAI Compatible Request/Response Models =====

class ChatMessage(BaseModel):
    """OpenAI compatible chat message"""
    role: Literal["system", "user", "assistant", "function"]
    content: str
    name: Optional[str] = None


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

def get_provider_config(model: str) -> Dict[str, str]:
    """
    Get provider configuration based on model name
    Returns: {provider: 'openai'|'gemini'|'anthropic', api_key: '...', base_url: '...'}
    """
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
    If trace_id is provided, sends to Tracing Service via HTTP
    Also broadcasts to local WebSocket manager (deprecated, for backward compatibility)
    """
    event = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
        "metadata": metadata or {}
    }

    logger.info(f"[Trace] Emitting {event_type} for agent {agent_id}, trace_id={trace_id}: {json.dumps(data)[:200]}")

    # Send to Tracing Service if trace_id is available
    if trace_id:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    "http://tracing-service:8004/api/tracing/logs",
                    json={
                        "trace_id": trace_id,
                        "service_name": "llm-proxy-service",
                        "level": "INFO",
                        "log_type": "LLM",
                        "message": f"{event_type}: agent={agent_id}",
                        "metadata": {
                            "agent_id": agent_id,
                            "event_type": event_type,
                            **data,
                            **(metadata or {})
                        }
                    }
                )
                logger.debug(f"[Trace] Sent to Tracing Service for trace_id={trace_id}")
        except Exception as e:
            logger.error(f"[Trace] Failed to send to Tracing Service: {e}")
    else:
        logger.warning(f"[Trace] No trace_id provided, event will not appear in Trace panel")

    # Also broadcast to local WebSocket manager (for backward compatibility)
    await trace_manager.broadcast_to_agent(agent_id, event)


# ===== OpenAI Compatible Endpoint =====

@openai_router.post("/chat/completions")
async def create_chat_completion(
    request: ChatCompletionRequest,
    authorization: Optional[str] = Header(None),
    x_agent_id: Optional[str] = Header(None),
    x_trace_id: Optional[str] = Header(None)
):
    """
    OpenAI Compatible Chat Completion Endpoint

    Usage:
    - Set Authorization header with Platform API key (Bearer a2g_...)
    - Set X-Agent-ID header for trace event routing
    - Supports streaming and non-streaming
    - Automatically routes to correct provider based on model name

    Example:
        curl -X POST http://localhost:8006/v1/chat/completions \\
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

    logger.info(f"[LLM Proxy] Chat completion request - agent_id={agent_id}, model={request.model}, stream={request.stream}")

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
    config = get_provider_config(request.model)
    provider = config["provider"]
    api_key = config["api_key"]
    base_url = config["base_url"]

    logger.info(f"[LLM Proxy] Using provider={provider}, base_url={base_url}")

    if not api_key:
        logger.error(f"[LLM Proxy] No API key configured for provider={provider}")
        raise HTTPException(status_code=500, detail=f"No API key configured for provider: {provider}")

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
        trace_id=x_trace_id
    )

    try:
        # Route to appropriate provider
        if provider == "openai" or provider == "openai-compatible":
            return await proxy_openai_compatible(
                agent_id=agent_id,
                api_key=api_key,
                base_url=base_url,
                request=request,
                provider=provider
            )

        elif provider == "gemini":
            return await proxy_gemini(
                agent_id=agent_id,
                api_key=api_key,
                request=request,
                trace_id=x_trace_id
            )

        elif provider == "anthropic":
            return await proxy_anthropic(
                agent_id=agent_id,
                api_key=api_key,
                request=request
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
            trace_id=x_trace_id
        )

        raise HTTPException(status_code=500, detail=str(e))


# ===== Provider Implementations =====

async def proxy_openai_compatible(
    agent_id: str,
    api_key: str,
    base_url: str,
    request: ChatCompletionRequest,
    provider: str
):
    """
    Proxy request to OpenAI or OpenAI-compatible endpoint
    Returns OpenAI-compatible response
    """
    logger.info(f"[OpenAI Proxy] Calling {base_url}/chat/completions for agent {agent_id}")

    # Prepare request payload (OpenAI format)
    payload = {
        "model": request.model,
        "messages": [msg.model_dump() for msg in request.messages],
        "temperature": request.temperature,
        "stream": request.stream
    }

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
                    model=request.model
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
            logger.info(f"[OpenAI Proxy] Response data: {json.dumps(data)[:500]}")

            # Emit trace event: LLM response
            if "choices" in data and len(data["choices"]) > 0:
                content = data["choices"][0].get("message", {}).get("content", "")
                usage = data.get("usage", {})

                await emit_trace_event(
                    agent_id,
                    "llm_response",
                    {
                        "content": content,
                        "provider": provider,
                        "model": request.model,
                        "usage": usage
                    }
                )

            return data


async def stream_openai_response(
    agent_id: str,
    client: httpx.AsyncClient,
    url: str,
    headers: Dict,
    payload: Dict,
    model: str
):
    """Stream OpenAI response and emit trace events"""
    logger.info(f"[OpenAI Proxy] Starting streaming request to {url}")

    accumulated_content = ""
    chunk_count = 0

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
                        logger.info(f"[OpenAI Proxy] Stream completed - chunks={chunk_count}, content_length={len(accumulated_content)}")

                        # Emit trace event: complete response
                        await emit_trace_event(
                            agent_id,
                            "llm_response",
                            {
                                "content": accumulated_content,
                                "provider": "openai",
                                "model": model,
                                "chunks": chunk_count
                            }
                        )

                        yield f"data: [DONE]\n\n"
                        return

                    try:
                        chunk_data = json.loads(data_str)
                        chunk_count += 1

                        # Extract content from delta
                        if "choices" in chunk_data and len(chunk_data["choices"]) > 0:
                            delta = chunk_data["choices"][0].get("delta", {})
                            content = delta.get("content", "")

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
                                    }
                                )

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
    request: ChatCompletionRequest
):
    """
    Proxy request to Anthropic Claude
    Converts OpenAI format to Anthropic format, then converts response back
    """
    # TODO: Implement Anthropic proxy with format conversion
    raise HTTPException(status_code=501, detail="Anthropic provider not yet implemented")
