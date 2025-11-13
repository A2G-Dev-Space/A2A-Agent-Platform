"""
Admin API endpoints for chat/agent usage statistics
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc, or_
from typing import List, Dict, Any, Optional

from app.core.database import ChatSession, get_db
from app.core.security import require_admin

router = APIRouter()


@router.get("/sessions/agent-usage")
async def get_agent_usage_statistics(
    top_k: int = Query(10, ge=1, le=100, description="Number of top agents to return"),
    user_id: Optional[int] = Query(None, description="Filter by specific user"),
    department: Optional[str] = Query(None, description="Filter by department (team)"),
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent usage statistics

    Returns:
    - Top K most used agents overall, by user, or by team
    - Usage count = number of chat sessions
    """

    # Build base query
    query = select(
        ChatSession.agent_id,
        func.count(ChatSession.id).label('usage_count'),
        func.count(func.distinct(ChatSession.user_id)).label('unique_users')
    )

    # Apply filters
    filters = []

    if user_id is not None:
        filters.append(ChatSession.user_id == str(user_id))

    # Note: department filtering requires joining with user table
    # For now, we'll skip department filtering as it requires user service integration
    # if department:
    #     filters.append(User.department == department)

    if filters:
        query = query.where(and_(*filters))

    # Group by agent and order by usage count
    query = query.group_by(ChatSession.agent_id).order_by(desc('usage_count')).limit(top_k)

    result = await db.execute(query)
    rows = result.all()

    agent_usage = [
        {
            "agent_id": row.agent_id,
            "usage_count": row.usage_count or 0,
            "unique_users": row.unique_users or 0
        }
        for row in rows
    ]

    return {
        "top_k": top_k,
        "user_filter": user_id,
        "department_filter": department,
        "agent_usage": agent_usage
    }


@router.get("/sessions/user-activity")
async def get_user_activity_statistics(
    user_id: int,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get activity statistics for a specific user

    Returns which agents the user has used and how often
    """

    query = select(
        ChatSession.agent_id,
        func.count(ChatSession.id).label('session_count'),
        func.max(ChatSession.created_at).label('last_used')
    ).where(
        ChatSession.user_id == str(user_id)
    ).group_by(ChatSession.agent_id).order_by(desc('session_count'))

    result = await db.execute(query)
    rows = result.all()

    user_activity = [
        {
            "agent_id": row.agent_id,
            "session_count": row.session_count or 0,
            "last_used": row.last_used.isoformat() if row.last_used else None
        }
        for row in rows
    ]

    # Get total sessions for this user
    total_result = await db.execute(
        select(func.count(ChatSession.id)).where(ChatSession.user_id == str(user_id))
    )
    total_sessions = total_result.scalar() or 0

    return {
        "user_id": user_id,
        "total_sessions": total_sessions,
        "agent_usage": user_activity
    }
