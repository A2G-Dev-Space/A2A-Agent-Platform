from playwright.sync_api import sync_playwright, expect
import time

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    context = browser.new_context()
    page = context.new_page()

    # 1. Authentication
    page.goto("http://localhost:9060/login")
    expect(page).to_have_title("frontend")
    page.screenshot(path="jules-scratch/verification/01_login_page.png")
    page.get_by_role("button", name="Continue with SSO").click()
    expect(page).to_have_url("http://localhost:9060/hub", timeout=10000)
    page.screenshot(path="jules-scratch/verification/02_hub_page_after_login.png")

    # 2. Hub Page
    expect(page.locator("h1")).to_have_text("Agent Hub")
    page.screenshot(path="jules-scratch/verification/03_hub_page.png")

    # 3. Workbench
    page.goto("http://localhost:9060/workbench")
    expect(page.locator("h2")).to_have_text("Agents")
    page.screenshot(path="jules-scratch/verification/04_workbench_page.png")

    # Create a new agent
    page.get_by_role("button", name="New Agent").click()
    expect(page.locator("h2")).to_have_text("Create New Agent")
    page.get_by_placeholder("Enter a unique name for your agent").fill("Test Agent")
    page.get_by_placeholder("Provide a brief description of what this agent does").fill("This is a test agent.")
    page.get_by_role("combobox").select_option("Agno")
    page.get_by_role("button", name="Create Agent").click()
    expect(page.locator("text=Test Agent")).to_be_visible()
    page.screenshot(path="jules-scratch/verification/05_workbench_page_with_new_agent.png")

    # 4. Settings
    page.goto("http://localhost:9060/settings")
    expect(page.locator("h1")).to_have_text("Settings")
    page.screenshot(path="jules-scratch/verification/06_settings_general_page.png")

    page.get_by_role("link", name="User Management").click()
    expect(page.locator("h2")).to_have_text("User Management")
    page.screenshot(path="jules-scratch/verification/07_user_management_page.png")

    page.get_by_role("link", name="LLM Model Management").click()
    expect(page.locator("h2")).to_have_text("Available LLM Models")
    page.screenshot(path="jules-scratch/verification/08_llm_management_page.png")

    page.get_by_role("link", name="Statistics").click()
    expect(page.locator("h3")).to_have_text("Statistics Dashboard")
    page.screenshot(path="jules-scratch/verification/09_statistics_page.png")

    context.close()
    browser.close()

with sync_playwright() as playwright:
    run(playwright)