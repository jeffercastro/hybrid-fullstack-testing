import { APIRequestContext, APIResponse } from '@playwright/test';
import { AccountRecord } from '../../app/server';

/**
 * SeederClient:
 * Fast HTTP client used in test hooks (beforeEach / afterEach) to seed
 * and tear down state in milliseconds without going through the UI.
 */
export class SeederClient {
  constructor(private request: APIRequestContext) {}

  async seedAccount(payload: Partial<AccountRecord>): Promise<AccountRecord> {
    const res: APIResponse = await this.request.post('/api/accounts', {
      data: payload,
    });
    if (!res.ok()) {
      throw new Error(`Failed to seed account: ${res.status()} ${await res.text()}`);
    }
    return res.json();
  }

  async getAccount(id: string): Promise<AccountRecord> {
    const res = await this.request.get(`/api/accounts/${id}`);
    if (!res.ok()) {
      throw new Error(`Failed to get account ${id}: ${res.status()}`);
    }
    return res.json();
  }

  async teardownAccount(id: string): Promise<void> {
    await this.request.delete(`/api/accounts/${id}`);
  }
}
