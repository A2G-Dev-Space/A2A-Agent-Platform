# User Service - Frontend 연동 가이드

## 📋 개요

User Service는 사용자 인증, API Key 관리, 사용자 관리 기능을 담당합니다.

## 🔗 Frontend가 호출하는 API

### 1. SSO 인증

#### 1.1 로그인 시작
```
GET /api/auth/login/
```
- 사용자를 IdP 로그인 페이지로 리디렉션합니다.
- Frontend에서는 window.location.href로 호출합니다.

#### 1.2 SSO 콜백
```
POST /api/auth/callback/
```
- IdP로부터 id_token을 받아 검증하고 내부 JWT를 발급합니다.
- Frontend는 이 엔드포인트를 직접 호출하지 않으며, IdP가 자동으로 리디렉션합니다.

**Response:**
```json
{
  "redirect_url": "http://localhost:9060/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### 1.3 로그아웃
```
GET /api/auth/logout/
```
- Django 세션을 파기하고 IdP 로그아웃 페이지로 리디렉션합니다.

### 2. API Key 관리

#### 2.1 API Key 목록 조회
```
GET /api/auth/api-keys/
Authorization: Bearer {accessToken}
```

**Response:**
```json
[
  {
    "id": 1,
    "name": "My API Key",
    "key": "a2g_abc123def456...",
    "is_active": true,
    "created_at": "2025-10-27T10:00:00Z",
    "last_used_at": "2025-10-27T11:30:00Z"
  }
]
```

#### 2.2 활성 API Key 조회
```
GET /api/auth/api-keys/active/
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "id": 1,
  "name": "My API Key",
  "key": "a2g_abc123def456...",
  "is_active": true,
  "created_at": "2025-10-27T10:00:00Z"
}
```

#### 2.3 API Key 생성
```
POST /api/auth/api-keys/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "name": "Workbench API Key"
}
```

**Response:**
```json
{
  "id": 2,
  "name": "Workbench API Key",
  "key": "a2g_xyz789ghi012...",
  "is_active": true,
  "created_at": "2025-10-27T12:00:00Z"
}
```

#### 2.4 API Key 삭제
```
DELETE /api/auth/api-keys/{id}/
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "message": "API key deleted successfully"
}
```

### 3. 사용자 관리 (ADMIN 전용)

#### 3.1 사용자 목록 조회
```
GET /api/auth/users/
Authorization: Bearer {accessToken}
```

**Query Parameters:**
- `role`: PENDING | USER | ADMIN
- `dept`: 부서명 (선택)

**Response:**
```json
[
  {
    "id": 1,
    "username": "syngha.han",
    "username_kr": "한승하",
    "email": "syngha.han@samsung.com",
    "deptname_kr": "AI Platform Team",
    "role": "ADMIN",
    "created_at": "2025-10-20T09:00:00Z"
  },
  {
    "id": 2,
    "username": "test.user",
    "username_kr": "테스트",
    "email": "test.user@samsung.com",
    "deptname_kr": "Dev Team",
    "role": "PENDING",
    "created_at": "2025-10-27T10:00:00Z"
  }
]
```

#### 3.2 사용자 역할 변경
```
PATCH /api/auth/users/{id}/
Authorization: Bearer {accessToken}
Content-Type: application/json

