# Infra Service - Frontend 연동 가이드

## 📋 개요

Infra Service는 Mock SSO 및 인프라 설정을 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. Mock SSO (사외망 개발용)

#### 1.1 Mock 로그인 페이지
```
GET /mock-sso/login?redirect_uri=https://localhost:9050/api/auth/callback/
```

**Response:** HTML 로그인 페이지 (사용자 선택)

#### 1.2 Mock 인증
```
POST /mock-sso/authenticate
Content-Type: application/x-www-form-urlencoded

username=syngha.han
redirect_uri=https://localhost:9050/api/auth/callback/
```

**Response:** Redirect to callback with id_token

#### 1.3 Mock 로그아웃
```
GET /mock-sso/logout
```

**Response:**
```json
{
  "message": "Mock logout successful"
}
```

### 2. Health Check

```
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "service": "mock-sso"
}
```

## 🧪 테스트 시나리오

### 시나리오 1: Mock SSO 로그인 (사외망)
1. Frontend에서 "로그인" 버튼 클릭
2. `/api/auth/login/` → Mock SSO로 리디렉션
3. Mock SSO 페이지에서 사용자 선택:
   - 한승하 (ADMIN)
   - 김개발 (USER)
   - 테스트 (PENDING)
4. 사용자 클릭 시 id_token 생성
5. User Service `/api/auth/callback/`로 리디렉션
6. Frontend로 token 전달

## 📁 초기 폴더 구조

```
infra-service/
├── mock-sso/
│   ├── main.py             # FastAPI Mock SSO
│   ├── templates/
│   │   └── login.html      # 로그인 UI
│   ├── requirements.txt    # FastAPI, PyJWT, Jinja2
│   └── Dockerfile
├── docker-compose/
│   ├── docker-compose.external.yml  # 사외망용
│   └── docker-compose.internal.yml  # 사내망용
└── README.md
```

## 🔑 Mock 사용자 목록

```python
MOCK_USERS = {
    "syngha.han": {
        "loginid": "syngha.han",
        "username": "한승하",
        "mail": "syngha.han@samsung.com",
        "deptname": "AI Platform Team",
    },
    "biend.i": {
        "loginid": "biend.i",
        "username": "김개발",
        "mail": "biend.i@samsung.com",
        "deptname": "Backend Team",
    },
    "test.user": {
        "loginid": "test.user",
        "username": "테스트",
        "mail": "test.user@samsung.com",
        "deptname": "QA Team",
    },
}
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] Mock SSO 로그인 페이지가 표시되는가?
- [ ] 사용자 선택 시 로그인이 정상적으로 작동하는가?
- [ ] ADMIN 사용자로 로그인 시 모든 기능에 접근 가능한가?
- [ ] PENDING 사용자로 로그인 시 승인 대기 페이지가 표시되는가?
- [ ] Mock 로그아웃이 정상적으로 작동하는가?
