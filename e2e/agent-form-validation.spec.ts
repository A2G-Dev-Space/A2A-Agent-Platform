import { test, expect } from '@playwright/test';

test.describe('Agent Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the workbench page
    await page.goto('/workbench');
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should show validation errors for empty fields', async ({ page }) => {
    // Click the "Add Agent" button to open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');

    // Wait for modal to appear
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Click submit without filling any fields
    await page.click('button:has-text("Create"), button:has-text("Submit")');

    // Check for validation error messages
    await expect(page.locator('text=/Agent name is required|name is required/i')).toBeVisible();
    await expect(page.locator('text=/Description is required|description is required/i')).toBeVisible();
    await expect(page.locator('text=/Framework.*required/i')).toBeVisible();
  });

  test('should show error for name too short', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Fill name with only 2 characters
    await page.fill('input[placeholder*="name" i], input[placeholder*="Name"]', 'AB');

    // Blur the input to trigger validation
    await page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').blur();

    // Check for "too short" error
    await expect(page.locator('text=/at least 3 characters|too short/i')).toBeVisible();
  });

  test('should show error for name too long', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Fill name with more than 50 characters
    const longName = 'A'.repeat(51);
    await page.fill('input[placeholder*="name" i], input[placeholder*="Name"]', longName);
    await page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').blur();

    // Check for "too long" error
    await expect(page.locator('text=/less than 50 characters|too long/i')).toBeVisible();
  });

  test('should show error for description too short', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Fill description with less than 10 characters
    await page.fill('textarea[placeholder*="description" i], textarea[placeholder*="Description"]', 'Too short');
    await page.locator('textarea[placeholder*="description" i], textarea[placeholder*="Description"]').blur();

    // Check for "too short" error
    await expect(page.locator('text=/at least 10 characters|too short/i')).toBeVisible();
  });

  test('should validate fields on blur', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Focus and blur name field without entering anything
    await page.focus('input[placeholder*="name" i], input[placeholder*="Name"]');
    await page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').blur();

    // Error should appear after blur
    await expect(page.locator('text=/name is required/i')).toBeVisible();

    // Now fill it correctly
    await page.fill('input[placeholder*="name" i], input[placeholder*="Name"]', 'Test Agent');
    await page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').blur();

    // Error should disappear
    await expect(page.locator('text=/name is required/i')).not.toBeVisible();
  });

  test('should show red border on invalid fields', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Focus and blur name field to trigger validation
    await page.focus('input[placeholder*="name" i], input[placeholder*="Name"]');
    await page.locator('input[placeholder*="name" i], input[placeholder*="Name"]').blur();

    // Check if the input has red border class
    const nameInput = page.locator('input[placeholder*="name" i], input[placeholder*="Name"]');
    await expect(nameInput).toHaveClass(/border-red-500/);
  });

  test('should allow submission with valid data', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Create Agent"), button:has-text("Add Agent")');
    await expect(page.locator('h2:has-text("Create Agent"), h2:has-text("Add Agent")')).toBeVisible();

    // Fill all fields with valid data
    await page.fill('input[placeholder*="name" i], input[placeholder*="Name"]', 'Test Agent');
    await page.fill('textarea[placeholder*="description" i], textarea[placeholder*="Description"]', 'This is a valid description with more than 10 characters');
    await page.selectOption('select', { index: 1 }); // Select first framework option

    // Submit button should be enabled
    const submitButton = page.locator('button:has-text("Create"), button:has-text("Submit")');
    await expect(submitButton).toBeEnabled();
  });
});
