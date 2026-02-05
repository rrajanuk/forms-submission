import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { RefreshToken } from '../types/auth';

export class RefreshTokenModel {
  static create(userId: string, expiresIn: number = 7 * 24 * 60 * 60 * 1000): RefreshToken {
    const stmt = db.prepare(`
      INSERT INTO refresh_tokens (id, user_id, token, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const token = Buffer.from(`${id}:${uuidv4()}:${Date.now()}`).toString('base64url');
    const created_at = Date.now();
    const expires_at = created_at + expiresIn;

    stmt.run(id, userId, token, expires_at, created_at);

    return { id, user_id: userId, token, expires_at, created_at };
  }

  static findByToken(token: string): RefreshToken | undefined {
    const stmt = db.prepare('SELECT * FROM refresh_tokens WHERE token = ? AND revoked_at IS NULL');
    return stmt.get(token) as RefreshToken | undefined;
  }

  static revoke(token: string): boolean {
    const stmt = db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE token = ?');
    const result = stmt.run(Date.now(), token);
    return result.changes > 0;
  }

  static revokeAllForUser(userId: string): number {
    const stmt = db.prepare('UPDATE refresh_tokens SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL');
    const result = stmt.run(Date.now(), userId);
    return result.changes;
  }

  static isExpired(token: RefreshToken): boolean {
    return token.expires_at < Date.now();
  }

  static isRevoked(token: RefreshToken): boolean {
    return token.revoked_at !== undefined && token.revoked_at !== null;
  }

  static isValid(token: RefreshToken): boolean {
    return !this.isExpired(token) && !this.isRevoked(token);
  }

  /**
   * Delete expired and revoked tokens
   */
  static cleanup(): number {
    const stmt = db.prepare('DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked_at IS NOT NULL');
    const result = stmt.run(Date.now());
    return result.changes;
  }

  static deleteByUser(userId: string): number {
    const stmt = db.prepare('DELETE FROM refresh_tokens WHERE user_id = ?');
    const result = stmt.run(userId);
    return result.changes;
  }
}
