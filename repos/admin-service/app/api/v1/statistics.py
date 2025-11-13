"""
Platform statistics API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
import httpx

from app.core.database import PlatformStatistics
from app.core.security import require_admin, get_db
from app.core.config import settings

router = APIRouter()

class StatisticsResponse(BaseModel):
    period: str
    statistics: Dict[str, Any]
    daily_breakdown: List[Dict[str, Any]]

class UserStatisticsResponse(BaseModel):
    total_users: int
    by_role: Dict[str, int]
    by_department: Dict[str, int]
    growth: Dict[str, int]

class AgentStatisticsResponse(BaseModel):
    total_agents: int
    by_status: Dict[str, int]
    by_framework: Dict[str, int]
    most_used: List[Dict[str, Any]]

@router.get("/statistics/", response_model=StatisticsResponse)
async def get_platform_statistics(
    start_date: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    group_by: str = Query("day", regex="^(day|week|month)$", description="Group by period"),
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get platform statistics (ADMIN only)

    Query external services to aggregate statistics from:
    - User Service: Total/active users
    - Agent Service: Total/production agents
    - Chat Service: Total sessions
    - Admin Service: API calls, LLM usage
    """

    # In production, query actual services
    # For now, return mock data from database or default values

    # Calculate period
    if not start_date:
        start_date = date.today() - timedelta(days=30)
    if not end_date:
        end_date = date.today()

    # Mock statistics (in production, aggregate from all services)
    statistics = {
        "total_users": 150,
        "active_users": 89,
        "total_agents": 45,
        "production_agents": 12,
        "total_sessions": 3456,
        "total_api_calls": 98765,
        "llm_usage": {
            "gpt-4": 45000,
            "claude-3": 32000,
            "custom": 21765
        }
    }

    # Generate daily breakdown (mock data)
    daily_breakdown = []
    current_date = start_date
    while current_date <= end_date:
        daily_breakdown.append({
            "date": current_date.isoformat(),
            "sessions": 100 + (current_date.day % 50),
            "api_calls": 3000 + (current_date.day % 1000),
            "active_users": 40 + (current_date.day % 20)
        })
        current_date += timedelta(days=1)

    period = f"{start_date} to {end_date}"

    return StatisticsResponse(
        period=period,
        statistics=statistics,
        daily_breakdown=daily_breakdown
    )

@router.get("/statistics/users/", response_model=UserStatisticsResponse)
async def get_user_statistics(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user statistics (ADMIN only)

    Queries User Service for detailed user statistics
    """

    # In production, query User Service API
    # For now, return mock data

    try:
        # Mock data - In production, query user-service
        user_stats = {
            "total_users": 150,
            "by_role": {
                "ADMIN": 5,
                "USER": 140,
                "PENDING": 5
            },
            "by_department": {
                "AI팀": 45,
                "데이터팀": 38,
                "개발팀": 67
            },
            "growth": {
                "last_7_days": 12,
                "last_30_days": 45
            }
        }

        return UserStatisticsResponse(**user_stats)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch user statistics: {str(e)}"
        )

@router.get("/statistics/agents/", response_model=AgentStatisticsResponse)
async def get_agent_statistics(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get agent statistics (ADMIN only)

    Queries Agent Service for detailed agent statistics
    """

    # In production, query Agent Service API
    # For now, return mock data

    try:
        # Mock data - In production, query agent-service
        agent_stats = {
            "total_agents": 45,
            "by_status": {
                "DEVELOPMENT": 25,
                "STAGING": 8,
                "PRODUCTION": 12
            },
            "by_framework": {
                "Langchain": 20,
                "Agno": 15,
                "ADK": 10
            },
            "most_used": [
                {
                    "agent_id": 1,
                    "name": "CS Agent",
                    "usage_count": 3456,
                    "last_used": datetime.utcnow().isoformat()
                },
                {
                    "agent_id": 2,
                    "name": "Data Analyzer",
                    "usage_count": 2341,
                    "last_used": datetime.utcnow().isoformat()
                },
                {
                    "agent_id": 3,
                    "name": "Report Generator",
                    "usage_count": 1876,
                    "last_used": datetime.utcnow().isoformat()
                }
            ]
        }

        return AgentStatisticsResponse(**agent_stats)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch agent statistics: {str(e)}"
        )

