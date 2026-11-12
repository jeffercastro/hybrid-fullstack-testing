import { Pool } from 'pg';
import http from 'http';
import { AccountRecord } from '../../app/server';

/**
 * DatabaseClient:
 * Represents the Direct Database Layer for an SDET.
 * In CI/Docker: Connects via PostgreSQL driver `pg` to execute raw SQL queries.
 * In local/standalone: Queries the database service directly to cross process boundaries.
 */
export class DatabaseClient {
  private pool: Pool | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    if (process.env.DATABASE_URL) {
      this.pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
    }
  }

  async getAccountById(id: string): Promise<AccountRecord | null> {
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
    if (this.pool) {
      await this.pool.end();
    }
  }
}
