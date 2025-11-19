"""
Hub Chat API - Multi-session chat for deployed agents in production
"""
from fastapi import APIRouter, Depends, HTTPException, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, AsyncGenerator, List
from datetime import datetime
import httpx
import json
import time
import logging
import uuid

from app.core.security import get_current_user
from app.core.database import async_session_maker, HubSession, get_db
from app.utils.agent_helpers import get_agent_info as get_agent_info_helper, stream_from_agent_a2a
from sqlalchemy import select, and_
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
    id: Optional[str] = None
    role: str  # 'user' or 'assistant' or 'system'
    content: str
    timestamp: Optional[str] = None
    systemEvents: Optional[List[SystemEvent]] = None


class HubChatRequest(BaseModel):
    """Hub chat request with multi-session support"""
    agent_id: int
    session_id: Optional[str] = None  # UUID of existing session or None for new
    messages: List[Message] = []  # For ADK framework
    content: Optional[str] = None  # For Agno framework
    selected_resource: Optional[str] = None  # For Agno team/agent routing
    selected_resource_type: Optional[str] = None  # 'team' or 'agent'


# Use shared helper function
get_agent_info = get_agent_info_helper


async def check_access_control(agent_info: dict, current_user: dict) -> bool:
    """
    Check if current user can access this deployed agent

    Rules:
    - Owner: always allowed
    - visibility=public: everyone allowed
    - visibility=team: same department only
    - visibility=private: owner only
    """
    visibility = agent_info.get("visibility", "private")
    owner_id = agent_info.get("owner_id")
    agent_department = agent_info.get("department")

    user_id = current_user["username"]
    user_department = current_user.get("department")

    # Owner always has access
    if owner_id == user_id:
        return True

    # Public: everyone can access
    if visibility == "public":
        return True

    # Team: same department only
    if visibility == "team":
        if agent_department and user_department and agent_department == user_department:
            return True
        return False

    # Private: owner only
    return False


async def record_agent_call(
    agent_id: int,
    user_id: str,
    agent_status: str,
    token: str
):
    """
    Record agent call statistics in Agent Service
    call_type: 'chat' for Hub Chat
    """
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.post(
                f"http://agent-service:8002/internal/statistics/agent-calls",
                json={
                    "agent_id": agent_id,
                    "user_id": user_id,
                    "call_type": "chat",
                    "agent_status": agent_status
                },
                headers={"Authorization": f"Bearer {token}"}
            )
            if response.status_code == 201:
                logger.info(f"[Hub] Recorded agent call: agent={agent_id}, user={user_id}")
            else:
                logger.warning(f"[Hub] Failed to record agent call: {response.status_code}")
    except Exception as e:
        logger.error(f"[Hub] Error recording agent call: {e}")


