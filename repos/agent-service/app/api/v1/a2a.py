"""
A2A Protocol API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import Dict, Any, Optional
import httpx
import json

from app.core.database import get_db, Agent, AgentFramework
from app.core.security import get_current_user
from sqlalchemy import select

router = APIRouter()

class A2ARegisterRequest(BaseModel):
    name: str
    framework: AgentFramework
    endpoint: str
    capabilities: Dict[str, Any] = {}

class A2ARegisterResponse(BaseModel):
    agent_id: str
    a2a_endpoint: str
    status: str

class A2AExecuteRequest(BaseModel):
    task: str
    context: Dict[str, Any] = {}
    parameters: Dict[str, Any] = {}

class A2AExecuteResponse(BaseModel):
    status: str
    data: Dict[str, Any]
    metadata: Dict[str, Any] = {}

@router.post("/register", response_model=A2ARegisterResponse)
async def register_a2a_agent(
    request: A2ARegisterRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Register A2A compatible agent"""
    # Create agent record with framework-specific endpoint
    agent_data = {
        "name": request.name,
        "framework": request.framework,
        "capabilities": request.capabilities,
        "owner_id": current_user["username"],
        "status": "DEVELOPMENT"
    }

    # Set framework-specific endpoint field
    if request.framework == AgentFramework.AGNO:
        agent_data["agno_os_endpoint"] = request.endpoint
    elif request.framework == AgentFramework.ADK:
        agent_data["a2a_endpoint"] = request.endpoint
    elif request.framework == AgentFramework.LANGCHAIN:
        agent_data["langchain_config"] = {"endpoint": request.endpoint}

    agent = Agent(**agent_data)
    
    db.add(agent)
    await db.commit()
    await db.refresh(agent)
    
    # Generate A2A endpoint
    agent_id = str(agent.id)
    a2a_endpoint = f"/api/agents/a2a/execute/{agent_id}"
    
    return A2ARegisterResponse(
        agent_id=agent_id,
        a2a_endpoint=a2a_endpoint,
        status="registered"
    )

@router.post("/execute/{agent_id}", response_model=A2AExecuteResponse)
async def execute_a2a_agent(
    agent_id: str,
    request: A2AExecuteRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Execute A2A agent"""
    # Get agent
    result = await db.execute(select(Agent).where(Agent.id == int(agent_id)))
    agent = result.scalar_one_or_none()
    
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found"
        )
    
    # Get framework-specific endpoint
    endpoint = None
    if agent.framework == AgentFramework.AGNO:
        endpoint = agent.agno_os_endpoint
    elif agent.framework == AgentFramework.ADK:
        endpoint = agent.a2a_endpoint
    elif agent.framework == AgentFramework.LANGCHAIN:
        if agent.langchain_config:
            endpoint = agent.langchain_config.get("endpoint")

    if not endpoint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent does not have endpoint configured for {agent.framework.value} framework"
        )

    # Prepare A2A request based on framework
    a2a_request = _prepare_a2a_request(agent.framework, request)

    try:
        # Execute A2A request
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                endpoint,
                json=a2a_request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            
            result_data = response.json()
            
            return A2AExecuteResponse(
                status="success",
                data=result_data,
                metadata={
                    "execution_time": 1234,  # Mock execution time
                    "tokens_used": 500,      # Mock token usage
                    "framework": agent.framework
                }
            )
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to execute agent: {str(e)}"
        )

def _prepare_a2a_request(framework: AgentFramework, request: A2AExecuteRequest) -> Dict[str, Any]:
    """Prepare A2A request based on framework"""
    if framework == AgentFramework.AGNO:
        return {
            "version": "1.0",
            "session_id": f"agno-session-{request.context.get('session_id', 'default')}",
            "request": {
                "type": "execute",
                "payload": {
                    "command": "process",
                    "data": request.task,
                    "context": request.context
                }
            }
        }
    elif framework == AgentFramework.ADK:
        return {
            "task": request.task,
            "parameters": request.parameters,
            "context": request.context
        }
    elif framework == AgentFramework.LANGCHAIN:
        return {
            "input": request.task,
            "config": {
                "temperature": 0.7,
                "max_tokens": 1000,
                "tools": request.parameters.get("tools", [])
            }
        }
    else:  # Custom
        return {
            "custom_field": "value",
            "action": "process",
            "data": {
                "task": request.task,
                "context": request.context,
                "parameters": request.parameters
            }
        }
