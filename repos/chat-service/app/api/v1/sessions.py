"""
Chat session management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import uuid

from app.core.database import async_session_maker, ChatSession
from app.core.security import get_current_user
from sqlalchemy import select

router = APIRouter()

class SessionCreate(BaseModel):
    agent_id: int
    title: Optional[str] = None

class SessionResponse(BaseModel):
    session_id: str
    trace_id: str
    websocket_url: str
    created_at: datetime

@router.post("/sessions/", response_model=SessionResponse)
async def create_session(
    request: SessionCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Create new chat session"""
    session_id = str(uuid.uuid4())
    trace_id = str(uuid.uuid4())
    
    session = ChatSession(
        session_id=session_id,
        trace_id=trace_id,
        agent_id=request.agent_id,
        user_id=current_user["username"],
        title=request.title or f"Chat Session {session_id[:8]}"
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return SessionResponse(
        session_id=session_id,
        trace_id=trace_id,
        websocket_url=f"ws://localhost:8003/ws/{session_id}",
        created_at=session.created_at
    )

@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Get chat session details"""
    result = await db.execute(select(ChatSession).where(ChatSession.session_id == session_id))
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    return {
        "session_id": session.session_id,
        "trace_id": session.trace_id,
        "agent_id": session.agent_id,
        "title": session.title,
        "created_at": session.created_at
    }
