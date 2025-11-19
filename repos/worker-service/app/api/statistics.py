"""
Historical statistics API endpoints
"""
from fastapi import APIRouter, Query, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
import logging
from app.core.database import get_db, StatisticsSnapshot, LLMHealthStatus

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/api/statistics/historical/trends")
async def get_historical_trends(
    period: Optional[str] = Query("12m", description="Period: 1w, 2w, 1m, 3m, 6m, 12m, 24m"),
    agent_id: Optional[str] = Query("all", description="Agent trace_id or 'all' for all agents"),
    top_k: Optional[int] = Query(None, description="Top K agents for token usage (only when agent_id='all')"),
    model: Optional[str] = Query("all", description="Model filter: 'all' for all models or specific model name"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get historical trends data for User Trend, Agent Trend, and LLM Token Usage Trend
    Returns daily snapshot data for line graphs

    Note: agent_id parameter actually accepts trace_id (which is the real agent identifier)

    - agent_id='all' + no top_k + model='all': Returns aggregated total for all agents across all models
    - agent_id='all' + top_k=N + model='all': Returns individual trends for top N agents (all models)
    - agent_id='all' + top_k=N + model=<specific>: Returns individual trends for top N agents (specific model only)
    - agent_id=<trace_id> + model='all': Returns trend for that specific agent across all models
    - agent_id=<trace_id> + model=<specific>: Returns trend for that specific agent for specific model
    """
    try:
        logger.info(f"[DEBUG] API Parameters - period={period}, agent_id={agent_id}, top_k={top_k}, model={model}")
        # Parse period to get date range
        end_date = datetime.utcnow()
        if period.endswith('w'):
            weeks = int(period[:-1])
            start_date = end_date - timedelta(weeks=weeks)
        elif period.endswith('m'):
            months = int(period[:-1])
            start_date = end_date - timedelta(days=months * 30)  # Approximate
        else:
            start_date = end_date - timedelta(days=365)  # Default to 1 year

        # Query snapshots within date range
        result = await db.execute(
            select(StatisticsSnapshot)
            .where(StatisticsSnapshot.snapshot_date >= start_date)
            .order_by(StatisticsSnapshot.snapshot_date.asc())
        )
        snapshots = result.scalars().all()

        # Process data for response
        user_trend = []
        agent_trend = []
        token_usage_trend = {}  # Dict to hold per-agent trends

        for snapshot in snapshots:
            date_str = snapshot.snapshot_date.strftime("%Y-%m-%d")

            # User trend
            user_trend.append({
                "date": date_str,
                "count": snapshot.total_users
            })

            # Agent trend
            agent_trend.append({
                "date": date_str,
                "total": snapshot.total_agents,
                "deployed": snapshot.deployed_agents,
                "development": snapshot.development_agents
            })

            # Token usage trend
            # Note: agent_token_usage now uses trace_id as key
            if model == "all":
                # Use aggregated data from agent_token_usage (all models combined)
                if snapshot.agent_token_usage:
                    for trace_id, usage in snapshot.agent_token_usage.items():
                        if trace_id not in token_usage_trend:
                            token_usage_trend[trace_id] = {
                                "trace_id": trace_id,
                                "agent_id": usage.get("agent_id"),
                                "agent_name": usage.get("display_name", usage.get("name", f"Agent {trace_id}")),
                                "owner_id": usage.get("owner_id"),
                                "data": []
                            }

                        token_usage_trend[trace_id]["data"].append({
                            "date": date_str,
                            "total_tokens": usage.get("total_tokens", 0),
                            "prompt_tokens": usage.get("prompt_tokens", 0),
                            "completion_tokens": usage.get("completion_tokens", 0),
                            "call_count": usage.get("call_count", 0)
                        })
            else:
                # Use model-specific data from agent_token_usage_by_model
                # Note: agent_token_usage_by_model also uses trace_id as key
                if snapshot.agent_token_usage_by_model:
                    logger.info(f"[DEBUG] Processing model-specific data: model={model}, agents={list(snapshot.agent_token_usage_by_model.keys())}")
                    for trace_id, models_data in snapshot.agent_token_usage_by_model.items():
                        logger.info(f"[DEBUG] Agent {trace_id} models: {list(models_data.keys())}")
                        if model in models_data:
                            if trace_id not in token_usage_trend:
                                # Get agent metadata from agent_token_usage
                                agent_name = f"Agent {trace_id}"
                                agent_numeric_id = None
                                owner_id = None
                                if snapshot.agent_token_usage and trace_id in snapshot.agent_token_usage:
                                    agent_info = snapshot.agent_token_usage[trace_id]
                                    agent_name = agent_info.get("display_name", agent_info.get("name", agent_name))
                                    agent_numeric_id = agent_info.get("agent_id")
                                    owner_id = agent_info.get("owner_id")

                                token_usage_trend[trace_id] = {
                                    "trace_id": trace_id,
                                    "agent_id": agent_numeric_id,
                                    "agent_name": agent_name,
                                    "owner_id": owner_id,
                                    "data": []
                                }

                            model_usage = models_data[model]
                            token_usage_trend[trace_id]["data"].append({
                                "date": date_str,
                                "total_tokens": model_usage.get("total_tokens", 0),
                                "prompt_tokens": model_usage.get("prompt_tokens", 0),
                                "completion_tokens": model_usage.get("completion_tokens", 0),
                                "call_count": model_usage.get("call_count", 0)
                            })

        # Process token_usage_trend based on agent_id and top_k parameters
        logger.info(f"[DEBUG] Before processing: agent_id={agent_id}, top_k={top_k}, model={model}, token_usage_trend keys={list(token_usage_trend.keys())}")

        # Check if we need to return model-specific breakdown
        # This happens when: agent_id != "all" AND model == "all"
        needs_model_breakdown = (agent_id != "all" and model == "all")

        if agent_id == "all":
            if top_k and token_usage_trend:
                logger.info(f"[DEBUG] Processing top-k filtering: top_k={top_k}")
                # Return top-k agents individually
                agent_totals = {}
                for aid, trend_data in token_usage_trend.items():
                    total = sum(d["total_tokens"] for d in trend_data["data"])
                    agent_totals[aid] = total
                    logger.info(f"[DEBUG] Agent {aid}: total_tokens={total}, data_points={len(trend_data['data'])}")

                top_agents = sorted(agent_totals.items(), key=lambda x: x[1], reverse=True)[:top_k]
                top_agent_ids = [aid for aid, _ in top_agents]

                filtered_token_usage = {}
                for aid in top_agent_ids:
                    if aid in token_usage_trend:
                        filtered_token_usage[aid] = token_usage_trend[aid]
                token_usage_trend = filtered_token_usage
            elif token_usage_trend:
                # Aggregate all agents into a single trend
                aggregated_data = {}
                for aid, trend_data in token_usage_trend.items():
                    for data_point in trend_data["data"]:
                        date = data_point["date"]
                        if date not in aggregated_data:
                            aggregated_data[date] = {
                                "date": date,
                                "total_tokens": 0,
                                "prompt_tokens": 0,
                                "completion_tokens": 0,
                                "call_count": 0
                            }
                        aggregated_data[date]["total_tokens"] += data_point["total_tokens"]
                        aggregated_data[date]["prompt_tokens"] += data_point["prompt_tokens"]
                        aggregated_data[date]["completion_tokens"] += data_point["completion_tokens"]
                        aggregated_data[date]["call_count"] += data_point["call_count"]

                token_usage_trend = {
                    "all": {
                        "agent_name": "All Agents",
                        "data": sorted(aggregated_data.values(), key=lambda x: x["date"])
                    }
                }
        elif needs_model_breakdown:
            # For specific agent with model='all', return breakdown by model
            # We need to fetch model-specific data from agent_token_usage_by_model
            logger.info(f"[DEBUG] Returning model breakdown for agent {agent_id}")

            model_trends = {}
            for snapshot in snapshots:
                date_str = snapshot.snapshot_date.strftime("%Y-%m-%d")

                if snapshot.agent_token_usage_by_model and agent_id in snapshot.agent_token_usage_by_model:
                    models_data = snapshot.agent_token_usage_by_model[agent_id]

                    for model_name, model_usage in models_data.items():
                        if model_name not in model_trends:
                            # Get agent metadata from agent_token_usage
                            agent_name = f"Agent {agent_id}"
                            if snapshot.agent_token_usage and agent_id in snapshot.agent_token_usage:
                                agent_info = snapshot.agent_token_usage[agent_id]
                                agent_name = agent_info.get("display_name", agent_info.get("name", agent_name))

                            model_trends[model_name] = {
                                "trace_id": agent_id,
                                "model": model_name,
                                "agent_name": agent_name,
                                "model_display_name": model_name,
                                "data": []
                            }

                        model_trends[model_name]["data"].append({
                            "date": date_str,
                            "total_tokens": model_usage.get("total_tokens", 0),
                            "prompt_tokens": model_usage.get("prompt_tokens", 0),
                            "completion_tokens": model_usage.get("completion_tokens", 0),
                            "call_count": model_usage.get("call_count", 0)
                        })

            token_usage_trend = model_trends
        else:
            # Filter to specific agent by trace_id (model is also specific or we already filtered above)
            # Note: agent_id parameter actually contains trace_id value
            if agent_id in token_usage_trend:
                token_usage_trend = {agent_id: token_usage_trend[agent_id]}
            else:
                token_usage_trend = {}

        # Ensure all trends have same date range (pad with zeros if needed)
        all_dates = set()
        for item in user_trend:
            all_dates.add(item["date"])

        # Generate complete date range
        current = start_date
        expected_dates = []
        while current <= end_date:
            expected_dates.append(current.strftime("%Y-%m-%d"))
            current += timedelta(days=1)

        # Pad missing dates with zeros
        user_trend_dict = {item["date"]: item["count"] for item in user_trend}
        agent_trend_dict = {item["date"]: item for item in agent_trend}

        padded_user_trend = []
        padded_agent_trend = []

        for date in expected_dates:
            if date in user_trend_dict:
                padded_user_trend.append({"date": date, "count": user_trend_dict[date]})
            else:
                # Use last known value or 0
                last_value = padded_user_trend[-1]["count"] if padded_user_trend else 0
                padded_user_trend.append({"date": date, "count": last_value})

            if date in agent_trend_dict:
                padded_agent_trend.append(agent_trend_dict[date])
            else:
                # Use last known value or zeros
                if padded_agent_trend:
                    last_item = padded_agent_trend[-1]
                    padded_agent_trend.append({
                        "date": date,
                        "total": last_item["total"],
                        "deployed": last_item["deployed"],
                        "development": last_item["development"]
                    })
                else:
                    padded_agent_trend.append({
                        "date": date,
                        "total": 0,
                        "deployed": 0,
                        "development": 0
                    })

        # Pad token usage trends and calculate cumulative sums
        for agent_id in token_usage_trend:
            agent_data = token_usage_trend[agent_id]["data"]
            agent_date_dict = {item["date"]: item for item in agent_data}

            padded_data = []
            cumulative_total = 0
            cumulative_prompt = 0
            cumulative_completion = 0
            cumulative_calls = 0
            last_recorded_total = 0
            last_recorded_prompt = 0
            last_recorded_completion = 0
            last_recorded_calls = 0

            for date in expected_dates:
                if date in agent_date_dict:
                    # Add daily values to cumulative sums
                    cumulative_total += agent_date_dict[date]["total_tokens"]
                    cumulative_prompt += agent_date_dict[date]["prompt_tokens"]
                    cumulative_completion += agent_date_dict[date]["completion_tokens"]
                    cumulative_calls += agent_date_dict[date]["call_count"]

                    # Update last recorded values
                    last_recorded_total = cumulative_total
                    last_recorded_prompt = cumulative_prompt
                    last_recorded_completion = cumulative_completion
                    last_recorded_calls = cumulative_calls

                    padded_data.append({
                        "date": date,
                        "total_tokens": cumulative_total,
                        "prompt_tokens": cumulative_prompt,
                        "completion_tokens": cumulative_completion,
                        "call_count": cumulative_calls
                    })
                else:
                    # For missing dates, use last recorded cumulative value
                    # This ensures deleted agents/models maintain their final cumulative value
                    padded_data.append({
                        "date": date,
                        "total_tokens": last_recorded_total,
                        "prompt_tokens": last_recorded_prompt,
                        "completion_tokens": last_recorded_completion,
                        "call_count": last_recorded_calls
                    })

            token_usage_trend[agent_id]["data"] = padded_data

        # Extract unique agents and models from snapshots for dropdown filters
        unique_agents = {}
        unique_models = set()

        for snapshot in snapshots:
            # Extract unique agents from agent_token_usage
            if snapshot.agent_token_usage:
                for trace_id, usage in snapshot.agent_token_usage.items():
                    if trace_id not in unique_agents:
                        unique_agents[trace_id] = {
                            "trace_id": trace_id,
                            "agent_id": usage.get("agent_id"),
                            "agent_name": usage.get("display_name", usage.get("name", f"Agent {trace_id}")),
                            "owner_id": usage.get("owner_id")
                        }

            # Extract unique models from model_usage_stats
            if snapshot.model_usage_stats:
                for model_stat in snapshot.model_usage_stats:
                    unique_models.add((model_stat["model"], model_stat["provider"]))

        # Convert to list for JSON serialization
        available_agents = list(unique_agents.values())
        available_models = [
            {"model": model, "provider": provider}
            for model, provider in sorted(unique_models)
        ]

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "user_trend": padded_user_trend,
            "agent_trend": padded_agent_trend,
            "token_usage_trend": token_usage_trend,
            "top_k": top_k,
            "available_agents": available_agents,
            "available_models": available_models
        }

    except Exception as e:
        logger.error(f"Error getting historical trends: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/api/statistics/llm-health/recent")
async def get_recent_llm_health(
    hours: int = Query(24, description="Hours of history to retrieve"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get recent LLM health check results
    """
    try:
        cutoff_time = datetime.utcnow() - timedelta(hours=hours)

        # Get unique LLMs and their latest status
        subquery = select(
            LLMHealthStatus.llm_id,
            func.max(LLMHealthStatus.checked_at).label("latest_check")
        ).where(
            LLMHealthStatus.checked_at >= cutoff_time
        ).group_by(LLMHealthStatus.llm_id).subquery()

        result = await db.execute(
            select(LLMHealthStatus)
            .join(
                subquery,
                and_(
                    LLMHealthStatus.llm_id == subquery.c.llm_id,
                    LLMHealthStatus.checked_at == subquery.c.latest_check
                )
            )
        )
        health_statuses = result.scalars().all()

        return [
            {
                "llm_id": status.llm_id,
                "provider": status.provider,
                "model": status.model,
                "is_healthy": status.is_healthy,
                "is_active": status.is_active,
                "response_time_ms": status.response_time_ms,
                "error_message": status.error_message,
                "consecutive_failures": status.consecutive_failures,
                "last_healthy_at": status.last_healthy_at.isoformat() if status.last_healthy_at else None,
                "checked_at": status.checked_at.isoformat()
            }
            for status in health_statuses
        ]

    except Exception as e:
        logger.error(f"Error getting LLM health status: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/statistics/snapshot/trigger")
async def trigger_snapshot():
    """
    Manually trigger a statistics snapshot collection
    Useful for testing or immediate data collection
    """
    from app.tasks import collect_daily_snapshot

    try:
        result = collect_daily_snapshot.delay()
        return {
            "status": "triggered",
            "task_id": result.id,
            "message": "Snapshot collection task has been queued"
        }
    except Exception as e:
        logger.error(f"Error triggering snapshot: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))