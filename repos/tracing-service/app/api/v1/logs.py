"""
Log management API endpoints - Simplified for Workbench
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime

from app.core.database import get_db, LogEntry
from app.websocket.manager import trace_manager
from sqlalchemy import select, and_

router = APIRouter()

class LogCreate(BaseModel):
    trace_id: str  # Encodes user+agent via MD5 hash
    service_name: str
    level: str
    message: str
    log_type: Optional[str] = None
    metadata: Dict[str, Any] = {}

class LogResponse(BaseModel):
    log_id: int
    timestamp: datetime

class LogEntryResponse(BaseModel):
    log_id: int
    timestamp: datetime
    service_name: str
    agent_id: Optional[str] = None
    level: str
    message: str
    log_type: Optional[str] = None
    metadata: Dict[str, Any] = {}
    is_transfer: bool = False

class LogTraceResponse(BaseModel):
    trace_id: str
    logs: List[LogEntryResponse]
    total_logs: int

@router.post("/logs", response_model=LogResponse)
async def create_log(
    request: LogCreate,
    db=Depends(get_db)
):
    """Create new log entry - No authentication required for simplicity"""
    # Detect agent transfer
    is_transfer = "Agent Transfer" in request.message or "agent transfer" in request.message.lower()

    # Store log_type in metadata
    metadata_with_type = {
        "log_type": request.log_type,
        **request.metadata
    }

    log_entry = LogEntry(
        trace_id=request.trace_id,
        service_name=request.service_name,
        level=request.level,
        message=request.message,
        context=metadata_with_type,
        is_transfer=is_transfer or (request.log_type == "AGENT_TRANSFER"),
        user_id="system"  # Simplified - no user tracking
    )

    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)

    # Broadcast log to WebSocket subscribers
    log_dict = {
        "log_id": log_entry.id,
        "timestamp": log_entry.timestamp.isoformat(),
        "service_name": log_entry.service_name,
        "level": log_entry.level,
        "message": log_entry.message,
        "log_type": request.log_type,
        "metadata": metadata_with_type,
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
    db=Depends(get_db)
):
    """Get logs by trace ID - No authentication required"""
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
                log_id=log.id,
                timestamp=log.timestamp,
                service_name=log.service_name,
                agent_id=log.context.get("agent_id") if log.context else None,
                level=log.level,
                message=log.message,
                log_type=log.context.get("log_type") if log.context else None,
                metadata=log.context if log.context else {},
                is_transfer=log.is_transfer
            )
            for log in logs
        ],
        total_logs=len(logs)
    )

@router.delete("/traces/{trace_id}")
async def delete_trace_logs(
    trace_id: str,
    db=Depends(get_db)
):
    """Delete all logs for a specific trace ID"""
    from sqlalchemy import delete as sql_delete

    # Delete all logs with this trace_id
    await db.execute(
        sql_delete(LogEntry).where(LogEntry.trace_id == trace_id)
    )
    await db.commit()

    return {"status": "success", "message": f"All logs for trace {trace_id} deleted"}
