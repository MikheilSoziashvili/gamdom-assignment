import { Page, Locator } from '@playwright/test';

export class HeaderComponent {
  private readonly page: Page;

  readonly logo: Locator;
  readonly loginButton: Locator;
  readonly casinoNavLink: Locator;
  readonly sportsNavLink: Locator;

  constructor(page: Page) {
    this.page = page;

    this.logo = page
      .locator('img[alt*="Gamdom Logo" i]')
      .first();

    this.loginButton = page
      .locator('[data-testid*="signin-nav"]')
      .first();

    this.casinoNavLink = page
      .locator('[data-testid*="navLink-casino-link"]')
      .first();

    this.sportsNavLink = page
      .locator('[data-testid*="navLink-sports-link"]')
      .first();
  }

  async clickLogin(): Promise<void> {
    await this.loginButton.click();
  }

  async clickCasino(): Promise<void> {
    await this.casinoNavLink.click();
  }

  async clickSports(): Promise<void> {
    await this.sportsNavLink.click();
  }

  async isLogoVisible(): Promise<boolean> {
    return this.logo.isVisible();
  }
}
