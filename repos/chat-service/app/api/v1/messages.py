"""
Chat message API endpoints - REST + SSE streaming
"""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
import json
import httpx
import logging
import time

from app.core.database import async_session_maker, ChatMessage, ChatSession
from app.core.security import get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()
logger = logging.getLogger(__name__)

class MessageCreate(BaseModel):
    content: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime

class ChatHistoryResponse(BaseModel):
    session_id: str
    agent_id: int
    title: str
    messages: List[MessageResponse]
    created_at: datetime

@router.post("/sessions/{session_id}/messages/stream")
async def send_message_stream(
    session_id: str,
    request: MessageCreate,
    current_user: dict = Depends(get_current_user),
    authorization: str = None
):
    """
    Send message to agent and stream response via SSE
    Returns Server-Sent Events stream with agent response
    """
    logger.info(f"[Messages API] Streaming message for session {session_id}")

    # Get session info
    async with async_session_maker() as db:
        result = await db.execute(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        session = result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        trace_id = session.trace_id
        agent_id = session.agent_id
        user_id = current_user["username"]

        # Save user message
        user_msg = ChatMessage(
            session_id=session_id,
            role="user",
            content=request.content,
            user_id=user_id
        )
        db.add(user_msg)
        await db.commit()

    # Get JWT token from header
    token = None
    if authorization:
        token = authorization.replace("Bearer ", "")

    # Stream response
    async def event_generator():
        """Generate SSE events from agent A2A stream"""
        accumulated_response = ""

        try:
            # Get agent URL
            agent_url = await _get_agent_url(agent_id, token)
            if not agent_url:
                yield f"data: {json.dumps({'type': 'error', 'message': 'Agent not found'})}\n\n"
                return

            # Send stream start event
            yield f"data: {json.dumps({'type': 'stream_start', 'session_id': session_id})}\n\n"

            # Stream from agent via A2A
            async for event in _stream_from_agent_a2a(agent_url, request.content, session_id, trace_id):
                if event["type"] == "text_token":
                    accumulated_response += event["content"]
                    # Send text token to client
                    yield f"data: {json.dumps(event)}\n\n"

                elif event["type"] == "trace_event":
                    # Log to tracing service
                    await _log_to_tracing(
                        trace_id=trace_id,
                        level=event.get("level", "INFO"),
                        log_type=event.get("log_type", "AGENT"),
                        message=event.get("message", ""),
                        metadata=event.get("metadata", {})
                    )

            # Save assistant response
            async with async_session_maker() as db:
                assistant_msg = ChatMessage(
                    session_id=session_id,
                    role="assistant",
                    content=accumulated_response,
                    user_id="system"
                )
                db.add(assistant_msg)
                await db.commit()

            # Send stream end event
            yield f"data: {json.dumps({'type': 'stream_end', 'session_id': session_id})}\n\n"

        except Exception as e:
            logger.error(f"[Messages API] Error streaming: {e}", exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable nginx buffering
        }
    )

@router.get("/sessions/{session_id}/messages/")
async def get_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat history for session"""
    async with async_session_maker() as db:
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp.asc())
        )
        messages = result.scalars().all()

        return [
            MessageResponse(
                id=msg.id,
                role=msg.role,
                content=msg.content,
                timestamp=msg.timestamp
            )
            for msg in messages
        ]

@router.get("/sessions/{session_id}/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get complete chat history including session info and all messages"""
    async with async_session_maker() as db:
        # Get session
        session_result = await db.execute(
            select(ChatSession).where(ChatSession.session_id == session_id)
        )
        session = session_result.scalar_one_or_none()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        # Get messages
        messages_result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.timestamp.asc())
        )
        messages = messages_result.scalars().all()

        return ChatHistoryResponse(
            session_id=session.session_id,
            agent_id=session.agent_id,
            title=session.title,
            messages=[
                MessageResponse(
                    id=msg.id,
                    role=msg.role,
                    content=msg.content,
                    timestamp=msg.timestamp
                )
                for msg in messages
            ],
            created_at=session.created_at
        )

