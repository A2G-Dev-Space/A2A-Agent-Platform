"""
User LLM API Keys management endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import UserLLMKey, async_session_maker
from app.core.security import get_current_user, get_db

router = APIRouter()

class LLMKeyCreate(BaseModel):
    provider: str  # google, openai, anthropic, etc.
    model_name: str  # gemini-2.5-flash, gpt-4, claude-3-opus, etc.
    api_key: str

class LLMKeyUpdate(BaseModel):
    model_name: Optional[str] = None
    api_key: Optional[str] = None
    is_active: Optional[bool] = None

class LLMKeyResponse(BaseModel):
    id: int
    provider: str
    model_name: str
    api_key_preview: str  # Only last 4 characters
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime]

@router.get("/me/llm-keys/", response_model=List[LLMKeyResponse])
async def list_llm_keys(
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user's LLM API keys
    """
    result = await db.execute(
        select(UserLLMKey).where(
            UserLLMKey.user_id == current_user.id
        ).order_by(UserLLMKey.created_at.desc())
    )
    keys = result.scalars().all()

    return [
        LLMKeyResponse(
            id=key.id,
            provider=key.provider,
            model_name=key.model_name,
            api_key_preview=f"...{key.api_key_encrypted[-4:]}" if len(key.api_key_encrypted) > 4 else "****",
            is_active=key.is_active,
            created_at=key.created_at,
            last_used=key.last_used
        )
        for key in keys
    ]

@router.post("/me/llm-keys/", response_model=LLMKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_llm_key(
    request: LLMKeyCreate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create new LLM API key for user
    """
    # Check if key with same provider and model already exists
    result = await db.execute(
        select(UserLLMKey).where(
            UserLLMKey.user_id == current_user.id,
            UserLLMKey.provider == request.provider,
            UserLLMKey.model_name == request.model_name
        )
    )
    existing_key = result.scalar_one_or_none()

    if existing_key:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"LLM key for {request.provider}/{request.model_name} already exists"
        )

    # Create new key (in production, encrypt api_key)
    llm_key = UserLLMKey(
        user_id=current_user.id,
        provider=request.provider,
        model_name=request.model_name,
        api_key_encrypted=request.api_key,  # TODO: Encrypt in production
        is_active=True
    )

    db.add(llm_key)
    await db.commit()
    await db.refresh(llm_key)

    return LLMKeyResponse(
        id=llm_key.id,
        provider=llm_key.provider,
        model_name=llm_key.model_name,
        api_key_preview=f"...{llm_key.api_key_encrypted[-4:]}",
        is_active=llm_key.is_active,
        created_at=llm_key.created_at,
        last_used=llm_key.last_used
    )

@router.put("/me/llm-keys/{key_id}/", response_model=LLMKeyResponse)
async def update_llm_key(
    key_id: int,
    request: LLMKeyUpdate,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user's LLM API key
    """
    result = await db.execute(
        select(UserLLMKey).where(
            UserLLMKey.id == key_id,
            UserLLMKey.user_id == current_user.id
        )
    )
    llm_key = result.scalar_one_or_none()

    if not llm_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM key not found"
        )

    # Update fields if provided
    if request.model_name is not None:
        llm_key.model_name = request.model_name
    if request.api_key is not None:
        llm_key.api_key_encrypted = request.api_key  # TODO: Encrypt in production
    if request.is_active is not None:
        llm_key.is_active = request.is_active

    llm_key.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(llm_key)

    return LLMKeyResponse(
        id=llm_key.id,
        provider=llm_key.provider,
        model_name=llm_key.model_name,
        api_key_preview=f"...{llm_key.api_key_encrypted[-4:]}",
        is_active=llm_key.is_active,
        created_at=llm_key.created_at,
        last_used=llm_key.last_used
    )

@router.delete("/me/llm-keys/{key_id}/")
async def delete_llm_key(
    key_id: int,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete user's LLM API key
    """
    result = await db.execute(
        select(UserLLMKey).where(
            UserLLMKey.id == key_id,
            UserLLMKey.user_id == current_user.id
        )
    )
    llm_key = result.scalar_one_or_none()

    if not llm_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="LLM key not found"
        )

    await db.delete(llm_key)
    await db.commit()

    return {"message": f"LLM key for {llm_key.provider}/{llm_key.model_name} deleted successfully"}

@router.get("/me/llm-keys/{provider}/{model_name}/", response_model=LLMKeyResponse)
async def get_llm_key_by_provider_model(
    provider: str,
    model_name: str,
    current_user = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's LLM API key by provider and model name
    """
    result = await db.execute(
        select(UserLLMKey).where(
            UserLLMKey.user_id == current_user.id,
            UserLLMKey.provider == provider,
            UserLLMKey.model_name == model_name,
            UserLLMKey.is_active == True
        )
    )
    llm_key = result.scalar_one_or_none()

    if not llm_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active LLM key found for {provider}/{model_name}"
        )

    return LLMKeyResponse(
        id=llm_key.id,
        provider=llm_key.provider,
        model_name=llm_key.model_name,
        api_key_preview=f"...{llm_key.api_key_encrypted[-4:]}",
        is_active=llm_key.is_active,
        created_at=llm_key.created_at,
        last_used=llm_key.last_used
    )
