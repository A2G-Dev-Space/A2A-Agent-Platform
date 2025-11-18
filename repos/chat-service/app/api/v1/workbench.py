"""
Workbench Chat API - Stateless chat for development/testing
No sessions, no history persistence, just direct agent communication with trace support
"""
from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator
from datetime import datetime
import httpx
import json
import time
import asyncio
import logging

from app.core.security import get_current_user
from app.core.database import async_session_maker, WorkbenchSession, get_db
from app.utils.agent_helpers import get_agent_info, get_agent_trace_id, stream_from_agent_a2a
from sqlalchemy import select, and_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import attributes

logger = logging.getLogger(__name__)
router = APIRouter()

class SystemEvent(BaseModel):
    """System event from agent (tool calls, agent transfers, etc.)"""
    event: str
    data: dict
    timestamp: str

class Message(BaseModel):
    """Individual message in conversation"""
    id: Optional[str] = None  # Message ID from frontend
    role: str  # 'user' or 'assistant' or 'system'
    content: str
    timestamp: Optional[str] = None  # Timestamp from frontend
    systemEvents: Optional[list[SystemEvent]] = None  # System events for this message

class WorkbenchMessage(BaseModel):
    """Message request for Workbench with conversation history (ADK and Agno)"""
    agent_id: int
    messages: list[Message] = []  # Array of messages for conversation context (ADK)
    session_id: Optional[str] = None  # Optional sessionId for agent-managed sessions (ADK)
    # Agno-specific fields
    content: Optional[str] = None  # Single message content for Agno
    selected_resource: Optional[str] = None  # team_id or agent_id for Agno framework

@router.post("/workbench/chat/stream")
async def workbench_chat_stream(
    request: WorkbenchMessage,
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None)
):
    """
    Stream chat response from agent for Workbench mode (ADK and Agno)
    - ADK: Uses messages array with A2A JSON-RPC protocol
    - Agno: Uses content + selected_resource with multipart/form-data
    """
    user_id = current_user["username"]
    token = authorization.replace("Bearer ", "") if authorization else ""

    # Get full agent info (framework, endpoint, trace_id)
    agent_info = await get_agent_info(request.agent_id, token)
    if not agent_info:
        raise HTTPException(status_code=404, detail="Agent not found")

    framework = agent_info.get("framework", "ADK")
    agent_url = agent_info.get("a2a_endpoint")
    trace_id = agent_info.get("trace_id")

    if not agent_url:
        raise HTTPException(status_code=400, detail="Agent endpoint not configured")

    logger.info(f"[Workbench] Chat request: agent={request.agent_id}, framework={framework}, user={user_id}")

    # Branch based on framework
    if framework == "Agno":
        # Agno: Use content + selected_resource
        if not request.content:
            raise HTTPException(status_code=400, detail="content is required for Agno agents")

        return await _handle_agno_stream(request, agent_url, user_id, trace_id)

    else:  # ADK or other frameworks
        # ADK: Use messages array (existing logic)
        if not trace_id:
            raise HTTPException(status_code=404, detail="trace_id missing for ADK agent")

        if not request.messages:
            raise HTTPException(status_code=400, detail="messages array is required for ADK agents")

        session_info = f", session_id={request.session_id}" if request.session_id else " (no session)"
        logger.info(f"[Workbench] ADK: messages={len(request.messages)}, trace_id={trace_id}{session_info}")

        # Stream response from ADK agent (existing logic)
        async def event_stream() -> AsyncGenerator[str, None]:
            """Stream events from ADK agent"""
            yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id})}\n\n"

            try:
                async for event in stream_from_agent_a2a(agent_url, request.messages, trace_id, request.session_id):
                    if event["type"] == "text_token":
                        yield f"data: {json.dumps(event)}\n\n"

                yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

            except Exception as e:
                logger.error(f"[Workbench] Error streaming from ADK agent: {e}")
                error_event = {"type": "error", "message": str(e)}
                yield f"data: {json.dumps(error_event)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
                "X-Trace-ID": trace_id
            }
        )

