from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # Login Page
    page.goto("http://localhost:9060/login")
    page.screenshot(path="jules-scratch/verification/01_login_page.png")

    # Log in
    page.get_by_role("button", name="Continue with SSO").click()
    expect(page).to_have_url("http://localhost:9060/hub")

    # Hub Page
    page.goto("http://localhost:9060/hub")
    page.wait_for_selector("text=Agent Hub")
    page.screenshot(path="jules-scratch/verification/02_hub_page.png")

    # Workbench Page
    page.goto("http://localhost:9060/workbench")
    page.wait_for_selector("text=Agents")
    page.screenshot(path="jules-scratch/verification/03_workbench_page.png")

    # Open "Create New Agent" modal
    page.get_by_role("button", name="New Agent").click()
    page.wait_for_selector("text=Create New Agent")
    page.screenshot(path="jules-scratch/verification/04_create_agent_modal.png")
    page.get_by_role("button", name="Close modal").click()

    # Flow Page
    page.goto("http://localhost:9060/flow")
    page.wait_for_selector("text=Flow Dashboard")
    page.screenshot(path="jules-scratch/verification/05_flow_page.png")

    # Settings Page
    page.goto("http://localhost:9060/settings")
    page.wait_for_selector("text=General")
    page.screenshot(path="jules-scratch/verification/06_settings_general_page.png")

    # User Management
    page.get_by_role("link", name="User Management").click()
    page.wait_for_selector("text=Invite User")
    page.screenshot(path="jules-scratch/verification/07_user_management_page.png")

    # LLM Management
    page.get_by_role("link", name="LLM Model Management").click()
    page.wait_for_selector("text=Add New Model")
    page.screenshot(path="jules-scratch/verification/08_llm_management_page..png")

    # Statistics
    page.get_by_role("link", name="Statistics").click()
    page.wait_for_selector("text=Statistics Dashboard")
    page.screenshot(path="jules-scratch/verification/09_statistics_page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)