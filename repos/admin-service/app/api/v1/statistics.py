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
