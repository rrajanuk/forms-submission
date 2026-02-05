import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { User, UserWithPassword } from '../types/auth';
import { hashPassword } from '../utils/password';

export class UserModel {
  static create(data: {
    organization_id: string;
    email: string;
    password: string;
    name?: string;
    role?: 'owner' | 'admin' | 'member';
  }): User {
    const stmt = db.prepare(`
      INSERT INTO users (id, organization_id, email, password_hash, name, role, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const created_at = Date.now();
    const password_hash = hashPassword(data.password);

    stmt.run(
      id,
      data.organization_id,
      data.email,
      password_hash,
      data.name || null,
      data.role || 'member',
      created_at
    );

    return {
      id,
      organization_id: data.organization_id,
      email: data.email,
      name: data.name,
      role: data.role || 'member',
      created_at,
    };
  }

  static findById(id: string): User | undefined {
    const stmt = db.prepare('SELECT id, organization_id, email, name, role, created_at, last_login_at FROM users WHERE id = ?');
    return stmt.get(id) as User | undefined;
  }

  static findByIdWithPassword(id: string): UserWithPassword | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as UserWithPassword | undefined;
  }

  static findByEmail(email: string): UserWithPassword | undefined {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as UserWithPassword | undefined;
  }

  static findByOrganization(organizationId: string, limit = 100, offset = 0): User[] {
    const stmt = db.prepare(`
      SELECT id, organization_id, email, name, role, created_at, last_login_at
      FROM users
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    return stmt.all(organizationId, limit, offset) as User[];
  }

  static update(id: string, data: {
    name?: string;
    role?: 'owner' | 'admin' | 'member';
    email?: string;
    password?: string;
  }): User | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.role !== undefined) {
      updates.push('role = ?');
      values.push(data.role);
    }
    if (data.email !== undefined) {
      updates.push('email = ?');
      values.push(data.email);
    }
    if (data.password !== undefined) {
      updates.push('password_hash = ?');
      values.push(hashPassword(data.password));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    values.push(id);
    const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static updateLastLogin(id: string): void {
    const stmt = db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?');
    stmt.run(Date.now(), id);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM users WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static countByOrganization(organizationId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM users WHERE organization_id = ?');
    const result = stmt.get(organizationId) as { count: number };
    return result.count;
  }
}
