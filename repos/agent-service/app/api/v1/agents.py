"""
Agent CRUD API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
import uuid
import httpx
import logging
import re
import os

from app.core.database import get_db, Agent, AgentFramework, AgentStatus, HealthStatus
from app.core.security import get_current_user
from sqlalchemy import select, and_, func

logger = logging.getLogger(__name__)

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
    card_color: Optional[str] = None  # Hex color for agent card
    logo_url: Optional[str] = None  # URL for agent logo

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
    card_color: Optional[str] = None  # Hex color for agent card
    logo_url: Optional[str] = None  # URL for agent logo

class AgentResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    framework: AgentFramework
    status: AgentStatus
    a2a_endpoint: Optional[str]
    trace_id: Optional[str]
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
    card_color: Optional[str]  # Hex color for agent card
    logo_url: Optional[str]  # URL for agent logo

class AgentListResponse(BaseModel):
    agents: List[AgentResponse]
    total: int
    page: int
    limit: int

class AgentSearchRequest(BaseModel):
    query: str


async def validate_agent_endpoint(a2a_endpoint: str) -> Dict[str, Any]:
    """
    Validate agent A2A endpoint by checking agent card

    Args:
        a2a_endpoint: Base URL of the agent (e.g. http://localhost:8011)

    Returns:
        Agent card JSON if valid

    Raises:
        HTTPException: If endpoint is invalid or unreachable
    """
    logger.info(f"[Agent Validation] Validating endpoint: {a2a_endpoint}")

    # Transform localhost to host.docker.internal for Docker environments
    validation_endpoint = a2a_endpoint.replace("localhost", "host.docker.internal").replace("127.0.0.1", "host.docker.internal")
    logger.info(f"[Agent Validation] Using validation endpoint: {validation_endpoint}")

    # Try both agent card endpoints (.well-known/agent-card.json and .well-known/agent.json)
    card_endpoints = [
        f"{validation_endpoint}/.well-known/agent-card.json",
        f"{validation_endpoint}/.well-known/agent.json"
    ]

    last_error = None

    for card_url in card_endpoints:
        try:
            logger.info(f"[Agent Validation] Trying: {card_url}")

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(card_url)

                if response.status_code == 200:
                    agent_card = response.json()
                    logger.info(f"[Agent Validation] Success! Agent card retrieved from {card_url}")
                    logger.debug(f"[Agent Validation] Agent card: {agent_card}")
                    return agent_card
                else:
                    last_error = f"HTTP {response.status_code} from {card_url}"
                    logger.warning(f"[Agent Validation] {last_error}")

        except httpx.TimeoutException as e:
            last_error = f"Timeout connecting to {card_url}"
            logger.warning(f"[Agent Validation] {last_error}")
        except httpx.ConnectError as e:
            last_error = f"Connection error to {card_url}: {str(e)}"
            logger.warning(f"[Agent Validation] {last_error}")
        except Exception as e:
            last_error = f"Error fetching {card_url}: {str(e)}"
            logger.warning(f"[Agent Validation] {last_error}")

    # If we get here, all attempts failed
    logger.error(f"[Agent Validation] Failed to validate endpoint {a2a_endpoint}: {last_error}")
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Failed to validate agent endpoint: {last_error}. "
               f"Please ensure the agent is running and accessible at {a2a_endpoint}."
    )


@router.get("/", response_model=AgentListResponse)
async def get_agents(
    status: Optional[AgentStatus] = Query(None),
    framework: Optional[AgentFramework] = Query(None),
    department: Optional[str] = Query(None),
    visibility: Optional[str] = Query(None, description="public, private, team"),
    trace_id: Optional[str] = Query(None, description="Filter by trace_id"),
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
    if trace_id:
        filters.append(Agent.trace_id == trace_id)

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
                trace_id=agent.trace_id,
                capabilities=agent.capabilities,
                owner_id=agent.owner_id,
                department=agent.department,
                is_public=agent.is_public,
                visibility=agent.visibility,
                allowed_users=agent.allowed_users,
                health_status=agent.health_status,
                last_health_check=agent.last_health_check,
                created_at=agent.created_at,
                updated_at=agent.updated_at,
                card_color=agent.card_color,
                logo_url=agent.logo_url
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
    """
    Create new agent without endpoint validation

    Agent can be created without an endpoint. The endpoint can be added later
    via Chat&Debug interface after the agent is hosted.
    """
    logger.info(f"[Create Agent] User {current_user['username']} creating agent: {request.name}")

    # Check if agent name already exists
    existing = await db.execute(select(Agent).where(Agent.name == request.name))
    if existing.scalar_one_or_none():
        logger.warning(f"[Create Agent] Agent name '{request.name}' already exists")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Agent with this name already exists"
        )

    # No endpoint validation during creation - endpoint will be added later via Chat&Debug
    logger.info(f"[Create Agent] Creating agent without endpoint validation (endpoint will be configured later)")

    # Generate unique trace_id for LLM tracking
    trace_id = str(uuid.uuid4())
    logger.info(f"[Create Agent] Generated trace_id: {trace_id}")

    agent = Agent(
        name=request.name,
        description=request.description,
        framework=request.framework,
        a2a_endpoint=request.a2a_endpoint,
        trace_id=trace_id,
        capabilities=request.capabilities,
        owner_id=current_user["username"],
        department=current_user.get("department"),
        is_public=request.is_public,
        visibility=request.visibility,
        allowed_users=request.allowed_users,
        status=AgentStatus.DEVELOPMENT,
        card_color=request.card_color,
        logo_url=request.logo_url
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
        trace_id=agent.trace_id,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        card_color=agent.card_color,
        logo_url=agent.logo_url
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
        trace_id=agent.trace_id,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        card_color=agent.card_color,
        logo_url=agent.logo_url
    )

@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: int,
    request: AgentUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update agent with optional endpoint validation"""
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

    # Validate A2A endpoint if it's being updated
    update_data = request.dict(exclude_unset=True)
    if "a2a_endpoint" in update_data and update_data["a2a_endpoint"]:
        logger.info(f"[Update Agent] Validating new endpoint: {update_data['a2a_endpoint']}")
        agent_card = await validate_agent_endpoint(update_data["a2a_endpoint"])
        logger.info(f"[Update Agent] Endpoint validation successful for agent {agent_id}")

    # Update fields
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
        trace_id=agent.trace_id,
        capabilities=agent.capabilities,
        owner_id=agent.owner_id,
        department=agent.department,
        is_public=agent.is_public,
        visibility=agent.visibility,
        allowed_users=agent.allowed_users,
        health_status=agent.health_status,
        last_health_check=agent.last_health_check,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        card_color=agent.card_color,
        logo_url=agent.logo_url
    )

