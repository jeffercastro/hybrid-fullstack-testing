import { test, expect } from '@playwright/test';
import { SeederClient } from '../src/api/seeder.client';
import { DatabaseClient } from '../src/db/db.client';
import { DashboardPage } from '../src/pages/dashboard.page';
import { buildAccountData } from '../src/data/user-factory';

test.describe('Hybrid SDET Architecture — API Seeding + UI Validation + DB Assertions', () => {
  let dbClient: DatabaseClient;

  test.beforeAll(async () => {
    dbClient = new DatabaseClient();
  });

  test.afterAll(async () => {
    await dbClient.close();
  });

  test('Full-Stack Flow: Seed via API -> Mutate via UI -> Verify in SQL Database', async ({ page, request }) => {
    const seeder = new SeederClient(request);
    const dashboard = new DashboardPage(page);

    // 1. FAST API SEEDING (Bypasses UI forms, runs in ~30ms)
    const seedData = buildAccountData({ status: 'ACTIVE', balance: 1000 });
    const seededAccount = await seeder.seedAccount(seedData);
    expect(seededAccount.id).toBeTruthy();

    try {
      // 2. VERIFY INITIAL STATE IN DATABASE (Direct SQL Query)
      const initialDbStatus = await dbClient.getAccountStatus(seededAccount.id);
      expect(initialDbStatus).toBe('ACTIVE');

      // 3. UI EXECUTION (Navigate directly to entity dashboard)
      await dashboard.goto(seededAccount.id);
      expect(await dashboard.getStatus()).toBe('ACTIVE');
      expect(await dashboard.getBalance()).toBe(1000);

      // 4. PERFORM UI MUTATION (Click button in browser)
      await dashboard.clickToggleStatus();

      // 5. ASSERT UI UPDATED
      expect(await dashboard.getStatus()).toBe('SUSPENDED');

      // 6. DIRECT DATABASE ASSERTION (Confirm persistence in SQL layer)
      const updatedDbStatus = await dbClient.getAccountStatus(seededAccount.id);
      expect(updatedDbStatus).toBe('SUSPENDED');

    } finally {
      // 7. TEARDOWN (Guarantees zero database pollution)
      await seeder.teardownAccount(seededAccount.id);
      const postTeardownDb = await dbClient.getAccountById(seededAccount.id);
      expect(postTeardownDb).toBeNull();
    }
  });

  test('Financial Transaction Flow: Seed via API -> Deposit via UI -> Verify DB Balance', async ({ page, request }) => {
    const seeder = new SeederClient(request);
    const dashboard = new DashboardPage(page);

    // 1. SEED INITIAL BALANCE
    const initialBalance = 2500;
    const seedData = buildAccountData({ balance: initialBalance, status: 'ACTIVE' });
    const seededAccount = await seeder.seedAccount(seedData);

    try {
      // 2. UI NAVIGATION & ACTION
      await dashboard.goto(seededAccount.id);
      expect(await dashboard.getBalance()).toBe(2500);

      // Perform Deposit $500 in UI
      await dashboard.clickAddFunds();

      // 3. ASSERT UI REFLECTS NEW BALANCE ($3,000)
      const newUiBalance = await dashboard.getBalance();
      expect(newUiBalance).toBe(3000);

      // 4. ASSERT DATABASE LAYER PERSISTED THE TRANSACTION
      const dbBalance = await dbClient.getAccountBalance(seededAccount.id);
      expect(dbBalance).toBe(3000);

    } finally {
      // Clean up
      await seeder.teardownAccount(seededAccount.id);
    }
  });

  test('Isolation Test: Verify records are deleted completely during teardown', async ({ request }) => {
    const seeder = new SeederClient(request);
    const account = await seeder.seedAccount(buildAccountData());

    // Confirm existence in DB
    const exists = await dbClient.getAccountById(account.id);
    expect(exists).not.toBeNull();

    // Teardown
    await seeder.teardownAccount(account.id);

    // Confirm eradication in DB
    const eradicated = await dbClient.getAccountById(account.id);
    expect(eradicated).toBeNull();
  });
});
