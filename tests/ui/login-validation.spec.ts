import { test, expect } from '../../src/fixtures/ui.fixtures';

test.describe('Login Validation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('login modal opens from header', async ({ homePage, loginPage }) => {
    await homePage.header.clickLogin();
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 10_000 });
  });

  test('login modal contains all expected fields', async ({ homePage, loginPage }) => {
    await homePage.header.clickLogin();
    await expect(loginPage.usernameInput).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });

  test('password field masks input', async ({ homePage, loginPage }) => {
    await homePage.header.clickLogin();
    await expect(loginPage.passwordInput).toBeVisible({ timeout: 10_000 });
    await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
  });
});
