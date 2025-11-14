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
    period: Optional[str] = Query("12m", description="Period: 1w, 2w, 3m, 6m, 12m, 24m"),
    top_k: Optional[int] = Query(None, description="Top K agents for token usage"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get historical trends data for User Trend, Agent Trend, and LLM Token Usage Trend
    Returns daily snapshot data for line graphs
    """
    try:
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
            if snapshot.agent_token_usage:
                for agent_id, usage in snapshot.agent_token_usage.items():
                    if agent_id not in token_usage_trend:
                        token_usage_trend[agent_id] = {
                            "agent_name": usage.get("name", f"Agent {agent_id}"),
                            "data": []
                        }

                    token_usage_trend[agent_id]["data"].append({
                        "date": date_str,
                        "total_tokens": usage.get("total_tokens", 0),
                        "prompt_tokens": usage.get("prompt_tokens", 0),
                        "completion_tokens": usage.get("completion_tokens", 0),
                        "call_count": usage.get("call_count", 0)
                    })

        # Apply top-k filtering if requested
        if top_k and token_usage_trend:
            # Calculate total tokens for each agent
            agent_totals = {}
            for agent_id, trend_data in token_usage_trend.items():
                total = sum(d["total_tokens"] for d in trend_data["data"])
                agent_totals[agent_id] = total

            # Get top-k agents by total tokens
            top_agents = sorted(agent_totals.items(), key=lambda x: x[1], reverse=True)[:top_k]
            top_agent_ids = [agent_id for agent_id, _ in top_agents]

            # Filter token usage to only top-k
            filtered_token_usage = {}
            for agent_id in top_agent_ids:
                if agent_id in token_usage_trend:
                    filtered_token_usage[agent_id] = token_usage_trend[agent_id]
            token_usage_trend = filtered_token_usage

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

        # Pad token usage trends
        for agent_id in token_usage_trend:
            agent_data = token_usage_trend[agent_id]["data"]
            agent_date_dict = {item["date"]: item for item in agent_data}

            padded_data = []
            for date in expected_dates:
                if date in agent_date_dict:
                    padded_data.append(agent_date_dict[date])
                else:
                    # Use zeros for missing dates
                    padded_data.append({
                        "date": date,
                        "total_tokens": 0,
                        "prompt_tokens": 0,
                        "completion_tokens": 0,
                        "call_count": 0
                    })

            token_usage_trend[agent_id]["data"] = padded_data

        return {
            "period": period,
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "user_trend": padded_user_trend,
            "agent_trend": padded_agent_trend,
            "token_usage_trend": token_usage_trend,
            "top_k": top_k
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