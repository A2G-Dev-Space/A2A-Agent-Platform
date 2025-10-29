# 👤 User Service

**담당자**: DEV1 (한승하)
**포트**: 8001
**설명**: 인증, 권한부여 및 사용자 관리 서비스

## 🚀 빠른 시작

```bash
# 1. 환경 설정
uv venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
uv sync

# 2. 설정 파일 작성
cp .env.example .env.local
# .env.local을 설정에 맞게 편집하세요

# 3. 데이터베이스 설정
alembic init alembic  # 첫 실행 시만
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head

# 4. 서비스 실행
uvicorn app.main:app --reload --port 8001

# 5. 헬스 체크
curl http://localhost:8001/health
```

## 📚 API 문서

실행 후 다음을 방문하세요: http://localhost:8001/docs

## 🧪 Frontend에서 테스트

### 1. 인증 흐름 테스트
```javascript
// http://localhost:9060의 브라우저 콘솔에서
const testAuth = async () => {
  // 로그인 시작
  const loginRes = await fetch('/api/auth/login/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      redirect_uri: 'http://localhost:9060/callback'
    })
  });
  const { sso_login_url } = await loginRes.json();
  console.log('SSO URL:', sso_login_url);

  // SSO 콜백 후 프로필 테스트
  const token = localStorage.getItem('accessToken');
  const profileRes = await fetch('/api/users/me/', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log('Profile:', await profileRes.json());
};

testAuth();
```

### 2. API 키 관리 테스트
```javascript
// API 키 생성
const createApiKey = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/api/users/me/api-keys/', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name: 'Dev Key' })
  });
  console.log('New API Key:', await res.json());
};
```

## 🔌 주요 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/auth/login/` | POST | SSO 로그인 시작 |
| `/api/auth/callback/` | POST | SSO 콜백 처리 |
| `/api/auth/logout/` | POST | 사용자 로그아웃 |
| `/api/auth/refresh/` | POST | JWT 토큰 갱신 |
| `/api/users/me/` | GET | 현재 사용자 프로필 조회 |
| `/api/users/me/` | PATCH | 사용자 프로필 수정 |
| `/api/users/me/api-keys/` | GET | 사용자 API 키 목록 |
| `/api/users/me/api-keys/` | POST | 새 API 키 생성 |
| `/api/users/me/api-keys/{id}/` | DELETE | API 키 삭제 |

## 🔐 환경 변수

```bash
# 서비스
SERVICE_NAME=user-service
SERVICE_PORT=8001

# 데이터베이스
DATABASE_URL=postgresql://dev_user:dev_password@localhost:5432/user_service_db

# Redis
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET_KEY=your-secret-key-change-in-production
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=720

# SSO (개발 - Mock)
IDP_ENTITY_ID=http://localhost:9999/mock-sso/login
IDP_CLIENT_ID=mock-client-id
SP_REDIRECT_URL=http://localhost:9050/api/auth/callback/
IDP_SIGNOUT_URL=http://localhost:9999/mock-sso/logout

# 관리자 사용자 (쉼표로 구분)
INITIAL_ADMIN_IDS=syngha.han,admin.user
```

## 📂 프로젝트 구조

```
user-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI 앱
│   ├── api/
│   │   └── v1/
│   │       ├── auth.py      # 인증 엔드포인트
│   │       └── users.py     # 사용자 관리 엔드포인트
│   ├── core/
│   │   ├── config.py        # 설정
│   │   ├── security.py      # JWT 및 비밀번호 해싱
│   │   └── dependencies.py  # 공통 의존성
│   ├── models/
│   │   └── user.py          # SQLAlchemy 모델
│   ├── schemas/
│   │   ├── auth.py          # 인증 스키마
│   │   └── user.py          # 사용자 스키마
│   └── services/
│       ├── auth_service.py  # 인증 비즈니스 로직
│       └── user_service.py  # 사용자 비즈니스 로직
├── tests/
│   ├── test_auth.py
│   └── test_users.py
├── alembic/                 # 데이터베이스 마이그레이션
├── .env.example
├── .env.local
├── pyproject.toml
└── README.md
```

## 🧪 테스트 실행

```bash
# 모든 테스트 실행
pytest

# 커버리지와 함께 실행
pytest --cov=app --cov-report=html

# 특정 테스트 실행
pytest tests/test_auth.py::test_login_flow
```

## 🐛 일반적인 문제

### 1. SSO 리다이렉트가 작동하지 않음
- `.env.local`에서 `SP_REDIRECT_URL` 확인
- Mock SSO가 포트 9999에서 실행 중인지 확인
- CORS 설정에 Frontend URL이 포함되어 있는지 확인

### 2. JWT 토큰 유효하지 않음
- 모든 서비스의 `JWT_SECRET_KEY`가 일치하는지 확인
- 토큰이 만료되지 않았는지 확인
- 시스템 시간 동기화 확인

### 3. 데이터베이스 연결 실패
- PostgreSQL이 실행 중인지 확인
- `.env.local`에서 `DATABASE_URL` 확인
- 데이터베이스가 없으면 생성:
  ```sql
  CREATE DATABASE user_service_db;
  ```

## 📞 지원

- **담당자**: DEV1 (한승하)
- **Slack**: #a2g-platform-dev
- **이메일**: syngha.han@company.com
