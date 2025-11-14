"""
Chat message API endpoints - REST + SSE streaming
"""
from fastapi import APIRouter, Depends, HTTPException, status, Header
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
    authorization: Optional[str] = Header(None)
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

    # Get JWT token from header (authorization already includes "Bearer " prefix)
    token = authorization.replace("Bearer ", "") if authorization else None

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
                logger.info(f"[SSE] Received event from agent: type={event.get('type')}, content={str(event.get('content', ''))[:50]}")
                if event["type"] == "text_token":
                    accumulated_response += event["content"]
                    logger.info(f"[SSE] Sending text_token to client: {event['content'][:50]}")
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
    Stream response from agent via A2A protocol
    Tries message/stream first, falls back to message/invoke if not supported
    Yields events: {"type": "text_token", "content": "..."} or {"type": "trace_event", ...}
    """
    # Transform localhost to host.docker.internal for Docker environments
    agent_url = agent_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
    logger.info(f"[A2A] Using transformed agent URL: {agent_url}")

    message_id = f"msg-{session_id}-{int(time.time() * 1000)}"

    # Try streaming first
    a2a_stream_request = {
        "jsonrpc": "2.0",
        "method": "message/stream",
        "params": {
            "message": {
                "messageId": message_id,
                "role": "user",
                "parts": [{"kind": "text", "text": user_message}],
                "contextId": session_id
            }
        },
        "id": f"req-{session_id}"
    }

    logger.info(f"[A2A] Calling agent: POST {agent_url}")

    try:
        streaming_supported = False

        async with httpx.AsyncClient(timeout=600.0) as client:  # 10 minutes for long-running A2A requests
            # Try streaming endpoint
            async with client.stream(
                "POST",
                agent_url,
                json=a2a_stream_request,
                headers={
                    "Accept": "text/event-stream",
                    "X-Trace-Id": trace_id  # Pass trace_id to agent
                }
            ) as response:
                response.raise_for_status()
                logger.info(f"[A2A] Stream response status: {response.status_code}")

                # Parse SSE events
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue

                    data_str = line[6:]

                    try:
                        event_data = json.loads(data_str)

                        # Check for streaming not supported error
                        if "error" in event_data:
                            error_msg = event_data["error"].get("message", "")
                            if "not supported" in error_msg.lower():
                                logger.info(f"[A2A] Agent doesn't support streaming, falling back to invoke")
                                break
                            else:
                                logger.error(f"[A2A] Error from agent: {error_msg}")
                                yield {"type": "error", "message": error_msg}
                                return

                        streaming_supported = True
                        logger.info(f"[A2A] Received SSE event: {json.dumps(event_data)[:200]}")

                        if "result" in event_data:
                            result = event_data["result"]
                            if isinstance(result, dict):
                                kind = result.get("kind")

                                if kind == "artifact-update":
                                    artifact = result.get("artifact", {})
                                    parts = artifact.get("parts", [])
                                    for part in parts:
                                        if part.get("kind") == "text":
                                            yield {"type": "text_token", "content": part.get("text", "")}

                                elif "parts" in result:
                                    for part in result.get("parts", []):
                                        if part.get("kind") == "text":
                                            yield {"type": "text_token", "content": part.get("text", "")}

                    except json.JSONDecodeError as e:
                        logger.warning(f"[A2A] Failed to parse SSE data: {e}")
                        continue

        if streaming_supported:
            return

        # Fall back to message/send if streaming not supported
        logger.info(f"[A2A] Using message/send fallback (non-streaming)")
        a2a_send_request = {
            "jsonrpc": "2.0",
            "method": "message/send",
            "params": {
                "message": {
                    "messageId": message_id,
                    "role": "user",
                    "parts": [{"kind": "text", "text": user_message}],
                    "contextId": session_id
                }
            },
            "id": f"req-{session_id}"
        }

        logger.info(f"[A2A] Sending message/send request to {agent_url}")
        logger.debug(f"[A2A] Request payload: {json.dumps(a2a_send_request)[:500]}")

        async with httpx.AsyncClient(timeout=600.0) as client:  # 10 minutes for long-running A2A requests
            response = await client.post(
                agent_url,
                json=a2a_send_request,
                headers={
                    "Content-Type": "application/json",
                    "X-Trace-Id": trace_id  # Pass trace_id to agent
                }
            )

            logger.info(f"[A2A] Response status: {response.status_code}")

            if response.status_code != 200:
                error_text = response.text
                logger.error(f"[A2A] Error response: {error_text}")
                response.raise_for_status()

            result_data = response.json()
            logger.info(f"[A2A] Send response received: {json.dumps(result_data)[:500]}")

            # Handle different A2A response formats
            if "result" in result_data:
                result = result_data["result"]
                logger.debug(f"[A2A] Result type: {type(result)}, keys: {result.keys() if isinstance(result, dict) else 'N/A'}")

                # Handle artifacts format (ADK agents return this for successful completions)
                if isinstance(result, dict) and "artifacts" in result:
                    artifacts = result.get("artifacts", [])
                    logger.info(f"[A2A] Artifacts format detected with {len(artifacts)} artifact(s)")

                    for artifact in artifacts:
                        if isinstance(artifact, dict) and "parts" in artifact:
                            for part in artifact.get("parts", []):
                                if part.get("kind") == "text":
                                    text_content = part.get("text", "")
                                    logger.info(f"[A2A] Extracted text from artifact: {text_content[:100]}")
                                    yield {"type": "text_token", "content": text_content}

                # Handle task format (ADK agents return this for errors/failures)
                elif isinstance(result, dict) and "status" in result:
                    status_message = result.get("status", {}).get("message", {})
                    logger.info(f"[A2A] Task status format detected: state={result.get('status', {}).get('state')}")

                    if isinstance(status_message, dict) and "parts" in status_message:
                        for part in status_message.get("parts", []):
                            if part.get("kind") == "text":
                                text_content = part.get("text", "")
                                logger.info(f"[A2A] Extracted text from task.status.message: {text_content[:100]}")
                                yield {"type": "text_token", "content": text_content}

                # Handle message format
                elif isinstance(result, dict) and "parts" in result:
                    logger.info(f"[A2A] Message format detected with {len(result.get('parts', []))} parts")
                    for part in result.get("parts", []):
                        if part.get("kind") == "text":
                            text_content = part.get("text", "")
                            logger.info(f"[A2A] Extracted text from message: {text_content[:100]}")
                            yield {"type": "text_token", "content": text_content}
                else:
                    logger.warning(f"[A2A] Unexpected result format: {json.dumps(result)[:200]}")

            elif "error" in result_data:
                error = result_data["error"]
                logger.error(f"[A2A] Agent returned error: code={error.get('code')}, message={error.get('message')}")
                raise Exception(f"Agent error: {error.get('message')}")

            else:
                logger.warning(f"[A2A] No result or error in response: {json.dumps(result_data)[:200]}")

    except httpx.HTTPStatusError as e:
        # Don't try to access .text on streaming responses
        error_detail = f"HTTP {e.response.status_code}"
        try:
            error_detail += f" - {e.response.text}"
        except:
            pass  # Response may be streaming and not readable
        logger.error(f"[A2A] HTTP error: {error_detail}")
        raise
    except Exception as e:
        logger.error(f"[A2A] Error calling agent: {e}", exc_info=True)
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
