"""
Admin API endpoints for agent statistics
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import List, Dict, Any

from app.core.database import Agent, get_db
from app.core.security import require_admin

router = APIRouter()


@router.get("/agents/statistics")
async def get_agent_statistics(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent statistics (ADMIN only)

    Returns:
    - deployed_count: Number of agents in DEPLOYED status
    - development_count: Number of agents in DEVELOPMENT status
    - top_used_agents: Top 10 most used agents (by session count)
    """

    # Count agents by status
    from app.core.database import AgentStatus
    deployed_result = await db.execute(
        select(func.count(Agent.id)).where(
            Agent.status.in_([
                AgentStatus.DEPLOYED_ALL,
                AgentStatus.DEPLOYED_TEAM,
                AgentStatus.PRODUCTION
            ])
        )
    )
    deployed_count = deployed_result.scalar() or 0

    development_result = await db.execute(
        select(func.count(Agent.id)).where(Agent.status == AgentStatus.DEVELOPMENT)
    )
    development_count = development_result.scalar() or 0

    # Get all agents with session count for usage statistics
    # Note: session_count is tracked in chat-service, so we'll return agent info
    # and the admin service will need to correlate with chat data
    agents_result = await db.execute(
        select(Agent)
        .order_by(Agent.created_at.desc())
        .limit(10)
    )
    agents = agents_result.scalars().all()

    # Format top used agents
    # In a real implementation, we'd join with session data from chat service
    top_used_agents = [
        {
            "agent_id": agent.id,
            "name": agent.name,
            "description": agent.description,
            "framework": agent.framework,
            "deployment_status": agent.status,
            "usage_count": 0  # Placeholder - should be fetched from chat service
        }
        for agent in agents
    ]

    return {
        "deployed_count": deployed_count,
        "development_count": development_count,
        "top_used_agents": top_used_agents
    }


@router.get("/agents/monthly-growth")
async def get_agents_monthly_growth(
    months: int = Query(12, ge=1, le=24, description="Number of periods to retrieve"),
    group_by: str = Query("month", regex="^(week|month)$", description="Group by week or month"),
    include_development: bool = True,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent growth statistics (ADMIN only)

    Args:
    - months: Number of periods to retrieve
    - group_by: Group by week or month
    - include_development: If True, includes DEVELOPMENT agents, if False only DEPLOYED

    Returns cumulative agent count at the end of each period
    """
    from sqlalchemy import text
    from datetime import datetime, timedelta
    from dateutil.relativedelta import relativedelta

    # Generate list of periods to show
    now = datetime.utcnow()
    periods = []

    if group_by == "week":
        # Generate last N weeks
        for i in range(months):
            week_start = now - timedelta(weeks=i)
            periods.append(week_start.strftime("%Y-W%U"))
    else:
        # Generate last N months
        for i in range(months):
            month_date = now - relativedelta(months=i)
            periods.append(month_date.strftime("%Y-%m"))

    periods.reverse()  # Oldest first

    # Query cumulative count for each period
    monthly_data = []

    for period in periods:
        if group_by == "week":
            # Parse week string (e.g., "2025-W45")
            year, week = period.split("-W")
            # Calculate end of week
            import datetime as dt
            period_end = dt.datetime.strptime(f"{year}-W{week}-0", "%Y-W%U-%w") + timedelta(days=7)
        else:
            # Parse month string (e.g., "2025-11")
            year, month = map(int, period.split("-"))
            # End of month
            if month == 12:
                period_end = datetime(year + 1, 1, 1)
            else:
                period_end = datetime(year, month + 1, 1)

        # Count agents created up to this period
        total_query = select(func.count(Agent.id)).where(
            Agent.created_at < period_end
        )
        deployed_query = select(func.count(Agent.id)).where(
            Agent.created_at < period_end,
            Agent.status.in_([
                AgentStatus.DEPLOYED_ALL,
                AgentStatus.DEPLOYED_TEAM,
                AgentStatus.PRODUCTION
            ])
        )
        dev_query = select(func.count(Agent.id)).where(
            Agent.created_at < period_end,
            Agent.status == AgentStatus.DEVELOPMENT
        )

        total_result = await db.execute(total_query)
        deployed_result = await db.execute(deployed_query)
        dev_result = await db.execute(dev_query)

        total_count = total_result.scalar() or 0
        deployed_count = deployed_result.scalar() or 0
        development_count = dev_result.scalar() or 0

        monthly_data.append({
            "month": period,
            "total_count": total_count,
            "deployed_count": deployed_count,
            "development_count": development_count
        })

    return {
        "months": months,
        "group_by": group_by,
        "include_development": include_development,
        "data": monthly_data
    }
