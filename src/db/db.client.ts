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
  private schemaInitialized: boolean = false;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaInitialized || !this.pool) return;
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS accounts (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL,
          balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
          status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      this.schemaInitialized = true;
    } catch (e) {
      // Ignore if cannot execute directly, fallback to HTTP
    }
  }

  // --- TRANSACTION SUPPORT ---
  async beginTransaction(): Promise<void> {
    await this.ensureSchema();

    if (this.pool) {
      try {
        this.activeClient = await this.pool.connect();
        await this.activeClient.query('BEGIN');
        return;
      } catch (e) {
        // Fallback to internal HTTP transaction
        this.activeClient = null;
      }
    }

    // In-memory simulation via HTTP internal endpoint
    await this.postInternal('/internal/db/transaction/begin');
  }

  async rollback(): Promise<void> {
    if (this.activeClient) {
      try {
        await this.activeClient.query('ROLLBACK');
      } finally {
        this.activeClient.release();
        this.activeClient = null;
      }
      return;
    }

    await this.postInternal('/internal/db/transaction/rollback');
  }

  async commit(): Promise<void> {
    if (this.activeClient) {
      try {
        await this.activeClient.query('COMMIT');
      } finally {
        this.activeClient.release();
        this.activeClient = null;
      }
      return;
    }

    await this.postInternal('/internal/db/transaction/commit');
  }

  // --- QUERY METHODS ---
  async getAccountById(id: string): Promise<AccountRecord | null> {
    await this.ensureSchema();

    if (this.activeClient) {
      try {
        const res = await this.activeClient.query('SELECT * FROM accounts WHERE id = $1', [id]);
        return res.rows[0] ? this.formatRow(res.rows[0]) : null;
      } catch (e) {
        // Fallback
      }
    }

    if (this.pool) {
      try {
        const res = await this.pool.query('SELECT * FROM accounts WHERE id = $1', [id]);
        return res.rows[0] ? this.formatRow(res.rows[0]) : null;
      } catch (e) {
        // Fallback to HTTP internal endpoint
      }
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
      this.activeClient = null;
    }
    if (this.pool) {
      await this.pool.end();
    }
  }

  private formatRow(row: any): AccountRecord {
    return {
      id: row.id,
      name: row.name,
      email: row.email,
      balance: parseFloat(row.balance),
      status: row.status,
      created_at: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    };
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
