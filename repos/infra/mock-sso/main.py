"""
Mock SSO Service for A2G Platform Development
This service simulates an SSO provider for local development and testing
"""

from fastapi import FastAPI, Query, Form, Request
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timedelta
from typing import Optional
import jwt
import json
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Mock SSO Service", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mock user database
MOCK_USERS = {
    "dev1": {
        "loginid": "syngha.han",
        "username": "한승하",
        "mail": "syngha.han@company.com",
        "deptid": "ai_platform",
        "deptname": "AI 플랫폼팀",
        "deptname_en": "AI Platform Team",
        "role": "ADMIN"
    },
    "dev2": {
        "loginid": "byungju.lee",
        "username": "이병주",
        "mail": "byungju.lee@company.com",
        "deptid": "ai_platform",
        "deptname": "AI 플랫폼팀",
        "deptname_en": "AI Platform Team",
        "role": "ADMIN"
    },
    "dev3": {
        "loginid": "youngsub.kim",
        "username": "김영섭",
        "mail": "youngsub.kim@company.com",
        "deptid": "ai_platform",
        "deptname": "AI 플랫폼팀",
        "deptname_en": "AI Platform Team",
        "role": "ADMIN"
    },
    "dev4": {
        "loginid": "junhyung.ahn",
        "username": "안준형",
        "mail": "junhyung.ahn@company.com",
        "deptid": "ai_platform",
        "deptname": "AI 플랫폼팀",
        "deptname_en": "AI Platform Team",
        "role": "ADMIN"
    },
    "testuser": {
        "loginid": "test.user",
        "username": "테스트유저",
        "mail": "test.user@company.com",
        "deptid": "test",
        "deptname": "테스트팀",
        "deptname_en": "Test Team",
        "role": "USER"
    },
    "pending": {
        "loginid": "pending.user",
        "username": "승인대기",
        "mail": "pending.user@company.com",
        "deptid": "new",
        "deptname": "신규팀",
        "deptname_en": "New Team",
        "role": "PENDING"
    }
}

# Secret key for JWT (in production, use a secure secret)
JWT_SECRET = "local-dev-secret-key-change-in-production"
JWT_ALGORITHM = "HS256"

@app.get("/")
async def root():
    """Root endpoint with service information"""
    return {
        "service": "Mock SSO Service",
        "version": "1.0.0",
        "endpoints": {
            "login": "/mock-sso/login",
            "logout": "/mock-sso/logout",
            "users": "/mock-sso/users"
        }
    }

@app.get("/mock-sso/login", response_class=HTMLResponse)
async def mock_login_page(
    redirect_uri: str = Query(..., description="Callback URL after authentication"),
    client_id: Optional[str] = Query(None, description="Client ID (ignored in mock)"),
    state: Optional[str] = Query(None, description="State parameter for CSRF protection")
):
    """
    Display mock login page with user selection
    """
    users_html = ""
    for user_key, user_data in MOCK_USERS.items():
        users_html += f"""
        <div class="user-card" onclick="selectUser('{user_key}')">
            <div class="user-name">{user_data['username']} ({user_data['loginid']})</div>
            <div class="user-info">{user_data['deptname']} - {user_data['role']}</div>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Mock SSO Login</title>
        <style>
            body {{
                font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}
            .container {{
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                max-width: 500px;
                width: 100%;
            }}
            h1 {{
                color: #333;
                margin: 0 0 10px 0;
                font-size: 24px;
            }}
            .subtitle {{
                color: #666;
                margin: 0 0 30px 0;
                font-size: 14px;
            }}
            .user-card {{
                background: #f8f9fa;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 15px;
                margin: 10px 0;
                cursor: pointer;
                transition: all 0.2s;
            }}
            .user-card:hover {{
                background: #e9ecef;
                border-color: #667eea;
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
            }}
            .user-name {{
                font-weight: 600;
                color: #333;
                margin-bottom: 5px;
            }}
            .user-info {{
                color: #666;
                font-size: 13px;
            }}
            .custom-login {{
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
            }}
            input {{
                width: 100%;
                padding: 10px;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 14px;
                margin: 5px 0;
            }}
            button {{
                background: #667eea;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 6px;
                font-size: 14px;
                font-weight: 600;
                cursor: pointer;
                margin-top: 10px;
                transition: background 0.2s;
            }}
            button:hover {{
                background: #5a67d8;
            }}
            .warning {{
                background: #fff3cd;
                color: #856404;
                padding: 10px;
                border-radius: 6px;
                font-size: 12px;
                margin-bottom: 20px;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>🔐 Mock SSO Login</h1>
            <p class="subtitle">Development Environment Only</p>

            <div class="warning">
                ⚠️ This is a mock SSO service for development purposes only.
                In production, this will be replaced with the actual company SSO.
            </div>

            <h3>Quick Login - Select a User:</h3>
            {users_html}

            <div class="custom-login">
                <h3>Or Create Custom User:</h3>
                <input type="text" id="custom-loginid" placeholder="Login ID (e.g., john.doe)">
                <input type="text" id="custom-username" placeholder="Full Name (e.g., John Doe)">
                <input type="email" id="custom-email" placeholder="Email (e.g., john@company.com)">
                <input type="text" id="custom-dept" placeholder="Department (e.g., Dev Team)">
                <button onclick="customLogin()">Login with Custom User</button>
            </div>
        </div>

        <script>
            const redirect_uri = '{redirect_uri}';
            const state = '{state or ""}';

            function selectUser(userKey) {{
                // Redirect to the login endpoint with the selected user
                const url = `/mock-sso/do-login?redirect_uri=${{encodeURIComponent(redirect_uri)}}&user=${{userKey}}`;
                if (state) {{
                    url += `&state=${{encodeURIComponent(state)}}`;
                }}
                window.location.href = url;
            }}

            function customLogin() {{
                const loginid = document.getElementById('custom-loginid').value;
                const username = document.getElementById('custom-username').value;
                const email = document.getElementById('custom-email').value;
                const dept = document.getElementById('custom-dept').value;

                if (!loginid || !username || !email) {{
                    alert('Please fill in all required fields');
                    return;
                }}

                // Generate deptid from department name (lowercase, replace spaces with underscores)
                const deptid = (dept || 'custom').toLowerCase().replace(/\s+/g, '_');

                // Create custom user data
                const userData = {{
                    loginid: loginid,
                    username: username,
                    mail: email,
                    deptid: deptid,
                    deptname: dept || 'Custom Team',
                    deptname_en: dept || 'Custom Team'
                }};

                // Post to login endpoint
                fetch('/mock-sso/do-login', {{
                    method: 'POST',
                    headers: {{
                        'Content-Type': 'application/json',
                    }},
                    body: JSON.stringify({{
                        redirect_uri: redirect_uri,
                        state: state,
                        custom_user: userData
                    }})
                }})
                .then(response => response.json())
                .then(data => {{
                    if (data.redirect_url) {{
                        window.location.href = data.redirect_url;
                    }}
                }});
            }}
        </script>
    </body>
    </html>
    """
    return html

