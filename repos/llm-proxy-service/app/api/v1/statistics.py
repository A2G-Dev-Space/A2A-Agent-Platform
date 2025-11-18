"""
Statistics API endpoints for LLM usage tracking
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Dict, Any, Optional
import httpx
import os
import logging

from app.core.database import LLMCall, get_db

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/statistics/agent-token-usage")
async def get_agent_token_usage(
    limit: int = Query(100, ge=1, le=200, description="Number of top agent-model combinations to return"),
    model: Optional[str] = Query(None, description="Filter by specific model (use 'all' for all models)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent token usage statistics (Agent-based by trace_id, not User-based)

    Returns:
    - Token usage by agent trace_id and model
    - Shows all model usage for each agent separately
    - Frontend can aggregate by trace_id for "all models" view
    - Includes agent name and owner information
    """

    # Build query - Group by trace_id, agent_id, model, and provider
    # This returns separate rows for each agent-model combination
    # Frontend will aggregate by trace_id when showing "all models"
    query = select(
        LLMCall.trace_id,
        LLMCall.agent_id,
        LLMCall.model,
        LLMCall.provider,
        func.sum(LLMCall.request_tokens).label('prompt_tokens'),
        func.sum(LLMCall.response_tokens).label('completion_tokens'),
        func.sum(LLMCall.total_tokens).label('total_tokens'),
        func.count(LLMCall.id).label('call_count')
    ).where(
        and_(
            LLMCall.trace_id.isnot(None),  # Exclude calls without trace_id
            LLMCall.success == True
        )
    )

    # Filter by model if specified (and not 'all')
    if model and model.lower() != 'all':
        query = query.where(LLMCall.model == model)

    # Group by trace_id, agent_id, model, and provider
    query = query.group_by(
        LLMCall.trace_id,
        LLMCall.agent_id,
        LLMCall.model,
        LLMCall.provider
    ).order_by(desc('total_tokens')).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    # Get agent information from Agent Service by ID (Internal API - No Auth Required)
    agent_service_url = os.getenv('AGENT_SERVICE_URL', 'http://agent-service:8002')
    agent_info_map = {}  # Map agent_id -> {name, owner_id}

    # Collect unique agent_ids
    agent_ids = list(set(row.agent_id for row in rows))

    if agent_ids:
        # Fetch agent info by IDs using internal API
        async with httpx.AsyncClient(timeout=5.0) as client:
            try:
                # Query agents by IDs
                agent_ids_param = ",".join(agent_ids)
                response = await client.get(
                    f"{agent_service_url}/api/internal/agents/by-ids",
                    params={"agent_ids": agent_ids_param}
                )
                if response.status_code == 200:
                    data = response.json()
                    agent_info_map = data.get("agents", {})
                    logger.info(f"Successfully fetched agent info for {len(agent_info_map)} agents")
            except Exception as e:
                logger.warning(f"Failed to fetch agent info: {e}")

    # Build response with agent names
    agent_usage = []
    for row in rows:
        agent_info = agent_info_map.get(row.agent_id)

        # Skip if agent info not found (agent may have been deleted)
        if not agent_info:
            logger.debug(f"Skipping agent_id {row.agent_id} - agent not found")
            continue

        agent_display_name = f"{agent_info['name']} ({agent_info['owner_id']})"

        agent_usage.append({
            "trace_id": row.trace_id,
            "agent_id": row.agent_id,
            "agent_name": agent_info["name"],
            "owner_id": agent_info["owner_id"],
            "agent_display_name": agent_display_name,
            "model": row.model,
            "provider": row.provider,
            "prompt_tokens": row.prompt_tokens or 0,
            "completion_tokens": row.completion_tokens or 0,
            "total_tokens": row.total_tokens or 0,
            "call_count": row.call_count or 0
        })

    return {
        "agent_usage": agent_usage,
        "model_filter": model or "all",
        "limit": limit
    }


