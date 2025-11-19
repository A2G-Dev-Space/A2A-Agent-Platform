"""
Internal API endpoints for service-to-service communication
No authentication required
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional, Dict, Any
from pydantic import BaseModel
from datetime import datetime

from app.core.database import get_db, Agent, AgentCallStatistics

router = APIRouter()


class AgentCallRecord(BaseModel):
    """Request model for recording agent call statistics"""
    agent_id: int
    user_id: str
    call_type: str  # 'chat' or 'a2a_router'
    agent_status: str  # 'DEPLOYED', 'DEVELOPMENT', etc.


class AgentHealthUpdate(BaseModel):
    """Request model for updating agent health status"""
    health_status: str  # 'healthy' or 'unhealthy'
    last_health_check: str  # ISO format datetime


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
            "trace_id": agent.trace_id,
            "status": agent.status.value if agent.status else None
        }
    }


@router.post("/internal/statistics/agent-calls", status_code=201)
async def record_agent_call(
    record: AgentCallRecord,
    db: AsyncSession = Depends(get_db)
):
    """
    Record agent call statistics (Internal API - No Auth Required)

    Used by chat-service and a2a_router to track agent usage

    call_type:
    - 'chat': Hub or Workbench chat calls
    - 'a2a_router': External A2A API calls

    agent_status: Agent status at the time of call
    """
    # Validate call_type
    if record.call_type not in ["chat", "a2a_router"]:
        raise HTTPException(status_code=400, detail="call_type must be 'chat' or 'a2a_router'")

    # Create statistics record
    stat = AgentCallStatistics(
        agent_id=record.agent_id,
        user_id=record.user_id,
        call_type=record.call_type,
        agent_status=record.agent_status,
        called_at=datetime.utcnow()
    )

    db.add(stat)
    await db.commit()

    return {
        "status": "success",
        "message": "Agent call recorded",
        "call_type": record.call_type,
        "agent_id": record.agent_id
    }


@router.get("/internal/agents")
async def get_all_agents(db: AsyncSession = Depends(get_db)):
    """
    Get all agents (Internal API - No Auth Required)

    Used by worker service for health checks
    """
    query = select(Agent)
    result = await db.execute(query)
    agents = result.scalars().all()

    agent_list = []
    for agent in agents:
        agent_dict = {
            "id": agent.id,
            "name": agent.name,
            "framework": agent.framework.value if agent.framework else None,
            "status": agent.status.value if agent.status else None,
            "trace_id": agent.trace_id,
            "owner_id": agent.owner_id,
            "a2a_endpoint": agent.a2a_endpoint,
            "agno_os_endpoint": agent.agno_os_endpoint,
            "langchain_config": agent.langchain_config,
            "health_status": agent.health_status.value if agent.health_status else None,
            "last_health_check": agent.last_health_check.isoformat() if agent.last_health_check else None
        }
        agent_list.append(agent_dict)

    return agent_list


@router.put("/internal/agents/{agent_id}/health")
async def update_agent_health(
    agent_id: int,
    health_update: AgentHealthUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Update agent health status (Internal API - No Auth Required)

    Used by worker service to update agent health check results
    """
    # Query agent
    query = select(Agent).where(Agent.id == agent_id)
    result = await db.execute(query)
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # Update health status
    from app.core.database import HealthStatus
    if health_update.health_status == "healthy":
        agent.health_status = HealthStatus.HEALTHY
    elif health_update.health_status == "unhealthy":
        agent.health_status = HealthStatus.UNHEALTHY
    else:
        agent.health_status = HealthStatus.UNKNOWN

    # Parse and update last health check time
    try:
        agent.last_health_check = datetime.fromisoformat(health_update.last_health_check.replace('Z', '+00:00'))
    except Exception:
        agent.last_health_check = datetime.utcnow()

    await db.commit()

    return {
        "status": "success",
        "agent_id": agent_id,
        "health_status": health_update.health_status,
        "last_health_check": health_update.last_health_check
    }