@app.get("/mock-sso/do-login", response_class=HTMLResponse)
async def do_login_get(
    redirect_uri: str,
    user: str = "dev1",
    state: Optional[str] = None
):
    """Process login with selected user (GET method) and return form_post"""
    return await process_login(redirect_uri, user, state)

@app.post("/mock-sso/do-login")
async def do_login_post(request: Request):
    """Process login with custom user (POST method)"""
    data = await request.json()
    redirect_uri = data.get("redirect_uri")
    state = data.get("state")
    custom_user = data.get("custom_user")

    if custom_user:
        # Use custom user data
        user_data = custom_user
    else:
        # Use predefined user
        user_key = data.get("user", "dev1")
        user_data = MOCK_USERS.get(user_key, MOCK_USERS["dev1"])

    # Create ID token
    id_token = create_id_token(user_data)

    # Build redirect URL
    redirect_url = f"{redirect_uri}?id_token={id_token}"
    if state:
        redirect_url += f"&state={state}"

    logger.info(f"Login successful for user: {user_data.get('loginid')}")

    return JSONResponse({"redirect_url": redirect_url})

async def process_login(redirect_uri: str, user: str, state: Optional[str]):
    """Common login processing logic - returns HTML form that auto-submits (form_post)"""
    # Get user data
    user_data = MOCK_USERS.get(user, MOCK_USERS["dev1"])

    # Create ID token
    id_token = create_id_token(user_data)

    logger.info(f"Login successful for user: {user_data['loginid']}")
    logger.info(f"Redirecting to: {redirect_uri} with form_post")

    # Create HTML form that auto-submits (form_post response_mode)
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Redirecting...</title>
        <style>
            body {{
                font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
            }}
            .container {{
                background: white;
                border-radius: 12px;
                padding: 30px;
                box-shadow: 0 20px 40px rgba(0,0,0,0.1);
                text-align: center;
            }}
            .spinner {{
                border: 3px solid #f3f3f3;
                border-top: 3px solid #667eea;
                border-radius: 50%;
                width: 40px;
                height: 40px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h2>🔐 Authentication Successful</h2>
            <div class="spinner"></div>
            <p>Redirecting to application...</p>
        </div>

        <form id="ssoForm" method="POST" action="{redirect_uri}">
            <input type="hidden" name="id_token" value="{id_token}">
            {"<input type='hidden' name='state' value='" + state + "'>" if state else ""}
            <input type="hidden" name="code" value="mock-auth-code">
        </form>

        <script>
            // Auto-submit the form
            document.getElementById('ssoForm').submit();
        </script>
    </body>
    </html>
    """

    return HTMLResponse(content=html)

def create_id_token(user_data: dict) -> str:
    """Create a mock ID token"""
    # Token payload
    payload = {
        **user_data,
        "iat": datetime.utcnow(),
        "exp": datetime.utcnow() + timedelta(hours=1),
        "iss": "mock-sso",
        "aud": "a2g-platform"
    }

    # Create and return JWT
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

@app.get("/mock-sso/logout")
async def mock_logout(
    redirect_uri: Optional[str] = Query(None, description="URL to redirect after logout")
):
    """Mock logout endpoint"""
    logger.info("Logout requested")

    if redirect_uri:
        return RedirectResponse(url=redirect_uri)
    else:
        return {"message": "Logged out successfully"}

@app.get("/mock-sso/users")
async def list_users():
    """List all available mock users"""
    return {
        "users": [
            {
                "key": key,
                "loginid": user["loginid"],
                "username": user["username"],
                "department": user["deptname"],
                "role": user.get("role", "USER")
            }
            for key, user in MOCK_USERS.items()
        ]
    }

@app.get("/mock-sso/verify")
async def verify_token(token: str):
    """Verify and decode a token (for testing)"""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"valid": True, "payload": payload}
    except jwt.ExpiredSignatureError:
        return {"valid": False, "error": "Token expired"}
    except jwt.InvalidTokenError as e:
        return {"valid": False, "error": str(e)}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mock-sso"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=9999,
        log_level="info"
    )