"""
Authentication API endpoints
"""
from fastapi import APIRouter, HTTPException, Depends, status, Query, Form, Request
from fastapi.responses import RedirectResponse, HTMLResponse
from pydantic import BaseModel
from jose import jwt, JWTError
from datetime import datetime, timedelta
from typing import Optional
from cryptography import x509
from cryptography.backends import default_backend
from cryptography.hazmat.primitives import serialization
import logging
import json
import os

from app.core.config import settings
from app.core.security import create_access_token, verify_token, get_db
from app.core.database import async_session_maker, User
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

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
    # Check if real SSO is enabled
    if settings.SSO_ENABLED and not settings.ENABLE_MOCK_SSO:
        # Real SSO URL with all required parameters
        import uuid
        nonce = str(uuid.uuid4())
        client_request_id = str(uuid.uuid4())

        sso_params = {
            "client_id": settings.SSO_CLIENT_ID,
            "redirect_uri": settings.SP_REDIRECT_URL,
            "response_mode": settings.SSO_RESPONSE_MODE,
            "response_type": settings.SSO_RESPONSE_TYPE,
            "scope": settings.SSO_SCOPE,
            "nonce": nonce,
            "client-request-id": client_request_id,
            "pullStatus": "0"
        }

        # Build query string
        query_string = "&".join([f"{k}={v}" for k, v in sso_params.items()])
        sso_url = f"{settings.IDP_ENTITY_ID}/?{query_string}"
    else:
        # Development mode - use mock SSO
        sso_url = f"{settings.IDP_ENTITY_ID}?redirect_uri={request.redirect_uri}"

    return LoginResponse(sso_login_url=sso_url)

@router.post("/callback/sso")
async def handle_sso_callback(
    id_token: str = Form(...),  # Form data from SSO form_post
    code: Optional[str] = Form(None),  # Optional authorization code
    db: AsyncSession = Depends(get_db)
):
    """
    Handle SSO callback with form_post and redirect to frontend.
    This endpoint receives the form_post from SSO and returns an HTML page
    that redirects to the frontend with the access token.
    """
    try:
        # Process the id_token (reuse logic from handle_callback)
        # Check if real SSO is enabled
        if settings.SSO_ENABLED and not settings.ENABLE_MOCK_SSO:
            # Real SSO - verify with certificate
            cert_file = settings.SSO_CERT_FILE
            if not os.path.exists(cert_file):
                logger.error(f"Certificate file not found: {cert_file}")
                return HTMLResponse(content=f"""
                    <html>
                        <body>
                            <script>
                                window.location.href = '/login?error=sso_config_error';
                            </script>
                        </body>
                    </html>
                """)

            # Load certificate and get public key
            with open(cert_file, 'rb') as f:
                cert_data = f.read()
                try:
                    cert_obj = x509.load_pem_x509_certificate(cert_data, default_backend())
                except:
                    cert_obj = x509.load_der_x509_certificate(cert_data, default_backend())
                public_key = cert_obj.public_key()

            # Decode and verify JWT with RS256
            try:
                id_payload = jwt.decode(
                    id_token,
                    public_key,
                    algorithms=["RS256"],
                    options={
                        "verify_signature": True,
                        "verify_exp": True,
                        "verify_aud": False
                    }
                )
            except Exception as e:
                logger.error(f"JWT verification failed: {e}")
                return HTMLResponse(content=f"""
                    <html>
                        <body>
                            <script>
                                window.location.href = '/login?error=invalid_token';
                            </script>
                        </body>
                    </html>
                """)
        else:
            # Development mode - decode without verification
            try:
                id_payload = jwt.decode(
                    id_token,
                    settings.JWT_SECRET_KEY,
                    algorithms=["HS256"],
                    options={
                        "verify_signature": False,
                        "verify_aud": False,
                        "verify_exp": True,
                        "verify_iat": False
                    }
                )
            except Exception as e:
                logger.error(f"JWT decode error: {e}")
                return HTMLResponse(content=f"""
                    <html>
                        <body>
                            <script>
                                window.location.href = '/login?error=invalid_token';
                            </script>
                        </body>
                    </html>
                """)

        # Extract user information
        username = id_payload.get("loginid")
        username_kr = id_payload.get("username")
        email = id_payload.get("mail")
        department_code = id_payload.get("deptid")
        department_kr = id_payload.get("deptname")
        department_en = id_payload.get("deptname_en", department_kr)

        if not username:
            return HTMLResponse(content=f"""
                <html>
                    <body>
                        <script>
                            window.location.href = '/login?error=invalid_user';
                        </script>
                    </body>
                </html>
            """)

        # Check if user exists
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            # New user - issue token with role="NEW"
            access_token = create_access_token(data={
                "sub": username,
                "role": "NEW",
                "department": department_code,
                "department_kr": department_kr,
                "department_en": department_en
            })

            # Redirect to signup request page
            return HTMLResponse(content=f"""
                <html>
                    <body>
                        <script>
                            // Store token in localStorage
                            const authData = {{
                                state: {{
                                    accessToken: "{access_token}",
                                    user: {{
                                        username: "{username}",
                                        username_kr: "{username_kr or ''}",
                                        email: "{email or ''}",
                                        department: "{department_code or ''}",
                                        department_kr: "{department_kr or ''}",
                                        department_en: "{department_en or ''}",
                                        role: "NEW"
                                    }}
                                }}
                            }};
                            localStorage.setItem('auth-storage', JSON.stringify(authData));
                            window.location.href = '/signup-request';
                        </script>
                    </body>
                </html>
            """)

        # Existing user - update last login
        user.last_login = datetime.utcnow()
        user.department = department_code
        user.department_kr = department_kr
        user.department_en = department_en
        await db.commit()

        # Create access token
        access_token = create_access_token(data={
            "sub": username,
            "role": user.role,
            "department": user.department,
            "department_kr": user.department_kr,
            "department_en": user.department_en
        })

        # Determine redirect path based on role
        redirect_path = '/hub'
        if user.role == 'PENDING':
            redirect_path = '/pending-approval'

        # Return HTML that stores token and redirects
        return HTMLResponse(content=f"""
            <html>
                <body>
                    <script>
                        // Store token in localStorage
                        const authData = {{
                            state: {{
                                accessToken: "{access_token}",
                                user: {{
                                    username: "{user.username}",
                                    username_kr: "{user.username_kr or ''}",
                                    email: "{user.email or ''}",
                                    department: "{user.department or ''}",
                                    department_kr: "{user.department_kr or ''}",
                                    department_en: "{user.department_en or ''}",
                                    role: "{user.role}"
                                }}
                            }}
                        }};
                        localStorage.setItem('auth-storage', JSON.stringify(authData));
                        window.location.href = '{redirect_path}';
                    </script>
                    <noscript>
                        <p>Processing authentication... Please enable JavaScript.</p>
                    </noscript>
                </body>
            </html>
        """)

    except Exception as e:
        logger.error(f"SSO callback error: {e}")
        return HTMLResponse(content=f"""
            <html>
                <body>
                    <script>
                        window.location.href = '/login?error=callback_failed';
                    </script>
                </body>
            </html>
        """)

