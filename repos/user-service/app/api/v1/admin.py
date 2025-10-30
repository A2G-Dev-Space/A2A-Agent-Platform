"""
Admin API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from app.core.database import async_session_maker, User
from app.core.security import require_admin, get_db
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class UserListItem(BaseModel):
    id: int
    username: str
    username_kr: Optional[str]
    username_en: Optional[str]
    email: str
    role: str
    department_kr: Optional[str]
    department_en: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    created_at: datetime

class UserListResponse(BaseModel):
    users: List[UserListItem]
    total: int
    page: int
    pages: int

class RoleUpdate(BaseModel):
    role: str

@router.get("/users", response_model=UserListResponse)
async def list_all_users(
    role: Optional[str] = Query(None, description="Filter by role (PENDING/USER/ADMIN)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users with filtering and pagination (ADMIN only)
    """
    # Build query
    query = select(User)

    # Apply filters
    if role:
        query = query.where(User.role == role)
    if department:
        query = query.where(
            or_(
                User.department_kr.ilike(f"%{department}%"),
                User.department_en.ilike(f"%{department}%")
            )
        )

    # Get total count
    count_query = select(func.count()).select_from(User)
    if role:
        count_query = count_query.where(User.role == role)
    if department:
        count_query = count_query.where(
            or_(
                User.department_kr.ilike(f"%{department}%"),
                User.department_en.ilike(f"%{department}%")
            )
        )

    result = await db.execute(count_query)
    total = result.scalar()

    # Apply pagination
    offset = (page - 1) * limit
    query = query.offset(offset).limit(limit).order_by(User.created_at.desc())

    result = await db.execute(query)
    users = result.scalars().all()

    # Calculate total pages
    pages = (total + limit - 1) // limit if total > 0 else 0

    return UserListResponse(
        users=[
            UserListItem(
                id=user.id,
                username=user.username,
                username_kr=user.username_kr,
                username_en=user.username_en,
                email=user.email,
                role=user.role,
                department_kr=user.department_kr,
                department_en=user.department_en,
                is_active=user.is_active,
                last_login=user.last_login,
                created_at=user.created_at
            )
            for user in users
        ],
        total=total,
        page=page,
        pages=pages
    )

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int,
    role_update: RoleUpdate,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user role (ADMIN only)
    """
    # Validate role
    valid_roles = ["PENDING", "USER", "ADMIN"]
    if role_update.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Get user
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update role
    user.role = role_update.role
    user.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(user)

    return {
        "message": "User role updated successfully",
        "user": UserListItem(
            id=user.id,
            username=user.username,
            username_kr=user.username_kr,
            username_en=user.username_en,
            email=user.email,
            role=user.role,
            department_kr=user.department_kr,
            department_en=user.department_en,
            is_active=user.is_active,
            last_login=user.last_login,
            created_at=user.created_at
        )
    }
