# 🔧 Mock Services 구현 가이드

**문서 버전**: 1.0
**최종 수정일**: 2025년 10월 27일
**목적**: 사외망 개발을 위한 Mock SSO, DB, Redis 서비스 구현

---

## 1. 📋 개요

이 문서는 사외망에서 사내 인프라(SSO, DB, Redis)를 대체할 Mock 서비스의 구현 방법을 설명합니다.

### 1.1 Mock Services 목록

| 서비스명 | 목적 | 기술 스택 | 포트 |
|---------|------|----------|------|
| Mock SSO | 사내 SSO 인증 시뮬레이션 | FastAPI (Python) | 9999 |
| PostgreSQL | 로컬 개발용 DB | PostgreSQL 15 | 5432 |
| Redis | 메시지 브로커/캐시 | Redis 7 | 6379 |

### 1.2 설계 원칙

1. **API 호환성**: 실제 서비스와 동일한 API 인터페이스 제공
2. **간소화**: 인증 로직은 최소화하고, 테스트 데이터는 하드코딩
3. **독립성**: Docker Compose로 한 번에 실행 가능
4. **환경 전환**: `.env` 파일만 교체하면 Real 서비스로 전환 가능

---

## 2. 🔐 Mock SSO Service 구현

### 2.1 요구사항

SSO_GUIDE.md에서 정의한 SSO 연동 흐름을 시뮬레이션해야 합니다:
1. `/mock-sso/login` → 로그인 페이지 (사용자 선택)
2. `/mock-sso/callback` → id_token 발급 (JWT, 서명 없음)
3. 사용자 정보: `loginid`, `username`, `mail`, `deptname` 등

### 2.2 프로젝트 구조

```
infra/
└── mock-sso/
    ├── Dockerfile
    ├── main.py
    ├── requirements.txt
    ├── templates/
    │   └── login.html
    └── certs/
        └── mock-cert.cer
```

### 2.3 구현 코드

#### 2.3.1 `main.py` (FastAPI 서버)

```python
# infra/mock-sso/main.py

from fastapi import FastAPI, Request, Form
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
import jwt
import datetime
from typing import Optional

app = FastAPI(title="Mock SSO Service")
templates = Jinja2Templates(directory="templates")

# 하드코딩된 테스트 사용자 목록 (SSO_GUIDE.md 스펙 준수)
MOCK_USERS = {
    "syngha.han": {
        "loginid": "syngha.han",
        "username": "한승하",
        "username_en": "Seungha Han",
        "mail": "syngha.han@samsung.com",
        "deptname": "AI Platform Team",
        "deptname_en": "AI Platform Team",
    },
    "biend.i": {
        "loginid": "biend.i",
        "username": "김개발",
        "username_en": "Gaebal Kim",
        "mail": "biend.i@samsung.com",
        "deptname": "Backend Team",
        "deptname_en": "Backend Team",
    },
    "test.user": {
        "loginid": "test.user",
        "username": "테스트",
        "username_en": "Test User",
        "mail": "test.user@samsung.com",
        "deptname": "QA Team",
        "deptname_en": "QA Team",
    },
}

# JWT 시크릿 키 (Mock용 - 실제 검증 안 함)
JWT_SECRET = "mock-sso-secret-key-12345"

@app.get("/mock-sso/login", response_class=HTMLResponse)
async def mock_login(request: Request, redirect_uri: str):
    """
    가짜 로그인 페이지: 사용자 목록을 보여주고 선택하게 함
    """
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "users": MOCK_USERS,
            "redirect_uri": redirect_uri,
        }
    )

@app.post("/mock-sso/authenticate")
async def mock_authenticate(
    username: str = Form(...),
    redirect_uri: str = Form(...),
):
    """
    사용자 선택 후 id_token 생성 및 콜백 URL로 리디렉션
    """
    if username not in MOCK_USERS:
        return {"error": "Invalid user"}

    user_data = MOCK_USERS[username]

    # JWT id_token 생성 (RS256 대신 HS256 사용, 검증 없음)
    id_token = jwt.encode(
        {
            **user_data,
            "iss": "mock-sso",
            "aud": "a2g-platform",
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1),
            "iat": datetime.datetime.utcnow(),
        },
        JWT_SECRET,
        algorithm="HS256",
    )

    # 실제 SSO는 POST form_post로 리디렉션, Mock은 간단히 GET 쿼리로 전달
    return RedirectResponse(
        url=f"{redirect_uri}?id_token={id_token}",
        status_code=302,
    )

@app.get("/mock-sso/logout")
async def mock_logout():
    """
    가짜 로그아웃 (아무 작업 안 함)
    """
    return {"message": "Mock logout successful"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mock-sso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9999)
```