@router.delete("/{agent_id}")
async def delete_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete agent and associated token usage records"""
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

    # Delete agent from database
    await db.delete(agent)
    await db.commit()

    # Delete associated LLM call records from llm-proxy-service
    llm_proxy_url = os.getenv('LLM_PROXY_SERVICE_URL', 'http://llm-proxy-service:8006')
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.delete(f"{llm_proxy_url}/api/internal/llm-calls/agent/{agent_id}")
            if response.status_code == 200:
                data = response.json()
                logger.info(f"Deleted LLM records for agent {agent_id}: {data.get('deleted_counts', {})}")
            else:
                logger.warning(f"Failed to delete LLM records for agent {agent_id}: {response.status_code}")
    except Exception as e:
        logger.error(f"Error calling llm-proxy-service to delete records for agent {agent_id}: {e}")
        # Don't fail the agent deletion if LLM record deletion fails

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


@router.patch("/{agent_id}/trace-id")
async def update_agent_trace_id(
    agent_id: int,
    request: dict,
    db: AsyncSession = Depends(get_db)
):
    """
    Update agent's trace_id (Internal API - No Auth Required)

    Used by Workbench to set deterministic trace_id for agent.
    This allows LLM proxy to resolve agent_id from trace_id for token tracking.
    """
    trace_id = request.get("trace_id")
    if not trace_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="trace_id is required"
        )

    # Find agent
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )

    # Update trace_id
    agent.trace_id = trace_id
    await db.commit()

    return {
        "id": agent.id,
        "name": agent.name,
        "trace_id": agent.trace_id,
        "updated": True
    }


# Deploy Request/Response Models
class DeployRequest(BaseModel):
    """Deploy request model"""
    deploy_scope: str  # 'team' or 'public'
    deploy_config: Optional[Dict[str, Any]] = {}


class DeployResponse(BaseModel):
    """Deploy response model"""
    agent_id: int
    status: str
    deployed_at: datetime
    deployed_by: str
    validated_endpoint: str
    deploy_scope: str


def validate_host_for_deploy(endpoint: str) -> tuple[bool, str]:
    """
    Validate that endpoint is not localhost/127.0.0.1/0.0.0.0
    Returns (is_valid, error_message)
    """
    if not endpoint:
        return False, "Endpoint is required for deployment"

    # Extract hostname from URL
    import re
    pattern = r'^(?:https?://)?([^:/]+)'
    match = re.match(pattern, endpoint.lower())
    if not match:
        return False, "Invalid endpoint format"

    hostname = match.group(1)

    # Check for localhost variations
    invalid_hosts = ['localhost', '127.0.0.1', '0.0.0.0', '::1']
    if hostname in invalid_hosts:
        return False, f"Cannot deploy with local endpoint '{hostname}'. Please provide a public URL."

    # Check for private IP ranges (optional, more strict validation)
    private_ip_patterns = [
        r'^10\.',  # 10.0.0.0 - 10.255.255.255
        r'^172\.(1[6-9]|2[0-9]|3[0-1])\.',  # 172.16.0.0 - 172.31.255.255
        r'^192\.168\.',  # 192.168.0.0 - 192.168.255.255
    ]

    for pattern in private_ip_patterns:
        if re.match(pattern, hostname):
            return False, f"Cannot deploy with private IP '{hostname}'. Please provide a public URL."

    return True, ""


async def test_agent_connection(endpoint: str, timeout: int = 5) -> tuple[bool, str]:
    """
    Test if agent endpoint is reachable
    Returns (is_reachable, error_message)
    """
    try:
        async with httpx.AsyncClient(timeout=timeout) as client:
            # Test with A2A info request
            response = await client.post(
                endpoint,
                json={
                    "jsonrpc": "2.0",
                    "method": "agent/info",
                    "params": {},
                    "id": "deploy-test"
                }
            )

            if response.status_code == 200:
                return True, ""
            else:
                return False, f"Agent returned status code {response.status_code}"

    except httpx.ConnectTimeout:
        return False, "Connection timeout - endpoint is not reachable"
    except httpx.ConnectError:
        return False, "Connection failed - endpoint is not accessible"
    except Exception as e:
        return False, f"Connection test failed: {str(e)}"


@router.post("/{agent_id}/deploy", response_model=DeployResponse)
async def deploy_agent(
    agent_id: int,
    request: DeployRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Deploy an agent to Hub

    Requirements:
    1. Agent must be owned by current user
    2. Endpoint must not be localhost/127.0.0.1
    3. Endpoint must be reachable
    4. Agent must be in DEVELOPMENT status
    """
    # Get agent
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
            detail="Only agent owner can deploy"
        )

    # Check if already deployed
    if agent.status in [AgentStatus.DEPLOYED_TEAM, AgentStatus.DEPLOYED_ALL, AgentStatus.DEPLOYED_DEPT, AgentStatus.PRODUCTION]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent is already deployed with status: {agent.status}"
        )

    # Validate endpoint is not localhost
    endpoint = agent.a2a_endpoint
    is_valid, error_msg = validate_host_for_deploy(endpoint)
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    # Test agent connection
    logger.info(f"[Deploy] Testing connection to {endpoint}")
    is_reachable, error_msg = await test_agent_connection(endpoint)
    if not is_reachable:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent endpoint validation failed: {error_msg}"
        )

    # Update agent status based on deploy scope
    new_status = AgentStatus.DEPLOYED_TEAM if request.deploy_scope == "team" else AgentStatus.DEPLOYED_ALL

    # For team deployment, check department is set
    if request.deploy_scope == "team" and not agent.department:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department must be set for team deployment"
        )

    # Update agent
    agent.status = new_status
    agent.deployed_at = datetime.utcnow()
    agent.deployed_by = current_user["username"]
    agent.validated_endpoint = endpoint
    agent.deploy_config = request.deploy_config

    # Update visibility based on deploy scope
    if request.deploy_scope == "team":
        agent.visibility = "team"
    else:
        agent.visibility = "public"

    await db.commit()
    await db.refresh(agent)

    logger.info(f"[Deploy] Agent {agent_id} deployed successfully as {new_status}")

    return DeployResponse(
        agent_id=agent.id,
        status=agent.status,
        deployed_at=agent.deployed_at,
        deployed_by=agent.deployed_by,
        validated_endpoint=agent.validated_endpoint,
        deploy_scope=request.deploy_scope
    )


