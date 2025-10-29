"""
Platform statistics API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime, date

from app.core.database import async_session_maker, Statistics
from app.core.security import get_current_user
from sqlalchemy import select, func

router = APIRouter()

class StatisticsResponse(BaseModel):
    period: str
    statistics: Dict[str, Any]
    daily_breakdown: List[Dict[str, Any]]

@router.get("/statistics/", response_model=StatisticsResponse)
async def get_statistics(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    group_by: str = Query("day", regex="^(day|week|month)$"),
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Get platform statistics"""
    
    # Mock statistics data for now
    # In production, this would query actual data from all services
    
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
    
    # Mock daily breakdown
    daily_breakdown = [
        {
            "date": "2025-01-01",
            "sessions": 112,
            "api_calls": 3200
        },
        {
            "date": "2025-01-02",
            "sessions": 98,
            "api_calls": 2800
        },
        {
            "date": "2025-01-03",
            "sessions": 134,
            "api_calls": 4100
        }
    ]
    
    period = f"{start_date or '2025-01-01'} to {end_date or '2025-01-31'}"
    
    return StatisticsResponse(
        period=period,
        statistics=statistics,
        daily_breakdown=daily_breakdown
    )
