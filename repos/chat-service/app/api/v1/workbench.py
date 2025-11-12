"""
Workbench Chat API - Stateless chat for development/testing
No sessions, no history persistence, just direct agent communication with trace support
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
import httpx
import json
import time
import asyncio
import logging
import hashlib

from app.core.security import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter()

class Message(BaseModel):
    """Individual message in conversation"""
    role: str  # 'user' or 'assistant'
    content: str

class WorkbenchMessage(BaseModel):
    """Message request for Workbench with conversation history"""
    agent_id: int
    messages: list[Message]  # Array of messages for conversation context

async def generate_fixed_trace_id(user_id: str, agent_id: int) -> str:
    """Generate a fixed trace_id from user_id and agent_id"""
    # Create deterministic trace_id that's always the same for user+agent combination
    combined = f"{user_id}_{agent_id}"
    # Use hash to create a valid UUID-like format
    hash_obj = hashlib.md5(combined.encode())
    hex_dig = hash_obj.hexdigest()
    # Format as UUID-like string
    trace_id = f"{hex_dig[:8]}-{hex_dig[8:12]}-{hex_dig[12:16]}-{hex_dig[16:20]}-{hex_dig[20:32]}"
    return trace_id

@router.post("/workbench/chat/stream")
async def workbench_chat_stream(
    request: WorkbenchMessage,
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """
    Stream chat response from agent for Workbench mode
    Maintains conversation history within the session (client-managed)
    Uses fixed trace_id based on user_id + agent_id
    """
    user_id = current_user["username"]
    trace_id = await generate_fixed_trace_id(user_id, request.agent_id)

    logger.info(f"[Workbench] Chat request from {user_id} to agent {request.agent_id}, messages={len(request.messages)}, trace_id={trace_id}")

    # Get agent URL
    agent_url = await _get_agent_url(request.agent_id, authorization.replace("Bearer ", ""))
    if not agent_url:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Stream response from agent
    async def event_stream() -> AsyncGenerator[str, None]:
        """Stream events from agent"""
        yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id})}\n\n"

        try:
            async for event in _stream_from_agent_a2a(agent_url, request.messages, trace_id):
                if event["type"] == "text_token":
                    yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

        except Exception as e:
            logger.error(f"[Workbench] Error streaming from agent: {e}")
            error_event = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "X-Trace-ID": trace_id  # Include trace_id in response header
        }
    )

@router.post("/workbench/clear")
async def clear_workbench_data(
    agent_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Clear trace data for the user+agent combination
    Note: Chat history is not persisted in Workbench mode
    """
    user_id = current_user["username"]
    trace_id = await generate_fixed_trace_id(user_id, agent_id)

    # Clear trace data from Tracing Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.delete(
                f"http://tracing-service:8004/api/tracing/traces/{trace_id}"
            )
            if response.status_code == 200:
                logger.info(f"[Workbench] Cleared trace data for {user_id}, agent {agent_id}")
                return {"status": "success", "message": "Trace data cleared"}
            else:
                logger.warning(f"[Workbench] Failed to clear trace: {response.status_code}")
                return {"status": "partial", "message": "Trace data may not be fully cleared"}
    except Exception as e:
        logger.error(f"[Workbench] Error clearing trace: {e}")
        return {"status": "error", "message": "Failed to clear trace data"}

