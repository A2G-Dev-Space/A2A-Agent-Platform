"""
A2A Router - Public Agent Endpoint

Exposes deployed agents via A2A Protocol.
Endpoint: /a2a/{agent_name}

Features:
- Agent Card hosting at /.well-known/agent-card.json
- message/send method for agent communication
- API Key authentication (Platform API Key)
- Team visibility enforcement
- Streaming support
"""

from fastapi import APIRouter, Depends, HTTPException, Header, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, Optional, AsyncGenerator
import httpx
import logging
import json
from uuid import uuid4

from app.core.database import get_db, Agent, AgentStatus
from app.a2a.adapters import get_framework_adapter

router = APIRouter()
logger = logging.getLogger(__name__)


async def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """
    Verify Platform API Key and return user info

    Returns None if no API key provided (for public agents)
    Returns user info dict if API key is valid
    Raises HTTPException if API key is invalid
    """
    if not x_api_key:
        return None

    # TODO: Implement API Key verification
    # For now, return None (no auth)
    logger.warning("API Key authentication not implemented yet")
    return None


@router.get("/a2a/{agent_name}/.well-known/agent-card.json")
async def get_agent_card(
    agent_name: str,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Agent Card Discovery Endpoint

    Returns the Agent Card for the specified agent.
    Uses 3-tier strategy:
    1. ADK agents: Fetch from original endpoint
    2. Stored agent_card_json: Use from database
    3. Generate from DB info

    **Public Endpoint**: No authentication required
    """
    # Query agent by name
    result = await db.execute(
        select(Agent).where(Agent.name == agent_name)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_name}' not found"
        )

    agent_card = None

    # Strategy 1: ADK agents - fetch from original endpoint
    if agent.framework.value == "ADK" and agent.original_endpoint:
        try:
            adk_card_url = f"{agent.original_endpoint}/.well-known/agent-card.json"
            logger.info(f"Fetching ADK agent card from: {adk_card_url}")

            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(adk_card_url)
                if response.status_code == 200:
                    agent_card = response.json()
                    logger.info(f"✅ Fetched ADK agent card for {agent_name}")
                else:
                    logger.warning(f"⚠️  ADK agent card fetch failed: {response.status_code}")
        except Exception as e:
            logger.warning(f"⚠️  Failed to fetch ADK agent card: {e}")

    # Strategy 2: Use stored agent_card_json
    if not agent_card and agent.agent_card_json:
        agent_card = agent.agent_card_json.copy()
        logger.info(f"Using stored agent_card_json for {agent_name}")

    # Strategy 3: Generate from DB info
    if not agent_card:
        logger.info(f"Generating default agent card for {agent_name}")
        agent_card = {
            "name": agent.name,
            "description": agent.description or "",
            "version": "1.0.0",
            "protocolVersion": "0.3.0",
            "capabilities": agent.capabilities or {},
            "preferredTransport": "JSONRPC",
            "framework": agent.framework.value,
            "logo_url": agent.logo_url,
            "card_color": agent.card_color,
            "metadata": {
                "owner_id": agent.owner_id,
                "department": agent.department,
                "visibility": agent.visibility,
                "created_at": agent.created_at.isoformat() if agent.created_at else None
            }
        }

    # Override URL to point to this platform
    agent_card["url"] = f"http://localhost:9050/api/v1/a2a/{agent_name}"

    # Add provider info
    if "provider" not in agent_card:
        agent_card["provider"] = {
            "organization": "A2G Platform",
            "url": "http://localhost:9050"
        }

    logger.info(f"Agent Card served for {agent_name}")
    return agent_card


@router.post("/a2a/{agent_name}")
async def agent_message_endpoint(
    agent_name: str,
    request_body: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    user_info: Optional[Dict[str, Any]] = Depends(verify_api_key)
) -> Dict[str, Any]:
    """
    A2A Agent Communication Endpoint

    Handles A2A Protocol requests:
    - method: "message/send"

    **Authentication**: Optional via x-api-key header
    - No auth: Only public agents accessible
    - With auth: Access to team agents (same department)

    **Request**:
    ```json
    {
      "jsonrpc": "2.0",
      "id": "req-001",
      "method": "message/send",
      "params": {
        "message": {
          "messageId": "...",
          "role": "user",
          "parts": [{"type": "text", "text": "..."}]
        }
      }
    }
    ```

    **Response**:
    ```json
    {
      "jsonrpc": "2.0",
      "result": {
        "id": "task-456",
        "status": {
          "state": "completed",
          "message": {
            "role": "agent",
            "parts": [{"type": "text", "text": "..."}]
          }
        }
      }
    }
    ```
    """
    # 1. Validate JSON-RPC request
    if request_body.get("jsonrpc") != "2.0":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON-RPC version, must be '2.0'"
        )

    method = request_body.get("method")
    if method != "message/send":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported method: {method}. Only 'message/send' is supported"
        )

    # 2. Load agent by name
    result = await db.execute(
        select(Agent).where(Agent.name == agent_name)
    )
    agent = result.scalar_one_or_none()

    if not agent:
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32002,
                "message": f"Agent '{agent_name}' not found"
            },
            "id": request_body.get("id")
        }

    # 3. Check access control (TODO: implement with API Key)
    # For now, allow all access
    logger.info(f"[A2A Router] Request to agent '{agent_name}' (visibility: {agent.visibility})")

    # 4. Get framework adapter
    try:
        adapter = get_framework_adapter(agent.framework.value)
    except ValueError as e:
        logger.error(f"Unsupported framework: {agent.framework}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32003,
                "message": f"Unsupported framework: {agent.framework}"
            },
            "id": request_body.get("id")
        }

    # 5. Transform request to framework format
    try:
        framework_request = adapter.transform_request(request_body, agent.agent_card)
        logger.info(f"[A2A Router] Transformed request for {agent.framework}")
    except Exception as e:
        logger.error(f"Failed to transform request: {e}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32004,
                "message": f"Failed to transform request: {str(e)}"
            },
            "id": request_body.get("id")
        }

    # 6. Call agent endpoint
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            endpoint_path = adapter.get_endpoint_path()
            full_endpoint = f"{agent.original_endpoint}{endpoint_path}"
            logger.info(f"[A2A Router] Calling {full_endpoint}")

            response = await client.post(
                full_endpoint,
                json=framework_request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            framework_response = response.json()
            logger.info(f"[A2A Router] Received response from {agent.framework}")

        except httpx.TimeoutException:
            logger.error(f"Timeout calling agent {agent_name}")
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32005,
                    "message": "Agent endpoint timeout"
                },
                "id": request_body.get("id")
            }
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling agent: {e}")
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32006,
                    "message": f"Failed to call agent: {str(e)}"
                },
                "id": request_body.get("id")
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                "jsonrpc": "2.0",
                "error": {
                    "code": -32007,
                    "message": f"Internal error: {str(e)}"
                },
                "id": request_body.get("id")
            }

    # 7. Transform response to A2A format
    try:
        a2a_response = adapter.transform_response(framework_response, request_body)
        logger.info(f"[A2A Router] Transformed response to A2A format")
        return a2a_response
    except Exception as e:
        logger.error(f"Failed to transform response: {e}")
        return {
            "jsonrpc": "2.0",
            "error": {
                "code": -32008,
                "message": f"Failed to transform response: {str(e)}"
            },
            "id": request_body.get("id")
        }
