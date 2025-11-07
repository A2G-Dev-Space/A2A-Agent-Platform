"""
LLM Proxy API - Intercepts LLM calls and broadcasts trace events
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import logging
import asyncio
from datetime import datetime

from ..websocket.manager import trace_manager

logger = logging.getLogger(__name__)

proxy_router = APIRouter()


class LLMRequest(BaseModel):
    """Request to LLM"""
    agent_id: str
    provider: str  # google, openai, anthropic
    model: str
    messages: List[Dict[str, str]]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = True


class TraceEventType:
    """Types of trace events"""
    LLM_REQUEST = "llm_request"
    LLM_RESPONSE = "llm_response"
    LLM_STREAM_TOKEN = "llm_stream_token"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    ERROR = "error"


async def emit_trace_event(
    agent_id: str,
    event_type: str,
    data: Any,
    metadata: Optional[Dict] = None
):
    """Emit a trace event via WebSocket"""
    event = {
        "type": event_type,
        "timestamp": datetime.utcnow().isoformat(),
        "data": data,
        "metadata": metadata or {}
    }

    await trace_manager.broadcast_to_agent(agent_id, event)
    logger.debug(f"[Trace] Emitted {event_type} for agent {agent_id}")


@proxy_router.post("/llm/chat")
async def proxy_llm_chat(request: LLMRequest):
    """
    Proxy LLM chat request and emit trace events

    This endpoint:
    1. Receives LLM request from agent
    2. Emits trace event for request
    3. Forwards to actual LLM provider
    4. Streams response and emits trace events
    5. Returns complete response
    """
    logger.info(f"[Proxy] LLM request from agent {request.agent_id} to {request.provider}/{request.model}")

    # Emit request trace event
    await emit_trace_event(
        request.agent_id,
        TraceEventType.LLM_REQUEST,
        {
            "provider": request.provider,
            "model": request.model,
            "messages": request.messages,
            "temperature": request.temperature,
            "max_tokens": request.max_tokens
        }
    )

    try:
        # Get API key from admin service (simplified for now)
        api_key = await get_llm_api_key(request.provider, request.model)

        if request.provider == "google":
            response = await proxy_google_gemini(
                request.agent_id,
                api_key,
                request.model,
                request.messages,
                request.temperature,
                request.max_tokens,
                request.stream
            )
        elif request.provider == "openai":
            response = await proxy_openai(
                request.agent_id,
                api_key,
                request.model,
                request.messages,
                request.temperature,
                request.max_tokens,
                request.stream
            )
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported provider: {request.provider}")

        return response

    except Exception as e:
        logger.error(f"[Proxy] Error in LLM proxy: {e}")

        # Emit error trace event
        await emit_trace_event(
            request.agent_id,
            TraceEventType.ERROR,
            {"error": str(e)}
        )

        raise HTTPException(status_code=500, detail=str(e))


async def get_llm_api_key(provider: str, model: str) -> str:
    """Get API key from admin service"""
    # TODO: Implement actual API key retrieval from admin service
    # For now, use environment variables or hardcoded values

    if provider == "google":
        # This should come from admin service
        return "YOUR_GOOGLE_API_KEY"
    elif provider == "openai":
        return "YOUR_OPENAI_API_KEY"
    else:
        raise ValueError(f"No API key configured for provider: {provider}")


async def proxy_google_gemini(
    agent_id: str,
    api_key: str,
    model: str,
    messages: list,
    temperature: float,
    max_tokens: Optional[int],
    stream: bool
) -> dict:
    """Proxy request to Google Gemini and emit trace events"""

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:streamGenerateContent?key={api_key}"

    # Convert messages to Gemini format
    contents = []
    for msg in messages:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg["content"]}]
        })

    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_tokens or 8192,
        }
    }

    logger.info(f"[Proxy] Calling Gemini for agent {agent_id}")

    async with httpx.AsyncClient(timeout=300.0) as client:
        if stream:
            # Stream response
            response_text = ""
            token_count = 0

            async with client.stream("POST", url, json=payload) as response:
                response.raise_for_status()

                # Buffer and parse response
                full_response = ""
                async for line in response.aiter_lines():
                    full_response += line + "\n"

                # Parse JSON array
                chunks = json.loads(full_response)
                if not isinstance(chunks, list):
                    chunks = [chunks]

                for chunk in chunks:
                    if "candidates" in chunk:
                        for candidate in chunk["candidates"]:
                            if "content" in candidate and "parts" in candidate["content"]:
                                for part in candidate["content"]["parts"]:
                                    if "text" in part:
                                        text = part["text"]
                                        response_text += text
                                        token_count += 1

                                        # Emit stream token trace event
                                        await emit_trace_event(
                                            agent_id,
                                            TraceEventType.LLM_STREAM_TOKEN,
                                            {"token": text, "index": token_count}
                                        )

            # Emit complete response trace event
            await emit_trace_event(
                agent_id,
                TraceEventType.LLM_RESPONSE,
                {
                    "content": response_text,
                    "tokens": token_count,
                    "provider": "google",
                    "model": model
                }
            )

            return {"content": response_text, "tokens": token_count}
        else:
            # Non-streaming response
            response = await client.post(url, json=payload)
            response.raise_for_status()
            data = response.json()

            # Extract response text
            response_text = ""
            for candidate in data.get("candidates", []):
                if "content" in candidate and "parts" in candidate["content"]:
                    for part in candidate["content"]["parts"]:
                        if "text" in part:
                            response_text += part["text"]

            # Emit response trace event
            await emit_trace_event(
                agent_id,
                TraceEventType.LLM_RESPONSE,
                {
                    "content": response_text,
                    "provider": "google",
                    "model": model
                }
            )

            return {"content": response_text}


async def proxy_openai(
    agent_id: str,
    api_key: str,
    model: str,
    messages: list,
    temperature: float,
    max_tokens: Optional[int],
    stream: bool
) -> dict:
    """Proxy request to OpenAI and emit trace events"""
    # TODO: Implement OpenAI proxy with trace events
    raise NotImplementedError("OpenAI proxy not yet implemented")