@router.get("/workbench/messages/{agent_id}")
async def get_workbench_messages(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get stored messages for user+agent combination
    """
    user_id = current_user["username"]

    # Find existing session
    result = await db.execute(
        select(WorkbenchSession).where(
            and_(
                WorkbenchSession.user_id == user_id,
                WorkbenchSession.agent_id == agent_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if session:
        return {"messages": session.messages}
    return {"messages": []}

@router.post("/workbench/messages/{agent_id}")
async def save_workbench_messages(
    agent_id: int,
    messages: list[Message],
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Save messages for user+agent combination
    """
    user_id = current_user["username"]

    # Find or create session
    result = await db.execute(
        select(WorkbenchSession).where(
            and_(
                WorkbenchSession.user_id == user_id,
                WorkbenchSession.agent_id == agent_id
            )
        )
    )
    session = result.scalar_one_or_none()

    # Convert messages to dict format for storage
    message_dicts = []
    for i, msg in enumerate(messages):
        msg_dict = {
            "id": msg.id or f"msg-{int(time.time() * 1000)}-{i}",
            "role": msg.role,
            "content": msg.content,
            "timestamp": msg.timestamp or datetime.utcnow().isoformat()
        }
        # Include systemEvents if present
        if msg.systemEvents:
            msg_dict["systemEvents"] = [
                {
                    "event": event.event,
                    "data": event.data,
                    "timestamp": event.timestamp
                }
                for event in msg.systemEvents
            ]
        message_dicts.append(msg_dict)

    if session:
        # Update existing session
        session.messages = message_dicts
        session.updated_at = datetime.utcnow()
        attributes.flag_modified(session, "messages")
    else:
        # Create new session
        session = WorkbenchSession(
            user_id=user_id,
            agent_id=agent_id,
            messages=message_dicts
        )
        db.add(session)

    await db.commit()

    logger.info(f"[Workbench] Saved {len(messages)} messages for {user_id}, agent {agent_id}")
    return {"status": "success", "message_count": len(messages)}

class ClearRequest(BaseModel):
    """Request to clear workbench data"""
    agent_id: int

@router.post("/workbench/clear")
async def clear_workbench_data(
    request: ClearRequest,
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Clear both chat history and trace data for the user+agent combination
    """
    user_id = current_user["username"]
    token = authorization.replace("Bearer ", "") if authorization else ""
    trace_id = await get_agent_trace_id(request.agent_id, token)

    if not trace_id:
        logger.warning(f"[Workbench] Could not retrieve trace_id for agent {request.agent_id}, skipping trace clear")
        # Continue to clear chat messages even if trace_id is not available

    # 1. Clear chat messages from database
    try:
        await db.execute(
            delete(WorkbenchSession).where(
                and_(
                    WorkbenchSession.user_id == user_id,
                    WorkbenchSession.agent_id == request.agent_id
                )
            )
        )
        await db.commit()
        logger.info(f"[Workbench] Cleared chat messages for {user_id}, agent {request.agent_id}")
    except Exception as e:
        logger.error(f"[Workbench] Error clearing chat messages: {e}")
        await db.rollback()

    # 2. Clear trace data from Tracing Service
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.delete(
                f"http://tracing-service:8004/api/tracing/traces/{trace_id}"
            )
            if response.status_code == 200:
                logger.info(f"[Workbench] Cleared trace data for {user_id}, agent {request.agent_id}")
                return {"status": "success", "message": "Chat and trace data cleared"}
            else:
                logger.warning(f"[Workbench] Failed to clear trace: {response.status_code}")
                return {"status": "partial", "message": "Chat cleared, but trace data may not be fully cleared"}
    except Exception as e:
        logger.error(f"[Workbench] Error clearing trace: {e}")
        return {"status": "partial", "message": "Chat cleared, but failed to clear trace data"}


async def _handle_agno_stream(
    request: WorkbenchMessage,
    agent_url: str,
    user_id: str,
    trace_id: Optional[str]
) -> StreamingResponse:
    """
    Handle Agno framework streaming using multipart/form-data
    Agno uses team-based routing with direct SSE streaming
    """
    # Replace localhost with host.docker.internal for Docker network
    agent_url = agent_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

    # Build Agno chat endpoint based on selected_resource
    # Agno uses team-based routing: {agent_url}/teams/{team_id}/runs
    if request.selected_resource:
        # Remove 'team_' prefix if exists, otherwise use as-is
        team_id = request.selected_resource.replace("team_", "") if request.selected_resource.startswith("team_") else request.selected_resource
        chat_endpoint = f"{agent_url.rstrip('/')}/teams/{team_id}/runs"
    else:
        # Default to direct endpoint (no team routing)
        chat_endpoint = f"{agent_url.rstrip('/')}/runs"

    logger.info(f"[Workbench] Agno endpoint: {chat_endpoint}")

    async def stream_generator():
        """Generator that forwards streaming response from Agno agent"""
        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Build message content with conversation history if provided
                message_content = request.content or ""

                if request.messages and len(request.messages) > 0:
                    history_text = "Previous conversation:\n"
                    for msg in request.messages:
                        role = "User" if msg.role == "user" else "Assistant"
                        history_text += f"{role}: {msg.content}\n"
                    message_content = f"{history_text}\nCurrent message:\n{message_content}"

                # Agno uses multipart/form-data
                form_data = {
                    "message": message_content,
                    "stream": "true",
                    "monitor": "true",
                    "user_id": user_id,
                }

                logger.info("=" * 80)
                logger.info(f"[Workbench] Sending Agno request:")
                logger.info(f"  Endpoint: {chat_endpoint}")
                logger.info(f"  Message length: {len(message_content)}")
                logger.info(f"  User: {user_id}")
                logger.info(f"  Form data: {form_data}")
                logger.info("=" * 80)

                # Start SSE streaming
                async with client.stream(
                    "POST",
                    chat_endpoint,
                    data=form_data,
                    files=[],  # Empty files list ensures multipart/form-data encoding
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    logger.info(f"[Workbench] Agno response received: status={response.status_code}, headers={dict(response.headers)}")

                    if response.status_code != 200:
                        error_text = await response.aread()
                        logger.error(f"[Workbench] Agno agent returned error: {response.status_code} - {error_text}")
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Agent returned error: {response.status_code}'})}\n\n"
                        return

                    # Stream start event with trace_id if available
                    if trace_id:
                        yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id})}\n\n"
                    else:
                        yield f"data: {json.dumps({'type': 'stream_start'})}\n\n"

                    # Forward SSE events line-by-line from Agno agent
                    logger.info(f"[Workbench] Starting real-time SSE streaming from Agno agent")
                    async for line in response.aiter_lines():
                        # Forward ALL lines including empty ones (SSE event separators)
                        logger.debug(f"[Workbench] Agno SSE line: {line[:100] if line else '(empty)'}...")
                        yield f"{line}\n"

                    # Stream end event
                    yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"
                    logger.info(f"[Workbench] Agno stream completed")

        except httpx.TimeoutException:
            logger.error(f"[Workbench] Agno stream timeout")
            yield f"data: {json.dumps({'type': 'error', 'message': 'Request timeout'})}\n\n"
        except Exception as e:
            logger.error(f"[Workbench] Error streaming from Agno agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            **({"X-Trace-ID": trace_id} if trace_id else {})
        }
    )