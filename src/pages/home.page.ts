import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';
import { HeaderComponent } from './header.component';

export class HomePage extends BasePage {
  readonly path = '/';

  readonly header: HeaderComponent;
  readonly heroBanner: Locator;
  readonly featuredGamesSection: Locator;

  constructor(page: Page) {
    super(page);
    this.header = new HeaderComponent(page);

    this.heroBanner = page
      .locator('[data-testid*="hero"], [data-testid*="banner"], .hero, .banner, section[class*="hero" i], section[class*="banner" i], div[class*="hero" i]')
      .first();

    this.featuredGamesSection = page
      .locator('[data-testid*="featured"], [data-testid*="games"], section[class*="featured" i], section[class*="game" i], div[class*="featured" i]')
      .first();
  }

  async isHeroBannerVisible(): Promise<boolean> {
    return this.heroBanner.isVisible();
  }
}
