"""
Internal API endpoints for service-to-service communication
No authentication required
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any

from app.core.database import get_db, Agent

router = APIRouter()


@router.get("/internal/agents/by-trace-ids")
async def get_agents_by_trace_ids(
    trace_ids: str,  # Comma-separated trace_ids
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent information by trace_ids (Internal API - No Auth Required)

    Used by other services to fetch agent metadata for display purposes
    """
    # Parse comma-separated trace_ids
    trace_id_list = [tid.strip() for tid in trace_ids.split(",") if tid.strip()]

    if not trace_id_list:
        return {"agents": []}

    # Query agents
    query = select(Agent).where(Agent.trace_id.in_(trace_id_list))
    result = await db.execute(query)
    agents = result.scalars().all()

    # Build response
    agent_map = {}
    for agent in agents:
        agent_map[agent.trace_id] = {
            "trace_id": agent.trace_id,
            "name": agent.name,
            "owner_id": agent.owner_id,
            "framework": agent.framework.value,
            "status": agent.status.value
        }

    return {"agents": agent_map}
