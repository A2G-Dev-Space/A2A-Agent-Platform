"""
Universal A2A Proxy Endpoints

This module provides a unified A2A Protocol interface for all registered agents,
regardless of their underlying framework.

Key Features:
1. Agent Card discovery (/.well-known/agent-card.json)
2. A2A Protocol endpoint (/tasks/send)
3. Framework-agnostic translation
4. Access control enforcement

Usage:
- GET  /api/a2a/proxy/{agent_id}/.well-known/agent-card.json
- POST /api/a2a/proxy/{agent_id}/tasks/send
- GET  /api/a2a/proxy/{agent_id}/tasks/{task_id}
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, AsyncGenerator
import httpx
import logging
import json
import asyncio

from app.core.database import get_db, Agent
from app.core.security import get_current_user
from app.a2a.adapters import get_framework_adapter

router = APIRouter()
logger = logging.getLogger(__name__)


async def stream_agent_response(
    agent: Agent,
    request_body: Dict[str, Any],
    adapter,
    framework_request: Dict[str, Any]
) -> AsyncGenerator[str, None]:
    """
    Stream agent response chunks as Server-Sent Events (SSE)

    Each chunk is a JSON-RPC 2.0 response with partial content.
    """
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:
            logger.info(f"Streaming from endpoint: {agent.original_endpoint}")

            # Call agent endpoint with streaming
            async with client.stream(
                "POST",
                agent.original_endpoint,
                json=framework_request,
                headers={"Content-Type": "application/json"}
            ) as response:
                response.raise_for_status()

                # Stream response chunks
                async for chunk in adapter.stream_response(response, request_body):
                    # Format as SSE
                    yield f"data: {json.dumps(chunk)}\n\n"

                # Send final done message
                yield "data: [DONE]\n\n"

    except httpx.TimeoutException:
        logger.error(f"Timeout streaming from agent: {agent.original_endpoint}")
        error_response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32000,
                "message": "Agent endpoint timeout"
            },
            "id": request_body.get("id", "unknown")
        }
        yield f"data: {json.dumps(error_response)}\n\n"

    except httpx.HTTPError as e:
        logger.error(f"HTTP error streaming from agent: {e}")
        error_response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32001,
                "message": f"Agent endpoint error: {str(e)}"
            },
            "id": request_body.get("id", "unknown")
        }
        yield f"data: {json.dumps(error_response)}\n\n"

    except Exception as e:
        logger.error(f"Unexpected error streaming: {e}")
        error_response = {
            "jsonrpc": "2.0",
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            },
            "id": request_body.get("id", "unknown")
        }
        yield f"data: {json.dumps(error_response)}\n\n"


@router.get("/a2a/proxy/{agent_id}/.well-known/agent-card.json")
async def get_agent_card(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    A2A Agent Card Discovery Endpoint

    This endpoint provides the Agent Card for A2A JS SDK clients.
    The Agent Card describes the agent's capabilities, protocols, and skills.

    **Public Endpoint**: No authentication required for agent discovery.

    **URL Format**:
    ```
    GET http://localhost:9050/api/a2a/proxy/{agent_id}/.well-known/agent-card.json
    ```

    **Response**: Standard A2A Agent Card (JSON)
    ```json
    {
      "name": "My Agent",
      "description": "Agent description",
      "url": "http://localhost:9050/api/a2a/proxy/123",
      "version": "1.0.0",
      "protocol_version": "1.0",
      "capabilities": {
        "streaming": true,
        "tools": true
      },
      "skills": [...]
    }
    ```

    **Example Usage (A2A JS SDK)**:
    ```typescript
    const client = await A2AClient.fromCardUrl(
      "http://localhost:9050/api/a2a/proxy/1/.well-known/agent-card.json"
    );
    ```
    """
    # Query agent from database
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id} not found"
        )

    # Return Agent Card with proxy URL
    agent_card = agent.agent_card.copy()

    # Override URL to point to proxy
    agent_card["url"] = f"http://localhost:9050/api/a2a/proxy/{agent_id}"

    # Add provider info
    if "provider" not in agent_card:
        agent_card["provider"] = {
            "organization": "A2G Platform",
            "url": "http://localhost:9050"
        }

    logger.info(f"Agent Card requested for agent_id={agent_id}, name={agent.name}")

    return agent_card


