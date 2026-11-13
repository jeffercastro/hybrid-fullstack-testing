import { test, expect } from '@playwright/test';
import { SeederClient } from '../src/api/seeder.client';
import { DashboardPage } from '../src/pages/dashboard.page';
import { buildAccountData } from '../src/data/user-factory';

test.describe('Network Interception & Chaos Engineering — page.route()', () => {
  let accountId: string;

  test.beforeEach(async ({ request }) => {
    const seeder = new SeederClient(request);
    const account = await seeder.seedAccount(buildAccountData({ balance: 1200, status: 'ACTIVE' }));
    accountId = account.id;
  });

  test.afterEach(async ({ request }) => {
    const seeder = new SeederClient(request);
    await seeder.teardownAccount(accountId).catch(() => {});
  });

  test('Chaos: Backend returns 500 Internal Server Error when updating status', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto(accountId);

    // Intercept network call and mock a 500 error response from backend API
    await page.route('**/api/accounts/**/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failure (Chaos Mock)' }),
      });
    });

    // Attempt the UI action
    await dashboard.toggleStatusBtn.click();

    // Verify UI catches error gracefully and displays the error message to the user
    const errorText = await dashboard.getErrorMessage();
    expect(errorText).toContain('Database connection failure (Chaos Mock)');
    // Status must remain ACTIVE (did not flip due to error)
    expect(await dashboard.getStatus()).toBe('ACTIVE');
  });

  test('Chaos: Simulated network drop (connection aborted)', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto(accountId);

    // Abort all outbound transaction POST requests to simulate sudden offline drop
    await page.route('**/api/accounts', async (route) => {
      await route.abort('failed');
    });

    // Attempt deposit
    await dashboard.addFundsBtn.click();

    // Verify UI shows connection lost error banner
    const errorText = await dashboard.getErrorMessage();
    expect(errorText).toContain('Network connection lost');
  });

  test('Latency: Simulated slow API response displays loading indicator', async ({ page }) => {
    const dashboard = new DashboardPage(page);
    await dashboard.goto(accountId);

    // Delay response by 800ms to verify loading spinner UI
    await page.route('**/api/accounts', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.continue();
    });

    // Click deposit
    await dashboard.addFundsBtn.click();

    // Verify loading indicator is displayed while request is in-flight
    await expect(dashboard.loadingIndicator).toBeVisible();
    await expect(dashboard.loadingIndicator).toHaveText('Processing transaction...');
  });
});