#### 2.3.2 `templates/login.html` (로그인 UI)

```html
<!-- infra/mock-sso/templates/login.html -->
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mock SSO Login</title>
    <style>
        body {
            font-family: 'Pretendard', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
        }
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0,0,0,0.2);
            max-width: 400px;
            width: 100%;
        }
        h1 {
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }
        .subtitle {
            text-align: center;
            color: #666;
            margin-bottom: 30px;
            font-size: 14px;
        }
        .user-card {
            border: 2px solid #e0e0e0;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
        }
        .user-card:hover {
            border-color: #667eea;
            background: #f8f9ff;
            transform: translateY(-2px);
        }
        .user-card h3 {
            margin: 0 0 8px 0;
            color: #333;
        }
        .user-card p {
            margin: 4px 0;
            color: #666;
            font-size: 13px;
        }
        button {
            display: none;
        }
    </style>
    <script>
        function selectUser(username) {
            document.getElementById('selected-user').value = username;
            document.getElementById('login-form').submit();
        }
    </script>
</head>
<body>
    <div class="login-container">
        <h1>🔐 Mock SSO</h1>
        <p class="subtitle">개발용 인증 서비스 - 사용자를 선택하세요</p>

        <form id="login-form" method="POST" action="/mock-sso/authenticate">
            <input type="hidden" name="redirect_uri" value="{{ redirect_uri }}">
            <input type="hidden" id="selected-user" name="username" value="">

            {% for user_id, user in users.items() %}
            <div class="user-card" onclick="selectUser('{{ user_id }}')">
                <h3>{{ user.username }} ({{ user.username_en }})</h3>
                <p><strong>ID:</strong> {{ user.loginid }}</p>
                <p><strong>Email:</strong> {{ user.mail }}</p>
                <p><strong>부서:</strong> {{ user.deptname }}</p>
            </div>
            {% endfor %}
        </form>
    </div>
</body>
</html>
```

#### 2.3.3 `Dockerfile`

```dockerfile
# infra/mock-sso/Dockerfile

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 9999

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "9999"]
```

#### 2.3.4 `requirements.txt`

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
pyjwt==2.8.0
jinja2==3.1.3
python-multipart==0.0.6
```

### 2.4 Backend 설정 변경

Mock SSO를 사용하도록 `backend/.env.external` 수정:

```bash
# backend/.env.external

# Mock SSO 엔드포인트
IDP_ENTITY_ID="http://localhost:9999/mock-sso/login"
IDP_CLIENT_ID="mock-client-id"
SP_REDIRECT_URL="https://localhost:9050/api/auth/callback/"
IDP_SIGNOUT_URL="http://localhost:9999/mock-sso/logout"

# Mock SSO는 JWT 검증을 하지 않으므로 CERT_FILE 불필요
# (또는 더미 인증서 사용)
```

**중요**: `backend/users/views.py`의 `sso_callback_view` 함수에서 Mock SSO 토큰 처리:

```python
# backend/users/views.py

@csrf_exempt
def sso_callback_view(request):
    # ... (기존 코드)

    # Mock SSO는 GET 쿼리로 id_token 전달
    id_token = request.GET.get("id_token") or request.POST.get("id_token")

    # Mock SSO는 HS256, Real SSO는 RS256
    if settings.IDP_ENTITY_ID.startswith("http://localhost:9999"):
        # Mock SSO 모드
        decoded_token = jwt.decode(
            id_token,
            "mock-sso-secret-key-12345",  # Mock SSO의 JWT_SECRET과 동일
            algorithms=["HS256"],
            options={"verify_aud": False, "verify_signature": False},
        )
    else:
        # Real SSO 모드 (기존 로직)
        with open(settings.CERT_FILE, "rb") as cert_file:
            # ... (기존 RS256 검증)

    # ... (나머지 프로비저닝 로직 동일)
