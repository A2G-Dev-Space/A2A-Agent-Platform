"""
Workbench API endpoints for single-user agent testing
Handles chat streaming for framework-specific agent endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm.attributes import flag_modified
from pydantic import BaseModel
from typing import Optional, List, Literal
import httpx
import logging
import time
import json

from app.core.database import get_db, Agent
from app.core.security import get_current_user
from app.frameworks import get_framework_adapter

router = APIRouter()
logger = logging.getLogger(__name__)


class ConversationMessage(BaseModel):
    """Single message in conversation history"""
    role: Literal["user", "assistant"]
    content: str


class WorkbenchChatRequest(BaseModel):
    """Request model for workbench chat"""
    agent_id: int
    content: str
    selected_resource: Optional[str] = None  # team_id or agent_id for Agno
    messages: Optional[List[ConversationMessage]] = None  # Conversation history for context


@router.post("/workbench/chat")
async def workbench_chat(
    request: WorkbenchChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Chat with agent in Workbench (streaming, for ADK)

    This endpoint:
    1. Fetches agent info from database
    2. Uses JSON-RPC message/stream to communicate with ADK agent
    3. Streams SSE response back to frontend

    For ADK agents only - Agno should use /workbench/chat/stream
    """
    user_id = current_user.get("username")
    logger.info(f"[Workbench] ADK streaming chat request: agent_id={request.agent_id}, user_id={user_id}")

    # Fetch agent from database
    query = select(Agent).where(Agent.id == request.agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Verify user owns the agent (for Workbench security)
    if agent.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to chat with this agent")

    # Check if agent has endpoint configured
    if not agent.a2a_endpoint:
        raise HTTPException(status_code=400, detail="Agent endpoint not configured")

    # ADK streaming endpoint
    if agent.framework.value != "ADK":
        raise HTTPException(status_code=400, detail="This endpoint is for ADK agents only. Use /workbench/chat/stream for Agno.")

    # Translate localhost to host.docker.internal for Docker containers
    agent_endpoint = agent.a2a_endpoint.replace("localhost", "host.docker.internal")

    logger.info(f"[Workbench] Forwarding to ADK agent (streaming): {agent_endpoint}")

    # Forward request to ADK agent endpoint and stream response
    async def stream_generator():
        """Generator that forwards streaming JSON-RPC response from ADK agent"""
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # ADK uses JSON-RPC 2.0 with A2A protocol
                # Use message/stream method (streaming)
                rpc_request = {
                    "jsonrpc": "2.0",
                    "method": "message/stream",
                    "params": {
                        "message": {
                            "messageId": f"msg-{request.agent_id}-{user_id}-{int(time.time()*1000)}",
                            "role": "user",
                            "parts": [{"kind": "text", "text": request.content}],
                            "kind": "message"
                        }
                    },
                    "id": f"workbench-{request.agent_id}-stream"
                }

                async with client.stream(
                    "POST",
                    agent_endpoint,
                    json=rpc_request,
                    headers={
                        "Accept": "application/x-ndjson",  # JSON-RPC streaming uses newline-delimited JSON
                    }
                ) as response:
                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"[Workbench] ADK agent returned error: {response.status_code} - {error_text}")
                        yield f"data: {{'type': 'error', 'message': 'Agent returned error: {response.status_code}'}}\n\n"
                        return

                    # Stream JSON-RPC responses line-by-line
                    # ADK sends SSE format (data: {...}\n\n)
                    logger.info(f"[Workbench] Starting ADK streaming for agent_id={request.agent_id}")
                    async for line in response.aiter_lines():
                        if not line or line.strip() == "":
                            continue

                        try:
                            # ADK sends SSE format: "data: {...json...}"
                            # Strip "data: " prefix if present
                            line_data = line.strip()
                            if line_data.startswith("data: "):
                                line_data = line_data[6:]  # Remove "data: " prefix

                            # Parse JSON-RPC response
                            rpc_response = json.loads(line_data)

                            # Extract A2A event from JSON-RPC result
                            if "result" in rpc_response:
                                result = rpc_response["result"]

                                # Convert A2A events to SSE format for frontend
                                # TaskStatusUpdateEvent, TaskArtifactUpdateEvent, Message, Task
                                if result.get("kind") == "message":
                                    # Final message
                                    parts = result.get("parts", [])
                                    content = ""
                                    for part in parts:
                                        if part.get("kind") == "text":
                                            content += part.get("text", "")

                                    yield f"data: {json.dumps({'type': 'message', 'content': content})}\n\n"

                                elif result.get("kind") == "artifact-update":
                                    # ADK sends final message as artifact-update with lastChunk=true
                                    if result.get("lastChunk"):
                                        artifact = result.get("artifact", {})
                                        parts = artifact.get("parts", [])
                                        content = ""
                                        for part in parts:
                                            if part.get("kind") == "text":
                                                content += part.get("text", "")

                                        if content:
                                            logger.info(f"[Workbench] ADK final artifact content: {content[:100]}...")
                                            yield f"data: {json.dumps({'type': 'message', 'content': content})}\n\n"

                                elif result.get("kind") == "status-update":
                                    # Streaming progress event (ADK uses status-update, not task_status_update_event)
                                    yield f"data: {json.dumps({'type': 'task_status_update', 'data': result})}\n\n"

                                else:
                                    # Unknown event type
                                    logger.debug(f"[Workbench] Unknown ADK event type: {result.get('kind')}")

                            elif "error" in rpc_response:
                                logger.error(f"[Workbench] ADK JSON-RPC error: {rpc_response['error']}")
                                yield f"data: {json.dumps({'type': 'error', 'message': str(rpc_response['error'])})}\n\n"
                                return

                        except json.JSONDecodeError as e:
                            logger.warning(f"[Workbench] Failed to parse ADK response line: {e}")
                            continue

                    # Stream completed
                    yield f"data: [DONE]\n\n"

        except httpx.TimeoutException:
            logger.error(f"[Workbench] Timeout connecting to ADK agent endpoint")
            yield f"data: {{'type': 'error', 'message': 'Timeout connecting to agent'}}\n\n"
        except httpx.ConnectError as e:
            logger.error(f"[Workbench] Connection error: {e}")
            yield f"data: {{'type': 'error', 'message': 'Cannot connect to agent endpoint'}}\n\n"
        except Exception as e:
            logger.error(f"[Workbench] ADK streaming error: {e}", exc_info=True)
            yield f"data: {{'type': 'error', 'message': 'Internal streaming error'}}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