async def _get_agent_url(agent_id: int, token: str) -> Optional[str]:
    """Get agent A2A URL from agent service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"http://agent-service:8002/api/agents/by-id/{agent_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                agent_data = response.json()
                agent_card = agent_data.get("agent_card", {})
                return agent_card.get("url") or agent_card.get("a2a_endpoint")
            return None
    except Exception as e:
        logger.error(f"[Workbench] Error getting agent URL: {e}")
        return None

async def _stream_from_agent_a2a(agent_url: str, messages: list[Message], trace_id: str):
    """
    Stream response from agent via A2A protocol (ADK agents)
    Uses metadata field to pass conversation history
    """
    agent_url = agent_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

    if not messages:
        raise ValueError("No messages provided")

    # Get current message (last in the list)
    current_message = messages[-1]

    # Build conversation history for metadata (exclude current message)
    conversation_history = []
    if len(messages) > 1:
        for msg in messages[:-1]:
            conversation_history.append({
                "role": msg.role,
                "content": msg.content
            })

    # Generate unique message ID
    message_id = f"msg-{int(time.time() * 1000)}"

    # Build A2A request with metadata containing conversation history
    a2a_request = {
        "jsonrpc": "2.0",
        "method": "message/send",  # A2A doesn't support streaming yet, use send
        "params": {
            "message": {
                "messageId": message_id,
                "role": "user",
                "parts": [{"kind": "text", "text": current_message.content}],
                "metadata": {
                    "conversation_history": conversation_history,
                    "trace_id": trace_id
                } if conversation_history else {"trace_id": trace_id}
            }
        },
        "id": f"workbench-{trace_id}"
    }

    logger.info(f"[Workbench] Sending message with {len(conversation_history)} history items")

    async with httpx.AsyncClient(timeout=300.0) as client:
        # A2A doesn't support streaming yet, use message/send (non-streaming)
        logger.info(f"[Workbench] Sending A2A request to {agent_url}")

        response = await client.post(
            agent_url,
            json=a2a_request,
            headers={
                "Content-Type": "application/json",
                "X-Trace-ID": trace_id
            }
        )

        response.raise_for_status()
        result_data = response.json()
        # Log full response for debugging
        logger.info(f"[Workbench] FULL Agent response: {json.dumps(result_data, indent=2)}")

        # Process non-streaming response
        if "result" in result_data:
            result = result_data["result"]
            logger.info(f"[Workbench] Result type: {type(result)}")
            if isinstance(result, dict):
                logger.info(f"[Workbench] Result keys: {list(result.keys())}")
                logger.info(f"[Workbench] has 'artifacts': {'artifacts' in result}, has 'status': {'status' in result}, has 'parts': {'parts' in result}, has 'history': {'history' in result}")

            # Handle artifacts format
            if isinstance(result, dict) and "artifacts" in result:
                logger.info(f"[Workbench] Processing artifacts: {len(result.get('artifacts', []))} artifacts")
                for artifact in result.get("artifacts", []):
                    for part in artifact.get("parts", []):
                        if part.get("kind") == "text":
                            text_content = part.get("text", "")
                            logger.info(f"[Workbench] Yielding text: {text_content[:100]}")
                            yield {"type": "text_token", "content": text_content}

            # Handle task status format
            elif isinstance(result, dict) and "status" in result:
                status_message = result.get("status", {}).get("message", {})
                if isinstance(status_message, dict) and "parts" in status_message:
                    for part in status_message.get("parts", []):
                        if part.get("kind") == "text":
                            yield {"type": "text_token", "content": part.get("text", "")}

            # Handle message format (most common for ADK agents)
            elif isinstance(result, dict) and "parts" in result:
                for part in result.get("parts", []):
                    if part.get("kind") == "text":
                        yield {"type": "text_token", "content": part.get("text", "")}

            # Handle A2A history format (ADK agents)
            elif isinstance(result, dict) and "history" in result:
                logger.info(f"[Workbench] Processing history format: {len(result.get('history', []))} messages")
                history = result.get("history", [])
                # Find the last assistant message in history
                for message in reversed(history):
                    if message.get("role") == "assistant" and message.get("kind") == "message":
                        for part in message.get("parts", []):
                            if part.get("kind") == "text":
                                text_content = part.get("text", "")
                                logger.info(f"[Workbench] Yielding text from history: {text_content[:100]}")
                                yield {"type": "text_token", "content": text_content}
                        break

        elif "error" in result_data:
            error = result_data["error"]
            raise Exception(f"Agent error: {error.get('message')}")