@router.post("/callback", response_model=CallbackResponse)
async def handle_callback(
    request: Optional[CallbackRequest] = None,
    id_token: Optional[str] = Form(None),  # Form data for form_post
    db: AsyncSession = Depends(get_db)
):
    """Handle SSO callback with ID token (JSON API for backward compatibility)"""
    try:
        # Get id_token from either request body (JSON) or form data (form_post)
        token = None
        if request and request.id_token:
            token = request.id_token
        elif id_token:
            token = id_token
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Missing id_token in request"
            )

        # Check if real SSO is enabled
        if settings.SSO_ENABLED and not settings.ENABLE_MOCK_SSO:
            # Real SSO - verify with certificate
            cert_file = settings.SSO_CERT_FILE
            if not os.path.exists(cert_file):
                logger.error(f"Certificate file not found: {cert_file}")
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=f"SSO certificate not configured"
                )

            # Load certificate and get public key
            with open(cert_file, 'rb') as f:
                cert_data = f.read()

                # Try to load as PEM first, then DER
                try:
                    cert_obj = x509.load_pem_x509_certificate(cert_data, default_backend())
                except:
                    cert_obj = x509.load_der_x509_certificate(cert_data, default_backend())

                public_key = cert_obj.public_key()

            # Decode and verify JWT with RS256
            try:
                id_payload = jwt.decode(
                    token,
                    public_key,
                    algorithms=["RS256"],
                    options={
                        "verify_signature": True,
                        "verify_exp": True,
                        "verify_aud": False  # May need to configure based on SSO
                    }
                )
            except Exception as e:
                logger.error(f"JWT verification failed: {e}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid ID token: {str(e)}"
                )
        else:
            # Development mode - decode without verification
            try:
                id_payload = jwt.decode(
                    token,
                    settings.JWT_SECRET_KEY,
                    algorithms=["HS256"],
                    options={
                        "verify_signature": False,
                        "verify_aud": False,
                        "verify_exp": True,
                        "verify_iat": False
                    }
                )
            except Exception as e:
                print(f"JWT decode error: {e}")
                print(f"Token: {token}")
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid ID token: {str(e)}"
                )
        
        username = id_payload.get("loginid")
        username_kr = id_payload.get("username")
        email = id_payload.get("mail")
        department_code = id_payload.get("deptid")  # Language-neutral department ID from SSO
        department_kr = id_payload.get("deptname")
        department_en = id_payload.get("deptname_en", id_payload.get("deptname"))  # Fallback to kr if en not available
        
        if not username:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid ID token: missing username"
            )
        
        # Check if user exists
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalar_one_or_none()

        if not user:
            # New user - issue token with role="NEW" without creating DB entry
            # User will see signup request page
            access_token = create_access_token(data={
                "sub": username,
                "role": "NEW",
                "department": department_code,
                "department_kr": department_kr,
                "department_en": department_en
            })

            return CallbackResponse(
                access_token=access_token,
                expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                user={
                    "username": username,
                    "username_kr": username_kr,
                    "email": email,
                    "department": department_code,
                    "department_kr": department_kr,
                    "department_en": department_en,
                    "role": "NEW"
                }
            )

        # Existing user - update last login and department from SSO
        user.last_login = datetime.utcnow()
        user.department = department_code  # Update department code from SSO
        user.department_kr = department_kr
        user.department_en = department_en
        await db.commit()

        # Create access token with role and all department fields included
        access_token = create_access_token(data={
            "sub": username,
            "role": user.role,
            "department": user.department,
            "department_kr": user.department_kr,
            "department_en": user.department_en
        })

        return CallbackResponse(
            access_token=access_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            user={
                "username": user.username,
                "username_kr": user.username_kr,
                "email": user.email,
                "department": user.department,
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

@router.get("/logout")
@router.post("/logout")
async def logout():
    """Logout user and redirect to SSO logout if enabled"""
    if settings.SSO_ENABLED and not settings.ENABLE_MOCK_SSO:
        # Redirect to SSO logout URL
        if hasattr(settings, 'SP_LOGOUT_URL') and settings.SP_LOGOUT_URL:
            return RedirectResponse(url=settings.SP_LOGOUT_URL, status_code=302)

    # For mock SSO or no SSO, just return success
    return LogoutResponse(message="Successfully logged out")
