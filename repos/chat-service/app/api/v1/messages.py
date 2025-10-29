"""
Chat message API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
import json

from app.core.database import async_session_maker, ChatMessage
from app.core.security import get_current_user
from sqlalchemy import select

router = APIRouter()

class MessageCreate(BaseModel):
    role: str
    content: str

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    timestamp: datetime

@router.post("/sessions/{session_id}/messages/", response_model=MessageResponse)
async def create_message(
    session_id: str,
    request: MessageCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Create new message in session"""
    message = ChatMessage(
        session_id=session_id,
        role=request.role,
        content=request.content,
        user_id=current_user["username"]
    )
    
    db.add(message)
    await db.commit()
    await db.refresh(message)
    
    return MessageResponse(
        id=message.id,
        role=message.role,
        content=message.content,
        timestamp=message.timestamp
    )

@router.get("/sessions/{session_id}/messages/")
async def get_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Get messages for session"""
    result = await db.execute(
        select(ChatMessage).where(ChatMessage.session_id == session_id)
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
