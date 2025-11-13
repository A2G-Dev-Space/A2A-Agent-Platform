"""
V1 User Management API endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

from app.core.database import async_session_maker, User
from app.core.security import require_admin, get_db, get_current_user
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class UserManagementInfo(BaseModel):
    id: int
    name: str
    email: str
    department: str
    role: str
    status: str

class UserInvite(BaseModel):
    email: EmailStr
    role: str
    username_kr: Optional[str] = None
    username_en: Optional[str] = None
    department_kr: Optional[str] = None
    department_en: Optional[str] = None

@router.get("/", response_model=List[UserManagementInfo])
async def list_users(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """List all active users for management (ADMIN only)"""
    # Return active users and PENDING users
    result = await db.execute(
        select(User)
        .where((User.is_active == True) | (User.role == "PENDING"))
    )
    users = result.scalars().all()

    # Custom sorting: PENDING first, then ADMIN (by department), then USER (by department)
    def sort_key(user):
        # Priority: PENDING=0, ADMIN=1, USER=2
        if user.role == "PENDING":
            priority = 0
        elif user.role == "ADMIN":
            priority = 1
        elif user.role == "USER":
            priority = 2
        else:
            priority = 3

        # Sort by: priority, then department, then name
        dept = user.department_kr or user.department_en or "Unassigned"
        name = user.username_kr or user.username
        return (priority, dept, name)

    sorted_users = sorted(users, key=sort_key)

    return [
        UserManagementInfo(
            id=user.id,
            name=user.username_kr or user.username,
            email=user.email,
            department=user.department_kr or user.department_en or "Unassigned",
            role=user.role,
            status="Active" if user.is_active else "Inactive"
        )
        for user in sorted_users
    ]

@router.post("/invite/", response_model=UserManagementInfo)
async def invite_user(
    invite: UserInvite,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Invite a new user (ADMIN only)"""
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == invite.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists"
        )

    # Validate role
    valid_roles = ["PENDING", "USER", "ADMIN"]
    if invite.role not in valid_roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role. Must be one of: {', '.join(valid_roles)}"
        )

    # Generate username from email
    username = invite.email.split("@")[0]

    # Create new user
    new_user = User(
        username=username,
        username_kr=invite.username_kr,
        username_en=invite.username_en,
        email=invite.email,
        department_kr=invite.department_kr,
        department_en=invite.department_en,
        role=invite.role,
        is_active=True
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return UserManagementInfo(
        id=new_user.id,
        name=new_user.username_kr or new_user.username,
        email=new_user.email,
        department=new_user.department_kr or new_user.department_en or "Unassigned",
        role=new_user.role,
        status="Active" if new_user.is_active else "Inactive"
    )

@router.put("/{user_id}/approve/")
async def approve_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Approve a user's registration (ADMIN only)"""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Update user role from PENDING to USER
    if user.role == "PENDING":
        user.role = "USER"
        user.is_active = True
        user.updated_at = datetime.utcnow()
        await db.commit()

    return {"message": f"User {user_id} approved successfully"}

@router.put("/{user_id}/reject/")
async def reject_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Reject a user's registration (ADMIN only)"""
    # Prevent admin from rejecting themselves
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot reject your own account"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Set role to REJECTED so they can reapply
    user.role = "REJECTED"
    user.is_active = True  # Keep active so they can see signup request page
    user.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": f"User {user_id} rejected successfully"}

@router.delete("/{user_id}/remove/")
async def remove_user(
    user_id: int,
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """Remove/ban a user by deactivating their account (ADMIN only)"""
    # Prevent admin from removing themselves
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot remove your own account"
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Deactivate user
    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()

    return {"message": f"User {user_id} removed successfully"}

@router.post("/signup-request/")
async def signup_request(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Submit signup request - creates or updates user to PENDING status
    Can be called by NEW or REJECTED users
    """
    # Check if user already exists in database
    result = await db.execute(select(User).where(User.username == current_user.username))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        # User exists (was REJECTED) - update to PENDING
        if existing_user.role != "REJECTED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User already has an active signup request"
            )

        existing_user.role = "PENDING"
        existing_user.is_active = True
        existing_user.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing_user)

        return {
            "message": "Signup request submitted successfully",
            "user": {
                "username": existing_user.username,
                "username_kr": existing_user.username_kr,
                "email": existing_user.email,
                "role": existing_user.role
            }
        }

    # New user - create in database with PENDING status
    new_user = User(
        username=current_user.username,
        username_kr=getattr(current_user, 'username_kr', current_user.username),
        username_en=getattr(current_user, 'username_en', None),
        email=getattr(current_user, 'email', f"{current_user.username}@company.com"),
        department_kr=getattr(current_user, 'department_kr', None),
        department_en=getattr(current_user, 'department_en', None),
        role="PENDING",
        is_active=True,
        last_login=datetime.utcnow()
    )

    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    return {
        "message": "Signup request submitted successfully",
        "user": {
            "username": new_user.username,
            "username_kr": new_user.username_kr,
            "email": new_user.email,
            "role": new_user.role
        }
    }