{
  "role": "USER"
}
```

**Response:**
```json
{
  "id": 2,
  "username": "test.user",
  "role": "USER",
  "message": "User role updated successfully"
}
```

#### 3.3 사용자 삭제
```
DELETE /api/auth/users/{id}/
Authorization: Bearer {accessToken}
```

**Response:**
```json
{
  "message": "User deleted successfully"
}
```

## 💻 Frontend 실제 구현 세부사항

### 1. State Management (Zustand)

#### useAuthStore (`frontend/src/store/useAuthStore.ts`)
사용자 인증 상태를 관리하는 전역 스토어입니다.

**주요 상태:**
- `user`: User | null - 현재 로그인한 사용자 정보
- `accessToken`: string | null - JWT 액세스 토큰
- `isAuthenticated`: boolean - 인증 여부
- `role`: UserRole | null - 사용자 역할 (PENDING | USER | ADMIN)

**주요 함수:**
- `checkAuthAndLogin(token)`: JWT를 디코딩하여 사용자 정보를 추출하고 localStorage에 저장
- `logout()`: localStorage에서 토큰 제거 및 상태 초기화

**사용 위치:**
- `Layout.tsx`: SSO 콜백 처리 (`?token=...` query parameter 감지)
- `Header.tsx`: 로그아웃 버튼
- `PendingApprovalPage.tsx`: PENDING 사용자 처리

#### useApiKeyStore (`frontend/src/store/useApiKeyStore.ts`)
API Key 관리 상태를 담당하는 스토어입니다.

**주요 상태:**
- `apiKeys`: APIKey[] - 사용자의 모든 API Key 목록
- `activeApiKey`: APIKey | null - 현재 활성 API Key

**주요 함수:**
- `fetchApiKeys()`: GET `/api/auth/api-keys/` 호출
- `fetchActiveApiKey()`: GET `/api/auth/api-keys/active/` 호출
- `createApiKey()`: POST `/api/auth/api-keys/` 호출
- `deleteApiKey(keyId)`: DELETE `/api/auth/api-keys/{keyId}/` 호출

**사용 위치:**
- `ApiKeysSettings.tsx`: API Key 관리 페이지
- `TraceCapturePanel.tsx`: Workbench에서 활성 API Key 표시

### 2. 컴포넌트별 API 호출

#### Layout (`frontend/src/components/layout/Layout.tsx`)
**기능:** SSO 콜백 처리 및 인증 체크

```typescript
// SSO 콜백에서 token을 받아 처리
useEffect(() => {
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  if (token) {
    checkAuthAndLogin(token);  // useAuthStore에서 제공
    window.history.replaceState({}, document.title, location.pathname);
    fetchActiveApiKey();  // useApiKeyStore에서 제공
  }
}, [location.search]);

// PENDING 사용자는 승인 대기 페이지로 리디렉션
if (user?.role === 'PENDING') {
  return <PendingApprovalPage />;
}
```

**API 호출:** 없음 (토큰 디코딩만 수행)

#### Header (`frontend/src/components/layout/Header.tsx`)
**기능:** 사용자 정보 표시 및 로그아웃

```typescript
const handleLogout = () => {
  logout();  // useAuthStore에서 제공 (localStorage 제거)
  window.location.href = '/api/auth/logout/';  // IdP 로그아웃
};
```

**API 호출:** GET `/api/auth/logout/` (페이지 리디렉션)

#### ApiKeysSettings (`frontend/src/pages/settings/ApiKeysSettings.tsx`)
**기능:** API Key 목록 조회, 생성, 삭제

```typescript
// API Key 목록 불러오기
const loadApiKeys = async () => {
  await fetchApiKeys();  // useApiKeyStore
};

// API Key 생성
const handleCreateApiKey = async () => {
  const createdKey = await createApiKey();  // useApiKeyStore
  setNewKey(createdKey.key);  // 한 번만 표시
  await loadApiKeys();
};

// API Key 삭제
const handleDeleteApiKey = async (keyId: string) => {
  await deleteApiKey(keyId);  // useApiKeyStore
  await loadApiKeys();
};
```

**API 호출:**
- GET `/api/auth/api-keys/` (초기 로딩, 생성/삭제 후)
- POST `/api/auth/api-keys/` (생성 시)
- DELETE `/api/auth/api-keys/{id}/` (삭제 시)

#### UsersManagement (`frontend/src/pages/settings/UsersManagement.tsx`)
**기능:** 사용자 목록 조회 및 역할 변경 (ADMIN 전용)

**예상 API 호출:** (백엔드 개발 시 구현 필요)
- GET `/api/auth/users/?role=PENDING`
- PATCH `/api/auth/users/{id}/` (role 변경)
- DELETE `/api/auth/users/{id}/`

### 3. Axios 인터셉터 설정

#### axios.ts (`frontend/src/api/axios.ts`)
모든 API 요청에 JWT 토큰을 자동으로 추가합니다.

```typescript
axiosInstance.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // 토큰 만료 시 로그아웃
      localStorage.removeItem('accessToken');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);
