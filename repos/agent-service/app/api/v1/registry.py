"""
A2A Registry API Endpoints
Following A2A Protocol specification with Access Control extensions
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from typing import Any, Optional, List
from urllib.parse import unquote

from app.core.types import AgentCard
from app.core.storage import RegistryStorage
from app.core.database import get_db
from app.core.security import get_current_user
import logging

router = APIRouter()
logger = logging.getLogger(__name__)


class RegisterAgentRequest(BaseModel):
    """Request to register an agent"""
    agent_card: dict[str, Any]


class AgentSearchRequest(BaseModel):
    """Request to search for agents"""
    query: str


@router.post("/agents", response_model=dict[str, Any])
async def register_agent(
    request: RegisterAgentRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    Register an agent in the registry using AgentCard format

    **A2A Registry Compliant Endpoint**

    This endpoint follows the A2A Registry specification with Access Control extensions.

    **Required AgentCard Fields:**
    - `name`: Unique agent name
    - `description`: Agent description
    - `url`: Agent A2A endpoint URL
    - `version`: Agent version (semantic versioning)
    - `protocol_version`: A2A protocol version (currently "1.0")

    **Optional AgentCard Fields:**
    - `capabilities`: Agent capabilities including skills
    - `preferred_transport`: Transport protocol (default: "JSONRPC")
    - `provider`: Provider information
    - `documentation_url`: Link to agent documentation

    **Access Control Extension Fields:**
    - `visibility`: "public", "private", or "team" (default: "public")
    - `department`: Department name (auto-set for team visibility)
    - `allowed_users`: List of usernames with explicit access

    **Example Request:**
    ```json
    {
      "agent_card": {
        "name": "Customer Support Bot",
        "description": "AI agent for customer support",
        "url": "http://localhost:8100/agent",
        "version": "1.0.0",
        "protocol_version": "1.0",
        "capabilities": {"skills": ["customer-support", "chat"]},
        "visibility": "public"
      }
    }
    ```

    **Example Response:**
    ```json
    {
      "success": true,
      "agent_id": "Customer Support Bot",
      "message": "Agent registered successfully",
      "extensions_processed": 0
    }
    ```
    """
    try:
        agent_card_dict = request.agent_card

        # Validate required fields for AgentCard
        required_fields = [
            "name",
            "description",
            "url",
            "version",
            "protocol_version",
        ]
        for field in required_fields:
            if field not in agent_card_dict:
                raise ValueError(f"Missing required field: {field}")

        # Set default transport to JSONRPC per A2A specification
        if "preferred_transport" not in agent_card_dict:
            agent_card_dict["preferred_transport"] = "JSONRPC"

        # Set default Access Control if not provided
        if "visibility" not in agent_card_dict:
            agent_card_dict["visibility"] = "public"
        if "is_public" not in agent_card_dict:
            agent_card_dict["is_public"] = True

        # Cast to AgentCard type
        agent_card: AgentCard = agent_card_dict  # type: ignore

        storage = RegistryStorage(db)
        success = await storage.register_agent(agent_card, current_user)

        if success:
            # Extract and update agent extensions
            agent_id = agent_card["name"]
            extensions = []

            # Get extensions from agent card capabilities
            capabilities = agent_card.get("capabilities", {})
            if isinstance(capabilities, dict):
                agent_extensions = capabilities.get("extensions", [])
                if isinstance(agent_extensions, list):
                    extensions = [
                        {
                            "uri": ext.get("uri", ""),
                            "description": ext.get("description", ""),
                            "required": ext.get("required", False),
                            "params": ext.get("params", {}),
                        }
                        for ext in agent_extensions
                        if isinstance(ext, dict) and ext.get("uri")
                    ]

            # Update agent extensions in storage
            await storage.update_agent_extensions(agent_id, extensions)

            return {
                "success": True,
                "agent_id": agent_id,
                "message": "Agent registered successfully",
                "extensions_processed": len(extensions),
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to register agent"
            )

    except Exception as e:
        logger.error(f"Error registering agent: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        ) from e


@router.get("/agents/{agent_id}", response_model=dict[str, Any])
async def get_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    Get an agent by ID

    Access Control: Users can only view agents they have access to
    """
    storage = RegistryStorage(db)
    agent_card = await storage.get_agent(agent_id, current_user)

    if agent_card:
        return {"agent_card": dict(agent_card)}
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found or access denied"
        )


@router.get("/agents", response_model=dict[str, Any])
async def list_agents(
    visibility: Optional[str] = Query(None, description="Filter by visibility: public, private, team"),
    department: Optional[str] = Query(None, description="Filter by department"),
    only_mine: bool = Query(False, description="Show only my agents"),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    List all registered agents with Access Control filtering

    **A2A Registry Compliant Endpoint**

    Returns AgentCard format for all accessible agents.

    **Default Behavior (no filters):**
    - All public agents
    - User's own agents (any visibility)
    - Team agents from user's department

    **Query Parameters:**
    - `visibility`: Filter by visibility level
      - `public`: Only public agents
      - `private`: Only your private agents
      - `team`: Only team agents from your department
    - `department`: Filter by specific department
    - `only_mine`: Show only agents you own (any visibility)

    **Example Requests:**

    List all accessible agents:
    ```
    GET /api/agents
    ```

    List only public agents:
    ```
    GET /api/agents?visibility=public
    ```

    List only my agents:
    ```
    GET /api/agents?only_mine=true
    ```

    List Engineering team agents:
    ```
    GET /api/agents?visibility=team&department=Engineering
    ```

    **Example Response:**
    ```json
    {
      "agents": [
        {
          "name": "Customer Support Bot",
          "description": "AI agent for customer support",
          "url": "http://localhost:8100/agent",
          "version": "1.0.0",
          "protocol_version": "1.0",
          "capabilities": {"skills": ["customer-support", "chat"]},
          "visibility": "public",
          "owner_id": "john.doe",
          "department": "Customer Success"
        }
      ],
      "count": 1
    }
    ```
    """
    storage = RegistryStorage(db)
    agents = await storage.list_agents(
        current_user=current_user,
        visibility=visibility,
        department=department,
        only_mine=only_mine
    )

    return {
        "agents": [dict(agent) for agent in agents],
        "count": len(agents)
    }


@router.delete("/agents/{agent_id}", response_model=dict[str, Any])
async def unregister_agent(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    Unregister an agent

    Access Control: Only the owner can delete their agent
    """
    storage = RegistryStorage(db)

    # First remove agent from extensions
    extensions_removed = await storage.remove_agent_from_extensions(agent_id)

    # Then remove the agent
    success = await storage.unregister_agent(agent_id, current_user)

    if success:
        return {
            "success": True,
            "message": "Agent unregistered successfully",
            "extensions_cleaned": extensions_removed,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Agent not found or access denied"
        )


@router.post("/agents/search", response_model=dict[str, Any])
async def search_agents(
    request: AgentSearchRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    Search for agents by query string

    **A2A Registry Compliant Endpoint**

    Searches agent names, descriptions, and capabilities (skills).
    Only returns agents the user has access to based on Access Control rules.

    **Request Body:**
    ```json
    {
      "query": "python data analysis"
    }
    ```

    **Example Response:**
    ```json
    {
      "agents": [
        {
          "name": "Python Coding Agent",
          "description": "Helps with Python programming",
          "url": "http://localhost:8102/agent",
          "version": "1.0.0",
          "protocol_version": "1.0",
          "capabilities": {"skills": ["python", "coding", "debugging"]},
          "visibility": "public",
          "owner_id": "dev.team"
        },
        {
          "name": "Data Analysis Agent",
          "description": "Analyzes data and creates visualizations",
          "url": "http://localhost:8101/agent",
          "version": "1.2.0",
          "protocol_version": "1.0",
          "capabilities": {"skills": ["data-analysis", "visualization", "python"]},
          "visibility": "public",
          "owner_id": "jane.smith"
        }
      ],
      "count": 2,
      "query": "python data analysis"
    }
    ```

    **Access Control:**
    - Public agents: Visible to all
    - Private agents: Only visible to owner
    - Team agents: Only visible to department members
    """
    storage = RegistryStorage(db)
    agents = await storage.search_agents(request.query, current_user)

    return {
        "agents": [dict(agent) for agent in agents],
        "count": len(agents),
        "query": request.query,
    }


# Extension discovery endpoints


@router.get("/extensions", response_model=dict[str, Any])
async def list_extensions(
    uri_pattern: Optional[str] = Query(
        None, description="Filter extensions by URI pattern"
    ),
    declaring_agents: Optional[List[str]] = Query(
        None, description="Filter by declaring agents"
    ),
    trust_levels: Optional[List[str]] = Query(
        None, description="Filter by trust levels"
    ),
    page_size: int = Query(
        100, description="Number of extensions per page", ge=1, le=1000
    ),
    page_token: Optional[str] = Query(None, description="Page token for pagination"),
    db=Depends(get_db)
) -> dict[str, Any]:
    """List all extensions with provenance information"""
    try:
        storage = RegistryStorage(db)
        extensions, next_page_token, total_count = await storage.list_extensions(
            uri_pattern=uri_pattern,
            declaring_agents=declaring_agents,
            trust_levels=trust_levels,
            page_size=page_size,
            page_token=page_token,
        )

        return {
            "extensions": [dict(ext) for ext in extensions],
            "count": len(extensions),
            "total_count": total_count,
            "next_page_token": next_page_token,
        }
    except Exception as e:
        logger.error(f"Error listing extensions: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e


@router.get("/extensions/{uri:path}", response_model=dict[str, Any])
async def get_extension_info(
    uri: str,
    db=Depends(get_db)
) -> dict[str, Any]:
    """Get specific extension information by URI"""
    try:
        # URL decode the URI
        decoded_uri = unquote(uri)
        storage = RegistryStorage(db)
        extension_info = await storage.get_extension(decoded_uri)

        if extension_info:
            return {
                "extension_info": dict(extension_info),
                "found": True,
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Extension not found"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting extension info for {uri}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e


@router.get("/agents/{agent_id}/extensions", response_model=dict[str, Any])
async def get_agent_extensions(
    agent_id: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
) -> dict[str, Any]:
    """
    Get all extensions used by a specific agent

    Access Control: User must have access to the agent
    """
    try:
        storage = RegistryStorage(db)

        # Verify agent exists and user has access
        agent_card = await storage.get_agent(agent_id, current_user)
        if not agent_card:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Agent not found or access denied"
            )

        extensions = await storage.get_agent_extensions(agent_id)

        return {
            "agent_id": agent_id,
            "extensions": [dict(ext) for ext in extensions],
            "count": len(extensions),
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting extensions for agent {agent_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        ) from e
