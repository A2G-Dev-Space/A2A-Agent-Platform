# 🔐 A2G Platform - 인증 및 보안 가이드

**문서 버전**: 2.0 (통합본)
**최종 수정일**: 2025년 10월 28일
**대상**: 전체 개발팀

---

## 📌 목차

1. [개요](#1-개요)
2. [SSO 통합 구현](#2-sso-통합-구현)
3. [JWT 토큰 관리](#3-jwt-토큰-관리)
4. [API 보안](#4-api-보안)
5. [WebSocket 보안](#5-websocket-보안)
6. [데이터 보안](#6-데이터-보안)
7. [환경별 보안 설정](#7-환경별-보안-설정)
8. [보안 체크리스트](#8-보안-체크리스트)

---

## 1. 개요

### 1.1 보안 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                    사용자 브라우저                       │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS/WSS
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  API Gateway (Nginx)                     │
│                  - SSL Termination                       │
│                  - Rate Limiting                         │
│                  - CORS Policy                           │
└─────────────────────────┬───────────────────────────────┘
                          │ JWT Bearer Token
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Backend Services                       │
│                  - JWT Validation                        │
│                  - RBAC Authorization                    │
│                  - Input Validation                      │
└─────────────────────────┬───────────────────────────────┘
                          │ Encrypted
                          ▼
┌─────────────────────────────────────────────────────────┐
│                      Database                            │
│                  - Encrypted at Rest                     │
│                  - Connection Pooling                    │
│                  - Access Control                        │
└─────────────────────────────────────────────────────────┘
```

### 1.2 보안 원칙

1. **Defense in Depth**: 다층 방어 전략
2. **Least Privilege**: 최소 권한 원칙
3. **Zero Trust**: 모든 요청 검증
4. **Secure by Default**: 기본 보안 설정

---

## 2. SSO 통합 구현

### 2.1 SSO 로그인 플로우

```
1. 사용자가 플랫폼 로그인 버튼 클릭
   ↓
2. Frontend → /api/auth/login/ 호출
   ↓
3. Backend가 SSO 서버로 리디렉션 URL 생성
   ↓
4. 사용자가 SSO 서버에서 인증
   ↓
5. SSO가 id_token과 함께 콜백
   ↓
6. Backend가 id_token 검증 및 JWT 발급
   ↓
7. Frontend가 JWT를 localStorage에 저장
```

### 2.2 환경 변수 설정

#### 사내망 (.env.internal)
```bash
# SSO 설정
IDP_ENTITY_ID="https://sso.company.com/auth/realms/master/protocol/openid-connect/auth"
IDP_CLIENT_ID="a2g-platform-prod"
IDP_CLIENT_SECRET="${VAULT_SSO_SECRET}"
SP_REDIRECT_URL="https://a2g-platform.company.com:9050/api/auth/callback/"
IDP_SIGNOUT_URL="https://sso.company.com/auth/realms/master/protocol/openid-connect/logout"
CERT_FILE="/app/certs/sso-prod.cer"

# JWT 설정
JWT_SECRET_KEY="${VAULT_JWT_SECRET}"
JWT_ALGORITHM="RS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=720  # 12시간
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7

# 관리자 목록
INITIAL_ADMIN_IDS="syngha.han,admin.user,team.lead"
```

#### 사외망 (.env.local)
```bash
# Mock SSO 설정
IDP_ENTITY_ID="http://localhost:9999/mock-sso/login"
IDP_CLIENT_ID="mock-client-id"
SP_REDIRECT_URL="http://localhost:9050/api/auth/callback/"
IDP_SIGNOUT_URL="http://localhost:9999/mock-sso/logout"

# JWT 설정 (개발용)
JWT_SECRET_KEY="local-dev-secret-key-change-in-production"
JWT_ALGORITHM="HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=1440  # 24시간 (개발 편의)
```

### 2.3 User Service 인증 구현

#### User 모델 (SQLAlchemy)
```python
from sqlalchemy import Column, Integer, String, Enum, DateTime
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    PENDING = "PENDING"  # 승인 대기
    USER = "USER"        # 일반 사용자
    ADMIN = "ADMIN"      # 관리자

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)  # SSO loginid
    username_kr = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PENDING)
    department_kr = Column(String)
    department_en = Column(String)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

#### SSO 콜백 처리 (FastAPI)
```python
from fastapi import APIRouter, Request, HTTPException
from app.core.config import settings
from app.core.security import create_access_token
import jwt

router = APIRouter()

@router.post("/api/auth/callback/")
async def sso_callback(request: Request, db: Session = Depends(get_db)):
    """SSO 콜백 처리 및 JWT 토큰 발급"""

    # 1. id_token 추출
    form_data = await request.form()
    id_token = form_data.get("id_token") or request.query_params.get("id_token")

    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    # 2. 환경에 따른 토큰 검증
    try:
        if "localhost:9999" in settings.IDP_ENTITY_ID:
            # Mock SSO (개발 환경)
            decoded = jwt.decode(
                id_token,
                "mock-sso-secret-key-12345",
                algorithms=["HS256"],
                options={"verify_aud": False, "verify_signature": False}
            )
        else:
            # Real SSO (운영 환경)
            with open(settings.CERT_FILE, "rb") as cert_file:
                public_key = cert_file.read()

            decoded = jwt.decode(
                id_token,
                public_key,
                algorithms=["RS256"],
                audience=settings.IDP_CLIENT_ID
            )
    except jwt.PyJWTError as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # 3. 사용자 정보 추출
    user_info = {
        "username": decoded.get("loginid"),
        "username_kr": decoded.get("username"),
        "email": decoded.get("mail"),
        "department_kr": decoded.get("deptname"),
        "department_en": decoded.get("deptname_en")
    }

    # 4. 사용자 프로비저닝
    user = db.query(User).filter(User.username == user_info["username"]).first()

    if not user:
        # 신규 사용자 생성
        user = User(**user_info)

        # 관리자 여부 확인
        if user_info["username"] in settings.INITIAL_ADMIN_IDS.split(","):
            user.role = UserRole.ADMIN
        else:
            user.role = UserRole.PENDING

        db.add(user)
        db.commit()
    else:
        # 기존 사용자 정보 업데이트
        user.last_login = func.now()
        db.commit()

    # 5. JWT 토큰 생성
    access_token = create_access_token(
        data={
            "sub": user.username,
            "role": user.role.value,
            "email": user.email
        }
    )

    return {
        "access_token": access_token,
        "token_type": "Bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": {
            "username": user.username,
            "username_kr": user.username_kr,
            "email": user.email,
            "role": user.role.value
        }
    }
```

### 2.4 JWT 토큰 생성 및 검증

```python
# app/core/security.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """JWT Access Token 생성"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire, "type": "access"})

    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM
    )

    return encoded_jwt

def verify_token(token: str) -> dict:
    """JWT 토큰 검증"""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM]
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
```

### 2.5 인증 미들웨어

```python
# app/middleware/auth.py
from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.security import verify_token

class JWTBearer(HTTPBearer):
    """JWT Bearer 인증 미들웨어"""

    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)

        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Invalid authentication scheme.")

            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Invalid token or expired token.")

            return credentials.credentials
        else:
            raise HTTPException(status_code=403, detail="Invalid authorization code.")

    def verify_jwt(self, jwtoken: str) -> bool:
        isTokenValid: bool = False

        try:
            payload = verify_token(jwtoken)
        except:
            payload = None

        if payload:
            isTokenValid = True

        return isTokenValid
```

---

## 3. JWT 토큰 관리

### 3.1 토큰 구조

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user.id",          // 사용자 ID
    "role": "USER",             // 사용자 권한
    "email": "user@example.com",
    "exp": 1234567890,          // 만료 시간
    "iat": 1234567890,          // 발급 시간
    "type": "access"            // 토큰 타입
  },
  "signature": "..."
}
```

### 3.2 토큰 저장 전략

#### Frontend (localStorage)
```javascript
// 토큰 저장
const saveToken = (token) => {
  localStorage.setItem('accessToken', token);
};

// 토큰 가져오기
const getToken = () => {
  return localStorage.getItem('accessToken');
};

// 토큰 삭제
const removeToken = () => {
  localStorage.removeItem('accessToken');
};

// Axios 인터셉터 설정
axios.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
```

### 3.3 토큰 갱신 전략

```python
@router.post("/api/auth/refresh/")
async def refresh_token(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """토큰 갱신"""

    # 새 access token 생성
    new_token = create_access_token(
        data={
            "sub": current_user.username,
            "role": current_user.role.value,
            "email": current_user.email
        }
    )

    return {
        "access_token": new_token,
        "token_type": "Bearer",
        "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
    }
```

---

## 4. API 보안

### 4.1 RBAC (Role-Based Access Control)

```python
from functools import wraps
from fastapi import Depends, HTTPException

def require_role(allowed_roles: list):
    """역할 기반 접근 제어 데코레이터"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user = kwargs.get('current_user')

            if not current_user:
                raise HTTPException(status_code=401, detail="Authentication required")

            if current_user.role not in allowed_roles:
                raise HTTPException(
                    status_code=403,
                    detail=f"Insufficient permissions. Required roles: {allowed_roles}"
                )

            return await func(*args, **kwargs)
        return wrapper
    return decorator

# 사용 예시
@router.get("/api/admin/users/")
@require_role([UserRole.ADMIN])
async def get_all_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """관리자만 접근 가능한 API"""
    return db.query(User).all()
```

### 4.2 입력 검증 (Pydantic)

```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    department: Optional[str] = None

    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('.', '').replace('_', '').isalnum():
            raise ValueError('Username must be alphanumeric with dots and underscores only')
        if len(v) < 3 or len(v) > 20:
            raise ValueError('Username must be between 3 and 20 characters')
        return v

    class Config:
        schema_extra = {
            "example": {
                "username": "john.doe",
                "email": "john.doe@example.com",
                "department": "AI Team"
            }
        }
```

### 4.3 Rate Limiting

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

# Limiter 생성
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["100 per minute"]
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# API에 적용
@router.post("/api/agents/")
@limiter.limit("10 per minute")  # 분당 10회 제한
async def create_agent(request: Request):
    pass
```

### 4.4 CORS 설정

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:9060",  # Frontend 개발 서버
        "https://localhost:9050",  # API Gateway
        "https://a2g-platform.company.com"  # 운영 도메인
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "Authorization",
        "X-Request-ID",
        "X-Trace-ID"
    ],
    expose_headers=["X-Total-Count", "X-Page-Number"],
    max_age=3600
)
```

---

## 5. WebSocket 보안

### 5.1 WebSocket 인증 미들웨어

```python
# app/middleware/websocket_auth.py
from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from app.core.security import verify_token

class TokenAuthMiddleware(BaseMiddleware):
    """WebSocket JWT 인증 미들웨어"""

    async def __call__(self, scope, receive, send):
        # Query string에서 토큰 추출
        query_string = scope.get("query_string", b"").decode()
        params = dict(param.split("=") for param in query_string.split("&") if "=" in param)
        token = params.get("token")

        if token:
            try:
                # 토큰 검증
                payload = verify_token(token)
                scope["user"] = await self.get_user(payload["sub"])
            except Exception:
                scope["user"] = AnonymousUser()
        else:
            scope["user"] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @database_sync_to_async
    def get_user(self, username):
        from app.models import User
        try:
            return User.objects.get(username=username)
        except User.DoesNotExist:
            return AnonymousUser()
```

### 5.2 WebSocket 연결 보안

```python
# app/websocket/chat.py
from fastapi import WebSocket, WebSocketDisconnect, Query, HTTPException

class ConnectionManager:
    def __init__(self):
        self.active_connections: dict = {}

    async def connect(self, websocket: WebSocket, session_id: str, token: str):
        """WebSocket 연결 수락"""
        try:
            # 토큰 검증
            payload = verify_token(token)
            user_id = payload["sub"]

            # 세션 권한 확인
            if not await self.has_session_access(user_id, session_id):
                await websocket.close(code=4003, reason="Access denied")
                return

            # 연결 수락
            await websocket.accept()
            self.active_connections[session_id] = {
                "websocket": websocket,
                "user_id": user_id
            }

        except Exception as e:
            await websocket.close(code=4001, reason="Authentication failed")

    async def has_session_access(self, user_id: str, session_id: str) -> bool:
        """세션 접근 권한 확인"""
        # DB에서 세션 소유자 확인
        session = await get_session(session_id)
        return session and session.user_id == user_id
```

---

## 6. 데이터 보안

### 6.1 민감 데이터 암호화

```python
from cryptography.fernet import Fernet
import base64
import os

class DataEncryption:
    """데이터 암호화 유틸리티"""

    def __init__(self):
        # 환경 변수에서 암호화 키 로드
        key = os.getenv("ENCRYPTION_KEY")
        if not key:
            # 개발 환경: 자동 생성
            key = Fernet.generate_key()

        self.cipher = Fernet(key)

    def encrypt(self, data: str) -> str:
        """문자열 암호화"""
        encrypted = self.cipher.encrypt(data.encode())
        return base64.urlsafe_b64encode(encrypted).decode()

    def decrypt(self, encrypted_data: str) -> str:
        """문자열 복호화"""
        data = base64.urlsafe_b64decode(encrypted_data.encode())
        decrypted = self.cipher.decrypt(data)
        return decrypted.decode()

# 사용 예시
encryption = DataEncryption()

# API Key 암호화 저장
api_key_encrypted = encryption.encrypt("sk_live_xxxxxxxxxxxxx")

# 복호화
api_key = encryption.decrypt(api_key_encrypted)
```

### 6.2 패스워드 해싱

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """패스워드 해싱"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """패스워드 검증"""
    return pwd_context.verify(plain_password, hashed_password)
```

### 6.3 SQL Injection 방지

```python
# ❌ 잘못된 예시 - SQL Injection 취약
@router.get("/api/users/search/")
async def search_users_bad(name: str, db: Session = Depends(get_db)):
    query = f"SELECT * FROM users WHERE username LIKE '%{name}%'"
    return db.execute(query).fetchall()

# ✅ 올바른 예시 - SQLAlchemy ORM 사용
@router.get("/api/users/search/")
async def search_users_good(name: str, db: Session = Depends(get_db)):
    return db.query(User).filter(
        User.username.contains(name)
    ).all()

# ✅ 올바른 예시 - 파라미터 바인딩
@router.get("/api/users/search/")
async def search_users_param(name: str, db: Session = Depends(get_db)):
    query = text("SELECT * FROM users WHERE username LIKE :name")
    return db.execute(query, {"name": f"%{name}%"}).fetchall()
```

### 6.4 XSS 방지

```python
import html
from markupsafe import Markup, escape

def sanitize_input(user_input: str) -> str:
    """사용자 입력 sanitization"""
    # HTML 엔티티 이스케이프
    sanitized = html.escape(user_input)

    # 추가 필터링 (필요시)
    dangerous_tags = ['script', 'iframe', 'object', 'embed']
    for tag in dangerous_tags:
        sanitized = sanitized.replace(f'<{tag}', f'&lt;{tag}')
        sanitized = sanitized.replace(f'</{tag}>', f'&lt;/{tag}&gt;')

    return sanitized

# Jinja2 템플릿에서 자동 이스케이프
# templates/message.html
"""
<div class="message">
  {{ message_content | e }}  <!-- 자동 이스케이프 -->
</div>
"""
```

---

## 7. 환경별 보안 설정

### 7.1 Nginx SSL/TLS 설정

```nginx
# nginx/nginx.conf
server {
    listen 9050 ssl http2;
    server_name localhost;

    # SSL 인증서
    ssl_certificate /etc/nginx/certs/server.crt;
    ssl_certificate_key /etc/nginx/certs/server.key;

    # SSL 프로토콜 및 암호화
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # 보안 헤더
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';" always;

    # Rate Limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    # API Gateway 프록시
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket 프록시
    location /ws/ {
        proxy_pass http://websocket;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

upstream backend {
    server host.docker.internal:8001;  # User Service
    server host.docker.internal:8002;  # Agent Service
    server host.docker.internal:8003;  # Chat Service
    server host.docker.internal:8004;  # Tracing Service
    server host.docker.internal:8005;  # Admin Service
}

upstream websocket {
    server host.docker.internal:8003;  # Chat Service WebSocket
}
```

### 7.2 Docker Compose 보안 설정

```yaml
# docker-compose.yml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "9050:9050"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    networks:
      - a2g_network
    security_opt:
      - no-new-privileges:true
    read_only: true
    tmpfs:
      - /var/run
      - /var/cache/nginx

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_PASSWORD_FILE: /run/secrets/db_password
    secrets:
      - db_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - a2g_network
    security_opt:
      - no-new-privileges:true

  redis:
    image: redis:7-alpine
    command: redis-server --requirepass ${REDIS_PASSWORD}
    networks:
      - a2g_network
    security_opt:
      - no-new-privileges:true

secrets:
  db_password:
    file: ./secrets/db_password.txt

networks:
  a2g_network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16

volumes:
  postgres_data:
    driver: local
```

---

## 8. 보안 체크리스트

### 8.1 개발 단계

- [ ] 환경 변수 파일 (.env) Git 제외 확인
- [ ] 모든 API에 인증 미들웨어 적용
- [ ] 입력 검증 (Pydantic Schema) 구현
- [ ] SQL Injection 방지 (ORM 사용)
- [ ] XSS 방지 (출력 이스케이프)
- [ ] CORS 설정 확인
- [ ] Rate Limiting 적용
- [ ] 민감 데이터 암호화

### 8.2 테스트 단계

- [ ] 인증 우회 테스트
- [ ] 권한 상승 테스트
- [ ] SQL Injection 테스트
- [ ] XSS 테스트
- [ ] CSRF 테스트
- [ ] Rate Limiting 테스트
- [ ] WebSocket 인증 테스트

### 8.3 배포 단계

- [ ] SSL/TLS 인증서 설치
- [ ] HTTPS 강제 적용
- [ ] 보안 헤더 설정
- [ ] 로그 마스킹 확인
- [ ] 백업 암호화 설정
- [ ] 모니터링 알림 설정
- [ ] 침입 탐지 시스템 설정

### 8.4 운영 단계

- [ ] 정기 보안 패치
- [ ] 로그 모니터링
- [ ] 이상 접근 패턴 감지
- [ ] 토큰 만료 정책 검토
- [ ] 권한 검토 (분기별)
- [ ] 보안 감사 (연 1회)

---

## 📚 보안 Best Practices

### DO's ✅

1. **항상 HTTPS 사용**: 모든 통신 암호화
2. **최소 권한 원칙**: 필요한 권한만 부여
3. **정기적 업데이트**: 의존성 패키지 최신 유지
4. **로그 모니터링**: 이상 패턴 조기 발견
5. **다단계 인증**: 가능한 경우 MFA 적용
6. **암호 정책**: 강력한 패스워드 정책 적용

### DON'Ts ❌

1. **하드코딩 금지**: 시크릿을 코드에 포함하지 않음
2. **디버그 모드 금지**: 운영 환경에서 DEBUG=false
3. **기본값 사용 금지**: 기본 패스워드/키 변경
4. **과도한 권한 금지**: 불필요한 ADMIN 권한 부여 금지
5. **로그 노출 금지**: 민감 정보를 로그에 기록하지 않음

---

## 🔗 참고 자료

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [FastAPI Security](https://fastapi.tiangolo.com/tutorial/security/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [Docker Security Best Practices](https://docs.docker.com/develop/security-best-practices/)

---

**© 2025 A2G Platform Development Team**