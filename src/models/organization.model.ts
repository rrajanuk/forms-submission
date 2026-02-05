import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { Organization } from '../types/auth';

export class OrganizationModel {
  static create(data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Organization {
    const stmt = db.prepare(`
      INSERT INTO organizations (id, name, slug, plan, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = Date.now();

    stmt.run(id, data.name, data.slug, data.plan, created_at, updated_at);

    return { id, name: data.name, slug: data.slug, plan: data.plan, created_at, updated_at };
  }

  static findById(id: string): Organization | undefined {
    const stmt = db.prepare('SELECT * FROM organizations WHERE id = ?');
    return stmt.get(id) as Organization | undefined;
  }

  static findBySlug(slug: string): Organization | undefined {
    const stmt = db.prepare('SELECT * FROM organizations WHERE slug = ?');
    return stmt.get(slug) as Organization | undefined;
  }

  static findAll(limit = 100, offset = 0): Organization[] {
    const stmt = db.prepare('SELECT * FROM organizations ORDER BY created_at DESC LIMIT ? OFFSET ?');
    return stmt.all(limit, offset) as Organization[];
  }

  static update(id: string, data: Partial<Omit<Organization, 'id' | 'created_at'>>): Organization | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      values.push(data.name);
    }
    if (data.slug !== undefined) {
      updates.push('slug = ?');
      values.push(data.slug);
    }
    if (data.plan !== undefined) {
      updates.push('plan = ?');
      values.push(data.plan);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE organizations SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM organizations WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static count(): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM organizations');
    const result = stmt.get() as { count: number };
    return result.count;
  }
}