async def get_or_create_hub_session(
    db: AsyncSession,
    user_id: str,
    agent_id: int,
    session_id: Optional[str] = None
) -> HubSession:
    """
    Get existing hub session or create new one

    If session_id is provided: load existing session
    If session_id is None: create new session
    """
    if session_id:
        # Load existing session
        try:
            session_uuid = uuid.UUID(session_id)
            result = await db.execute(
                select(HubSession).where(
                    and_(
                        HubSession.id == session_uuid,
                        HubSession.user_id == user_id,
                        HubSession.agent_id == agent_id
                    )
                )
            )
            session = result.scalar_one_or_none()

            if session:
                logger.info(f"[Hub] Loaded existing session: {session_id}")
                return session
            else:
                logger.warning(f"[Hub] Session not found: {session_id}, creating new session")
        except ValueError:
            logger.warning(f"[Hub] Invalid session_id format: {session_id}, creating new session")

    # Create new session with session_id
    new_session_id = str(uuid.uuid4())
    new_session = HubSession(
        user_id=user_id,
        agent_id=agent_id,
        messages=[],
        session_id=new_session_id
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    logger.info(f"[Hub] Created new session: {new_session.id}, session_id: {new_session_id}")
    return new_session


@router.post("/hub/chat/stream")
async def hub_chat_stream(
    request: HubChatRequest,
    current_user: dict = Depends(get_current_user),
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Stream chat response from deployed agent for Hub

    - ADK: Uses messages array with A2A JSON-RPC protocol
    - Agno: Uses content + selected_resource with multipart/form-data
    - Multi-session support via session_id
    - Only deployed agents accessible
    - Access control based on visibility
    """
    user_id = current_user["username"]
    token = authorization.replace("Bearer ", "") if authorization else ""

    # 1. Get agent info
    agent_info = await get_agent_info(request.agent_id, token)
    if not agent_info:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 2. Check if agent is deployed
    agent_status = agent_info.get("status", "DEVELOPMENT")
    if agent_status not in ["DEPLOYED_ALL", "DEPLOYED_TEAM", "DEPLOYED_DEPT"]:
        raise HTTPException(
            status_code=403,
            detail="Agent is not deployed. Only deployed agents can be accessed from Hub."
        )

    # 3. Check access control
    has_access = await check_access_control(agent_info, current_user)
    if not has_access:
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to access this agent"
        )

    framework = agent_info.get("framework", "ADK")
    agent_url = agent_info.get("a2a_endpoint")
    trace_id = agent_info.get("trace_id")

    if not agent_url:
        raise HTTPException(status_code=400, detail="Agent endpoint not configured")

    logger.info(f"[Hub] Chat request: agent={request.agent_id}, framework={framework}, user={user_id}")

    # 4. Get or create hub session
    session = await get_or_create_hub_session(
        db,
        user_id,
        request.agent_id,
        request.session_id
    )

    # 5. Record agent call statistics
    await record_agent_call(request.agent_id, user_id, agent_status, token)

    # 6. Branch based on framework (case-insensitive comparison)
    framework_upper = framework.upper() if framework else "ADK"

    if framework_upper.startswith("AGNO"):
        # Agno: Use content + selected_resource
        if not request.content:
            raise HTTPException(status_code=400, detail="content is required for Agno agents")

        return await _handle_agno_stream(request, agent_url, user_id, trace_id, session, db)

    elif framework_upper.startswith("LANGCHAIN"):
        # Langchain: Use content
        if not request.content:
            raise HTTPException(status_code=400, detail="content is required for Langchain agents")

        return await _handle_langchain_stream(request, agent_url, agent_info, trace_id, session, db)

    else:  # ADK or other frameworks
        # ADK: Use messages array
        if not request.messages:
            raise HTTPException(status_code=400, detail="messages array is required for ADK agents")

        return await _handle_adk_stream(request, agent_url, trace_id, session, db)


async def _handle_adk_stream(
    request: HubChatRequest,
    agent_url: str,
    trace_id: Optional[str],
    session: HubSession,
    db: AsyncSession
) -> StreamingResponse:
    """
    Handle ADK framework streaming using A2A JSON-RPC
    """
    async def event_stream() -> AsyncGenerator[str, None]:
        """Stream events from ADK agent"""
        if trace_id:
            yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id, 'session_id': str(session.id)})}\n\n"
        else:
            yield f"data: {json.dumps({'type': 'stream_start', 'session_id': str(session.id)})}\n\n"

        assistant_response = ""

        try:
            # Stream from agent and collect response
            async for event in stream_from_agent_a2a(agent_url, request.messages, trace_id):
                if event["type"] == "text_token":
                    assistant_response += event.get("content", "")
                    yield f"data: {json.dumps(event)}\n\n"

            yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

            # Update session with messages after stream completes
            message_dicts = []

            # Add all user and previous assistant messages from request
            for msg in request.messages:
                msg_dict = {
                    "id": msg.id or f"msg-{int(time.time() * 1000)}",
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp or datetime.utcnow().isoformat()
                }
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

            # Add new assistant response
            if assistant_response:
                message_dicts.append({
                    "id": f"msg-{int(time.time() * 1000)}",
                    "role": "assistant",
                    "content": assistant_response,
                    "timestamp": datetime.utcnow().isoformat()
                })

            # Set session name from first user message if not set
            if not session.session_name and message_dicts:
                first_user_msg = next((msg for msg in message_dicts if msg["role"] == "user"), None)
                if first_user_msg:
                    content = first_user_msg["content"]
                    session.session_name = content[:50] + "..." if len(content) > 50 else content

            session.messages = message_dicts
            session.last_message_at = datetime.utcnow()
            attributes.flag_modified(session, "messages")
            await db.commit()

        except Exception as e:
            logger.error(f"[Hub] Error streaming from ADK agent: {e}")
            error_event = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def _handle_agno_stream(
    request: HubChatRequest,
    agent_url: str,
    user_id: str,
    trace_id: Optional[str],
    session: HubSession,
    db: AsyncSession
) -> StreamingResponse:
    """
    Handle Agno framework streaming using multipart/form-data + SSE
    """
    # Replace localhost with host.docker.internal for Docker network
    agent_url = agent_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

    # Build Agno endpoint with team/agent routing
    if request.selected_resource and request.selected_resource_type:
        resource_id = request.selected_resource
        if request.selected_resource_type == "team":
            chat_endpoint = f"{agent_url.rstrip('/')}/teams/{resource_id}/runs"
        elif request.selected_resource_type == "agent":
            chat_endpoint = f"{agent_url.rstrip('/')}/agents/{resource_id}/runs"
        else:
            # Fallback to default runs endpoint
            chat_endpoint = f"{agent_url.rstrip('/')}/runs"
    else:
        # No resource selected - use default runs endpoint
        chat_endpoint = f"{agent_url.rstrip('/')}/runs"

    logger.info(f"[Hub] Agno endpoint: {chat_endpoint}")

    async def stream_generator():
        """Generator that forwards streaming response from Agno agent"""
        assistant_response = ""

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Build message content with conversation history
                message_content = request.content or ""

                # Add conversation history if provided (same as Workbench)
                if request.messages and len(request.messages) > 0:
                    history_text = "Previous conversation:\n"
                    for msg in request.messages:
                        role = "User" if msg.role == "user" else "Assistant"
                        history_text += f"{role}: {msg.content}\n"
                    message_content = f"{history_text}\nCurrent message:\n{message_content}"

                # Build form data for Agno
                form_data = {
                    "message": message_content,
                    "stream": "true",
                    "monitor": "true",
                    "user_id": user_id
                }

                # Stream start
                if trace_id:
                    yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id, 'session_id': str(session.id)})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'stream_start', 'session_id': str(session.id)})}\n\n"

                # Start SSE streaming from Agno
                async with client.stream(
                    "POST",
                    chat_endpoint,
                    data=form_data,
                    files=[],
                    headers={"Accept": "text/event-stream"}
                ) as response:
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Agent error: {response.status_code}'})}\n\n"
                        return

                    # Forward SSE events from Agno exactly like Workbench
                    async for line in response.aiter_lines():
                        # Forward ALL lines including empty ones (SSE event separators)
                        yield f"{line}\n"

                        # Try to collect assistant response for DB storage
                        if line.startswith("data: "):
                            try:
                                event_data = json.loads(line[6:])
                                # Collect content based on resource type
                                # Team mode: collect TeamRunContent only
                                # Agent mode: collect RunContent only
                                if request.selected_resource_type == "team":
                                    if event_data.get("event") == "TeamRunContent" and event_data.get("content"):
                                        assistant_response += event_data.get("content", "")
                                elif request.selected_resource_type == "agent":
                                    if event_data.get("event") == "RunContent" and event_data.get("content"):
                                        assistant_response += event_data.get("content", "")
                                else:
                                    # Fallback: collect RunContent for backward compatibility
                                    if event_data.get("event") == "RunContent" and event_data.get("content"):
                                        assistant_response += event_data.get("content", "")
                            except:
                                pass

                # Stream end
                yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

                # Update session with messages after stream completes
                message_dicts = []
                for msg in request.messages:
                    msg_dict = {
                        "id": msg.id or f"msg-{int(time.time() * 1000)}",
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.timestamp or datetime.utcnow().isoformat()
                    }
                    message_dicts.append(msg_dict)

                # Add current user message
                message_dicts.append({
                    "id": f"msg-{int(time.time() * 1000)}",
                    "role": "user",
                    "content": request.content,
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Add assistant response if collected
                if assistant_response:
                    message_dicts.append({
                        "id": f"msg-{int(time.time() * 1000) + 1}",
                        "role": "assistant",
                        "content": assistant_response,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                # Set session name from first user message if not set
                if not session.session_name and message_dicts:
                    first_user_msg = next((msg for msg in message_dicts if msg["role"] == "user"), None)
                    if first_user_msg:
                        content = first_user_msg["content"]
                        session.session_name = content[:50] + "..." if len(content) > 50 else content

                session.messages = message_dicts
                session.last_message_at = datetime.utcnow()
                attributes.flag_modified(session, "messages")
                await db.commit()

        except Exception as e:
            logger.error(f"[Hub] Error streaming from Agno agent: {e}")
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def _handle_langchain_stream(
    request: HubChatRequest,
    agent_url: str,
    agent_info: dict,
    trace_id: Optional[str],
    session: HubSession,
    db: AsyncSession
) -> StreamingResponse:
    """
    Handle Langchain framework streaming using custom endpoint
    """
    # Replace localhost with host.docker.internal for Docker network
    agent_url = agent_url.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")

    # Get Langchain-specific configuration
    langchain_config = agent_info.get("langchain_config", {})
    endpoint = langchain_config.get("endpoint", agent_url)
    request_schema = langchain_config.get("request_schema", '{"input": "{{message}}"}')
    response_format = langchain_config.get("response_format", "sse")

    logger.info(f"[Hub] Langchain endpoint: {endpoint}, format: {response_format}")

    async def stream_generator():
        """Generator that forwards streaming response from Langchain agent"""
        assistant_response = ""

        try:
            async with httpx.AsyncClient(timeout=300.0) as client:
                # Use content directly from request
                message_content = request.content or ""

                # Build request body using schema template
                request_body_str = request_schema.replace("{{message}}", message_content)
                request_body = json.loads(request_body_str)

                # Stream start
                if trace_id:
                    yield f"data: {json.dumps({'type': 'stream_start', 'trace_id': trace_id, 'session_id': str(session.id)})}\n\n"
                else:
                    yield f"data: {json.dumps({'type': 'stream_start', 'session_id': str(session.id)})}\n\n"

                if response_format == "sse":
                    # SSE streaming response
                    async with client.stream(
                        "POST",
                        endpoint,
                        json=request_body,
                        headers={"Accept": "text/event-stream"}
                    ) as response:
                        if response.status_code != 200:
                            yield f"data: {json.dumps({'type': 'error', 'message': f'Agent error: {response.status_code}'})}\n\n"
                            return

                        # Forward SSE events from Langchain and collect response
                        async for line in response.aiter_lines():
                            if line.startswith("data: "):
                                try:
                                    event_data = json.loads(line[6:])
                                    # Extract content based on common patterns
                                    content = event_data.get("content") or event_data.get("output") or event_data.get("delta")
                                    if content:
                                        assistant_response += content
                                        yield f"data: {json.dumps({'type': 'content_chunk', 'content': content})}\n\n"
                                except:
                                    pass
                else:
                    # JSON blocking response
                    response = await client.post(
                        endpoint,
                        json=request_body,
                        headers={"Content-Type": "application/json"}
                    )
                    if response.status_code != 200:
                        yield f"data: {json.dumps({'type': 'error', 'message': f'Agent error: {response.status_code}'})}\n\n"
                        return

                    response_data = response.json()
                    # Extract content based on config or common patterns
                    assistant_response = response_data.get("output") or response_data.get("content") or str(response_data)
                    yield f"data: {json.dumps({'type': 'content_chunk', 'content': assistant_response})}\n\n"

                # Stream end
                yield f"data: {json.dumps({'type': 'stream_end'})}\n\n"

                # Update session with messages after stream completes
                message_dicts = []
                for msg in request.messages:
                    msg_dict = {
                        "id": msg.id or f"msg-{int(time.time() * 1000)}",
                        "role": msg.role,
                        "content": msg.content,
                        "timestamp": msg.timestamp or datetime.utcnow().isoformat()
                    }
                    message_dicts.append(msg_dict)

                # Add current user message
                message_dicts.append({
                    "id": f"msg-{int(time.time() * 1000)}",
                    "role": "user",
                    "content": request.content,
                    "timestamp": datetime.utcnow().isoformat()
                })

                # Add assistant response
                if assistant_response:
                    message_dicts.append({
                        "id": f"msg-{int(time.time() * 1000)}",
                        "role": "assistant",
                        "content": assistant_response,
                        "timestamp": datetime.utcnow().isoformat()
                    })

                # Set session name from first user message if not set
                if not session.session_name and message_dicts:
                    first_user_msg = next((msg for msg in message_dicts if msg["role"] == "user"), None)
                    if first_user_msg:
                        content = first_user_msg["content"]
                        session.session_name = content[:50] + "..." if len(content) > 50 else content

                session.messages = message_dicts
                session.last_message_at = datetime.utcnow()
                attributes.flag_modified(session, "messages")
                await db.commit()

        except Exception as e:
            logger.error(f"[Hub] Error streaming from Langchain agent: {e}")
            error_event = {"type": "error", "message": str(e)}
            yield f"data: {json.dumps(error_event)}\n\n"

    return StreamingResponse(
        stream_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/hub/sessions")
async def get_hub_sessions(
    agent_id: Optional[int] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all hub sessions for current user
    Optionally filter by agent_id
    """
    user_id = current_user["username"]

    query = select(HubSession).where(HubSession.user_id == user_id)

    if agent_id:
        query = query.where(HubSession.agent_id == agent_id)

    query = query.order_by(HubSession.last_message_at.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    return {
        "sessions": [
            {
                "id": str(session.id),
                "agent_id": session.agent_id,
                "session_name": session.session_name,
                "message_count": len(session.messages) if session.messages else 0,
                "created_at": session.created_at.isoformat(),
                "last_message_at": session.last_message_at.isoformat()
            }
            for session in sessions
        ]
    }


@router.get("/hub/sessions/{session_id}/messages")
async def get_hub_session_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get messages for a specific hub session
    """
    user_id = current_user["username"]

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    result = await db.execute(
        select(HubSession).where(
            and_(
                HubSession.id == session_uuid,
                HubSession.user_id == user_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "session_id": str(session.id),
        "agent_id": session.agent_id,
        "messages": session.messages or []
    }


@router.delete("/hub/sessions/{session_id}")
async def delete_hub_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a hub session
    """
    user_id = current_user["username"]

    try:
        session_uuid = uuid.UUID(session_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid session_id format")

    result = await db.execute(
        select(HubSession).where(
            and_(
                HubSession.id == session_uuid,
                HubSession.user_id == user_id
            )
        )
    )
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    await db.delete(session)
    await db.commit()

    logger.info(f"[Hub] Deleted session {session_id} for user {user_id}")
    return {"status": "success", "message": "Session deleted"}
