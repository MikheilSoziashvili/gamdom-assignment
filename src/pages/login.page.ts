import { Page, Locator } from '@playwright/test';
import { BasePage } from './base.page';

export class LoginPage extends BasePage {
  readonly path = '/';

  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly modal: Locator;

  constructor(page: Page) {
    super(page);

    this.modal = page.locator(
      '[data-testid*="login-modal"], [data-testid*="auth-modal"], [role="dialog"][aria-label*="login" i], [role="dialog"][aria-label*="sign in" i], [class*="login-modal" i], [class*="auth-modal" i], [class*="loginModal" i]'
    ).first();

    this.usernameInput = page
      .getByPlaceholder('Enter your username')
      .or(page.locator('input[name="username"]'))
      .first();

    this.passwordInput = page
      .getByPlaceholder('Enter your password')
      .or(page.locator('input[name="password"]'))
      .first();

    this.submitButton = page
      .getByTestId('start-playing-login')
      .first();

    this.errorMessage = page.locator(
      '[data-testid*="toastSubTitle"]'
    )
    .getByText('Incorrect credentials')
    .first();
  }

  async login(email: string, password: string): Promise<void> {
    await this.usernameInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.errorMessage.isVisible()) {
      return this.errorMessage.textContent();
    }
    return null;
  }

  async isModalVisible(): Promise<boolean> {
    return this.modal.isVisible();
  }
}