async def _get_agent_url(agent_id: int, token: str) -> Optional[str]:
    """Get agent A2A URL from agent service"""
    try:
        logger.info(f"[Messages API] Getting agent URL for agent_id={agent_id}")
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"http://agent-service:8002/api/agents/by-id/{agent_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 200:
                agent_data = response.json()
                agent_card = agent_data.get("agent_card", {})
                agent_url = agent_card.get("url") or agent_card.get("a2a_endpoint")
                logger.info(f"[Messages API] Got agent URL: {agent_url}")
                return agent_url
            else:
                logger.error(f"[Messages API] Failed to get agent info: {response.status_code}")
                return None
    except Exception as e:
        logger.error(f"[Messages API] Error getting agent URL: {e}", exc_info=True)
        return None

async def _stream_from_agent_a2a(
    agent_url: str,
    user_message: str,
    session_id: str,
    trace_id: str
):
    """
    Stream response from agent via A2A SSE protocol
    Yields events: {"type": "text_token", "content": "..."} or {"type": "trace_event", ...}
    """
    # Build A2A JSON-RPC 2.0 request for streaming
    message_id = f"msg-{session_id}-{int(time.time() * 1000)}"
    a2a_request = {
        "jsonrpc": "2.0",
        "method": "message/stream",
        "params": {
            "message": {
                "messageId": message_id,
                "role": "user",
                "parts": [
                    {
                        "kind": "text",
                        "text": user_message
                    }
                ],
                "contextId": session_id
            }
        },
        "id": f"req-{session_id}"
    }

    logger.info(f"[A2A] Calling agent: POST {agent_url}")

    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            async with client.stream(
                "POST",
                agent_url,
                json=a2a_request,
                headers={"Accept": "text/event-stream"}
            ) as response:
                response.raise_for_status()
                logger.info(f"[A2A] Stream response status: {response.status_code}")

                # Parse SSE events
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data_str = line[6:]  # Remove "data: " prefix

                    try:
                        event_data = json.loads(data_str)
                        logger.info(f"[A2A] Received SSE event: {json.dumps(event_data)[:200]}")

                        # Parse JSON-RPC response
                        if "result" in event_data:
                            result = event_data["result"]

                            # Handle different result types based on A2A spec
                            if isinstance(result, dict):
                                kind = result.get("kind")

                                if kind == "status-update":
                                    # TaskStatusUpdateEvent
                                    status = result.get("status", {})
                                    state = status.get("state")

                                    # Emit trace event for status change
                                    yield {
                                        "type": "trace_event",
                                        "level": "INFO",
                                        "log_type": "AGENT",
                                        "message": f"Agent status: {state}",
                                        "metadata": {"state": state, "task_id": result.get("taskId")}
                                    }

                                elif kind == "artifact-update":
                                    # TaskArtifactUpdateEvent - contains agent response
                                    artifact = result.get("artifact", {})
                                    parts = artifact.get("parts", [])

                                    for part in parts:
                                        if part.get("kind") == "text":
                                            # Yield text token for chat UI
                                            yield {
                                                "type": "text_token",
                                                "content": part.get("text", "")
                                            }

                                elif "parts" in result:
                                    # Message object with parts
                                    for part in result.get("parts", []):
                                        if part.get("kind") == "text":
                                            yield {
                                                "type": "text_token",
                                                "content": part.get("text", "")
                                            }

                                elif "status" in result:
                                    # Task object
                                    status = result.get("status", {})
                                    state = status.get("state")
                                    yield {
                                        "type": "trace_event",
                                        "level": "INFO",
                                        "log_type": "AGENT",
                                        "message": f"Task {state}",
                                        "metadata": {"task_id": result.get("id"), "state": state}
                                    }

                    except json.JSONDecodeError as e:
                        logger.warning(f"[A2A] Failed to parse SSE data: {e}")
                        continue

    except httpx.HTTPStatusError as e:
        logger.error(f"[A2A] HTTP error: {e.response.status_code} - {e.response.text}")
        raise
    except Exception as e:
        logger.error(f"[A2A] Error streaming from agent: {e}", exc_info=True)
        raise

async def _log_to_tracing(
    trace_id: str,
    level: str,
    log_type: str,
    message: str,
    metadata: Dict[str, Any]
):
    """Send log to tracing service"""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(
                "http://tracing-service:8004/api/tracing/logs",
                json={
                    "trace_id": trace_id,
                    "service_name": "chat-service",
                    "level": level,
                    "log_type": log_type,
                    "message": message,
                    "metadata": metadata
                }
            )
    except Exception as e:
        logger.error(f"Failed to log to tracing: {e}")
