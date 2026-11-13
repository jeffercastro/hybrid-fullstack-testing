import { test, expect } from '@playwright/test';
import { SeederClient } from '../src/api/seeder.client';
import { DatabaseClient } from '../src/db/db.client';
import { DashboardPage } from '../src/pages/dashboard.page';
import { buildAccountData } from '../src/data/user-factory';

test.describe('Database Transaction Pattern — Automatic Rollback for Clean State', () => {
  let dbClient: DatabaseClient;

  test.beforeEach(async () => {
    dbClient = new DatabaseClient();
    // 1. BEGIN TRANSACTION (Snapshots state or starts Postgres transaction)
    await dbClient.beginTransaction();
  });

  test.afterEach(async () => {
    // 2. ROLLBACK TRANSACTION (Reverts all writes, zero manual teardown needed)
    await dbClient.rollback();
    await dbClient.close();
  });

  test('Mutations are fully reverted after rollback without explicit delete', async ({ page, request }) => {
    const seeder = new SeederClient(request);
    const dashboard = new DashboardPage(page);

    // Seed account within the active transaction
    const seedData = buildAccountData({ balance: 5000, status: 'ACTIVE' });
    const account = await seeder.seedAccount(seedData);

    // Perform UI mutation
    await dashboard.goto(account.id);
    await dashboard.clickToggleStatus();
    expect(await dashboard.getStatus()).toBe('SUSPENDED');

    // Confirm that inside the transaction, the database sees the change
    const inTxStatus = await dbClient.getAccountStatus(account.id);
    expect(inTxStatus).toBe('SUSPENDED');

    // Manually trigger rollback to demonstrate atomic revert
    await dbClient.rollback();

    // After rollback, the record created in this transaction is completely gone!
    const postRollbackRecord = await dbClient.getAccountById(account.id);
    expect(postRollbackRecord).toBeNull();
  });
});