@router.get("/statistics/sessions/")
async def get_session_statistics(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get chat session statistics (ADMIN only)

    Queries Chat Service for session statistics
    """

    # In production, query Chat Service API
    # For now, return mock data

    return {
        "total_sessions": 3456,
        "active_sessions": 89,
        "avg_duration_minutes": 15.3,
        "avg_messages_per_session": 12.5,
        "by_status": {
            "active": 89,
            "completed": 3367
        }
    }

@router.get("/statistics/llm-usage/")
async def get_llm_usage_statistics(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get LLM usage statistics (ADMIN only)

    Returns LLM usage statistics from platform
    """

    # Query LLM models from database
    from app.core.database import LLMModel
    result = await db.execute(select(LLMModel))
    models = result.scalars().all()

    # Mock usage data - In production, aggregate from actual usage logs
    llm_usage = {}
    for model in models:
        llm_usage[model.name] = {
            "total_calls": 1000 + (model.id * 234),
            "total_tokens": 50000 + (model.id * 12340),
            "avg_response_time_ms": 200 + (model.id * 50),
            "health_status": model.health_status.value,
            "is_active": model.is_active
        }

    return {
        "period": "last_30_days",
        "by_model": llm_usage,
        "total_llm_calls": sum(usage["total_calls"] for usage in llm_usage.values()),
        "total_tokens": sum(usage["total_tokens"] for usage in llm_usage.values())
    }


class ComprehensiveStatisticsResponse(BaseModel):
    """Comprehensive statistics for settings page"""
    # Overview
    total_users: int
    active_agents: int
    agents_in_dev: int

    # Growth trends
    user_monthly_growth: List[Dict[str, Any]]
    agent_monthly_growth: List[Dict[str, Any]]
    token_monthly_usage: List[Dict[str, Any]]

    # Agent token usage (replaces top_token_consumers, top_consumers_by_model, and agent_usage_frequency)
    agent_token_usage: List[Dict[str, Any]]
    model_usage_stats: List[Dict[str, Any]]


@router.get("/statistics/comprehensive/", response_model=ComprehensiveStatisticsResponse)
async def get_comprehensive_statistics(
    months: int = Query(12, ge=1, le=24, description="Months for growth charts"),
    group_by: str = Query("month", regex="^(week|month)$", description="Group by week or month"),
    top_k_users: int = Query(5, ge=1, le=50, description="Top K token consumers"),
    top_k_agents: int = Query(10, ge=1, le=50, description="Top K agent usage"),
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive statistics for settings dashboard (ADMIN only)

    Returns all statistics needed for the dashboard:
    - Overview cards (users, agents)
    - Monthly growth charts (users, agents, tokens)
    - Token usage analytics (top consumers, by model)
    - Agent usage analytics
    """

    # Initialize default values
    user_count = 0
    active_agents = 0
    agents_in_dev = 0
    user_growth = []
    agent_growth = []
    token_growth = []
    top_consumers = []
    top_by_model = []
    model_stats = []
    agent_usage = []

    # Fetch all data in parallel using httpx
    async with httpx.AsyncClient(timeout=10.0) as client:
        # Get auth header
        auth_header = {"Authorization": f"Bearer {admin_user.get('access_token', '')}"}

        # Create tasks for parallel requests
        tasks = []

        # 1. User count
        tasks.append(client.get(
            f"{settings.USER_SERVICE_URL}/api/admin/users/count",
            headers=auth_header
        ))

        # 2. User monthly growth
        tasks.append(client.get(
            f"{settings.USER_SERVICE_URL}/api/admin/users/monthly-growth?months={months}&group_by={group_by}",
            headers=auth_header
        ))

        # 3. Agent statistics
        tasks.append(client.get(
            f"{settings.AGENT_SERVICE_URL}/api/admin/agents/statistics",
            headers=auth_header
        ))

        # 4. Agent monthly growth
        tasks.append(client.get(
            f"{settings.AGENT_SERVICE_URL}/api/admin/agents/monthly-growth?months={months}&group_by={group_by}",
            headers=auth_header
        ))

        # 5. Agent token usage (replaces top-consumers, top-consumers-by-model, and agent-usage)
        tasks.append(client.get(
            f"{settings.LLM_PROXY_SERVICE_URL}/api/v1/statistics/agent-token-usage?limit={top_k_agents}&model=all"
        ))

        # 6. Model usage statistics
        tasks.append(client.get(
            f"{settings.LLM_PROXY_SERVICE_URL}/api/v1/statistics/model-usage?limit=10",
            headers=auth_header
        ))

        # 7. Monthly token usage (default to all agents with monthly grouping)
        tasks.append(client.get(
            f"{settings.LLM_PROXY_SERVICE_URL}/api/v1/statistics/monthly-token-usage?months={months}&group_by={group_by}&trace_id=all",
            headers=auth_header
        ))

        # Execute all requests in parallel
        import asyncio
        responses = await asyncio.gather(*tasks, return_exceptions=True)

        # Process responses
        import logging
        logger = logging.getLogger(__name__)

        try:
            if isinstance(responses[0], Exception):
                logger.error(f"User count request failed: {responses[0]}")
            elif responses[0].status_code == 200:
                user_count = responses[0].json().get("count", 0)
                logger.info(f"✓ User count: {user_count}")
            else:
                logger.error(f"User count request failed with status {responses[0].status_code}: {responses[0].text}")
        except Exception as e:
            logger.error(f"Error processing user count: {e}")

        try:
            if isinstance(responses[1], Exception):
                logger.error(f"User growth request failed: {responses[1]}")
            elif responses[1].status_code == 200:
                user_growth = responses[1].json().get("data", [])
                logger.info(f"✓ User growth data: {len(user_growth)} months")
            else:
                logger.error(f"User growth request failed with status {responses[1].status_code}: {responses[1].text}")
        except Exception as e:
            logger.error(f"Error processing user growth: {e}")

        try:
            if isinstance(responses[2], Exception):
                logger.error(f"Agent statistics request failed: {responses[2]}")
            elif responses[2].status_code == 200:
                data = responses[2].json()
                active_agents = data.get("deployed_count", 0)
                agents_in_dev = data.get("development_count", 0)
                logger.info(f"✓ Agent stats - Active: {active_agents}, In Dev: {agents_in_dev}")
            else:
                logger.error(f"Agent statistics request failed with status {responses[2].status_code}: {responses[2].text}")
        except Exception as e:
            logger.error(f"Error processing agent statistics: {e}")

        try:
            if isinstance(responses[3], Exception):
                logger.error(f"Agent growth request failed: {responses[3]}")
            elif responses[3].status_code == 200:
                agent_growth = responses[3].json().get("data", [])
                logger.info(f"✓ Agent growth data: {len(agent_growth)} months")
            else:
                logger.error(f"Agent growth request failed with status {responses[3].status_code}: {responses[3].text}")
        except Exception as e:
            logger.error(f"Error processing agent growth: {e}")

        # Response indices updated after removing tasks 6, 7, 9
        # 4: Agent token usage
        # 5: Model usage stats
        # 6: Monthly token usage

        try:
            if isinstance(responses[4], Exception):
                logger.error(f"Agent token usage request failed: {responses[4]}")
            elif responses[4].status_code == 200:
                agent_usage = responses[4].json().get("agent_usage", [])
                logger.info(f"✓ Agent token usage: {len(agent_usage)} agents")
            else:
                logger.error(f"Agent token usage request failed with status {responses[4].status_code}: {responses[4].text}")
        except Exception as e:
            logger.error(f"Error processing agent token usage: {e}")

        try:
            if isinstance(responses[5], Exception):
                logger.error(f"Model usage stats request failed: {responses[5]}")
            elif responses[5].status_code == 200:
                model_stats = responses[5].json().get("model_usage", [])
                logger.info(f"✓ Model usage stats: {len(model_stats)} models")
            else:
                logger.error(f"Model usage stats request failed with status {responses[5].status_code}: {responses[5].text}")
        except Exception as e:
            logger.error(f"Error processing model usage stats: {e}")

        try:
            if isinstance(responses[6], Exception):
                logger.error(f"Token growth request failed: {responses[6]}")
            elif responses[6].status_code == 200:
                token_growth = responses[6].json().get("data", [])
                logger.info(f"✓ Token growth data: {len(token_growth)} months")
            else:
                logger.error(f"Token growth request failed with status {responses[6].status_code}: {responses[6].text}")
        except Exception as e:
            logger.error(f"Error processing token growth: {e}")

    return ComprehensiveStatisticsResponse(
        total_users=user_count,
        active_agents=active_agents,
        agents_in_dev=agents_in_dev,
        user_monthly_growth=user_growth,
        agent_monthly_growth=agent_growth,
        token_monthly_usage=token_growth,
        agent_token_usage=agent_usage,
        model_usage_stats=model_stats
    )
