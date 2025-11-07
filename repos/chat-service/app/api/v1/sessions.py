"""
Chat session management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import uuid

from app.core.database import get_db, ChatSession
from app.core.security import get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class SessionCreate(BaseModel):
    agent_id: int
    title: Optional[str] = None

class SessionResponse(BaseModel):
    id: str
    trace_id: str
    agent_id: int
    title: str
    created_at: datetime

class SessionListItem(BaseModel):
    session_id: str
    agent_id: int
    title: str
    created_at: datetime

@router.post("/sessions/", response_model=SessionResponse)
async def create_session(
    request: SessionCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
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
        id=session_id,
        trace_id=trace_id,
        agent_id=session.agent_id,
        title=session.title,
        created_at=session.created_at
    )

@router.get("/sessions/", response_model=List[SessionListItem])
async def list_sessions(
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    agent_id: Optional[int] = None
):
    """List all chat sessions for current user, optionally filtered by agent"""
    query = select(ChatSession).where(ChatSession.user_id == current_user["username"])

    if agent_id is not None:
        query = query.where(ChatSession.agent_id == agent_id)

    query = query.order_by(ChatSession.created_at.desc())

    result = await db.execute(query)
    sessions = result.scalars().all()

    return [
        SessionListItem(
            session_id=session.session_id,
            agent_id=session.agent_id,
            title=session.title,
            created_at=session.created_at
        )
        for session in sessions
    ]

@router.get("/sessions/{session_id}", response_model=SessionResponse)
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get chat session details"""
    result = await db.execute(select(ChatSession).where(ChatSession.session_id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Check user access
    if session.user_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    return SessionResponse(
        id=session.session_id,
        trace_id=session.trace_id,
        agent_id=session.agent_id,
        title=session.title,
        created_at=session.created_at
    )

@router.delete("/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a chat session"""
    result = await db.execute(select(ChatSession).where(ChatSession.session_id == session_id))
    session = result.scalar_one_or_none()

    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    # Check user access
    if session.user_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    await db.delete(session)
    await db.commit()

    return {"status": "deleted", "session_id": session_id}
