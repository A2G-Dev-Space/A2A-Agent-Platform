"""
LLM Proxy API endpoints
Allows agents to access LLM through platform proxy using platform keys
"""
from fastapi import APIRouter, HTTPException, Depends, Header
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
import logging

from app.core.database import get_db
from app.llm.proxy import LLMProxy

logger = logging.getLogger(__name__)

router = APIRouter()
llm_proxy = LLMProxy()


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[ChatMessage]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = 4096
    stream: Optional[bool] = True


async def validate_platform_key(authorization: str) -> Optional[int]:
    """Validate platform key and return user_id"""
    if not authorization or not authorization.startswith("Bearer a2g_"):
        return None

    key = authorization.replace("Bearer ", "")

    try:
        from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
        from sqlalchemy import text

        # Connect to user_service_db
        user_db_url = "postgresql+asyncpg://dev_user:dev_password@postgres:5432/user_service_db"
        engine = create_async_engine(user_db_url)
        session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

        async with session_maker() as session:
            # Query platform_keys table
            result = await session.execute(
                text("""
                    SELECT user_id FROM platform_keys
                    WHERE key = :key AND is_active = true
                """),
                {"key": key}
            )
            row = result.fetchone()
            if row:
                # Update last_used timestamp
                await session.execute(
                    text("""
                        UPDATE platform_keys
                        SET last_used = NOW()
                        WHERE key = :key
                    """),
                    {"key": key}
                )
                await session.commit()
                return row[0]
            return None
    except Exception as e:
        logger.error(f"Error validating platform key: {e}")
        return None


@router.post("/llm/agent/{agent_id}/chat")
async def agent_llm_chat(
    agent_id: int,
    request: ChatCompletionRequest,
    authorization: str = Header(None)
):
    """
    LLM Proxy endpoint for agents
    Agents use their platform API key to access LLM through platform proxy
    """
    # Validate platform key
    user_id = await validate_platform_key(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or missing platform API key")

    logger.info(f"Agent {agent_id} (user {user_id}) requesting LLM: {request.model}")

    # Convert messages to dict format
    messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]

    # Determine provider from model name
    provider = None
    if "gemini" in request.model.lower() or "google" in request.model.lower():
        provider = "google"
    elif "gpt" in request.model.lower() or "openai" in request.model.lower():
        provider = "openai"
    elif "claude" in request.model.lower() or "anthropic" in request.model.lower():
        provider = "anthropic"
    else:
        # Default to google for gemini models
        provider = "google"

    try:
        # Stream the completion
        async def generate():
            try:
                if request.stream:
                    # Server-Sent Events format for streaming
                    async for token in llm_proxy.stream_completion(
                        provider=provider,
                        model_name=request.model,
                        messages=messages,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    ):
                        # Format as SSE
                        yield f"data: {token}\n\n"
                    yield "data: [DONE]\n\n"
                else:
                    # Non-streaming response
                    full_response = ""
                    async for token in llm_proxy.stream_completion(
                        provider=provider,
                        model_name=request.model,
                        messages=messages,
                        temperature=request.temperature,
                        max_tokens=request.max_tokens
                    ):
                        full_response += token
                    yield full_response
            except Exception as e:
                logger.error(f"Error during LLM streaming: {e}")
                yield f"data: {{\"error\": \"{str(e)}\"}}\n\n"

        return StreamingResponse(
            generate(),
            media_type="text/event-stream" if request.stream else "text/plain"
        )

    except Exception as e:
        logger.error(f"Error in LLM proxy: {e}")
        raise HTTPException(status_code=500, detail=str(e))
