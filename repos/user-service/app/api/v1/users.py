"""
User management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime, timedelta
import secrets
import hashlib

from app.core.database import async_session_maker, User, APIKey
from app.core.security import get_current_user, require_admin, get_password_hash, get_db
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class UserProfile(BaseModel):
    id: int
    username: str
    username_kr: Optional[str]
    username_en: Optional[str]
    email: str
    department_kr: Optional[str]
    department_en: Optional[str]
    role: str
    is_active: bool
    last_login: Optional[datetime]
    created_at: Optional[datetime]

class UserUpdate(BaseModel):
    username_kr: Optional[str] = None
    username_en: Optional[str] = None
    department_kr: Optional[str] = None
    department_en: Optional[str] = None

class APIKeyCreate(BaseModel):
    name: str
    expires_in_days: Optional[int] = 365

class APIKeyResponse(BaseModel):
    id: int
    name: str
    api_key: str
    expires_at: Optional[datetime]
    created_at: datetime

class APIKeyList(BaseModel):
    id: int
    name: str
    is_active: bool
    expires_at: Optional[datetime]
    created_at: datetime
    last_used: Optional[datetime]

@router.get("/me/", response_model=UserProfile)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user)
):
    """Get current user profile"""
    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        username_kr=current_user.username_kr,
        username_en=current_user.username_en,
        email=current_user.email,
        department_kr=current_user.department_kr,
        department_en=current_user.department_en,
        role=current_user.role,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
        created_at=current_user.created_at
    )

@router.put("/me/", response_model=UserProfile)
async def update_current_user_profile(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    # Update fields if provided
    if update_data.username_kr is not None:
        current_user.username_kr = update_data.username_kr
    if update_data.username_en is not None:
        current_user.username_en = update_data.username_en
    if update_data.department_kr is not None:
        current_user.department_kr = update_data.department_kr
    if update_data.department_en is not None:
        current_user.department_en = update_data.department_en

    current_user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(current_user)

    return UserProfile(
        id=current_user.id,
        username=current_user.username,
        username_kr=current_user.username_kr,
        username_en=current_user.username_en,
        email=current_user.email,
        department_kr=current_user.department_kr,
        department_en=current_user.department_en,
        role=current_user.role,
        is_active=current_user.is_active,
        last_login=current_user.last_login,
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
    api_key = f"sk_live_a2g_{secrets.token_urlsafe(32)}"

    # Hash the API key for storage
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Calculate expiration
    expires_at = None
    if request.expires_in_days:
        expires_at = datetime.utcnow() + timedelta(days=request.expires_in_days)

    # Create API key record
    db_api_key = APIKey(
        user_id=current_user.id,
        name=request.name,
        key_hash=key_hash,
        expires_at=expires_at,
        is_active=True
    )

    db.add(db_api_key)
    await db.commit()
    await db.refresh(db_api_key)

    return APIKeyResponse(
        id=db_api_key.id,
        name=db_api_key.name,
        api_key=api_key,
        expires_at=db_api_key.expires_at,
        created_at=db_api_key.created_at
    )

@router.get("/me/api-keys/", response_model=List[APIKeyList])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
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
            expires_at=key.expires_at,
            created_at=key.created_at,
            last_used=key.last_used
        )
        for key in api_keys
    ]

@router.delete("/me/api-keys/{key_id}")
async def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
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
