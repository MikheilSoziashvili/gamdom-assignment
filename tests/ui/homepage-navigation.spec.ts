import { test, expect } from '../../src/fixtures/ui.fixtures';

test.describe('Homepage Navigation', () => {
  test.beforeEach(async ({ homePage }) => {
    await homePage.navigate();
  });

  test('homepage loads with key elements visible', async ({ homePage }) => {
    await expect(homePage.header.logo).toBeVisible();
    await expect(homePage.header.loginButton).toBeVisible();
    await expect(homePage.header.casinoNavLink).toBeVisible();
  });

  test('navigate to casino section from header', async ({ homePage, page }) => {
    await homePage.header.clickCasino();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/casino/);
  });
});