```

### 4. JWT 디코딩 로직

#### useAuthStore.ts
```typescript
const decodeJWT = (token: string | null): DecodedJWT | null => {
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    // 만료 체크
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return null;
    }

    return {
      user_id: payload.user_id,
      username: payload.username,
      username_kr: payload.username_kr,
      email: payload.email,
      role: payload.role,
      deptname_kr: payload.deptname_kr,
    };
  } catch {
    return null;
  }
};
```

## 🧪 테스트 시나리오

### 시나리오 1: SSO 로그인
1. Frontend에서 "로그인" 버튼 클릭
2. `window.location.href = '/api/auth/login/'`
3. IdP 로그인 페이지로 이동
4. 사용자 로그인 후 `/api/auth/callback/` 호출
5. Frontend로 리디렉션: `http://localhost:9060/?token=...`
6. Frontend가 token을 localStorage에 저장
7. Header에 사용자 정보 표시

### 시나리오 2: API Key 생성
1. Settings → API Keys 페이지 이동
2. "+ 새 API Key 생성" 버튼 클릭
3. 모달에서 이름 입력: "Workbench API Key"
4. POST `/api/auth/api-keys/` 호출
5. 생성된 Key 표시 (마스킹: `a2g_***...`)
6. 테이블에 새 Key 추가

### 시나리오 3: 사용자 승인 (ADMIN)
1. Settings → Admin → 사용자 관리 페이지 이동
2. PENDING 상태 사용자 확인
3. "승인" 버튼 클릭
4. PATCH `/api/auth/users/{id}/` 호출 (role: USER)
5. 사용자 역할이 USER로 변경됨
6. 해당 사용자가 재로그인하면 플랫폼 이용 가능

## 📁 초기 폴더 구조

```
user-service/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI 애플리케이션
│   ├── models.py               # User, APIKey 모델
│   ├── schemas.py              # Pydantic 스키마
│   ├── auth/
│   │   ├── __init__.py
│   │   ├── sso.py              # SSO 로직
│   │   └── jwt_handler.py      # JWT 생성/검증
│   ├── api/
│   │   ├── __init__.py
│   │   ├── auth.py             # SSO 엔드포인트
│   │   ├── api_keys.py         # API Key CRUD
│   │   └── users.py            # User Management
│   └── dependencies.py         # 인증 의존성
├── certs/
│   └── cert.cer                # IdP 공개키
├── tests/
│   └── test_auth.py
├── requirements.txt            # FastAPI, PyJWT, python-jose, cryptography
├── Dockerfile
├── .env.example
└── README.md
```

## 🔑 환경 변수

```bash
# .env
DB_HOST=localhost
DB_NAME=agent_dev_platform_local
DB_USER=dev_user
DB_PASSWORD=dev_password

# SSO
IDP_ENTITY_ID="http://localhost:9999/mock-sso/login"
IDP_CLIENT_ID="mock-client-id"
SP_REDIRECT_URL="https://localhost:9050/api/auth/callback/"
CERT_FILE="./certs/cert.cer"
IDP_SIGNOUT_URL="http://localhost:9999/mock-sso/logout"

# JWT
JWT_SECRET_KEY="your-secret-key-here"
JWT_ALGORITHM="HS256"
JWT_EXPIRATION_HOURS=12

# Frontend
FRONTEND_BASE_URL="http://localhost:9060"

# Initial Admins
INITIAL_ADMIN_IDS="syngha.han,biend.i"
```

## ✅ Frontend 동작 확인 체크리스트

- [ ] SSO 로그인이 정상적으로 작동하는가?
- [ ] 로그인 후 Header에 사용자 정보가 표시되는가?
- [ ] PENDING 사용자는 승인 대기 페이지가 표시되는가?
- [ ] API Key 생성이 정상적으로 작동하는가?
- [ ] API Key 삭제가 정상적으로 작동하는가?
- [ ] ADMIN 사용자만 사용자 관리 페이지에 접근할 수 있는가?
- [ ] 사용자 역할 변경이 정상적으로 작동하는가?
- [ ] 로그아웃 후 IdP 로그아웃 페이지로 이동하는가?
