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
        return {"agents": {}}

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


@router.get("/internal/agents/by-ids")
async def get_agents_by_ids(
    agent_ids: str,  # Comma-separated agent IDs
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent information by IDs (Internal API - No Auth Required)

    Used by statistics service to fetch agent names for token usage display
    """
    # Parse comma-separated agent_ids
    agent_id_list = [int(aid.strip()) for aid in agent_ids.split(",") if aid.strip().isdigit()]

    if not agent_id_list:
        return {"agents": {}}

    # Query agents
    query = select(Agent).where(Agent.id.in_(agent_id_list))
    result = await db.execute(query)
    agents = result.scalars().all()

    # Build response - Map agent_id (as string) -> agent info
    agent_map = {}
    for agent in agents:
        agent_map[str(agent.id)] = {
            "id": agent.id,
            "name": agent.name,
            "owner_id": agent.owner_id,
            "framework": agent.framework.value,
            "status": agent.status.value
        }

    return {"agents": agent_map}


@router.get("/internal/agents/by-trace-id/{trace_id}")
async def get_agent_by_trace_id(
    trace_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent information by trace_id (Internal API - No Auth Required)

    Used by LLM proxy to resolve agent_id from trace_id for token usage tracking.

    Workbench workflow:
    1. User selects agent in Workbench
    2. Workbench generates deterministic trace_id = MD5(user_id + agent_id)
    3. Workbench updates agent.trace_id with this value
    4. Agent uses URL: /api/llm/trace/{trace_id}/v1/chat/completions
    5. LLM proxy calls this endpoint to get agent_id
    6. Token usage tracked accurately by agent_id
    """
    # Query agent by trace_id
    query = select(Agent).where(Agent.trace_id == trace_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        return {"agent": None}

    return {
        "agent": {
            "id": agent.id,
            "name": agent.name,
            "owner_id": agent.owner_id,
            "trace_id": agent.trace_id
        }
    }
