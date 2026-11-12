import { Page, Locator } from '@playwright/test';

/**
 * DashboardPage:
 * Page Object Model for the Account Management Dashboard UI.
 */
export class DashboardPage {
  readonly accountId: Locator;
  readonly accountName: Locator;
  readonly accountEmail: Locator;
  readonly accountBalance: Locator;
  readonly accountStatus: Locator;
  readonly toggleStatusBtn: Locator;
  readonly addFundsBtn: Locator;

  constructor(private page: Page) {
    this.accountId = page.locator('#account-id');
    this.accountName = page.locator('#account-name');
    this.accountEmail = page.locator('#account-email');
    this.accountBalance = page.locator('#account-balance');
    this.accountStatus = page.locator('#account-status');
    this.toggleStatusBtn = page.locator('#btn-toggle-status');
    this.addFundsBtn = page.locator('#btn-add-funds');
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
    // Wait for the reload/state update
    await this.page.waitForLoadState('networkidle');
  }

  async clickAddFunds(): Promise<void> {
    await this.addFundsBtn.click();
    await this.page.waitForLoadState('networkidle');
  }
}
