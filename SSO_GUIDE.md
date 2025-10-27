🚀 A2G 플랫폼: SSO 연동 종합 가이드 (Phase 1/2)
1. 🎯 목표 및 아키텍처
목표: 사내 표준 OIDC(OpenID Connect) 인증 시스템(IdP)과 우리 A2G 플랫폼(SP)을 연동하여, 사용자가 SSO를 통해 로그인하고, 플랫폼 내부 역할(Role)을 할당받으며, 발급된 JWT 토큰으로 API 및 WebSocket 통신을 인증하도록 구현합니다.
핵심 아키텍처 (현재 Phase 1 기준):
 * 사용자 접속 (HTTPS): 사용자는 https://<서버_IP>:9050 (허가된 포트)으로 플랫폼에 접속합니다.
 * nginx (Reverse Proxy): 9050 포트에서 HTTPS(wss:// 포함) 요청을 받아 SSL 인증서를 처리(SSL Termination)한 후, 모든 요청을 내부 backend 서비스의 HTTP:9050 포트로 전달합니다.
 * backend (Uvicorn/ASGI): HTTP:9050 포트에서 Nginx로부터 전달받은 HTTP 및 WebSocket 요청을 처리합니다. (SSO 콜백, API 요청, WebSocket 연결 등)
이 구조는 백엔드(Python)가 SSL 인증서 관리의 복잡성 없이 HTTP로만 동작하게 하면서, 외부 요구사항(HTTPS, 9050 포트)을 Nginx가 전문적으로 처리하도록 하는 표준적인 방식입니다.
전체 인증 흐름:
 * (FE) 사용자가 https://...:9050/api/auth/login/ (Nginx 경유) 요청.
 * (BE) user-service (또는 users/views.py)가 IdP 로그인 페이지로 리디렉션.
 * (IdP) 사용자 로그인 성공.
 * (IdP) 브라우저를 https://...:9050/api/auth/callback/ (Nginx 경유)로 리디렉션 (POST, id_token 포함).
 * (BE) user-service가 id_token 검증, 사용자 프로비저닝(DB 저장), 역할(Role) 부여.
 * (BE) 내부용 JWT (accessToken) 생성.
 * (BE) 사용자를 http://...:9060/?token=<accessToken> (Frontend 주소)로 리디렉션.
 * (FE) Layout.tsx가 token을 localStorage에 저장하고 useAuthStore 상태 업데이트.
 * (FE) 이후 모든 axios API 요청 시 이 token을 Authorization: Bearer ... 헤더에 포함.
 * (FE) WebSocket 연결 (useTraceLogSocket.ts) 시 wss://...:9050/ws/...?token=<accessToken> URL로 연결 시도.
 * (BE) TokenAuthMiddleware가 WebSocket token을 검증하여 사용자 인증.
2. 📋 사전 준비: 환경 변수 및 인증서
2.1. 환경 변수 (backend/.env)
IdP 담당자로부터 발급받은 정보와 우리 플랫폼의 주소를 입력합니다.
```
# backend/.env

# --- Django ---
DJANGO_SECRET_KEY='<your-generated-secret-key>'
DEBUG=True

# --- Database (External) ---
DB_HOST=a2g-db.com
DB_NAME=agent_development_platform
DB_USER=adp
DB_PASSWORD=a2g-passwd

# --- Redis (Local Docker) ---
REDIS_HOST=redis
REDIS_PASSWORD=a2g-passwd

# --- SSO 연동 정보 ---
# IdP 로그인 페이지 URL (담당자 제공)
IDP_ENTITY_ID="https_idp_login_url"
# IdP에 등록된 우리 플랫폼(SP)의 Client ID (담당자 제공)
IDP_CLIENT_ID="our_platform_client_id"
# IdP 로그아웃 URL (담당자 제공)
IDP_SIGNOUT_URL="https_idp_logout_url"
```

## [중요] Nginx 프록시를 통과한 후 백엔드 콜백 API 주소
### (Nginx가 9050 포트로 서비스하므로)
SP_REDIRECT_URL="https://<서버_IP_또는_도메인>:9050/api/auth/callback/"
### (로컬 테스트 시: "https://localhost:9050/api/auth/callback/")

## --- Frontend URL ---
### (로그인 완료 후 리디렉션될 주소)
FRONTEND_BASE_URL="http://<서버_IP_또는_도메인>:9060"
### (로컬 테스트 시: "http://localhost:9060")

## --- 초기 관리자 계정 목록 (SSO의 loginid 기준) ---
INITIAL_ADMIN_IDS="syngha.han,biend.i"

## --- 내부 알림 API 정보 (REQ 12) ---
INTERNAL_MAIL_API_ENDPOINT="[http://internal.api.com/send-mail](http://internal.api.com/send-mail)"
INTERNAL_MAIL_API_KEY="secret-key-for-mail"

2.2. 인증서 (backend/certs/ 및 certs/)
 * backend/certs/cert.cer (예시):
   * IdP가 발급한 id_token의 서명을 검증하기 위한 공개키 인증서. IdP 담당자로부터 받아 이 위치에 저장합니다.
 * certs/localhost.crt, certs/localhost.key:
   * Nginx HTTPS 프록시(https://...:9050)를 구동하기 위한 SSL 인증서. 로컬 개발용으로는 자체 서명 인증서를, 실제 서버 환경에서는 유효한 인증서를 이 위치에 배치합니다.
3. ⚙️ Part 1: 백엔드 (Django / Phase 1 기준)
3.1. users/models.py (User 모델)
SSO 정보(username_kr 등)와 role을 저장할 커스텀 User 모델입니다.
```
# backend/users/models.py

from django.contrib.auth.models import AbstractUser
from django.db import models

class User(AbstractUser):
    """
    Django의 기본 User 모델을 확장한 커스텀 User 모델.
    SSO 정보 및 플랫폼 역할을 저장합니다.
    """
    class Role(models.TextChoices):
        PENDING = "PENDING", "사용 신청"
        USER = "USER", "일반 사용자"
        ADMIN = "ADMIN", "관리자"

    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.PENDING,
        help_text="사용자 권한 등급 (신청/일반/관리자)",
    )
    
    # Django 기본 first/last name 대신 명시적 필드 사용
    first_name = models.CharField(max_length=150, blank=True)
    last_name = models.CharField(max_length=150, blank=True)
    
    username_kr = models.CharField(max_length=150, blank=True, verbose_name="이름 (한글)")
    username_en = models.CharField(max_length=150, blank=True, verbose_name="영문 이름")
    deptname_kr = models.CharField(
        max_length=100, blank=True, verbose_name="부서명 (한글)"
    )
    deptname_en = models.CharField(
        max_length=100, blank=True, verbose_name="부서명 (영문)"
    )
    
    theme_preference = models.CharField(
        max_length=10,
        choices=[("light", "Light"), ("dark", "Dark")],
        default="light",
    )
    language_preference = models.CharField(
        max_length=10,
        choices=[("ko", "Korean"), ("en", "English")],
        default="ko",
    )

    def __str__(self):
        return self.username
```

3.2. config/settings.py (SSO/JWT/Auth 설정)
SSO 연동에 필요한 핵심 설정값들입니다.

```
# backend/config/settings.py
from pathlib import Path
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# ... (INSTALLED_APPS, MIDDLEWARE 등 - 리팩토링된 상태) ...
# 'users.apps.UsersConfig', 'channels', 'rest_framework_simplejwt' 등 포함
INSTALLED_APPS = [
    "channels",
    'core.apps.CoreConfig',
    'users.apps.UsersConfig',
    'agents.apps.AgentsConfig',
    'chat.apps.ChatConfig',
    'tracing.apps.TracingConfig',
    'platform_admin.apps.PlatformAdminConfig',
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "rest_framework_simplejwt",
    "corsheaders",
    "django_celery_results",
    "django_celery_beat",
]

# ...

# [중요] 커스텀 User 모델 지정
AUTH_USER_MODEL = "users.User"

# ...

# [중요] DRF/JWT 설정
REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    # (선택적) 기본적으로 모든 API에 인증 요구
    # "DEFAULT_PERMISSION_CLASSES": [
    #     "rest_framework.permissions.IsAuthenticated",
    # ],
}

SIMPLE_JWT = {
    "USER_ID_FIELD": "username", # User 모델의 'username' (사번)을 ID로 사용
    "USER_ID_CLAIM": "user_id",  # 토큰 내부에서 user_id 클레임 이름
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=12), # 토큰 유효 시간
    # (토큰 알고리즘, 서명 키 등은 기본값 사용)
}

# --- SSO 연동 설정 (환경 변수 로드) ---
IDP_ENTITY_ID = os.getenv("IDP_ENTITY_ID")
IDP_CLIENT_ID = os.getenv("IDP_CLIENT_ID")
SP_REDIRECT_URL = os.getenv("SP_REDIRECT_URL")
# [중요] .cer 파일 경로 (하드코딩)
CERT_FILE = os.path.join(BASE_DIR, "certs", "cert.cer") 
IDP_SIGNOUT_URL = os.getenv("IDP_SIGNOUT_URL")
# [중요] 초기 관리자 ID 목록 (환경 변수에서 읽어옴)
INITIAL_ADMIN_IDS = os.getenv("INITIAL_ADMIN_IDS", "").split(',')
# ------------------------------------

# ... (Celery, Channels, DB, Cache 등 나머지 설정) ...

3.3. users/urls.py (SSO 라우팅)
config/urls.py의 path("api/auth/", include("users.urls"))에 의해 참조됩니다.
# backend/users/urls.py
from django.urls import path
from . import views

# 이 파일은 users 앱 내 다른 API(APIKey, UserManagement) 라우터와 병합될 수 있음
# 여기서는 SSO 관련 경로만 명시
urlpatterns = [
    path("login/", views.sso_login_view, name="sso_login"),
    path("callback/", views.sso_callback_view, name="sso_callback"),
    path("logout/", views.sso_logout_view, name="sso_logout"),
]

```

3.4. users/views.py (SSO 핵심 로직)
SSO 흐름을 처리하는 3개의 View 함수입니다. (다른 ViewSet과 같은 파일에 위치)
```
# backend/users/views.py

import jwt
import uuid
import os
import logging # 로깅 추가
from django.conf import settings
from django.http import HttpResponseRedirect, JsonResponse, HttpResponseBadRequest
from django.shortcuts import redirect
from django.contrib.auth import get_user_model, login, logout
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Case, When, Value, IntegerField
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.response import Response
from cryptography import x509
from .serializers import UserRoleSerializer, UserAdminListSerializer, APIKeyListSerializer, APIKeyCreateSerializer
from .permissions import IsAdminRoleUser
from core.models import APIKey

User = get_user_model()
logger = logging.getLogger(__name__)

# --- SSO View 함수 ---

def sso_login_view(request):
    """
    1. 로그인 시작: 사용자를 IdP(회사 SSO) 로그인 페이지로 리디렉션합니다.
    """
    nonce = str(uuid.uuid4())
    request.session["sso_nonce"] = nonce

    params = {
        "client_id": settings.IDP_CLIENT_ID,
        "redirect_uri": settings.SP_REDIRECT_URL,
        "response_mode": "form_post",
        "response_type": "code id_token",
        "scope": "openid profile",
        "nonce": nonce,
    }
    from urllib.parse import urlencode # 함수 내에서 임포트
    query_string = urlencode(params)
    login_url = f"{settings.IDP_ENTITY_ID}?{query_string}"
    
    logger.info(f"[SSO] Redirecting user to IdP: {settings.IDP_ENTITY_ID}")
    return HttpResponseRedirect(login_url)


@csrf_exempt
def sso_callback_view(request):
    """
    2. IdP 콜백 처리: id_token 검증, 사용자 프로비저닝, 내부 JWT 발급.
    """
    if request.method != "POST":
        logger.warning(f"[SSO Callback] Invalid method {request.method} received.")
        return HttpResponseBadRequest("Invalid request method.")

    id_token = request.POST.get("id_token")
    if not id_token:
        logger.warning("[SSO Callback] ID token not found in POST data.")
        return HttpResponseBadRequest("ID token not found in POST data.")
        
    logger.info("[SSO Callback] Received id_token. Attempting validation...")

    # --- 토큰 검증 ---
    try:
        # 1. IdP 공개키(.cer) 로드
        with open(settings.CERT_FILE, "rb") as cert_file:
            cert_data = cert_file.read()
            certificate = x509.load_pem_x509_certificate(cert_data)
            public_key = certificate.public_key()
            
        # 2. JWT 디코딩 (서명, 만료시간 검증)
        options = {"verify_aud": False} # Audience 검증 생략
        decoded_token = jwt.decode(
            id_token,
            public_key,
            algorithms=["RS256"], # IdP가 사용하는 알고리즘
            options=options,
        )
        logger.info(f"[SSO Callback] id_token verified for user: {decoded_token.get('loginid')}")

    except jwt.InvalidTokenError as e:
        logger.error(f"[SSO Error] Invalid token: {e}")
        return HttpResponseBadRequest(f"Invalid token: {e}")
    except Exception as e:
        logger.error(f"[SSO Error] Failed to load public key or decode token: {e}")
        return JsonResponse({"error": f"Failed to load public key or decode: {str(e)}"}, status=500)

    # --- 사용자 프로비저닝 ---
    user_id = decoded_token.get("loginid") # IdP가 사번을 'loginid'로 준다고 가정
    if not user_id:
        logger.error("[SSO Error] 'loginid' not found in token claims.")
        return HttpResponseBadRequest("User ID (loginid) not found in token claims.")

    try:
        # 3. User DB에서 조회 또는 생성
        user, created = User.objects.get_or_create(
            username=user_id,
            defaults={
                "email": decoded_token.get("mail", ""),
                "username_kr": decoded_token.get("username", ""),
                "username_en": decoded_token.get("username_en", ""),
                "deptname_kr": decoded_token.get("deptname", ""),
                "deptname_en": decoded_token.get("deptname_en", ""),
            },
        )

        # 4. 기존 사용자 정보 업데이트
        if not created:
            user.email = decoded_token.get("mail", user.email)
            user.username_kr = decoded_token.get("username", user.username_kr)
            user.username_en = decoded_token.get("username_en", user.username_en)
            user.deptname_kr = decoded_token.get("deptname", user.deptname_kr)
            user.deptname_en = decoded_token.get("deptname_en", user.deptname_en)

        # 5. 역할(Role) 및 관리자 권한 설정 (RBAC)
        if user_id in settings.INITIAL_ADMIN_IDS:
            if user.role != User.Role.ADMIN or not user.is_staff:
                user.role = User.Role.ADMIN
                user.is_staff = True
                user.is_superuser = True
                logger.info(f"[SSO Provisioning] User {user_id} set/updated as ADMIN.")
        elif created:
            user.role = User.Role.PENDING
            user.is_staff = False
            user.is_superuser = False
            logger.info(f"[SSO Provisioning] New user {user_id} set as PENDING.")
        
        user.save()

    except Exception as e:
        logger.exception(f"[SSO Error] Failed to provision user {user_id}: {e}")
        return JsonResponse({"error": f"Failed to provision user: {str(e)}"}, status=500)

    # --- 내부 JWT 발급 및 리디렉션 ---
    login(request, user) # Django 세션 로그인 (Admin 페이지 접근용)
    
    # 6. 우리 플랫폼 내부용 Access Token 생성
    refresh = RefreshToken.for_user(user)
    
    # 7. 토큰 Payload에 커스텀 정보 추가 (FE에서 사용)
    refresh["user_id"] = user.username
    refresh["email"] = user.email
    refresh["username_kr"] = user.username_kr
    refresh["username_en"] = user.username_en
    refresh["deptname_kr"] = user.deptname_kr
    refresh["deptname_en"] = user.deptname_en
    refresh["role"] = user.role # [핵심] 역할 정보
    
    access_token = str(refresh.access_token)
    
    # 8. 프론트엔드 URL로 토큰과 함께 리디렉션
    frontend_url = f"{settings.FRONTEND_BASE_URL}/?token={access_token}"
    logger.info(f"[SSO] Issuing internal JWT for {user.username} and redirecting to Frontend.")
    return redirect(frontend_url)


def sso_logout_view(request):
    """
    3. 로그아웃: Django 세션 파기 및 IdP 중앙 로그아웃 페이지로 리디렉션
    """
    logger.info(f"[SSO] User {request.user} logging out.")
    logout(request)

    idp_logout_url = settings.IDP_SIGNOUT_URL
    if not idp_logout_url:
        return JsonResponse({"message": "Local logout successful, IdP signout URL not configured."})

    return HttpResponseRedirect(idp_logout_url)

# --- (기존 APIKeyViewSet, ActiveAPIKeyView, UserManagementViewSet 등) ---
# ...
```


4. ⚙️ Part 2: 인프라 (Nginx) 설정
Nginx가 HTTPS:9050 포트로 접속을 받고, HTTP 및 WebSocket 요청을 backend:9050 (Uvicorn/Daphne)으로 전달합니다.
📄 nginx/dev.conf (전문)
```
# nginx/dev.conf
# (허가된 9050 포트 사용 및 HTTPS/WSS 지원)

server {
    # [수정] 443(내부) 대신 9050(외부) 포트를 직접 리스닝 (docker-compose.yml에서 9050:9050으로 매핑 가정)
    # 또는 docker-compose.yml에서 9050:443으로 매핑했다면 listen 443 ssl; 유지
    
    # --- [권장] docker-compose.yml 에서 "9050:443"을 사용한다고 가정 ---
    listen 443 ssl;
    listen [::]:443 ssl;
    # -----------------------------------------------------------
    
    # 서버 이름 (접속할 주소)
    server_name localhost; 
    # (실제 서버 IP/도메인으로 변경)
    # server_name 19.252.32.21;

    # SSL 인증서 경로
    ssl_certificate /etc/nginx/certs/localhost.crt;
    ssl_certificate_key /etc/nginx/certs/localhost.key;

    # --- WebSocket 경로 설정 (/ws/) ---
    location /ws/ {
        proxy_pass http://backend:9050; # 백엔드 ASGI 서버 (Uvicorn/Daphne)
        
        # WebSocket 프록시 필수 헤더
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 원본 클라이언트 정보 전달
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme; # "https" 전달

        proxy_read_timeout 86400s; # 긴 연결 유지
        proxy_buffering off; # 실시간
    }
    # ---------------------------------

    # --- 일반 HTTP 경로 설정 (API 포함) ---
    location / {
        proxy_pass http://backend:9050; # 백엔드 ASGI 서버
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme; # "https" 전달
    }
    # ------------------------------------
}
```

📄 docker-compose.yml (nginx 서비스 부분)
위 nginx/dev.conf 설정(listen 443 ssl)과 맞추기 위해 9050:443 포트 매핑을 사용합니다.
```
services:
  nginx:
    image: nginx:alpine
    ports:
      - "9050:443" # [중요] 외부 9050(HTTPS) -> Nginx 컨테이너 443(SSL)
    volumes:
      - ./nginx/dev.conf:/etc/nginx/conf.d/default.conf
      - ./certs:/etc/nginx/certs # SSL 인증서 마운트
    depends_on:
      - backend
    restart: always
  
  backend:
    build: ./backend
    # [중요] Uvicorn/Daphne가 내부 9050 포트에서 실행
    command: ["uv", "run", "uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "9050", "--reload"]
    volumes:
      - ./backend:/app
    env_file:
      - ./backend/.env
    expose:
      - "9050" # Nginx가 접근할 내부 포트
    depends_on:
       - redis
    restart: always

  # ... (frontend, redis, celery_worker, celery_beat) ...
```

5. ⚙️ Part 3: WebSocket 인증 (Backend)
AuthMiddlewareStack 대신 TokenAuthMiddleware를 사용하여 WebSocket 연결 시 쿼리 파라미터의 토큰을 검증합니다.
📄 backend/users/middleware.py (전문)
```
# backend/users/middleware.py

import jwt
import logging # 로거 추가 (users.views에서 이미 임포트했지만, 명시적으로 추가)
from urllib.parse import parse_qs
from channels.db import database_sync_to_async
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken

User = get_user_model()
logger = logging.getLogger(__name__) # 로거 추가

@database_sync_to_async
def get_user_from_token(token_key):
    """
    비동기 컨텍스트에서 JWT 토큰으로 사용자를 조회하는 함수.
    """
    if not token_key:
        return AnonymousUser()
    try:
        access_token = AccessToken(token_key)
        
        # [수정] settings.py의 SIMPLE_JWT 설정값 참조
        user_id_claim = settings.SIMPLE_JWT.get('USER_ID_CLAIM', 'user_id')
        user_id_field = settings.SIMPLE_JWT.get('USER_ID_FIELD', 'username') # USER_ID_FIELD 기본값 'id' 아님
        
        user_id = access_token.get(user_id_claim)
        if not user_id:
            logger.warning("[TokenAuthMiddleware] User ID claim not found in token.")
            return AnonymousUser()

        user = User.objects.get(**{user_id_field: user_id})
        logger.info(f"[TokenAuthMiddleware] User {user.username} authenticated via WebSocket token.")
        return user

    except (InvalidToken, TokenError, User.DoesNotExist) as e:
        logger.warning(f"[TokenAuthMiddleware] Token validation or user lookup failed: {e}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"[TokenAuthMiddleware] Unexpected error during token auth: {e}")
        return AnonymousUser()


class TokenAuthMiddleware:
    """
    WebSocket 연결 시 쿼리 파라미터의 JWT 토큰을 사용하여 사용자를 인증하는 ASGI 미들웨어.
    """
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        query_string = scope.get('query_string', b'').decode('utf-8')
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        logger.debug(f"[TokenAuthMiddleware] WS connection attempt. Token present: {'Yes' if token else 'No'}")

        # 토큰으로 사용자 조회 (비동기 DB 접근)
        scope['user'] = await get_user_from_token(token)
        
        # 다음 미들웨어 또는 Consumer 호출
        return await self.app(scope, receive, send)

```

📄 backend/config/asgi.py (전문)
TokenAuthMiddleware를 WebSocket 라우팅에 적용합니다.
```
# backend/config/asgi.py

import os
from django.core.asgi import get_asgi_application

# Django 초기화 먼저!
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django_asgi_app = get_asgi_application()

# Channels 관련 임포트는 그 다음!
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
import tracing.routing # [수정] tracing.routing 임포트
from users.middleware import TokenAuthMiddleware # [수정] users.middleware 임포트

application = ProtocolTypeRouter(
    {
        "http": django_asgi_app, # HTTP 요청
        "websocket": AllowedHostsOriginValidator(
            # [수정] TokenAuthMiddleware 사용
            TokenAuthMiddleware(
                URLRouter(
                    # [수정] tracing.routing 참조
                    tracing.routing.websocket_urlpatterns
                )
            )
        ),
    }
)
```

6. ⚙️ Part 4: 프론트엔드 (React) 연동
프론트엔드가 토큰을 수신, 저장하고 WebSocket 연결에 사용하는지 확인합니다.

📄 frontend/src/Layout.tsx (핵심 로직)
```
// frontend/src/components/layout/Layout.tsx (핵심 로직)

import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import WorkspaceHeader from './WorkspaceHeader';
import { useThemeStore } from '../../store/useThemeStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useApiKeyStore } from '../../store/useApiKeyStore'; // ApiKeyStore 임포트
import PendingApprovalPage from '../../pages/PendingApprovalPage/PendingApprovalPage'; // PENDING 페이지

export default function Layout() {
  const { theme } = useThemeStore();
  const { role, checkAuthAndLogin, isAuthenticated } = useAuthStore();
  const fetchActiveApiKey = useApiKeyStore((state) => state.fetchActiveApiKey);
  const location = useLocation();

  // 1. SSO 콜백 처리 및 인증 상태 동기화
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    
    // URL에 토큰이 있으면 로그인 처리
    if (token) {
      checkAuthAndLogin(token); // 토큰 저장 및 스토어 상태 업데이트
      window.history.replaceState({}, document.title, location.pathname); // URL에서 토큰 제거
      fetchActiveApiKey(); // [중요] 로그인 성공 시 API 키 로드
    } else {
      // URL에 토큰이 없으면 (새로고침/일반 방문) 기존 토큰으로 인증 확인
      checkAuthAndLogin(null); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, checkAuthAndLogin]); // checkAuthAndLogin은 useCallback으로 감싸져있다고 가정

  // 2. 인증 상태 변경 시 API 키 로드 (새로고침 시)
  useEffect(() => {
      if (isAuthenticated) { // isAuthenticated가 true로 변경되면
          fetchActiveApiKey();
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return (
    <div className="flex flex-col h-screen ..." data-theme={theme}>
      {isAuthenticated && role === 'PENDING' ? (
        // 3. PENDING 상태일 경우 승인 대기 페이지
        <PendingApprovalPage />
      ) : (
        // 4. USER, ADMIN 또는 로그아웃 상태일 경우
        <div className="flex-1 flex flex-col overflow-hidden">
          <WorkspaceHeader />
          <main className="flex-1 overflow-y-auto">
            <Outlet />
          </main>
        </div>
      )}
    </div>
  );
}
```
