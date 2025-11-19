"""
Internal API endpoints for service-to-service communication
No authentication required - for internal use only
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete
import logging

from app.core.database import get_db, LLMCall, TraceEvent, ToolCall

logger = logging.getLogger(__name__)
router = APIRouter()


@router.delete("/internal/llm-calls/agent/{agent_id}")
async def delete_agent_llm_calls(
    agent_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete all LLM call records for a specific agent (Internal API - No Auth Required)

    Called by Agent Service when an agent is deleted to clean up token usage records.
    """
    try:
        agent_id_str = str(agent_id)

        # Delete LLM calls
        llm_delete_stmt = delete(LLMCall).where(LLMCall.agent_id == agent_id_str)
        llm_result = await db.execute(llm_delete_stmt)

        # Delete trace events
        trace_delete_stmt = delete(TraceEvent).where(TraceEvent.agent_id == agent_id_str)
        trace_result = await db.execute(trace_delete_stmt)

        # Delete tool calls
        tool_delete_stmt = delete(ToolCall).where(ToolCall.agent_id == agent_id_str)
        tool_result = await db.execute(tool_delete_stmt)

        await db.commit()

        deleted_counts = {
            "llm_calls": llm_result.rowcount,
            "trace_events": trace_result.rowcount,
            "tool_calls": tool_result.rowcount
        }

        logger.info(f"Deleted records for agent_id={agent_id}: {deleted_counts}")

        return {
            "message": f"Successfully deleted all records for agent {agent_id}",
            "deleted_counts": deleted_counts
        }

    except Exception as e:
        logger.error(f"Failed to delete records for agent_id={agent_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/internal/llm-calls/model/{model_name:path}")
async def delete_model_llm_calls(
    model_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete all LLM call records for a specific model (Internal API - No Auth Required)

    Called by Admin Service when an LLM is deleted to clean up real-time token usage records.
    Worker-service snapshots are kept as-is (model name based, continues accumulating if same name is reused).
    """
    try:
        # Delete LLM calls for this model
        llm_delete_stmt = delete(LLMCall).where(LLMCall.model == model_name)
        llm_result = await db.execute(llm_delete_stmt)

        await db.commit()

        deleted_count = llm_result.rowcount

        logger.info(f"Deleted {deleted_count} LLM call records for model={model_name}")

        return {
            "message": f"Successfully deleted all LLM call records for model '{model_name}'",
            "deleted_count": deleted_count
        }

    except Exception as e:
        logger.error(f"Failed to delete records for model={model_name}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
