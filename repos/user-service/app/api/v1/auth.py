"""
Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional

from app.core.config import settings
from app.core.security import create_access_token, verify_token, get_db
from app.core.database import async_session_maker, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()

class LoginRequest(BaseModel):
    redirect_uri: str

class LoginResponse(BaseModel):
    sso_login_url: str

class CallbackRequest(BaseModel):
    id_token: str

class CallbackResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: dict

class LogoutResponse(BaseModel):
    message: str

@router.post("/login", response_model=LoginResponse)
async def initiate_login(request: LoginRequest):
    """Initiate SSO login process"""
    # In development, redirect to mock SSO
    sso_url = f"{settings.IDP_ENTITY_ID}?redirect_uri={request.redirect_uri}"

    return LoginResponse(sso_login_url=sso_url)

@router.post("/callback", response_model=CallbackResponse)
async def handle_callback(
    request: Optional[CallbackRequest] = None,
    id_token: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Handle SSO callback with ID token"""
    try:
        # Get id_token from either request body or query parameter
        token = None
        if request and request.id_token:
            token = request.id_token
        elif id_token:
            token = id_token
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing id_token in request body or query parameter"
            )
        
        # Decode ID token (in production, verify signature)
        try:
            id_payload = jwt.decode(
                token, 
                settings.JWT_SECRET_KEY,  # Use configured secret
                algorithms=["HS256"],
                options={
                    "verify_signature": False,  # Skip signature verification in dev
                    "verify_aud": False,       # Skip audience verification in dev
                    "verify_exp": True,        # Still verify expiration
                    "verify_iat": False        # Skip issued at verification in dev
                }
            )
        except Exception as e:
            print(f"JWT decode error: {e}")
            print(f"Token: {token}")
            print(f"Secret: {settings.JWT_SECRET_KEY}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid ID token: {str(e)}"
            )
        
        username = id_payload.get("loginid")
        username_kr = id_payload.get("username")
        email = id_payload.get("mail")
        department_kr = id_payload.get("deptname")
        department_en = id_payload.get("deptname")  # Same value for now
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID token: missing username"
            )
        
        # Check if user exists, create if not
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()
        
        if not user:
            # Create new user with PENDING status (requires admin approval)
            user = User(
                username=username,
                username_kr=username_kr,
                email=email,
                department_kr=department_kr,
                department_en=department_en,
                role="PENDING",  # New users start as PENDING
                last_login=datetime.utcnow()
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
        else:
            # Update last login
            user.last_login = datetime.utcnow()
            await db.commit()

        # Create access token with role included
        access_token = create_access_token(data={"sub": username, "role": user.role})

        return CallbackResponse(
            access_token=access_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "username": user.username,
                "username_kr": user.username_kr,
                "email": user.email,
                "department_kr": user.department_kr,
                "department_en": user.department_en,
                "role": user.role
            }
        )
        
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid ID token"
        )

@router.post("/logout", response_model=LogoutResponse)
async def logout():
    """Logout user (token invalidation would be handled by client)"""
    return LogoutResponse(message="Successfully logged out")
