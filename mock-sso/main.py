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
    """가짜 로그인 페이지: 사용자 목록을 보여주고 선택하게 함"""
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
    """사용자 선택 후 id_token 생성 및 콜백 URL로 리디렉션"""
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
    """가짜 로그아웃"""
    return {"message": "Mock logout successful"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "mock-sso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=9999)