@router.post("/{agent_id}/undeploy")
async def undeploy_agent(
    agent_id: int,
    current_user: dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Undeploy an agent from Hub

    Requirements:
    1. Agent must be owned by current user
    2. Agent must be in deployed status
    """
    # Get agent
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
            detail="Only agent owner can undeploy"
        )

    # Check if deployed
    if agent.status not in [AgentStatus.DEPLOYED_TEAM, AgentStatus.DEPLOYED_ALL, AgentStatus.DEPLOYED_DEPT, AgentStatus.PRODUCTION]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent is not deployed. Current status: {agent.status}"
        )

    # Update agent status back to DEVELOPMENT
    agent.status = AgentStatus.DEVELOPMENT
    agent.deployed_at = None
    agent.deployed_by = None
    agent.validated_endpoint = None
    agent.deploy_config = {}
    agent.visibility = "private"  # Reset to private

    await db.commit()
    await db.refresh(agent)

    logger.info(f"[Undeploy] Agent {agent_id} undeployed successfully")

    return {
        "agent_id": agent.id,
        "status": agent.status,
        "message": "Agent undeployed successfully"
    }


@router.get("/statistics")
async def get_agent_statistics(
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent statistics (Internal API - No Auth Required)
    Used by worker service for daily snapshots
    """
    # Count total agents
    total_result = await db.execute(
        select(func.count(Agent.id))
    )
    total_agents = total_result.scalar() or 0

    # Count deployed agents (is_deployed = true)
    deployed_result = await db.execute(
        select(func.count(Agent.id)).where(Agent.is_deployed == True)
    )
    deployed_agents = deployed_result.scalar() or 0

    # Count development agents (is_deployed = false)
    development_agents = total_agents - deployed_agents

    return {
        "total": total_agents,
        "deployed": deployed_agents,
        "development": development_agents,
        "timestamp": datetime.utcnow().isoformat()
    }
