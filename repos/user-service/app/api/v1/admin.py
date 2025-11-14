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
    last_login: Optional[datetime]
    created_at: Optional[datetime]

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
    # Prevent admin from changing their own role
    if user_id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change your own role"
        )

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
            last_login=user.last_login,
            created_at=user.created_at
        )
    }


@router.get("/users/count")
async def get_users_count(
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get total number of approved users (ADMIN only)

    Excludes PENDING users who haven't been approved yet.
    """
    result = await db.execute(
        select(func.count(User.id)).where(User.role != "PENDING")
    )
    count = result.scalar()

    return {"count": count}


@router.get("/users/monthly-growth")
async def get_users_monthly_growth(
    months: int = Query(12, ge=1, le=24, description="Number of months to retrieve"),
    group_by: str = Query("month", regex="^(week|month)$", description="Group by week or month"),
    admin_user: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user growth statistics (ADMIN only)

    Returns cumulative user count at the end of each period (week or month) for the last N periods
    """
    from sqlalchemy import extract, text
    from datetime import datetime, timedelta
    from dateutil.relativedelta import relativedelta

    # Generate list of periods to show
    now = datetime.utcnow()
    periods = []

    if group_by == "week":
        # Generate last N weeks
        for i in range(months):
            week_start = now - timedelta(weeks=i)
            periods.append(week_start.strftime("%Y-W%U"))
    else:
        # Generate last N months
        for i in range(months):
            month_date = now - relativedelta(months=i)
            periods.append(month_date.strftime("%Y-%m"))

    periods.reverse()  # Oldest first

    # Query cumulative count for each period
    monthly_data = []

    for period in periods:
        if group_by == "week":
            # Parse week string (e.g., "2025-W45")
            year, week = period.split("-W")
            # Calculate end of week
            # This is approximate - using 7 days from start of week
            import datetime as dt
            period_end = dt.datetime.strptime(f"{year}-W{week}-0", "%Y-W%U-%w") + timedelta(days=7)
        else:
            # Parse month string (e.g., "2025-11")
            year, month = map(int, period.split("-"))
            # End of month
            if month == 12:
                period_end = datetime(year + 1, 1, 1)
            else:
                period_end = datetime(year, month + 1, 1)

        # Count approved users created up to this period (exclude PENDING users)
        count_query = select(func.count(User.id)).where(
            User.created_at < period_end,
            User.role != "PENDING"
        )

        result = await db.execute(count_query)
        count = result.scalar() or 0

        monthly_data.append({
            "month": period if group_by == "month" else period,
            "count": count
        })

    return {
        "months": months,
        "group_by": group_by,
        "data": monthly_data
    }