@router.post("/workbench/chat/stream")
async def workbench_chat_stream(
    request: WorkbenchChatRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream chat with agent in Workbench (streaming, for Agno)

    This endpoint:
    1. Fetches agent info from database
    2. Uses framework adapter to build correct endpoint
    3. Forwards request to agent endpoint
    4. Streams SSE response back to frontend

    For Agno agents only - ADK should use /workbench/chat
    """
    user_id = current_user.get("username")
    logger.info(f"[Workbench] Streaming chat request: agent_id={request.agent_id}, user_id={user_id}")

    # Fetch agent from database
    query = select(Agent).where(Agent.id == request.agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Verify user owns the agent (for Workbench security)
    if agent.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to chat with this agent")

    # Check if agent has endpoint configured
    if not agent.a2a_endpoint:
        raise HTTPException(status_code=400, detail="Agent endpoint not configured")

    # Agno only supports streaming
    if agent.framework.value != "Agno":
        raise HTTPException(status_code=400, detail="This endpoint is for Agno agents only. Use /workbench/chat for ADK.")

    # Get framework adapter
    try:
        adapter = get_framework_adapter(agent.framework.value)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Translate localhost to host.docker.internal for Docker containers
    # This allows users to use localhost in UI while backend can reach host machine
    agent_endpoint = agent.a2a_endpoint.replace("localhost", "host.docker.internal")

    # Build chat endpoint using adapter
    if request.selected_resource:
        chat_endpoint = adapter.build_chat_endpoint(agent_endpoint, request.selected_resource)
    else:
        # For ADK and other frameworks without resource selection
        chat_endpoint = adapter.build_chat_endpoint(agent_endpoint, None)

    logger.info(f"[Workbench] Forwarding to: {chat_endpoint}")

    # Forward request to agent endpoint and stream response
    async def stream_generator():
        """Generator that forwards streaming response from agent"""
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Prepare request based on framework
                if agent.framework.value == "Agno":
                    # Agno uses multipart/form-data (no session - we manage history in frontend)
                    # Format conversation history as text if provided
                    message_content = request.content
                    if request.messages and len(request.messages) > 0:
                        # Format history as OpenAI-compatible text
                        history_text = "Previous conversation:\n"
                        for msg in request.messages:
                            role = "User" if msg.role == "user" else "Assistant"
                            history_text += f"{role}: {msg.content}\n"
                        message_content = f"{history_text}\nCurrent message:\n{request.content}"

                    # Prepare multipart/form-data (as per Agno API spec)
                    form_data = {
                        "message": message_content,
                        "stream": "true",
                        "monitor": "true",  # Enable monitoring/logging
                        "user_id": user_id,
                    }

                    async with client.stream(
                        "POST",
                        chat_endpoint,
                        data=form_data,
                        files=[],  # Empty files list ensures multipart/form-data encoding
                        headers={
                            "Accept": "text/event-stream",
                        }
                    ) as response:
                        if response.status_code != 200:
                            error_text = await response.aread()
                            logger.error(f"[Workbench] Agent returned error: {response.status_code} - {error_text}")
                            yield f"data: {{'type': 'error', 'message': 'Agent returned error: {response.status_code}'}}\n\n"
                            return

                        # Stream SSE events line-by-line for immediate forwarding
                        # aiter_lines() is optimized for SSE protocol (line-based)
                        # IMPORTANT: Do NOT skip empty lines - they are SSE event separators!
                        logger.info(f"[Workbench] Starting real-time SSE streaming for agent_id={request.agent_id}")
                        async for line in response.aiter_lines():
                            # Forward ALL lines including empty ones (SSE event separators)
                            logger.debug(f"[Workbench] SSE line: {line[:100] if line else '(empty)'}...")
                            yield f"{line}\n"

                elif agent.framework.value == "ADK":
                    # ADK uses JSON-RPC 2.0 format
                    # TODO: Implement ADK streaming
                    yield f"data: {{'type': 'error', 'message': 'ADK streaming not implemented yet'}}\n\n"

                else:
                    yield f"data: {{'type': 'error', 'message': 'Unsupported framework'}}\n\n"

        except httpx.TimeoutException:
            logger.error(f"[Workbench] Timeout connecting to agent endpoint")
            yield f"data: {{'type': 'error', 'message': 'Timeout connecting to agent'}}\n\n"
        except httpx.ConnectError as e:
            logger.error(f"[Workbench] Connection error: {e}")
            yield f"data: {{'type': 'error', 'message': 'Cannot connect to agent endpoint'}}\n\n"
        except Exception as e:
            logger.error(f"[Workbench] Streaming error: {e}", exc_info=True)
            yield f"data: {{'type': 'error', 'message': 'Internal streaming error'}}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )


class WorkbenchMessage(BaseModel):
    """Message model for workbench conversation history"""
    id: str
    role: Literal["user", "assistant", "system"]
    content: str
    timestamp: str  # ISO format string
    systemEvents: Optional[List[dict]] = None  # For system event messages


@router.get("/workbench/messages/{agent_id}")
async def get_workbench_messages(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get conversation history for an agent in Workbench mode
    """
    user_id = current_user.get("username")

    # Verify agent exists and user owns it
    query = select(Agent).where(Agent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Get messages from database
    workbench_messages = agent.workbench_messages or {}
    messages = workbench_messages.get(user_id, [])

    return {"messages": messages}


@router.post("/workbench/messages/{agent_id}")
async def save_workbench_messages(
    agent_id: int,
    messages: List[WorkbenchMessage],
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Save conversation history for an agent in Workbench mode
    """
    user_id = current_user.get("username")

    # Verify agent exists and user owns it
    query = select(Agent).where(Agent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    if agent.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Save messages to database
    workbench_messages = agent.workbench_messages or {}
    workbench_messages[user_id] = [msg.model_dump() for msg in messages]
    agent.workbench_messages = workbench_messages

    # Mark JSON column as modified (SQLAlchemy doesn't auto-detect JSON changes)
    flag_modified(agent, 'workbench_messages')

    await db.commit()
    logger.info(f"[Workbench] Saved {len(messages)} messages to DB for agent_id={agent_id}, user_id={user_id}")

    return {"success": True, "message_count": len(messages)}
