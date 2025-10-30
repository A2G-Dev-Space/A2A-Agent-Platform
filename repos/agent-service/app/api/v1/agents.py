"""
Agent CRUD API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import uuid

from app.core.database import get_db, Agent, AgentFramework, AgentStatus, HealthStatus
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
    visibility: str = "public"  # public, private, team
    allowed_users: Optional[List[str]] = None

class AgentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    framework: Optional[AgentFramework] = None
    a2a_endpoint: Optional[str] = None
    capabilities: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None
    status: Optional[AgentStatus] = None  # Status update integrated here
    visibility: Optional[str] = None  # public, private, team
    allowed_users: Optional[List[str]] = None

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
    visibility: str
    allowed_users: Optional[List[str]]
    health_status: HealthStatus
    last_health_check: Optional[datetime]
    created_at: datetime
    updated_at: datetime

class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    limit: int

class AgentSearchRequest(BaseModel):
    query: str

@router.get("/", response_model=AgentListResponse)
async def get_agents(
    status: Optional[AgentStatus] = Query(None),
    framework: Optional[AgentFramework] = Query(None),
    department: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None, description="public, private, team"),
    only_mine: bool = Query(False, description="Show only my agents"),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of agents with Access Control filtering"""
    from sqlalchemy import or_

    query = select(Agent)

    # Apply basic filters
    filters = []
    if status:
        filters.append(Agent.status == status)
    if framework:
        filters.append(Agent.framework == framework)
    if department:
        filters.append(Agent.department == department)

    # Access Control filtering
    if only_mine:
        # Show only agents owned by current user
        filters.append(Agent.owner_id == current_user["username"])
    elif visibility == "private":
        # Show only private agents owned by current user
        filters.append(Agent.owner_id == current_user["username"])
        filters.append(Agent.visibility == "private")
    elif visibility == "team":
        # Show team agents from same department
        filters.append(Agent.visibility == "team")
        filters.append(Agent.department == current_user.get("department"))
    elif visibility == "public":
        # Show only public agents
        filters.append(Agent.visibility == "public")
    else:
        # Default: show public agents + my agents + team agents + agents where I'm in allowed_users
        username = current_user["username"]
        user_dept = current_user.get("department")

        access_filters = [
            Agent.visibility == "public",
            Agent.owner_id == username,
        ]

        # Add team filter if user has department
        if user_dept:
            access_filters.append(
                and_(
                    Agent.visibility == "team",
                    Agent.department == user_dept
                )
            )

        filters.append(or_(*access_filters))

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
                visibility=agent.visibility,
                allowed_users=agent.allowed_users,
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
    db: AsyncSession = Depends(get_db)
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
        department=current_user.get("department"),
        is_public=request.is_public,
        visibility=request.visibility,
        allowed_users=request.allowed_users,
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
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
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
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
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
    db: AsyncSession = Depends(get_db)
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
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at
    )

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
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

# This is a dummy in-memory storage for the search endpoint.
# In a real implementation, this would be a database query with vector search.
DUMMY_AGENTS_FOR_SEARCH = [
    {
        "id": 101, "name": "Customer Support Bot", "description": "A friendly bot to help with customer questions.",
        "framework": AgentFramework.LANGCHAIN, "status": AgentStatus.PRODUCTION, "a2a_endpoint": "http://dummy-host:8101/agent",
        "capabilities": {"skills": ["chat", "faq"]}, "owner_id": "syngha.han", "department": "Customer Service",
        "is_public": True, "visibility": "public", "allowed_users": [], "health_status": HealthStatus.HEALTHY,
        "last_health_check": datetime.utcnow(), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        "logo_url": "/assets/dummy_logo_1.png"
    },
    {
        "id": 102, "name": "Data Analysis Agent", "description": "An agent that can analyze sales data and generate reports.",
        "framework": AgentFramework.CUSTOM, "status": AgentStatus.PRODUCTION, "a2a_endpoint": "http://dummy-host:8102/agent",
        "capabilities": {"skills": ["analyze", "report", "sql"]}, "owner_id": "byungju.lee", "department": "Business Intelligence",
        "is_public": False, "visibility": "team", "allowed_users": [], "health_status": HealthStatus.HEALTHY,
        "last_health_check": datetime.utcnow(), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        "logo_url": "/assets/dummy_logo_2.png"
    },
    {
        "id": 103, "name": "Code Generation Assistant", "description": "Helps developers write boilerplate code.",
        "framework": AgentFramework.AGNO, "status": AgentStatus.DEVELOPMENT, "a2a_endpoint": "http://dummy-host:8103/agent",
        "capabilities": {"skills": ["generate_code", "python", "javascript"]}, "owner_id": "junhyung.ahn", "department": "AI Platform Team",
        "is_public": False, "visibility": "private", "allowed_users": [], "health_status": HealthStatus.UNKNOWN,
        "last_health_check": datetime.utcnow(), "created_at": datetime.utcnow(), "updated_at": datetime.utcnow(),
        "logo_url": "/assets/dummy_logo_3.png"
    },
]

@router.post("/search", response_model=dict[str, Any])
async def search_agents(request: AgentSearchRequest) -> dict[str, Any]:
    """
    DUMMY IMPLEMENTATION: Search for agents based on a query string.
    This is a temporary in-memory search.
    """
    query = request.query.lower()
    if not query:
        return {"agents": DUMMY_AGENTS_FOR_SEARCH, "count": len(DUMMY_AGENTS_FOR_SEARCH), "query": request.query}

    # Dummy search logic
    filtered_agents = [
        agent for agent in DUMMY_AGENTS_FOR_SEARCH
        if query in agent["name"].lower() or query in agent["description"].lower()
    ]

    return {
        "agents": filtered_agents,
        "count": len(filtered_agents),
        "query": request.query,
    }
