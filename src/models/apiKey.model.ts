import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { ApiKey, ApiKeyCreate } from '../types/auth';
import { generateApiKey, hashApiKey } from '../utils/password';

export class ApiKeyModel {
  static create(data: ApiKeyCreate & { raw_key?: string }): { apiKey: ApiKey; rawKey: string } {
    const stmt = db.prepare(`
      INSERT INTO api_keys (id, user_id, organization_id, key_hash, name, scopes, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const rawKey = data.raw_key || generateApiKey();
    const key_hash = hashApiKey(rawKey);
    const created_at = Date.now();

    stmt.run(
      id,
      data.user_id,
      data.organization_id,
      key_hash,
      data.name || null,
      JSON.stringify(data.scopes),
      data.expires_at || null,
      created_at
    );

    return {
      apiKey: {
        id,
        user_id: data.user_id,
        organization_id: data.organization_id,
        key_hash,
        name: data.name,
        scopes: data.scopes,
        expires_at: data.expires_at,
        created_at,
      },
      rawKey,
    };
  }

  static findById(id: string): ApiKey | undefined {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return {
      ...row,
      scopes: JSON.parse(row.scopes),
    };
  }

  static findByKeyHash(keyHash: string): ApiKey | undefined {
    const stmt = db.prepare('SELECT * FROM api_keys WHERE key_hash = ?');
    const row = stmt.get(keyHash) as any;
    if (!row) return undefined;

    return {
      ...row,
      scopes: JSON.parse(row.scopes),
    };
  }

  static validate(rawKey: string): ApiKey | null {
    const keyHash = hashApiKey(rawKey);
    const apiKey = this.findByKeyHash(keyHash);

    if (!apiKey) {
      return null;
    }

    // Check if expired
    if (apiKey.expires_at && apiKey.expires_at < Date.now()) {
      return null;
    }

    return apiKey;
  }

  static findByOrganization(organizationId: string, limit = 100, offset = 0): ApiKey[] {
    const stmt = db.prepare(`
      SELECT * FROM api_keys
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(organizationId, limit, offset) as any[];

    return rows.map(row => ({
      ...row,
      scopes: JSON.parse(row.scopes),
    }));
  }

  static findByUser(userId: string, limit = 100, offset = 0): ApiKey[] {
    const stmt = db.prepare(`
      SELECT * FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(userId, limit, offset) as any[];

    return rows.map(row => ({
      ...row,
      scopes: JSON.parse(row.scopes),
    }));
  }

  static updateLastUsed(id: string): void {
    const stmt = db.prepare('UPDATE api_keys SET last_used_at = ? WHERE id = ?');
    stmt.run(Date.now(), id);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM api_keys WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static deleteByUser(userId: string): number {
    const stmt = db.prepare('DELETE FROM api_keys WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }

  static countByOrganization(organizationId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM api_keys WHERE organization_id = ?');
    const result = stmt.get(organizationId) as { count: number };
    return result.count;
  }

  /**
   * Cleanup expired API keys
   */
  static cleanupExpired(): number {
    const stmt = db.prepare('DELETE FROM api_keys WHERE expires_at < ?');
    const result = stmt.run(Date.now());
    return result.changes;
  }
}
