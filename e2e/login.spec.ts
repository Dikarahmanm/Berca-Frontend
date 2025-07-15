
import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('should allow a user to log in successfully', async ({ page }) => {
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');
  });

  test('should show an error message with invalid credentials', async ({ page }) => {
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Replace with the actual error message selector
    const errorMessage = page.locator('.error-message'); 
    await expect(errorMessage).toBeVisible();
  });
});
