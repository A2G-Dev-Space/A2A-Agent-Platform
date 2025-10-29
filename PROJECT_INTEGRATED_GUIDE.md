# 🚀 A2G Agent Platform - 통합 개발 가이드

**문서 버전**: 4.0 (최종 통합본)
**최종 수정일**: 2025년 10월 29일
**개발 기간**: 6주 (Sprint 0-4)
**개발 인원**: 4명

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [빠른 시작](#2-빠른-시작)
3. [시스템 아키텍처](#3-시스템-아키텍처)
4. [기술 스택](#4-기술-스택)
5. [백엔드 개발 가이드](#5-백엔드-개발-가이드)
6. [인증 및 보안](#6-인증-및-보안)
7. [A2A 프로토콜](#7-a2a-프로토콜)
8. [Frontend 개발 가이드](#8-frontend-개발-가이드)
9. [테스트 전략](#9-테스트-전략)
10. [배포 가이드](#10-배포-가이드)
11. [문제 해결](#11-문제-해결)
12. [관련 문서](#12-관련-문서)

---

## 1. 프로젝트 개요

### 1.1 A2G Agent Platform이란?

**A2G(AI Agent Generation) Platform**은 개발자들이 **LLM 기반 에이전트를 개발, 테스트, 배포 및 모니터링**할 수 있는 통합 플랫폼입니다.

**비전:** "사내 모든 개발자가 쉽게 AI 에이전트를 개발하고 운영할 수 있는 통합 플랫폼"

### 1.2 주요 특징

- **멀티 프레임워크 지원**: Agno, ADK, Langchain, Custom 에이전트 통합
- **A2A 프로토콜**: 표준화된 Agent-to-Agent 통신 (JSON-RPC 2.0)
- **실시간 추적**: WebSocket 기반 실시간 로그 및 디버깅
- **지능형 추천**: Top-K 알고리즘 기반 에이전트 추천
- **사내/사외 개발**: Mock 서비스를 통한 독립적 개발 환경
- **3가지 모드**: Workbench (개발), Hub (사용), Flow (워크플로우)

### 1.3 팀 구성

| 개발자 | 담당 저장소 | 주요 책임 | 포트 |
|--------|-------------|-----------|------|
| **DEV1 (한승하)** | frontend, user-service | Frontend 전체, SSO 인증, Infra | 9060, 8001 |
| **DEV2 (이병주)** | admin-service, worker-service | LLM 관리, 통계, Celery | 8005, - |
| **DEV3 (김영섭)** | chat-service, tracing-service | WebSocket, 로그 추적 | 8003, 8004 |
| **DEV4 (안준형)** | agent-service | A2A Protocol, Top-K, pgvector | 8002 |

### 1.4 저장소 구조

```
repos/
├── user-service/       → DEV1: 인증 및 사용자 관리
├── agent-service/      → DEV4: 에이전트 레지스트리, Top-K
├── chat-service/       → DEV3: WebSocket 채팅
├── tracing-service/    → DEV3: 로그 수집 및 추적
├── admin-service/      → DEV2: LLM 관리, 통계
├── worker-service/     → DEV2: Celery 백그라운드 작업
├── api-gateway/        → 플랫폼 팀: Nginx 게이트웨이
└── infra/              → DEV1: Docker, Mock 서비스

frontend/               → DEV1: React 19 애플리케이션
```

**참고**: 각 서비스 README는 해당 폴더 안에 있으며, 완전한 API 명세, 데이터베이스 스키마, 테스트 예제를 포함합니다.

---

## 2. 빠른 시작

### 2.1 start-dev.sh 사용 (권장)

```bash
# 1. 저장소 클론
git clone --recursive https://github.com/A2G-Dev-Space/Agent-Platform-Development.git
cd Agent-Platform-Development

# 2. 초기 설정 (최초 1회만)
./start-dev.sh setup

# 3. 모든 서비스 시작
./start-dev.sh full

# 4. Frontend 실행 (별도 터미널)
cd frontend
npm install
npm run dev

# 5. 브라우저에서 접속
# http://localhost:9060
```

### 2.2 start-dev.sh 명령어

| 명령어 | 설명 |
|--------|------|
| `./start-dev.sh setup` | 데이터베이스 초기화 (처음 1회만) |
| `./start-dev.sh full` | 모든 백엔드 서비스 시작 |
| `./start-dev.sh minimal` | Gateway + SSO + DB만 시작 |
| `./start-dev.sh gateway` | Gateway와 DB만 시작 |
| `./start-dev.sh stop` | 모든 서비스 중지 |

### 2.3 서비스 포트 맵

| 서비스 | 포트 | URL | 담당자 |
|--------|------|-----|--------|
| Frontend | 9060 | http://localhost:9060 | DEV1 |
| API Gateway | 9050 | https://localhost:9050 | 플랫폼 팀 |
| User Service | 8001 | http://localhost:8001/docs | DEV1 |
| Agent Service | 8002 | http://localhost:8002/docs | DEV4 |
| Chat Service | 8003 | http://localhost:8003/docs | DEV3 |
| Tracing Service | 8004 | http://localhost:8004/docs | DEV3 |
| Admin Service | 8005 | http://localhost:8005/docs | DEV2 |
| Mock SSO | 9999 | http://localhost:9999 | DEV1 |

---

## 3. 시스템 아키텍처

### 3.1 전체 아키텍처

```
┌─────────────────────────────────────────────────────────┐
│                   사용자 브라우저                        │
│                    Port: 9060                            │
│         (React 19 + TypeScript + Tailwind CSS)           │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS/WSS
        ┌──────────────▼──────────────┐
        │   API Gateway (Nginx)       │
        │        Port: 9050           │
        │  - SSL Termination          │
        │  - Rate Limiting            │
        │  - CORS Policy              │
        └──────────┬──────────────────┘
                   │ JWT Bearer Token
    ┌──────────────┼──────────────────────────────────┐
    │              │                                   │
┌───▼───┐ ┌───────▼──────┐ ┌────────▼───────┐ ┌──────▼────┐
│User   │ │Agent Service │ │Chat Service    │ │Tracing    │
│Service│ │Port: 8002    │ │Port: 8003      │ │Service    │
│8001   │ │- A2A Protocol│ │- WebSocket     │ │Port: 8004 │
│- SSO  │ │- Top-K       │ │- Redis Pub/Sub │ │- Logs     │
│- JWT  │ │- pgvector    │ └────────────────┘ └───────────┘
└───────┘ └──────────────┘
┌──────────────┐ ┌────────────────┐
│Admin Service │ │Worker Service  │
│Port: 8005    │ │(Celery)        │
│- LLM 관리    │ │- Health Checks │
│- 통계        │ │- 통계 집계     │
└──────┬───────┘ └───────┬────────┘
       │                  │
    ┌──▼──────────────────▼───────────────┐
    │      PostgreSQL + Redis              │
    │  Ports: 5432, 6379                  │
    │  - 서비스별 독립 DB                  │
    │  - pgvector extension               │
    └──────────────────────────────────────┘
```

### 3.2 마이크로서비스 설계 원칙

1. **서비스별 독립 데이터베이스**: 각 서비스는 자체 DB 사용
2. **API 기반 통신**: HTTP/WebSocket을 통한 서비스 간 통신
3. **독립 배포**: 각 서비스를 개별적으로 배포 가능
4. **수평 확장**: 필요에 따라 서비스 인스턴스 증가 가능

### 3.3 데이터베이스 구조

```sql
-- 서비스별 데이터베이스
CREATE DATABASE user_service_db;       -- 사용자, 권한, API 키
CREATE DATABASE agent_service_db;      -- 에이전트, 벡터 임베딩
CREATE DATABASE chat_service_db;       -- 채팅 세션, 메시지
CREATE DATABASE tracing_service_db;    -- 로그, 추적 정보
CREATE DATABASE admin_service_db;      -- LLM 모델, 통계

-- Agent Service용 pgvector 확장
\c agent_service_db
CREATE EXTENSION IF NOT EXISTS vector;
```

---

## 4. 기술 스택

### 4.1 Frontend

| 항목 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **Framework** | React | 19.0.0 | UI 프레임워크 |
| **Language** | TypeScript | 5.6.3 | 타입 안전성 |
| **Build Tool** | Vite | 6.0.5 | 빌드 및 개발 서버 |
| **State Management** | Zustand | - | 경량 상태 관리 |
| **Styling** | Tailwind CSS | v4 | 유틸리티 기반 스타일링 |
| **Router** | React Router | 7.1.1 | 클라이언트 라우팅 |
| **WebSocket** | Socket.IO Client | - | 실시간 통신 |
| **HTTP Client** | Axios | - | API 호출 |
| **Data Fetching** | React Query | - | 서버 상태 관리 |

### 4.2 Backend

| 항목 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **Framework** | FastAPI | 0.104.0 | 웹 프레임워크 |
| **Language** | Python | 3.11+ | 백엔드 언어 |
| **Package Manager** | UV | - | 패키지 관리 (pip/poetry 대신) |
| **ORM** | SQLAlchemy | 2.0.23 | 데이터베이스 ORM |
| **Migration** | Alembic | - | DB 마이그레이션 |
| **Task Queue** | Celery | 5.3.4 | 비동기 작업 |
| **Validation** | Pydantic | 2.5.0 | 데이터 검증 |
| **Vector Search** | pgvector | - | 벡터 유사도 검색 |
| **LLM** | LangChain | - | LLM 통합 |

### 4.3 Infrastructure

| 항목 | 기술 | 버전 | 용도 |
|------|------|------|------|
| **Container** | Docker | - | 컨테이너화 |
| **Orchestration** | Docker Compose | - | 다중 컨테이너 관리 |
| **API Gateway** | Nginx | alpine | 요청 라우팅, SSL |
| **Database** | PostgreSQL | 15-alpine | 관계형 데이터베이스 |
| **Cache/Broker** | Redis | 7-alpine | 캐시 및 메시지 브로커 |
| **Monitoring** | Flower | 2.0.1 | Celery 모니터링 |

---

## 5. 백엔드 개발 가이드

### 5.1 표준 프로젝트 구조

모든 백엔드 서비스는 동일한 구조를 따릅니다:

```
{service-name}/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 엔트리포인트
│   ├── database.py             # DB 연결 설정
│   ├── models.py               # SQLAlchemy 모델
│   ├── schemas.py              # Pydantic 스키마
│   ├── core/
│   │   ├── config.py           # 환경 변수 설정
│   │   ├── security.py         # JWT, 암호화
│   │   └── dependencies.py     # FastAPI Dependencies
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   ├── auth.py     # 인증 엔드포인트
│   │       │   └── agents.py   # 에이전트 엔드포인트
│   │       └── router.py       # API 라우터
│   ├── services/               # 비즈니스 로직
│   └── utils/                  # 유틸리티 함수
├── alembic/                    # DB 마이그레이션
├── tests/
│   ├── unit/
│   └── integration/
├── .env.local                  # 로컬 환경 변수
├── .env.internal               # 사내망 환경 변수
├── pyproject.toml              # UV 패키지 설정
└── README.md                   # 서비스 문서
```

### 5.2 FastAPI 애플리케이션 초기화

**app/main.py**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.router import api_router

app = FastAPI(
    title=f"{settings.SERVICE_NAME} API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# API 라우터 등록
app.include_router(api_router, prefix="/api")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": settings.SERVICE_NAME}
```

### 5.3 환경 변수 설정

**app/core/config.py**
```python
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    # Service
    SERVICE_NAME: str
    SERVICE_PORT: int = 8000
    DEBUG: bool = False

    # Database
    DATABASE_URL: str

    # Redis
    REDIS_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 720  # 12시간

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:9060",
        "https://localhost:9050"
    ]

    class Config:
        env_file = ".env.local"
        case_sensitive = True

settings = Settings()
```

### 5.4 데이터베이스 설정

**app/database.py**
```python
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Engine 생성
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)

# Session Factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base 클래스
Base = declarative_base()

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

### 5.5 SQLAlchemy 모델 예시

**app/models.py**
```python
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Enum, JSON
from sqlalchemy.sql import func
from app.database import Base
import enum

class UserRole(str, enum.Enum):
    PENDING = "PENDING"
    USER = "USER"
    ADMIN = "ADMIN"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    username_kr = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(Enum(UserRole), default=UserRole.PENDING)
    department_kr = Column(String)
    department_en = Column(String)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
```

### 5.6 Pydantic 스키마 예시

**app/schemas.py**
```python
from pydantic import BaseModel, EmailStr, validator
from typing import Optional
from datetime import datetime

class UserBase(BaseModel):
    username: str
    email: EmailStr
    department_kr: Optional[str] = None

class UserCreate(UserBase):
    @validator('username')
    def username_alphanumeric(cls, v):
        if not v.replace('.', '').replace('_', '').isalnum():
            raise ValueError('Username must be alphanumeric')
        return v

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True  # SQLAlchemy 2.0
```

### 5.7 API 엔드포인트 예시

**app/api/v1/endpoints/users.py**
```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User
from app.schemas import UserResponse
from typing import List

router = APIRouter()

@router.get("/users/", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """사용자 목록 조회"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    db: Session = Depends(get_db)
):
    """특정 사용자 조회"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
```

### 5.8 서비스별 구현 세부사항

각 서비스의 상세한 구현 가이드는 해당 서비스 README를 참조하세요:

- [User Service README](repos/user-service/README.md) - SSO 인증, JWT, API 키 관리
- [Agent Service README](repos/agent-service/README.md) - A2A Protocol, Top-K, pgvector
- [Chat Service README](repos/chat-service/README.md) - WebSocket, Redis Pub/Sub
- [Tracing Service README](repos/tracing-service/README.md) - 로그 수집, Agent Transfer 감지
- [Admin Service README](repos/admin-service/README.md) - LLM 모델 관리, 통계
- [Worker Service README](repos/worker-service/README.md) - Celery 태스크, 스케줄링

---

## 6. 인증 및 보안

### 6.1 SSO 통합 구현

A2G Platform은 회사 SSO를 사용하여 사용자를 인증합니다.

#### 로그인 플로우

```
1. 사용자가 로그인 버튼 클릭
   ↓
2. Frontend → /api/auth/login/ 호출
   ↓
3. Backend가 SSO 리디렉션 URL 생성
   ↓
4. 사용자가 SSO 서버에서 인증
   ↓
5. SSO가 id_token과 함께 콜백
   ↓
6. Backend가 id_token 검증 및 JWT 발급
   ↓
7. Frontend가 JWT를 localStorage에 저장
```

#### SSO 콜백 처리

**app/api/v1/endpoints/auth.py**
```python
from fastapi import APIRouter, Request, HTTPException
from app.core.security import create_access_token, verify_sso_token
from app.models import User, UserRole
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()

@router.post("/auth/callback/")
async def sso_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    """SSO 콜백 처리 및 JWT 토큰 발급"""

    # 1. id_token 추출
    form_data = await request.form()
    id_token = form_data.get("id_token")

    if not id_token:
        raise HTTPException(status_code=400, detail="Missing id_token")

    # 2. id_token 검증
    try:
        user_info = verify_sso_token(id_token)
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Invalid token: {str(e)}")

    # 3. 사용자 프로비저닝
    user = db.query(User).filter(User.username == user_info["username"]).first()

    if not user:
        user = User(
            username=user_info["username"],
            username_kr=user_info["username_kr"],
            email=user_info["email"],
            department_kr=user_info.get("department_kr"),
            role=UserRole.PENDING  # 기본값
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    # 4. JWT 토큰 생성
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
        "expires_in": 43200,  # 12시간
        "user": {
            "username": user.username,
            "role": user.role.value
        }
    }
```

### 6.2 JWT 토큰 관리

**app/core/security.py**
```python
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from fastapi import HTTPException
from app.core.config import settings

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

### 6.3 RBAC (Role-Based Access Control)

**app/core/dependencies.py**
```python
from fastapi import Depends, HTTPException, Header
from app.core.security import verify_token
from app.models import User, UserRole
from sqlalchemy.orm import Session
from app.database import get_db

async def get_current_user(
    authorization: str = Header(...),
    db: Session = Depends(get_db)
) -> User:
    """현재 사용자 확인"""
    try:
        token = authorization.replace("Bearer ", "")
        payload = verify_token(token)
        username = payload.get("sub")

        user = db.query(User).filter(User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        return user
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid authentication")

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """관리자 권한 확인"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
```

### 6.4 보안 체크리스트

#### 개발 단계
- [ ] 환경 변수 파일 (.env) Git 제외 확인
- [ ] 모든 API에 인증 미들웨어 적용
- [ ] 입력 검증 (Pydantic Schema) 구현
- [ ] SQL Injection 방지 (ORM 사용)
- [ ] XSS 방지 (출력 이스케이프)
- [ ] CORS 설정 확인
- [ ] Rate Limiting 적용

#### 배포 단계
- [ ] SSL/TLS 인증서 설치
- [ ] HTTPS 강제 적용
- [ ] 보안 헤더 설정
- [ ] 민감 데이터 암호화
- [ ] 로그 마스킹 확인

---

## 7. A2A 프로토콜

### 7.1 A2A Protocol 개요

**A2A (Agent-to-Agent) Protocol**은 다양한 프레임워크의 에이전트들이 통신할 수 있도록 하는 표준 인터페이스입니다.

- **기반**: JSON-RPC 2.0
- **전송**: HTTP POST
- **인증**: Bearer Token

### 7.2 A2A 요청/응답 형식

#### 요청 (Request)

```json
{
  "jsonrpc": "2.0",
  "method": "agent.execute",
  "params": {
    "task": "고객 문의 분석",
    "context": {
      "user_id": "test.user",
      "session_id": "session-uuid-123",
      "trace_id": "trace-uuid-789"
    },
    "config": {
      "temperature": 0.7,
      "max_tokens": 2000
    }
  },
  "id": "request-001"
}
```

#### 응답 (Response)

```json
{
  "jsonrpc": "2.0",
  "result": {
    "status": "success",
    "output": "분석 결과...",
    "metadata": {
      "execution_time": 1250,
      "tokens_used": 450
    }
  },
  "id": "request-001"
}
```

### 7.3 지원 프레임워크

| 프레임워크 | 엔드포인트 형식 | 어댑터 필요 |
|------------|----------------|-------------|
| **Agno** | `http://agno.company.com/{agent-name}/agent` | 예 |
| **ADK** | `http://adk.company.com/{agent-name}` | 예 |
| **Langchain** | `http://agent-name.langchain.com/execute` | 예 |
| **Custom** | 사용자 정의 | 선택 |

### 7.4 A2A 어댑터 구현 예시

**app/a2a/adapters.py**
```python
import httpx
from typing import Dict, Any

class A2AAdapter:
    """A2A Protocol 기본 어댑터"""

    async def execute(self, endpoint: str, request: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                endpoint,
                json=request,
                headers={"Content-Type": "application/json"},
                timeout=30
            )
            return response.json()

class AgnoAdapter(A2AAdapter):
    """Agno 프레임워크 어댑터"""

    def format_request(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Agno 형식으로 변환"""
        return {
            "action": request["params"]["task"],
            "parameters": request["params"]["context"]
        }

    def format_response(self, response: Dict[str, Any]) -> Dict[str, Any]:
        """표준 A2A 형식으로 변환"""
        return {
            "jsonrpc": "2.0",
            "result": {
                "status": "success",
                "output": response.get("result"),
                "metadata": response.get("metadata", {})
            }
        }
```

### 7.5 Agent Service 통합

**app/api/v1/endpoints/a2a.py**
```python
from fastapi import APIRouter, Depends, HTTPException
from app.a2a.adapters import AgnoAdapter, ADKAdapter, LangchainAdapter
from app.models import Agent
from sqlalchemy.orm import Session
from app.database import get_db

router = APIRouter()

@router.post("/a2a/execute/{agent_id}")
async def execute_agent(
    agent_id: int,
    request: dict,
    db: Session = Depends(get_db)
):
    """A2A Protocol을 통한 에이전트 실행"""

    # 에이전트 조회
    agent = db.query(Agent).filter(Agent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    # 프레임워크별 어댑터 선택
    adapter_map = {
        "Agno": AgnoAdapter(),
        "ADK": ADKAdapter(),
        "Langchain": LangchainAdapter()
    }

    adapter = adapter_map.get(agent.framework)
    if not adapter:
        raise HTTPException(status_code=400, detail="Unsupported framework")

    # 요청 변환 및 실행
    formatted_request = adapter.format_request(request)
    response = await adapter.execute(agent.a2a_endpoint, formatted_request)

    return adapter.format_response(response)
```

---

## 8. Frontend 개발 가이드

### 8.1 Frontend 개요

Frontend는 React 19 + TypeScript로 구현된 SPA입니다. 상세한 UI/UX 디자인, 컴포넌트 구조, 상태 관리는 **[frontend/README.md](frontend/README.md)**를 참조하세요.

### 8.2 3가지 모드

| 모드 | URL | 색상 테마 | 용도 |
|------|-----|----------|------|
| **Workbench** | `/workbench` | 보라색 (#E9D5FF) | 에이전트 개발 및 테스트 |
| **Hub** | `/hub` | 파란색 (#E0F2FE) | 프로덕션 에이전트 탐색 |
| **Flow** | `/flow` | 청록색 (#CCFBF1) | 다중 에이전트 워크플로우 |

### 8.3 상태 관리 (Zustand)

**src/stores/authStore.ts**
```typescript
import { create } from 'zustand';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  login: (token, user) => {
    localStorage.setItem('accessToken', token);
    set({ accessToken: token, user });
  },
  logout: () => {
    localStorage.removeItem('accessToken');
    set({ accessToken: null, user: null });
  }
}));
```

### 8.4 API 서비스 레이어

**src/services/api.ts**
```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:9050',
  headers: {
    'Content-Type': 'application/json'
  }
});

// 인터셉터: 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
```

### 8.5 WebSocket 통합

**src/services/websocket.ts**
```typescript
import { io, Socket } from 'socket.io-client';

class WebSocketService {
  private socket: Socket | null = null;

  connect(sessionId: string, token: string) {
    this.socket = io(`ws://localhost:8003/ws/${sessionId}`, {
      query: { token }
    });

    this.socket.on('message', (data) => {
      console.log('Received:', data);
    });
  }

  sendMessage(content: string) {
    this.socket?.emit('message', { type: 'message', content });
  }

  disconnect() {
    this.socket?.disconnect();
  }
}

export default new WebSocketService();
```

---

## 9. 테스트 전략

### 9.1 브라우저 콘솔 테스트

모든 API는 브라우저 콘솔에서 즉시 테스트 가능합니다.

#### 인증 테스트
```javascript
// 로그인 확인
const token = localStorage.getItem('accessToken');
console.log('Token:', token);

// 현재 사용자 조회
fetch('/api/auth/me', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.log);
```

#### 에이전트 CRUD 테스트
```javascript
const token = localStorage.getItem('accessToken');

// 에이전트 생성
fetch('/api/agents', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'Test Agent',
    framework: 'Langchain',
    description: 'Created from console'
  })
}).then(r => r.json()).then(console.log);

// 에이전트 목록
fetch('/api/agents', {
  headers: { 'Authorization': `Bearer ${token}` }
}).then(r => r.json()).then(console.table);
```

#### WebSocket 테스트
```javascript
const token = localStorage.getItem('accessToken');
const ws = new WebSocket(`ws://localhost:8003/ws/test-session?token=${token}`);

ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.send(JSON.stringify({ type: 'message', content: 'Hello!' }));
```

### 9.2 cURL 테스트

```bash
TOKEN="your-jwt-token"

# 헬스 체크
curl http://localhost:8001/health

# 사용자 목록
curl http://localhost:8001/api/users/ \
  -H "Authorization: Bearer $TOKEN"

# 에이전트 생성
curl -X POST http://localhost:8002/api/agents/ \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Agent",
    "framework": "Langchain",
    "description": "Test"
  }'
```

### 9.3 Pytest 단위 테스트

**tests/unit/test_auth.py**
```python
import pytest
from app.core.security import create_access_token, verify_token

def test_create_access_token():
    """JWT 토큰 생성 테스트"""
    data = {"sub": "test.user", "role": "USER"}
    token = create_access_token(data)

    assert token is not None
    assert isinstance(token, str)

def test_verify_token():
    """JWT 토큰 검증 테스트"""
    data = {"sub": "test.user", "role": "USER"}
    token = create_access_token(data)
    payload = verify_token(token)

    assert payload["sub"] == "test.user"
    assert payload["role"] == "USER"
```

**tests/integration/test_api.py**
```python
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    """헬스 체크 테스트"""
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_users():
    """사용자 목록 조회 테스트"""
    # 테스트 토큰 생성
    token = create_test_token()

    response = client.get(
        "/api/users/",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

### 9.4 Frontend 테스트 체크리스트

- [ ] SSO 로그인 가능
- [ ] 토큰이 localStorage에 저장됨
- [ ] 사용자 정보가 올바르게 표시됨
- [ ] 에이전트 CRUD 작동
- [ ] WebSocket 연결 성공
- [ ] Top-K 추천 표시
- [ ] 3가지 모드 전환 가능
- [ ] 브라우저 콘솔에 오류 없음

---

## 10. 배포 가이드

### 10.1 Docker 이미지 빌드

각 서비스는 독립적으로 Docker 이미지를 빌드합니다.

**Dockerfile 예시**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# UV 설치
RUN pip install uv

# 의존성 설치
COPY pyproject.toml .
RUN uv pip install --system .

# 애플리케이션 복사
COPY app/ ./app/

# 포트 노출
EXPOSE 8001

# 실행
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

```bash
# 이미지 빌드
docker build -t a2g-user-service:latest .

# 태깅
docker tag a2g-user-service:latest registry.company.com/a2g-user-service:v1.0.0

# 푸시
docker push registry.company.com/a2g-user-service:v1.0.0
```

### 10.2 Docker Compose 배포

```yaml
version: '3.8'

services:
  user-service:
    image: registry.company.com/a2g-user-service:v1.0.0
    environment:
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET_KEY: ${JWT_SECRET_KEY}
    ports:
      - "8001:8001"
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres_data:
```

### 10.3 성능 목표

| 작업 유형 | P50 | P95 | P99 |
|-----------|-----|-----|-----|
| 단순 조회 | 50ms | 200ms | 500ms |
| 복잡 조회 | 200ms | 500ms | 1s |
| Top-K 추천 | 500ms | 1s | 2s |
| LLM 호출 | 2s | 5s | 10s |

**동시 처리 목표:**
- 동시 사용자: 1,000명
- 초당 요청: 500 RPS
- WebSocket 연결: 5,000개

---

## 11. 문제 해결

### 11.1 자주 발생하는 문제

#### "Connection refused" 에러
**증상**: 데이터베이스 연결 실패
**해결**:
```bash
docker ps | grep postgres
docker start a2g-postgres-dev
```

#### "Database does not exist" 에러
**증상**: 데이터베이스를 찾을 수 없음
**해결**:
```bash
./start-dev.sh setup  # 데이터베이스 재생성
```

#### Alembic 마이그레이션 충돌
**증상**: 여러 개발자의 마이그레이션 충돌
**해결**:
```bash
git pull origin main
alembic merge -m "Merge migrations"
alembic upgrade head
```

#### JWT 토큰 검증 실패
**증상**: Invalid signature error
**해결**: 모든 서비스가 동일한 `JWT_SECRET_KEY` 사용하는지 확인

### 11.2 디버깅 팁

```bash
# Docker 로그 확인
docker logs -f a2g-user-service

# Python 로그 레벨 설정
LOG_LEVEL=debug uvicorn app.main:app

# 데이터베이스 직접 확인
docker exec -it a2g-postgres-dev psql -U dev_user -d user_service_db
\dt
SELECT * FROM users;
```

---

## 12. 관련 문서

### 12.1 프로젝트 문서

- [PROJECT_OVERVIEW.md](PROJECT_OVERVIEW.md) - 프로젝트 전체 개요
- [WSL_DEVELOPMENT_SETUP.md](WSL_DEVELOPMENT_SETUP.md) - WSL2 개발 환경 설정

### 12.2 서비스별 문서

- [User Service README](repos/user-service/README.md) - 인증/권한 API 상세
- [Agent Service README](repos/agent-service/README.md) - A2A Protocol, Top-K 알고리즘
- [Chat Service README](repos/chat-service/README.md) - WebSocket, Redis Pub/Sub
- [Tracing Service README](repos/tracing-service/README.md) - 로그 수집, Agent Transfer
- [Admin Service README](repos/admin-service/README.md) - LLM 관리, 통계 API
- [Worker Service README](repos/worker-service/README.md) - Celery 태스크, 스케줄링
- [API Gateway README](repos/api-gateway/README.md) - Nginx 설정
- [Frontend README](frontend/README.md) - React 애플리케이션, UI/UX 가이드

### 12.3 외부 참고 자료

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/)
- [React 19 Documentation](https://react.dev/)
- [pgvector Guide](https://github.com/pgvector/pgvector)
- [Celery Documentation](https://docs.celeryq.dev/)

---

## 📞 지원 및 문의

- **Slack**: #a2g-platform-dev
- **프로젝트 리드**: syngha.han@company.com (DEV1)
- **GitHub**: https://github.com/A2G-Dev-Space

---

**© 2025 A2G Platform Development Team. All rights reserved.**
