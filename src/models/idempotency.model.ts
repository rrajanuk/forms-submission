import db from '../db/database';
import { IdempotencyKey } from '../types';

export class IdempotencyModel {
  static save(key: string, response: string): void {
    const stmt = db.prepare(`
      INSERT OR REPLACE INTO idempotency_keys (key, response, created_at)
      VALUES (?, ?, ?)
    `);
    stmt.run(key, response, Date.now());
  }

  static findByKey(key: string): IdempotencyKey | undefined {
    const stmt = db.prepare('SELECT * FROM idempotency_keys WHERE key = ?');
    return stmt.get(key) as IdempotencyKey | undefined;
  }

  static cleanup(maxAgeMs: number): number {
    const cutoffTime = Date.now() - maxAgeMs;
    const stmt = db.prepare('DELETE FROM idempotency_keys WHERE created_at < ?');
    const result = stmt.run(cutoffTime);
    return result.changes;
  }
}
