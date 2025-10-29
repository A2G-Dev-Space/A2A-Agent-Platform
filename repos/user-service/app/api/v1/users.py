"""
User management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import secrets

from app.core.database import async_session_maker, User, APIKey
from app.core.security import get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

async def get_db():
    """Get database session"""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()

class UserProfile(BaseModel):
    username: str
    username_kr: Optional[str]
    email: str
    department_kr: Optional[str]
    department_en: Optional[str]
    role: str
    created_at: Optional[datetime]

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: int
    name: str
    key: str
    created_at: datetime

class APIKeyList(BaseModel):
    id: int
    name: str
    is_active: bool
    created_at: datetime
    last_used: Optional[datetime]

@router.get("/me/", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return UserProfile(
        username=current_user.username,
        username_kr=current_user.username_kr,
        email=current_user.email,
        department_kr=current_user.department_kr,
        department_en=current_user.department_en,
        role=current_user.role,
        created_at=current_user.created_at
    )

@router.post("/me/api-keys/", response_model=APIKeyResponse)
async def create_api_key(
    request: APIKeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new API key for current user"""
    # Generate API key
    api_key = f"ak_live_{secrets.token_urlsafe(32)}"
    
    # Create API key record
    db_api_key = APIKey(
        user_id=current_user.id,
        name=request.name,
        key_hash=api_key,  # In production, hash this
        is_active=True
    )
    
    db.add(db_api_key)
    await db.commit()
    await db.refresh(db_api_key)
    
    return APIKeyResponse(
        id=db_api_key.id,
        name=db_api_key.name,
        key=api_key,
        created_at=db_api_key.created_at
    )

@router.get("/me/api-keys/", response_model=List[APIKeyList])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """List user's API keys"""
    result = await db.execute(
        select(APIKey).where(APIKey.user_id == current_user.id)
    )
    api_keys = result.scalars().all()
    
    return [
        APIKeyList(
            id=key.id,
            name=key.name,
            is_active=key.is_active,
            created_at=key.created_at,
            last_used=key.last_used
        )
        for key in api_keys
    ]

@router.delete("/me/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db=Depends(async_session_maker)
):
    """Delete API key"""
    result = await db.execute(
        select(APIKey).where(
            APIKey.id == key_id,
            APIKey.user_id == current_user.id
        )
    )
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="API key not found"
        )
    
    await db.delete(api_key)
    await db.commit()
    
    return {"message": "API key deleted successfully"}
