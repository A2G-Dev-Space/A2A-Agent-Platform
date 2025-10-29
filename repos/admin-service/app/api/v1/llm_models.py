"""
LLM Model management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import async_session_maker, LLMModel, HealthStatus
from app.core.security import get_current_user
from sqlalchemy import select

router = APIRouter()

class LLMModelCreate(BaseModel):
    name: str
    provider: str
    endpoint: str
    api_key: str

class LLMModelResponse(BaseModel):
    id: int
    name: str
    provider: str
    endpoint: str
    is_active: bool
    health_status: HealthStatus
    last_health_check: Optional[datetime]

@router.get("/llm-models/", response_model=List[LLMModelResponse])
async def list_llm_models(
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """List all LLM models"""
    result = await db.execute(select(LLMModel))
    models = result.scalars().all()
    
    return [
        LLMModelResponse(
            id=model.id,
            name=model.name,
            provider=model.provider,
            endpoint=model.endpoint,
            is_active=model.is_active,
            health_status=model.health_status,
            last_health_check=model.last_health_check
        )
        for model in models
    ]

@router.post("/llm-models/", response_model=LLMModelResponse)
async def create_llm_model(
    request: LLMModelCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Create new LLM model"""
    model = LLMModel(
        name=request.name,
        provider=request.provider,
        endpoint=request.endpoint,
        api_key=request.api_key,  # In production, encrypt this
        is_active=False,
        health_status=HealthStatus.UNKNOWN
    )
    
    db.add(model)
    await db.commit()
    await db.refresh(model)
    
    return LLMModelResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        endpoint=model.endpoint,
        is_active=model.is_active,
        health_status=model.health_status,
        last_health_check=model.last_health_check
    )

@router.put("/llm-models/{model_id}", response_model=LLMModelResponse)
async def update_llm_model(
    model_id: int,
    request: LLMModelCreate,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Update LLM model"""
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM model not found"
        )
    
    model.name = request.name
    model.provider = request.provider
    model.endpoint = request.endpoint
    model.api_key = request.api_key
    
    await db.commit()
    await db.refresh(model)
    
    return LLMModelResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        endpoint=model.endpoint,
        is_active=model.is_active,
        health_status=model.health_status,
        last_health_check=model.last_health_check
    )

@router.delete("/llm-models/{model_id}")
async def delete_llm_model(
    model_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Delete LLM model"""
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()
    
    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM model not found"
        )
    
    await db.delete(model)
    await db.commit()
    
    return {"message": "LLM model deleted successfully"}
