"""Platform API key endpoints."""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from pydantic import BaseModel
import secrets
import hashlib

from app.core.security import get_db, get_current_user
from app.core.database import User
from app.models.platform_keys import PlatformKey


router = APIRouter()


class PlatformKeyCreate(BaseModel):
    name: str


class PlatformKeyResponse(BaseModel):
    id: int
    key: str
    name: str
    created_at: datetime
    last_used: Optional[datetime]
    is_active: bool

    class Config:
        from_attributes = True


class PlatformKeyCreatedResponse(BaseModel):
    id: int
    key: str  # Full key returned only on creation
    name: str
    created_at: datetime

    class Config:
        from_attributes = True


def generate_platform_key() -> str:
    """Generate a secure platform key with a2g_ prefix."""
    # Generate 32 bytes of random data
    random_bytes = secrets.token_bytes(32)
    # Create a hex string from the random bytes
    key_hash = hashlib.sha256(random_bytes).hexdigest()
    # Return with platform prefix
    return f"a2g_{key_hash}"


@router.get("/users/me/platform-keys/", response_model=List[PlatformKeyResponse])
async def list_platform_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all platform keys for the current user."""
    result = await db.execute(
        select(PlatformKey).where(
            and_(
                PlatformKey.user_id == current_user.id,
                PlatformKey.is_active == True
            )
        ).order_by(PlatformKey.created_at.desc())
    )
    keys = result.scalars().all()

    # Mask the keys for security (show only prefix and suffix)
    response_keys = []
    for key in keys:
        key_dict = {
            "id": key.id,
            "key": key.key[4:12] + "..." + key.key[-4:],  # Show only parts of the key
            "name": key.name,
            "created_at": key.created_at,
            "last_used": key.last_used,
            "is_active": key.is_active
        }
        response_keys.append(PlatformKeyResponse(**key_dict))

    return response_keys


@router.post("/users/me/platform-keys/", response_model=PlatformKeyCreatedResponse)
async def create_platform_key(
    key_data: PlatformKeyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new platform key for the current user."""
    # Generate a unique key
    platform_key = generate_platform_key()

    # Check if key exists (extremely unlikely but good practice)
    existing = await db.execute(
        select(PlatformKey).where(PlatformKey.key == platform_key)
    )
    if existing.scalar_one_or_none():
        # Regenerate if collision occurs
        platform_key = generate_platform_key()

    # Create the key record
    db_key = PlatformKey(
        user_id=current_user.id,
        key=platform_key,
        name=key_data.name
    )

    db.add(db_key)
    await db.commit()
    await db.refresh(db_key)

    # Return the full key only on creation
    return PlatformKeyCreatedResponse(
        id=db_key.id,
        key=db_key.key,
        name=db_key.name,
        created_at=db_key.created_at
    )


@router.delete("/users/me/platform-keys/{key_id}/")
async def delete_platform_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a platform key."""
    result = await db.execute(
        select(PlatformKey).where(
            and_(
                PlatformKey.id == key_id,
                PlatformKey.user_id == current_user.id
            )
        )
    )
    db_key = result.scalar_one_or_none()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found")

    # Soft delete by marking as inactive
    db_key.is_active = False
    await db.commit()

    return {"message": "Key deleted successfully"}


@router.post("/users/me/platform-keys/{key_id}/verify")
async def verify_platform_key(
    key_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Verify that a platform key is valid and active."""
    result = await db.execute(
        select(PlatformKey).where(
            and_(
                PlatformKey.id == key_id,
                PlatformKey.user_id == current_user.id,
                PlatformKey.is_active == True
            )
        )
    )
    db_key = result.scalar_one_or_none()

    if not db_key:
        raise HTTPException(status_code=404, detail="Key not found or inactive")

    # Update last used timestamp
    db_key.last_used = datetime.utcnow()
    await db.commit()

    return {
        "valid": True,
        "key_id": db_key.id,
        "name": db_key.name
    }


@router.get("/platform-keys/validate")
async def validate_platform_key_endpoint(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Validate a Platform API key
    Used by LLM Proxy and other services to authenticate requests
    """
    if not authorization or not authorization.startswith("Bearer a2g_"):
        raise HTTPException(status_code=401, detail="Invalid or missing authorization header")

    key = authorization.replace("Bearer ", "")

    result = await db.execute(
        select(PlatformKey).where(
            and_(
                PlatformKey.key == key,
                PlatformKey.is_active == True
            )
        )
    )
    db_key = result.scalar_one_or_none()

    if not db_key:
        raise HTTPException(status_code=401, detail="Invalid or inactive API key")

    # Update last used timestamp
    db_key.last_used = datetime.utcnow()
    await db.commit()

    return {
        "valid": True,
        "user_id": db_key.user_id,
        "key_id": db_key.id,
        "key_name": db_key.name
    }


# Middleware function to validate platform keys in requests
async def validate_platform_key(
    authorization: str,
    db: AsyncSession
) -> Optional[PlatformKey]:
    """Validate a platform key from the Authorization header."""
    if not authorization or not authorization.startswith("Bearer a2g_"):
        return None

    key = authorization.replace("Bearer ", "")

    result = await db.execute(
        select(PlatformKey).where(
            and_(
                PlatformKey.key == key,
                PlatformKey.is_active == True
            )
        )
    )
    db_key = result.scalar_one_or_none()

    if db_key:
        # Update last used timestamp
        db_key.last_used = datetime.utcnow()
        await db.commit()

    return db_key