@router.post("/a2a/proxy/{agent_id}/tasks/send")
async def proxy_a2a_request(
    agent_id: int,
    request_body: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Universal A2A Proxy Endpoint

    This endpoint receives A2A Protocol requests and forwards them to the
    actual agent endpoint, performing necessary format transformations.

    **Flow**:
    1. Load agent from database
    2. Check access control (visibility, ownership)
    3. Get framework adapter
    4. Transform A2A request → Framework format
    5. Call original endpoint (user's agent server)
    6. Transform Framework response → A2A format
    7. Return A2A response

    **Authentication**: Required (JWT Bearer token)

    **Request Format**: A2A Protocol (JSON-RPC 2.0)
    ```json
    {
      "jsonrpc": "2.0",
      "method": "sendMessage",
      "params": {
        "message": {
          "messageId": "msg-123",
          "role": "user",
          "parts": [{"kind": "text", "text": "Hello"}],
          "kind": "message"
        },
        "configuration": {
          "blocking": true,
          "acceptedOutputModes": ["text/plain"]
        }
      },
      "id": "request-123"
    }
    ```

    **Response Format**: A2A Protocol (JSON-RPC 2.0)
    ```json
    {
      "jsonrpc": "2.0",
      "result": {
        "kind": "message",
        "messageId": "response-123",
        "role": "agent",
        "parts": [{"kind": "text", "text": "Response"}]
      },
      "id": "request-123"
    }
    ```

    **Error Handling**:
    - 404: Agent not found
    - 403: Access denied (visibility/ownership)
    - 502: Failed to call agent endpoint
    - 500: Internal server error
    """
    # 1. Load agent from database
    result = await db.execute(select(Agent).where(Agent.id == agent_id))
    agent = result.scalar_one_or_none()

    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent {agent_id} not found"
        )

    # 2. Check access control
    username = current_user["username"]
    department = current_user.get("department")

    # Access rules:
    # - Public agents: accessible to all
    # - Private agents: owner only
    # - Team agents: same department only
    if agent.visibility == "private" and agent.owner_id != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: This is a private agent"
        )

    if agent.visibility == "team":
        if agent.department != department:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: This agent is only available to your team"
            )

    # 3. Get framework adapter
    try:
        adapter = get_framework_adapter(agent.framework.value)
    except ValueError as e:
        logger.error(f"Unsupported framework: {agent.framework}, error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unsupported framework: {agent.framework}"
        )

    # 4. Transform request (A2A → Framework format)
    try:
        framework_request = adapter.transform_request(request_body, agent.agent_card)
        logger.info(f"Transformed A2A request to {agent.framework} format for agent_id={agent_id}")
    except Exception as e:
        logger.error(f"Failed to transform request: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid request format: {str(e)}"
        )

    # Check if streaming is requested
    params = request_body.get("params", {})
    configuration = params.get("configuration", {})
    blocking = configuration.get("blocking", True)

    # 5. Route to streaming or blocking mode
    if not blocking:
        # Streaming mode: Return SSE response
        logger.info(f"Streaming mode requested for agent_id={agent_id}")
        return StreamingResponse(
            stream_agent_response(agent, request_body, adapter, framework_request),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )

    # 6. Blocking mode: Call endpoint and return complete response
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            logger.info(f"Calling original endpoint: {agent.original_endpoint}")
            response = await client.post(
                agent.original_endpoint,
                json=framework_request,
                headers={"Content-Type": "application/json"}
            )
            response.raise_for_status()
            framework_response = response.json()
            logger.info(f"Received response from {agent.framework} agent")
        except httpx.TimeoutException:
            logger.error(f"Timeout calling agent endpoint: {agent.original_endpoint}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Agent endpoint timeout"
            )
        except httpx.HTTPError as e:
            logger.error(f"HTTP error calling agent endpoint: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to call agent endpoint: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Unexpected error calling agent endpoint: {e}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Unexpected error: {str(e)}"
            )

    # 7. Transform response (Framework format → A2A)
    try:
        a2a_response = adapter.transform_response(framework_response, request_body)
        logger.info(f"Transformed {agent.framework} response to A2A format")
    except Exception as e:
        logger.error(f"Failed to transform response: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to transform response: {str(e)}"
        )

    return a2a_response


@router.get("/a2a/proxy/{agent_id}/tasks/{task_id}")
async def get_task_status(
    agent_id: int,
    task_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Get Task Status (for streaming/async tasks)

    **Note**: This endpoint is a placeholder for future streaming support.
    Currently returns 501 Not Implemented.

    **Future Implementation**:
    - Store task status in Redis
    - Poll agent endpoint for updates
    - Return current task state

    **URL Format**:
    ```
    GET /api/a2a/proxy/{agent_id}/tasks/{task_id}
    ```

    **Response**:
    ```json
    {
      "task_id": "task-123",
      "status": "running",
      "progress": 0.5,
      "result": null
    }
    ```
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Task status tracking not implemented yet. Use blocking mode for now."
    )