@router.get("/statistics/user-usage/{user_id}")
async def get_user_token_usage(
    user_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get token usage breakdown for a specific user

    Returns usage statistics by model for the specified user
    """

    # Query usage by model for this user
    query = select(
        LLMCall.model,
        LLMCall.provider,
        func.sum(LLMCall.total_tokens).label('total_tokens'),
        func.sum(LLMCall.request_tokens).label('request_tokens'),
        func.sum(LLMCall.response_tokens).label('response_tokens'),
        func.count(LLMCall.id).label('call_count'),
        func.avg(LLMCall.latency_ms).label('avg_latency_ms')
    ).where(
        and_(
            LLMCall.user_id == user_id,
            LLMCall.success == True
        )
    ).group_by(LLMCall.model, LLMCall.provider).order_by(desc('total_tokens'))

    result = await db.execute(query)
    rows = result.all()

    # Format response
    usage_by_model = [
        {
            "model": row.model,
            "provider": row.provider,
            "total_tokens": row.total_tokens or 0,
            "request_tokens": row.request_tokens or 0,
            "response_tokens": row.response_tokens or 0,
            "call_count": row.call_count or 0,
            "avg_latency_ms": round(row.avg_latency_ms, 2) if row.avg_latency_ms else 0
        }
        for row in rows
    ]

    # Calculate totals
    total_tokens = sum(item["total_tokens"] for item in usage_by_model)
    total_calls = sum(item["call_count"] for item in usage_by_model)

    return {
        "user_id": user_id,
        "total_tokens": total_tokens,
        "total_calls": total_calls,
        "usage_by_model": usage_by_model
    }


@router.get("/statistics/model-usage")
async def get_model_usage_statistics(
    limit: int = Query(10, ge=1, le=100, description="Number of top models to return"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get usage statistics by model

    Returns top models by token consumption with user breakdown
    """

    # Query usage by model
    query = select(
        LLMCall.model,
        LLMCall.provider,
        func.sum(LLMCall.total_tokens).label('total_tokens'),
        func.count(LLMCall.id).label('call_count'),
        func.count(func.distinct(LLMCall.user_id)).label('unique_users')
    ).where(
        LLMCall.success == True
    ).group_by(LLMCall.model, LLMCall.provider).order_by(desc('total_tokens')).limit(limit)

    result = await db.execute(query)
    rows = result.all()

    model_usage = [
        {
            "model": row.model,
            "provider": row.provider,
            "total_tokens": row.total_tokens or 0,
            "call_count": row.call_count or 0,
            "unique_users": row.unique_users or 0
        }
        for row in rows
    ]

    # Return just the array for easier consumption by worker service
    return model_usage


@router.get("/statistics/top-consumers-by-model")
async def get_top_consumers_by_model(
    top_k: int = Query(5, ge=1, le=50, description="Number of top users per model"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get top K token consumers for each model

    Returns a breakdown showing which users consume the most tokens for each model
    """

    # First, get all unique models
    models_query = select(
        func.distinct(LLMCall.model),
        LLMCall.provider
    ).where(LLMCall.success == True)

    models_result = await db.execute(models_query)
    models = models_result.all()

    # For each model, get top K consumers
    result_by_model = []

    for model_name, provider in models:
        # Query top consumers for this model
        query = select(
            LLMCall.user_id,
            func.sum(LLMCall.total_tokens).label('total_tokens'),
            func.count(LLMCall.id).label('call_count')
        ).where(
            and_(
                LLMCall.model == model_name,
                LLMCall.provider == provider,
                LLMCall.user_id.isnot(None),
                LLMCall.success == True
            )
        ).group_by(LLMCall.user_id).order_by(desc('total_tokens')).limit(top_k)

        result = await db.execute(query)
        rows = result.all()

        top_users = [
            {
                "user_id": row.user_id,
                "total_tokens": row.total_tokens or 0,
                "call_count": row.call_count or 0
            }
            for row in rows
        ]

        if top_users:  # Only include models that have usage
            result_by_model.append({
                "model": model_name,
                "provider": provider,
                "top_users": top_users
            })

    return {
        "top_k": top_k,
        "models": result_by_model
    }


@router.get("/statistics/monthly-token-usage")
async def get_monthly_token_usage(
    months: int = Query(12, ge=1, le=48, description="Number of months to retrieve"),
    group_by: str = Query("month", regex="^(week|month)$", description="Group by week or month"),
    trace_id: Optional[str] = Query(None, description="Filter by agent trace_id (optional)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get monthly/weekly token usage statistics with optional agent filtering

    Returns cumulative token usage by month or week, optionally filtered by agent
    """
    from sqlalchemy import text, extract
    from datetime import datetime, timedelta

    # Determine date truncation based on group_by
    if group_by == "week":
        date_trunc_expr = func.date_trunc('week', LLMCall.created_at)
    else:
        date_trunc_expr = func.date_trunc('month', LLMCall.created_at)

    # Build query with optional trace_id filter
    query = select(
        date_trunc_expr.label('period'),
        func.sum(LLMCall.total_tokens).label('total_tokens'),
        func.sum(LLMCall.request_tokens).label('request_tokens'),
        func.sum(LLMCall.response_tokens).label('response_tokens'),
        func.count(LLMCall.id).label('call_count')
    ).where(
        LLMCall.success == True
    )

    # Add trace_id filter if provided
    if trace_id and trace_id != "all":
        query = query.where(LLMCall.trace_id == trace_id)

    query = query.group_by(
        text('period')
    ).order_by(
        text('period ASC')
    )

    result = await db.execute(query)
    rows = result.all()

    # Create a dictionary of actual data
    data_dict = {}
    for row in rows:
        if group_by == "week":
            period_str = row.period.strftime("%Y-W%U") if row.period else None
        else:
            period_str = row.period.strftime("%Y-%m") if row.period else None

        data_dict[period_str] = {
            "total_tokens": row.total_tokens or 0,
            "request_tokens": row.request_tokens or 0,
            "response_tokens": row.response_tokens or 0,
            "call_count": row.call_count or 0
        }

    # Generate list of all periods for the last N months/weeks
    now = datetime.utcnow()
    periods = []

    if group_by == "week":
        # Generate last N weeks
        for i in range(months - 1, -1, -1):
            week_date = now - timedelta(weeks=i)
            periods.append(week_date.strftime("%Y-W%U"))
    else:
        # Generate last N months
        for i in range(months - 1, -1, -1):
            if now.month - i > 0:
                month_date = now.replace(month=now.month - i)
            else:
                year_offset = (i - now.month) // 12 + 1
                month_val = 12 - ((i - now.month) % 12)
                month_date = now.replace(year=now.year - year_offset, month=month_val)
            periods.append(month_date.strftime("%Y-%m"))

    # Fill in data with cumulative totals
    monthly_data = []
    cumulative_total = 0
    cumulative_request = 0
    cumulative_response = 0

    for period in periods:
        if period in data_dict:
            cumulative_total += data_dict[period]["total_tokens"]
            cumulative_request += data_dict[period]["request_tokens"]
            cumulative_response += data_dict[period]["response_tokens"]
            call_count = data_dict[period]["call_count"]
        else:
            call_count = 0

        monthly_data.append({
            "month": period,
            "total_tokens": cumulative_total,
            "request_tokens": cumulative_request,
            "response_tokens": cumulative_response,
            "call_count": call_count
        })

    return {
        "months": months,
        "group_by": group_by,
        "trace_id": trace_id or "all",
        "data": monthly_data
    }


@router.get("/statistics/agent-usage/{trace_id}")
async def get_agent_usage_by_trace_id(
    trace_id: str,
    include_by_model: bool = Query(False, description="Include breakdown by model"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get token usage statistics for a specific agent by trace_id
    Used by worker service for daily snapshots
    This accumulates token usage across all models used by the agent

    If include_by_model=True, also returns breakdown by model
    """
    # Query token usage for the specific trace_id (across all models)
    total_query = select(
        func.sum(LLMCall.request_tokens).label('prompt_tokens'),
        func.sum(LLMCall.response_tokens).label('completion_tokens'),
        func.sum(LLMCall.total_tokens).label('total_tokens'),
        func.count(LLMCall.id).label('call_count')
    ).where(
        and_(
            LLMCall.trace_id == trace_id,
            LLMCall.success == True
        )
    )

    result = await db.execute(total_query)
    row = result.first()

    response = {
        "trace_id": trace_id,
        "prompt_tokens": row.prompt_tokens or 0 if row else 0,
        "completion_tokens": row.completion_tokens or 0 if row else 0,
        "total_tokens": row.total_tokens or 0 if row else 0,
        "call_count": row.call_count or 0 if row else 0
    }

    if include_by_model:
        # Query token usage by model for this trace_id
        by_model_query = select(
            LLMCall.model,
            func.sum(LLMCall.request_tokens).label('prompt_tokens'),
            func.sum(LLMCall.response_tokens).label('completion_tokens'),
            func.sum(LLMCall.total_tokens).label('total_tokens'),
            func.count(LLMCall.id).label('call_count')
        ).where(
            and_(
                LLMCall.trace_id == trace_id,
                LLMCall.success == True
            )
        ).group_by(LLMCall.model)

        by_model_result = await db.execute(by_model_query)
        by_model_rows = by_model_result.all()

        by_model = {}
        for model_row in by_model_rows:
            by_model[model_row.model] = {
                "prompt_tokens": model_row.prompt_tokens or 0,
                "completion_tokens": model_row.completion_tokens or 0,
                "total_tokens": model_row.total_tokens or 0,
                "call_count": model_row.call_count or 0
            }

        response["by_model"] = by_model

    return response
