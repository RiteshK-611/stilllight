import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { JobStatus, RenderMode, Wallet } from '../../src/domain/api.ts';
import type { LookId } from '../../src/domain/looks.ts';
import { HttpError } from './errors.ts';

export interface JobRow {
  id: string;
  account_id: string;
  request_key: string;
  fingerprint: string;
  look_id: LookId;
  mode: RenderMode;
  status: JobStatus;
  created_at: number;
  finished_at: number | null;
  delivered_at: number | null;
  error: string | null;
}

export function tokenHash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class Store {
  readonly db: DatabaseSync;
  constructor(path: string, readonly mode: RenderMode) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL,
        credits INTEGER NOT NULL CHECK(credits >= 0), mode TEXT NOT NULL,
        created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, demo_refills INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY, account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        request_key TEXT NOT NULL, fingerprint TEXT NOT NULL, look_id TEXT NOT NULL, mode TEXT NOT NULL,
        status TEXT NOT NULL, created_at INTEGER NOT NULL, finished_at INTEGER,
        delivered_at INTEGER, error TEXT, UNIQUE(account_id, request_key)
      );
      CREATE INDEX IF NOT EXISTS jobs_created ON jobs(created_at);
      CREATE TABLE IF NOT EXISTS cancelled_requests (
        account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
        request_key TEXT NOT NULL, PRIMARY KEY(account_id, request_key)
      );
    `);
    // In-flight images live only in RAM. Recover their credit holds after a restart.
    const interrupted = this.db.prepare("SELECT id FROM jobs WHERE status = 'processing' OR (status = 'succeeded' AND delivered_at IS NULL)").all() as { id: string }[];
    for (const job of interrupted) this.refund(job.id, 'expired', 'The server restarted before your photo was delivered. Your credit was returned.');
  }

  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn();
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  createSession(credits: number, days: number) {
    const id = randomUUID();
    const token = randomBytes(32).toString('base64url');
    const now = Date.now();
    this.db.prepare('INSERT INTO accounts (id, token_hash, credits, mode, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(id, tokenHash(token), credits, this.mode, now, now + days * 86_400_000);
    return { token, wallet: this.wallet(id) };
  }

  authenticate(token: string): string {
    const account = this.db.prepare('SELECT id FROM accounts WHERE token_hash = ? AND expires_at > ? AND mode = ?')
      .get(tokenHash(token), Date.now(), this.mode) as { id: string } | undefined;
    if (!account) throw new HttpError(401, 'Your beta session expired. Please reconnect in Settings.', 'UNAUTHORIZED');
    return account.id;
  }

  wallet(accountId: string): Wallet {
    const row = this.db.prepare('SELECT credits FROM accounts WHERE id = ?').get(accountId) as { credits: number } | undefined;
    if (!row) throw new HttpError(401, 'Session not found.', 'UNAUTHORIZED');
    const pending = this.db.prepare("SELECT count(*) AS count FROM jobs WHERE account_id = ? AND status = 'processing'").get(accountId) as { count: number };
    return { available: row.credits, reserved: pending.count, mode: this.mode };
  }

  findByKey(accountId: string, key: string): JobRow | undefined {
    return this.db.prepare('SELECT * FROM jobs WHERE account_id = ? AND request_key = ?').get(accountId, key) as JobRow | undefined;
  }

  ownedJob(accountId: string, id: string): JobRow {
    const job = this.db.prepare('SELECT * FROM jobs WHERE id = ? AND account_id = ?').get(id, accountId) as JobRow | undefined;
    if (!job) throw new HttpError(404, 'This edit could not be found.', 'NOT_FOUND');
    return job;
  }

  reserve(accountId: string, key: string, fingerprint: string, lookId: LookId, dailyLimit: number): JobRow {
    return this.transaction(() => {
      if (this.db.prepare('SELECT 1 FROM cancelled_requests WHERE account_id = ? AND request_key = ?').get(accountId, key)) {
        throw new HttpError(409, 'This edit was cancelled. Start a new edit when you are ready.', 'REQUEST_CANCELLED');
      }
      const wallet = this.wallet(accountId);
      if (wallet.reserved) throw new HttpError(409, 'Your current photo is still processing.', 'EDIT_PENDING');
      if (wallet.available < 1) throw new HttpError(402, 'You have no beta credits left.', 'NO_CREDITS');
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const usage = this.db.prepare('SELECT count(*) AS count FROM jobs WHERE created_at >= ?').get(today.getTime()) as { count: number };
      if (usage.count >= dailyLimit) throw new HttpError(429, 'The studio has reached its daily beta limit. Please try again tomorrow.', 'DAILY_LIMIT');
      const id = randomUUID();
      this.db.prepare('UPDATE accounts SET credits = credits - 1 WHERE id = ?').run(accountId);
      this.db.prepare("INSERT INTO jobs (id, account_id, request_key, fingerprint, look_id, mode, status, created_at) VALUES (?, ?, ?, ?, ?, ?, 'processing', ?)")
        .run(id, accountId, key, fingerprint, lookId, this.mode, Date.now());
      return this.ownedJob(accountId, id);
    });
  }

  succeed(id: string): boolean {
    return this.db.prepare("UPDATE jobs SET status = 'succeeded', finished_at = ? WHERE id = ? AND status = 'processing'").run(Date.now(), id).changes === 1;
  }

  refund(id: string, status: 'failed' | 'cancelled' | 'expired', message: string): boolean {
    return this.transaction(() => {
      const row = this.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id) as JobRow | undefined;
      if (!row || !(row.status === 'processing' || (status === 'expired' && row.status === 'succeeded' && row.delivered_at === null))) return false;
      this.db.prepare('UPDATE jobs SET status = ?, error = ?, finished_at = ? WHERE id = ?').run(status, message, Date.now(), id);
      this.db.prepare('UPDATE accounts SET credits = credits + 1 WHERE id = ?').run(row.account_id);
      return true;
    });
  }

  delivered(id: string) {
    this.db.prepare('UPDATE jobs SET delivered_at = COALESCE(delivered_at, ?) WHERE id = ?').run(Date.now(), id);
  }

  cancelRequest(accountId: string, key: string): JobRow | undefined {
    // The tombstone also cancels an upload that has not finished validation yet.
    this.db.prepare('INSERT OR IGNORE INTO cancelled_requests (account_id, request_key) VALUES (?, ?)').run(accountId, key);
    const job = this.findByKey(accountId, key);
    if (job) this.refund(job.id, 'cancelled', 'You cancelled this edit. Your credit has been returned.');
    return job ? this.ownedJob(accountId, job.id) : undefined;
  }

  refill(accountId: string): Wallet {
    this.transaction(() => {
      if (this.mode !== 'demo') throw new HttpError(403, 'Live beta credits are granted by the pilot operator. Purchases are not enabled.', 'PURCHASES_DISABLED');
      const row = this.db.prepare('SELECT credits, demo_refills FROM accounts WHERE id = ?').get(accountId) as { credits: number; demo_refills: number };
      if (row.credits > 2) throw new HttpError(409, 'Use a few more of your demo credits before refilling.');
      if (row.demo_refills >= 10) throw new HttpError(429, 'This session has reached its demo refill limit.');
      this.db.prepare('UPDATE accounts SET credits = credits + 10, demo_refills = demo_refills + 1 WHERE id = ?').run(accountId);
    });
    return this.wallet(accountId);
  }

  removeAccount(accountId: string) {
    this.db.prepare('DELETE FROM accounts WHERE id = ?').run(accountId);
  }

  close() { this.db.close(); }
}
