import re
from playwright.sync_api import sync_playwright, Page, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Set a mock token to bypass SSO
    mock_token = "mock_jwt_token_for_testing"
    mock_user = {
        "username": "testuser",
        "username_kr": "테스트유저",
        "department_kr": "테스트부서",
        "role": "ADMIN"
    }

    page.goto("http://localhost:9060/login")

    # Screenshot of the login page
    page.screenshot(path="jules-scratch/verification/01_login_page.png")

    # Use evaluate to set the persisted auth state in localStorage
    auth_state = {
        "state": {
            "user": mock_user,
            "accessToken": mock_token,
            "isAuthenticated": True
        },
        "version": 0
    }
    import json
    page.evaluate(f'''() => {{
        localStorage.setItem('auth-storage', JSON.stringify({json.dumps(auth_state)}));
    }}''')

    # Navigate to Hub
    page.goto("http://localhost:9060/hub")
    page.wait_for_selector("text=Agent Hub")
    page.screenshot(path="jules-scratch/verification/02_hub_dashboard.png")

    # Navigate to Workbench
    page.goto("http://localhost:9060/workbench")
    page.wait_for_selector("text=Agents")
    page.screenshot(path="jules-scratch/verification/03_workbench_dashboard.png")

    # Navigate to Flow
    page.goto("http://localhost:9060/flow")
    page.wait_for_selector("text=Flow Mode")
    page.screenshot(path="jules-scratch/verification/04_flow_dashboard.png")

    # Navigate to Statistics
    page.goto("http://localhost:9060/statistics")
    page.wait_for_selector("text=Dashboard")
    page.screenshot(path="jules-scratch/verification/05_statistics_dashboard.png")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)