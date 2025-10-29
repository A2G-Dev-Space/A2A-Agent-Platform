"""
Agent CRUD API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
import uuid

from app.core.database import async_session_maker, Agent, AgentFramework, AgentStatus, HealthStatus
from app.core.security import get_current_user
from sqlalchemy import select, and_

router = APIRouter()

class AgentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    framework: AgentFramework
    a2a_endpoint: Optional[str] = None
    capabilities: Dict[str, Any] = {}
    is_public: bool = True

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    framework: Optional[AgentFramework] = None
    a2a_endpoint: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class AgentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    framework: AgentFramework
    status: AgentStatus
    a2a_endpoint: Optional[str]
    capabilities: Dict[str, Any]
    owner_id: str
    department: Optional[str]
    is_public: bool
    health_status: HealthStatus
    last_health_check: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    limit: int

@router.get("/", response_model=AgentListResponse)
async def get_agents(
    status: Optional[AgentStatus] = Query(None),
    framework: Optional[AgentFramework] = Query(None),
    department: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db=Depends(async_session_maker)
):
    """Get list of agents with filtering"""
    query = select(Agent)
    
    # Apply filters
    filters = []
    if status:
        filters.append(Agent.status == status)
    if framework:
        filters.append(Agent.framework == framework)
    if department:
        filters.append(Agent.department == department)
    
    if filters:
        query = query.where(and_(*filters))
    
    # Count total
    count_query = select(Agent).where(and_(*filters)) if filters else select(Agent)
    total_result = await db.execute(count_query)
    total = len(total_result.scalars().all())
    
    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit)
    
    result = await db.execute(query)
    agents = result.scalars().all()
    
    return AgentListResponse(
        agents=[
            AgentResponse(
                id=agent.id,
                name=agent.name,
                description=agent.description,
                framework=agent.framework,
                status=agent.status,
                a2a_endpoint=agent.a2a_endpoint,
                capabilities=agent.capabilities,
                owner_id=agent.owner_id,
                department=agent.department,
                is_public=agent.is_public,
                health_status=agent.health_status,
                last_health_check=agent.last_health_check,
                created_at=agent.created_at,
                updated_at=agent.updated_at
            )
            for agent in agents
        ],
        total=total,
        page=page,
        limit=limit
    )

@router.post("/", response_model=AgentResponse)
async def create_agent(
    request: AgentCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Create new agent"""
    # Check if agent name already exists
    existing = await db.execute(select(Agent).where(Agent.name == request.name))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agent with this name already exists"
        )
    
    agent = Agent(
        name=request.name,
        description=request.description,
        framework=request.framework,
        a2a_endpoint=request.a2a_endpoint,
        capabilities=request.capabilities,
        owner_id=current_user["username"],
        is_public=request.is_public,
        status=AgentStatus.DEVELOPMENT
    )
    
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        framework=agent.framework,
        status=agent.status,
        a2a_endpoint=agent.a2a_endpoint,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    db=Depends(async_session_maker)
):
    """Get agent by ID"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        framework=agent.framework,
        status=agent.status,
        a2a_endpoint=agent.a2a_endpoint,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    request: AgentUpdate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Update agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check ownership
    if agent.owner_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this agent"
        )
    
    # Update fields
    update_data = request.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(agent, field, value)
    
    await db.commit()
    await db.refresh(agent)
    
    return AgentResponse(
        id=agent.id,
        name=agent.name,
        description=agent.description,
        framework=agent.framework,
        status=agent.status,
        a2a_endpoint=agent.a2a_endpoint,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Delete agent"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check ownership
    if agent.owner_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this agent"
        )
    
    await db.delete(agent)
    await db.commit()
    
    return {"message": "Agent deleted successfully"}

@router.patch("/{agent_id}/status")
async def update_agent_status(
    agent_id: int,
    status: AgentStatus,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Update agent status"""
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Check ownership
    if agent.owner_id != current_user["username"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this agent"
        )
    
    agent.status = status
    await db.commit()
    
    return {"message": f"Agent status updated to {status}"}
