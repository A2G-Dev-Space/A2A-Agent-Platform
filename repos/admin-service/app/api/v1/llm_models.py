"""
LLM Model management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.core.database import LLMModel, HealthStatus
from app.core.security import require_admin, get_db

router = APIRouter()

class LLMModelCreate(BaseModel):
    name: str
    provider: str
    endpoint: str
    api_key: str
    configuration: Optional[Dict[str, Any]] = None

class LLMModelUpdate(BaseModel):
    name: Optional[str] = None
    provider: Optional[str] = None
    endpoint: Optional[str] = None
    api_key: Optional[str] = None
    configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

class LLMModelResponse(BaseModel):
    id: int
    name: str
    provider: str
    endpoint: str
    is_active: bool
    health_status: str
    last_health_check: Optional[datetime]
    configuration: Optional[Dict[str, Any]]
    created_at: datetime

class HealthCheckResponse(BaseModel):
    model_id: int
    status: str
    response_time_ms: Optional[int]
    checked_at: datetime
    error_message: Optional[str] = None

@router.get("/llm-models/", response_model=List[LLMModelResponse])
async def list_llm_models(
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all LLM models (ADMIN only)
    """
    result = await db.execute(select(LLMModel).order_by(LLMModel.created_at.desc()))
    models = result.scalars().all()

    return [
        LLMModelResponse(
            id=model.id,
            name=model.name,
            provider=model.provider,
            endpoint=model.endpoint,
            is_active=model.is_active,
            health_status=model.health_status.value,
            last_health_check=model.last_health_check,
            configuration=model.model_config,
            created_at=model.created_at
        )
        for model in models
    ]

@router.post("/llm-models/", response_model=LLMModelResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_model(
    request: LLMModelCreate,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Create new LLM model (ADMIN only)
    """
    # Check if model with same name already exists
    result = await db.execute(select(LLMModel).where(LLMModel.name == request.name))
    existing_model = result.scalar_one_or_none()

    if existing_model:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LLM model with name '{request.name}' already exists"
        )

    # Create model (in production, encrypt api_key)
    model = LLMModel(
        name=request.name,
        provider=request.provider,
        endpoint=request.endpoint,
        api_key_encrypted=request.api_key,  # TODO: Encrypt in production
        model_config=request.configuration,
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
        health_status=model.health_status.value,
        last_health_check=model.last_health_check,
        configuration=model.model_config,
        created_at=model.created_at
    )

@router.get("/llm-models/{model_id}/", response_model=LLMModelResponse)
async def get_llm_model(
    model_id: int,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get LLM model details (ADMIN only)
    """
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM model with id {model_id} not found"
        )

    return LLMModelResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        endpoint=model.endpoint,
        is_active=model.is_active,
        health_status=model.health_status.value,
        last_health_check=model.last_health_check,
        configuration=model.model_config,
        created_at=model.created_at
    )

@router.put("/llm-models/{model_id}/", response_model=LLMModelResponse)
async def update_llm_model(
    model_id: int,
    request: LLMModelUpdate,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update LLM model (ADMIN only)
    """
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM model with id {model_id} not found"
        )

    # Update fields if provided
    if request.name is not None:
        model.name = request.name
    if request.provider is not None:
        model.provider = request.provider
    if request.endpoint is not None:
        model.endpoint = request.endpoint
    if request.api_key is not None:
        model.api_key_encrypted = request.api_key  # TODO: Encrypt in production
    if request.configuration is not None:
        model.model_config = request.configuration
    if request.is_active is not None:
        model.is_active = request.is_active

    model.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(model)

    return LLMModelResponse(
        id=model.id,
        name=model.name,
        provider=model.provider,
        endpoint=model.endpoint,
        is_active=model.is_active,
        health_status=model.health_status.value,
        last_health_check=model.last_health_check,
        configuration=model.model_config,
        created_at=model.created_at
    )

@router.delete("/llm-models/{model_id}/")
async def delete_llm_model(
    model_id: int,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete LLM model (ADMIN only)
    """
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM model with id {model_id} not found"
        )

    await db.delete(model)
    await db.commit()

    return {"message": f"LLM model '{model.name}' deleted successfully"}

@router.post("/llm-models/{model_id}/health-check/", response_model=HealthCheckResponse)
async def health_check_llm_model(
    model_id: int,
    admin_user: dict = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Perform health check on LLM model (ADMIN only)
    """
    result = await db.execute(select(LLMModel).where(LLMModel.id == model_id))
    model = result.scalar_one_or_none()

    if not model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"LLM model with id {model_id} not found"
        )

    # Perform health check
    start_time = datetime.utcnow()
    error_message = None
    response_time_ms = None

    try:
        async with httpx.AsyncClient() as client:
            # Different health check based on provider
            if model.provider == 'openai_compatible' or model.provider == 'openai':
                # For OpenAI-compatible endpoints, send a minimal chat completion request
                headers = {
                    "Authorization": f"Bearer {model.api_key_encrypted}",
                    "Content-Type": "application/json"
                }
                # Adjust model name for Gemini API
                model_name = model.name
                if 'gemini' in model.name.lower():
                    model_name = f"models/{model.name}"

                data = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": "test"}],
                    "max_tokens": 1
                }

                # Ensure endpoint ends with /chat/completions for OpenAI compatibility
                endpoint = model.endpoint
                if not endpoint.endswith('/chat/completions'):
                    if endpoint.endswith('/'):
                        endpoint += 'chat/completions'
                    else:
                        endpoint += '/chat/completions'

                response = await client.post(
                    endpoint,
                    headers=headers,
                    json=data,
                    timeout=10.0
                )
            else:
                # For other providers, try a simple GET request
                response = await client.get(
                    model.endpoint,
                    timeout=10.0
                )

            end_time = datetime.utcnow()
            response_time_ms = int((end_time - start_time).total_seconds() * 1000)

            if response.status_code in [200, 201]:
                model.health_status = HealthStatus.HEALTHY
            else:
                model.health_status = HealthStatus.UNHEALTHY
                error_message = f"HTTP {response.status_code}"

    except httpx.TimeoutException:
        model.health_status = HealthStatus.UNHEALTHY
        error_message = "Connection timeout"
    except Exception as e:
        model.health_status = HealthStatus.UNHEALTHY
        error_message = str(e)

    # Update model
    model.last_health_check = datetime.utcnow()
    await db.commit()

    return HealthCheckResponse(
        model_id=model.id,
        status=model.health_status.value,
        response_time_ms=response_time_ms,
        checked_at=model.last_health_check,
        error_message=error_message
    )