```

---

## 3. 🗄️ PostgreSQL (로컬 DB) 설정

### 3.1 Docker Compose 구성

```yaml
# infra/docker-compose/docker-compose.external.yml

version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: a2g_postgres_external
    environment:
      POSTGRES_DB: agent_dev_platform_local
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_external:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user -d agent_dev_platform_local"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data_external:
    driver: local
```

### 3.2 초기 데이터 시드 (선택 사항)

**개발자 간 일관된 테스트 데이터 제공**:

```sql
-- infra/mock-sso/init.sql (PostgreSQL 초기화 스크립트)

-- 테스트 사용자 자동 생성 (백엔드가 SSO 콜백으로 자동 생성하므로 불필요할 수 있음)
-- 필요시 LLMModel, RegisteredAgent 등 샘플 데이터 삽입

INSERT INTO platform_admin_llmmodel (name, endpoint, api_key, is_active, health_status, created_at, updated_at)
VALUES
    ('GPT-4 (Mock)', 'http://mock-llm.local/v1', 'mock-api-key-gpt4', true, 'healthy', NOW(), NOW()),
    ('Claude-3 (Mock)', 'http://mock-llm.local/v1', 'mock-api-key-claude3', true, 'healthy', NOW(), NOW());
```

Docker Compose에서 실행:
```yaml
  postgres:
    # ... (기존 설정)
    volumes:
      - postgres_data_external:/var/lib/postgresql/data
      - ./init.sql:/docker-entrypoint-initdb.d/init.sql  # 초기화 스크립트
```

---

## 4. 📦 Redis (로컬) 설정

### 4.1 Docker Compose 구성

```yaml
# infra/docker-compose/docker-compose.external.yml

services:
  redis:
    image: redis:7-alpine
    container_name: a2g_redis_external
    command: redis-server --requirepass dev_redis_password --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data_external:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  redis_data_external:
    driver: local
```

### 4.2 Celery 설정

```python
# services/worker-service/celery.py (또는 backend/config/celery.py)

import os
from celery import Celery

# 환경 변수로부터 Redis 설정 로드
REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PASSWORD = os.getenv("REDIS_PASSWORD", "")

app = Celery(
    "worker",
    broker=f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:6379/0",
    backend=f"redis://:{REDIS_PASSWORD}@{REDIS_HOST}:6379/1",
)

app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()
```

---

## 5. 🚀 전체 실행 가이드

### 5.1 통합 Docker Compose

```yaml
# infra/docker-compose/docker-compose.external.yml (전체)

version: '3.8'

services:
  # Mock SSO
  mock-sso:
    build: ../mock-sso
    container_name: a2g_mock_sso
    ports:
      - "9999:9999"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9999/health"]
      interval: 10s
      timeout: 5s
      retries: 3

  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: a2g_postgres_external
    environment:
      POSTGRES_DB: agent_dev_platform_local
      POSTGRES_USER: dev_user
      POSTGRES_PASSWORD: dev_password
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_external:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dev_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: a2g_redis_external
    command: redis-server --requirepass dev_redis_password --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_data_external:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data_external:
  redis_data_external:

networks:
  default:
    name: a2g_external_network
```

### 5.2 실행 명령어

```bash
# Mock Services 시작
cd infra/docker-compose
docker-compose -f docker-compose.external.yml up -d

# 상태 확인
docker-compose -f docker-compose.external.yml ps

# 로그 확인
docker-compose -f docker-compose.external.yml logs -f mock-sso

# 중지
docker-compose -f docker-compose.external.yml down

# 데이터까지 삭제 (DB/Redis 초기화)
docker-compose -f docker-compose.external.yml down -v
```

---

## 6. 🧪 테스트 시나리오

### 6.1 Mock SSO 로그인 테스트

1. Frontend 실행: `http://localhost:9060`
2. "로그인" 버튼 클릭
3. Mock SSO 페이지로 리디렉션: `http://localhost:9999/mock-sso/login`
4. 사용자 선택 (예: "한승하")
5. Backend 콜백 처리 후 토큰 발급
6. Frontend 메인 페이지로 리디렉션 (로그인 완료)

