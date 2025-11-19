"""
Admin API endpoints for agent statistics
"""
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, case
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta, date

from app.core.database import Agent, AgentCallStatistics, get_db
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


@router.get("/statistics/trend/agent-calls")
async def get_agent_call_trend(
    date_range: str = Query("1m", regex="^(1w|1m|3m|6m|1y)$", description="Date range: 1w, 1m, 3m, 6m, 1y"),
    top_k: int = Query(10, ge=1, le=50, description="Top K agents (only when agent_id not specified)"),
    call_type: str = Query("all", regex="^(chat|a2a_router|all)$", description="Call type filter"),
    agent_id: Optional[int] = Query(None, description="Specific agent ID (optional)"),
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent call trend statistics (ADMIN only)

    Returns cumulative agent call counts over time

    Cases:
    1. agent_id=None: Returns top_k agents by total calls
       - Datasets: One line per agent (top K agents)
       - call_type filter applies

    2. agent_id=X: Returns call type breakdown for specific agent
       - Datasets: One line per call_type (chat, a2a_router)

    Response format:
    {
        "labels": ["2025-01-01", "2025-01-02", ...],
        "datasets": [
            {
                "agent_id": 1,
                "agent_name": "Math Agent",
                "call_type": "all",  # or specific type
                "data": [120, 145, 180, ...]  # cumulative counts
            }
        ]
    }
    """
    # Parse date_range
    end_date = datetime.utcnow().date()
    if date_range == "1w":
        start_date = end_date - timedelta(weeks=1)
    elif date_range == "1m":
        start_date = end_date - timedelta(days=30)
    elif date_range == "3m":
        start_date = end_date - timedelta(days=90)
    elif date_range == "6m":
        start_date = end_date - timedelta(days=180)
    elif date_range == "1y":
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=30)  # default 1m

    # Generate complete date range
    date_list = []
    current_date = start_date
    while current_date <= end_date:
        date_list.append(current_date)
        current_date += timedelta(days=1)

    labels = [d.isoformat() for d in date_list]

    if agent_id is None:
        # Case 1: Top K agents by call count
        # Build query for call type filter
        query = select(
            AgentCallStatistics.agent_id,
            AgentCallStatistics.date,
            func.count(AgentCallStatistics.id).label("call_count")
        ).where(
            AgentCallStatistics.date >= start_date
        ).group_by(
            AgentCallStatistics.agent_id,
            AgentCallStatistics.date
        )

        if call_type != "all":
            query = query.where(AgentCallStatistics.call_type == call_type)

        result = await db.execute(query)
        call_data = result.all()

        # Group by agent_id
        agent_calls = {}
        for row in call_data:
            if row.agent_id not in agent_calls:
                agent_calls[row.agent_id] = {}
            agent_calls[row.agent_id][row.date] = row.call_count

        # Calculate total calls per agent
        agent_totals = {}
        for agent_id_val, date_counts in agent_calls.items():
            agent_totals[agent_id_val] = sum(date_counts.values())

        # Get top K agents
        top_agent_ids = sorted(agent_totals.items(), key=lambda x: x[1], reverse=True)[:top_k]
        top_agent_ids = [aid for aid, _ in top_agent_ids]

        # Get agent names
        if top_agent_ids:
            agents_result = await db.execute(
                select(Agent).where(Agent.id.in_(top_agent_ids))
            )
            agents = agents_result.scalars().all()
            agent_name_map = {agent.id: agent.name for agent in agents}
        else:
            agent_name_map = {}

        # Build datasets with cumulative counts
        datasets = []
        for agent_id_val in top_agent_ids:
            date_counts = agent_calls.get(agent_id_val, {})
            cumulative_data = []
            cumulative_sum = 0

            for d in date_list:
                if d in date_counts:
                    cumulative_sum += date_counts[d]
                cumulative_data.append(cumulative_sum)

            datasets.append({
                "agent_id": agent_id_val,
                "agent_name": agent_name_map.get(agent_id_val, f"Agent {agent_id_val}"),
                "call_type": call_type,
                "data": cumulative_data
            })

        return {
            "labels": labels,
            "date_range": date_range,
            "call_type": call_type,
            "top_k": top_k,
            "datasets": datasets
        }

    else:
        # Case 2: Specific agent - breakdown by call_type
        # Get agent info
        agent_result = await db.execute(
            select(Agent).where(Agent.id == agent_id)
        )
        agent = agent_result.scalar_one_or_none()

        if not agent:
            return {
                "labels": labels,
                "agent_id": agent_id,
                "agent_name": None,
                "datasets": [],
                "error": "Agent not found"
            }

        # Get call data for this agent
        query = select(
            AgentCallStatistics.call_type,
            AgentCallStatistics.date,
            func.count(AgentCallStatistics.id).label("call_count")
        ).where(
            AgentCallStatistics.agent_id == agent_id,
            AgentCallStatistics.date >= start_date
        ).group_by(
            AgentCallStatistics.call_type,
            AgentCallStatistics.date
        )

        result = await db.execute(query)
        call_data = result.all()

        # Group by call_type
        type_calls = {}
        for row in call_data:
            if row.call_type not in type_calls:
                type_calls[row.call_type] = {}
            type_calls[row.call_type][row.date] = row.call_count

        # Build datasets with cumulative counts for each call_type
        datasets = []
        for call_type_val in ["chat", "a2a_router"]:
            date_counts = type_calls.get(call_type_val, {})
            cumulative_data = []
            cumulative_sum = 0

            for d in date_list:
                if d in date_counts:
                    cumulative_sum += date_counts[d]
                cumulative_data.append(cumulative_sum)

            datasets.append({
                "call_type": call_type_val,
                "data": cumulative_data
            })

        return {
            "labels": labels,
            "date_range": date_range,
            "agent_id": agent_id,
            "agent_name": agent.name,
            "datasets": datasets
        }
