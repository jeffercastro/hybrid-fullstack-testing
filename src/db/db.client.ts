import { Pool, PoolClient } from 'pg';
import http from 'http';
import { AccountRecord } from '../../app/server';

/**
 * DatabaseClient:
 * Represents the Direct Database Layer for an SDET.
 * Supports:
 * - Direct SQL queries
 * - Full Transaction Management (BEGIN, ROLLBACK, COMMIT) for zero-teardown state resets.
 */
export class DatabaseClient {
  private pool: Pool | null = null;
  private activeClient: PoolClient | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }
  }

  // --- TRANSACTION SUPPORT ---
  async beginTransaction(): Promise<void> {
    if (this.pool) {
      this.activeClient = await this.pool.connect();
      await this.activeClient.query('BEGIN');
      return;
    }

    // In-memory simulation via HTTP internal endpoint
    await this.postInternal('/internal/db/transaction/begin');
  }

  async rollback(): Promise<void> {
    if (this.activeClient) {
      await this.activeClient.query('ROLLBACK');
      this.activeClient.release();
      this.activeClient = null;
      return;
    }

    await this.postInternal('/internal/db/transaction/rollback');
  }

  async commit(): Promise<void> {
    if (this.activeClient) {
      await this.activeClient.query('COMMIT');
      this.activeClient.release();
      this.activeClient = null;
      return;
    }

    await this.postInternal('/internal/db/transaction/commit');
  }

  // --- QUERY METHODS ---
  async getAccountById(id: string): Promise<AccountRecord | null> {
    if (this.activeClient) {
      const res = await this.activeClient.query('SELECT * FROM accounts WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    if (this.pool) {
      const res = await this.pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
      return res.rows[0] || null;
    }

    return new Promise((resolve) => {
      http.get(`${this.baseUrl}/internal/db/accounts/${id}`, (res) => {
        if (res.statusCode !== 200) {
          resolve(null);
          return;
        }
        let data = '';
        res.on('data', chunk => { data += chunk; });
        res.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  }

  async getAccountStatus(id: string): Promise<string | null> {
    const acc = await this.getAccountById(id);
    return acc ? acc.status : null;
  }

  async getAccountBalance(id: string): Promise<number | null> {
    const acc = await this.getAccountById(id);
    return acc ? acc.balance : null;
  }

  async close(): Promise<void> {
    if (this.activeClient) {
      this.activeClient.release();
    }
    if (this.pool) {
      await this.pool.end();
    }
  }

  private postInternal(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const req = http.request(`${this.baseUrl}${path}`, { method: 'POST' }, (res) => {
        res.resume();
        res.on('end', () => resolve());
      });
      req.on('error', reject);
      req.end();
    });
  }
}
