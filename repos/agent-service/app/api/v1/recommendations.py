"""
Top-K Recommendation API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import httpx
import json

from app.core.database import get_db, Agent, AgentStatus
from app.core.security import get_current_user
from app.core.config import settings
from sqlalchemy import select

router = APIRouter()

class RecommendationRequest(BaseModel):
    query: str
    k: int = 5
    filters: Optional[Dict[str, Any]] = {}

class AgentRecommendation(BaseModel):
    agent_id: int
    name: str
    similarity_score: float
    match_reason: str
    framework: str
    status: str

class RecommendationResponse(BaseModel):
    recommendations: List[AgentRecommendation]
    query: str
    total_found: int

@router.post("/recommend/", response_model=RecommendationResponse)
async def get_recommendations(
    request: RecommendationRequest,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db)
):
    """Get Top-K agent recommendations based on query"""
    
    # For now, return mock recommendations
    # In production, this would use OpenAI embeddings and pgvector
    
    # Get agents with filters
    query = select(Agent).where(Agent.is_public == True)
    
    if request.filters:
        if "status" in request.filters:
            query = query.where(Agent.status == request.filters["status"])
        if "department" in request.filters:
            query = query.where(Agent.department == request.filters["department"])
    
    result = await db.execute(query)
    agents = result.scalars().all()
    
    # Mock similarity scoring and matching
    recommendations = []
    for i, agent in enumerate(agents[:request.k]):
        # Mock similarity score (0.5 to 0.95)
        similarity_score = 0.95 - (i * 0.1)
        
        # Mock match reason generation
        match_reason = _generate_match_reason(request.query, agent)
        
        recommendations.append(AgentRecommendation(
            agent_id=agent.id,
            name=agent.name,
            similarity_score=similarity_score,
            match_reason=match_reason,
            framework=agent.framework.value,
            status=agent.status.value
        ))
    
    return RecommendationResponse(
        recommendations=recommendations,
        query=request.query,
        total_found=len(agents)
    )

def _generate_match_reason(query: str, agent: Agent) -> str:
    """Generate match reason for agent recommendation"""
    # Mock match reason generation
    # In production, this would use LLM to generate contextual reasons
    
    query_lower = query.lower()
    agent_name_lower = agent.name.lower()
    
    if "고객" in query_lower or "customer" in query_lower:
        if "고객" in agent_name_lower or "customer" in agent_name_lower:
            return "고객 지원 전문 에이전트로 요청과 정확히 일치합니다"
        else:
            return "고객 관련 작업에 적합한 기능을 제공합니다"
    
    elif "분석" in query_lower or "analyze" in query_lower:
        return "데이터 분석 및 처리 기능이 우수합니다"
    
    elif "채팅" in query_lower or "chat" in query_lower:
        return "대화형 인터페이스와 채팅 기능에 특화되어 있습니다"
    
    else:
        return f"'{agent.name}'의 기능이 요청과 관련성이 높습니다"
