"""
Log management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.core.database import async_session_maker, LogEntry
from app.core.security import get_current_user
from app.websocket.manager import trace_manager
from sqlalchemy import select, and_

router = APIRouter()

class LogCreate(BaseModel):
    trace_id: str
    service_name: str
    agent_id: Optional[int] = None
    level: str
    message: str
    metadata: Dict[str, Any] = {}

class LogResponse(BaseModel):
    log_id: int
    timestamp: datetime

class LogEntryResponse(BaseModel):
    timestamp: datetime
    service: str
    agent_id: Optional[int]
    level: str
    message: str
    is_transfer: bool = False

class LogTraceResponse(BaseModel):
    trace_id: str
    logs: List[LogEntryResponse]
    total_logs: int

@router.post("/logs", response_model=LogResponse)
async def create_log(
    request: LogCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Create new log entry"""
    # Detect agent transfer
    is_transfer = "Agent Transfer" in request.message or "agent transfer" in request.message.lower()

    log_entry = LogEntry(
        trace_id=request.trace_id,
        service_name=request.service_name,
        agent_id=request.agent_id,
        level=request.level,
        message=request.message,
        metadata=request.metadata,
        is_transfer=is_transfer,
        user_id=current_user["username"]
    )

    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    # Broadcast log to WebSocket subscribers
    log_dict = {
        "log_id": log_entry.id,
        "timestamp": log_entry.timestamp.isoformat(),
        "service_name": log_entry.service_name,
        "agent_id": log_entry.agent_id,
        "level": log_entry.level,
        "message": log_entry.message,
        "metadata": log_entry.metadata,
        "is_transfer": log_entry.is_transfer
    }
    await trace_manager.broadcast_log(request.trace_id, log_dict)

    return LogResponse(
        log_id=log_entry.id,
        timestamp=log_entry.timestamp
    )

@router.get("/logs/{trace_id}", response_model=LogTraceResponse)
async def get_logs_by_trace(
    trace_id: str,
    level: Optional[str] = Query(None),
    service: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Get logs by trace ID"""
    query = select(LogEntry).where(LogEntry.trace_id == trace_id)
    
    # Apply filters
    filters = []
    if level:
        filters.append(LogEntry.level == level)
    if service:
        filters.append(LogEntry.service_name == service)
    
    if filters:
        query = query.where(and_(*filters))
    
    result = await db.execute(query)
    logs = result.scalars().all()
    
    return LogTraceResponse(
        trace_id=trace_id,
        logs=[
            LogEntryResponse(
                timestamp=log.timestamp,
                service=log.service_name,
                agent_id=log.agent_id,
                level=log.level,
                message=log.message,
                is_transfer=log.is_transfer
            )
            for log in logs
        ],
        total_logs=len(logs)
    )