**예상 결과**:
- WorkspaceHeader에 "한승하" 프로필 표시
- localStorage에 `accessToken` 저장됨
- useAuthStore의 `role`이 "ADMIN" 또는 "USER"로 설정

### 6.2 데이터베이스 연결 테스트

```bash
# PostgreSQL 컨테이너 접속
docker exec -it a2g_postgres_external psql -U dev_user -d agent_dev_platform_local

# 테이블 목록 확인
\dt

# 사용자 목록 조회
SELECT username, email, role FROM users_user;

# 종료
\q
```

### 6.3 Redis 연결 테스트

```bash
# Redis 컨테이너 접속
docker exec -it a2g_redis_external redis-cli

# 인증
AUTH dev_redis_password

# 키 확인
KEYS *

# 종료
exit
```

---

## 7. 🔄 사내망 전환 가이드

### 7.1 환경 변수 교체

**사외망 개발 완료 후 사내망 테스트**:

```bash
# 각 서비스의 .env 파일 교체
cd services/user-service
cp .env.internal .env

cd ../agent-service
cp .env.internal .env

# ... (모든 서비스 동일)
```

### 7.2 `.env.internal` 예시

```bash
# services/user-service/.env.internal

# 사내 SSO
IDP_ENTITY_ID="https://sso.company.com/auth/realms/master/protocol/openid-connect/auth"
IDP_CLIENT_ID="a2g-platform-prod"
SP_REDIRECT_URL="https://a2g-platform.company.com:9050/api/auth/callback/"
IDP_SIGNOUT_URL="https://sso.company.com/auth/realms/master/protocol/openid-connect/logout"

# 사내 DB
DB_HOST=a2g-db.company.com
DB_NAME=agent_development_platform
DB_USER=adp_prod
DB_PASSWORD=${SECRET_DB_PASSWORD}

# 사내 Redis
REDIS_HOST=redis.company.com
REDIS_PASSWORD=${SECRET_REDIS_PASSWORD}

# 사내 관리자 목록
INITIAL_ADMIN_IDS="syngha.han,admin.user"
```

### 7.3 전환 체크리스트

- [ ] 모든 서비스의 `.env` 파일을 `.env.internal`로 교체
- [ ] Mock Services 컨테이너 중지: `docker-compose -f docker-compose.external.yml down`
- [ ] 사내 DB 마이그레이션 실행: `python manage.py migrate`
- [ ] 사내 SSO 콜백 URL 등록 확인
- [ ] SSL 인증서 교체 (`certs/production.crt` 사용)
- [ ] 통합 테스트 실행
- [ ] 헬스 체크 확인: `curl https://a2g-platform.company.com:9050/health`

---

## 8. 🐛 트러블슈팅

### 8.1 Mock SSO 포트 충돌

**증상**: `Error starting userland proxy: listen tcp4 0.0.0.0:9999: bind: address already in use`
**해결**:
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :9999

# 프로세스 종료
kill -9 <PID>

# 또는 docker-compose.external.yml에서 포트 변경
ports:
  - "9998:9999"  # 호스트 포트를 9998로 변경
```

### 8.2 PostgreSQL 데이터 초기화 안됨

**증상**: Docker 볼륨에 이전 데이터가 남아있어 `init.sql`이 실행되지 않음
**해결**:
```bash
# 볼륨 삭제 후 재생성
docker-compose -f docker-compose.external.yml down -v
docker-compose -f docker-compose.external.yml up -d
```

### 8.3 JWT 토큰 검증 실패

**증상**: `jwt.exceptions.InvalidSignatureError: Signature verification failed`
**원인**: Mock SSO는 HS256, Real SSO는 RS256 사용
**해결**: `backend/users/views.py`에서 환경에 따라 알고리즘 분기 처리 (위 2.4 참조)

---

## 9. 📚 참고 자료

- [FastAPI 공식 문서](https://fastapi.tiangolo.com/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [PyJWT 문서](https://pyjwt.readthedocs.io/)

---

**문의**: syngha.han@samsung.com
