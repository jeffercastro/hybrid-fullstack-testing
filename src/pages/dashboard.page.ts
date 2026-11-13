import { Page, Locator } from '@playwright/test';

/**
 * DashboardPage:
 * Page Object Model for the Account Management Dashboard UI.
 * Covers user interactions, state assertions, and network failure states.
 */
export class DashboardPage {
  readonly accountId: Locator;
  readonly accountName: Locator;
  readonly accountEmail: Locator;
  readonly accountBalance: Locator;
  readonly accountStatus: Locator;
  readonly toggleStatusBtn: Locator;
  readonly addFundsBtn: Locator;
  readonly errorBanner: Locator;
  readonly loadingIndicator: Locator;

  constructor(private page: Page) {
    this.accountId = page.locator('#account-id');
    this.accountName = page.locator('#account-name');
    this.accountEmail = page.locator('#account-email');
    this.accountBalance = page.locator('#account-balance');
    this.accountStatus = page.locator('#account-status');
    this.toggleStatusBtn = page.locator('#btn-toggle-status');
    this.addFundsBtn = page.locator('#btn-add-funds');
    this.errorBanner = page.locator('#error-banner');
    this.loadingIndicator = page.locator('#loading-indicator');
  }

  async goto(id: string): Promise<void> {
    await this.page.goto(`/dashboard/${id}`);
  }

  async getStatus(): Promise<string> {
    return (await this.accountStatus.innerText()).trim();
  }

  async getBalance(): Promise<number> {
    const text = await this.accountBalance.innerText();
    return parseFloat(text.replace('$', ''));
  }

  async clickToggleStatus(): Promise<void> {
    await this.toggleStatusBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddFunds(): Promise<void> {
    await this.addFundsBtn.click();
    await this.page.waitForLoadState('networkidle');
  }

  async getErrorMessage(): Promise<string> {
    await this.errorBanner.waitFor({ state: 'visible' });
    return (await this.errorBanner.innerText()).trim();
  }
}
