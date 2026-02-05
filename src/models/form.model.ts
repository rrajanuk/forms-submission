import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { Form, FormCreateInput, FormUpdateInput } from '../types/forms';

export class FormModel {
  static create(data: {
    organization_id: string;
    name: string;
    slug?: string;
    description?: string;
    schema: Form['schema'];
  }): Form {
    const stmt = db.prepare(`
      INSERT INTO forms (id, organization_id, name, slug, description, schema, status, settings, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const created_at = Date.now();
    const updated_at = Date.now();

    stmt.run(
      id,
      data.organization_id,
      data.name,
      data.slug || null,
      data.description || null,
      JSON.stringify(data.schema),
      'draft',
      JSON.stringify(data.schema.settings),
      created_at,
      updated_at
    );

    return {
      id,
      organization_id: data.organization_id,
      name: data.name,
      slug: data.slug,
      description: data.description,
      schema: data.schema,
      status: 'draft',
      settings: data.schema.settings,
      created_at,
      updated_at,
    };
  }

  static findById(id: string): Form | undefined {
    const stmt = db.prepare('SELECT * FROM forms WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return this.mapRowToForm(row);
  }

  static findBySlug(organizationId: string, slug: string): Form | undefined {
    const stmt = db.prepare('SELECT * FROM forms WHERE organization_id = ? AND slug = ?');
    const row = stmt.get(organizationId, slug) as any;
    if (!row) return undefined;

    return this.mapRowToForm(row);
  }

  static findByOrganization(organizationId: string, limit = 100, offset = 0): Form[] {
    const stmt = db.prepare(`
      SELECT * FROM forms
      WHERE organization_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(organizationId, limit, offset) as any[];
    return rows.map(row => this.mapRowToForm(row));
  }

  static findByStatus(organizationId: string, status: 'draft' | 'published' | 'archived', limit = 100, offset = 0): Form[] {
    const stmt = db.prepare(`
      SELECT * FROM forms
      WHERE organization_id = ? AND status = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(organizationId, status, limit, offset) as any[];
    return rows.map(row => this.mapRowToForm(row));
  }

  /**
   * Find forms by status across all organizations (for public routes)
   */
  static findAllByStatus(status: 'draft' | 'published' | 'archived', limit = 100, offset = 0): Form[] {
    const stmt = db.prepare(`
      SELECT * FROM forms
      WHERE status = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(status, limit, offset) as any[];
    return rows.map(row => this.mapRowToForm(row));
  }

  /**
   * Find published form by slug across all organizations
   */
  static findPublishedBySlug(slug: string): Form | undefined {
    const stmt = db.prepare('SELECT * FROM forms WHERE status = ? AND slug = ?');
    const row = stmt.get('published', slug) as any;
    if (!row) return undefined;

    return this.mapRowToForm(row);
  }

  static update(id: string, data: FormUpdateInput): Form | undefined {
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
    if (data.description !== undefined) {
      updates.push('description = ?');
      values.push(data.description);
    }
    if (data.schema !== undefined) {
      updates.push('schema = ?');
      values.push(JSON.stringify(data.schema));
      updates.push('settings = ?');
      values.push(JSON.stringify(data.schema.settings));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);

      // Set/unset published_at based on status
      if (data.status === 'published' && !this.isPublished(id)) {
        updates.push('published_at = ?');
        values.push(Date.now());
      }
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE forms SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static publish(id: string): Form | undefined {
    return this.update(id, { status: 'published' });
  }

  static archive(id: string): Form | undefined {
    return this.update(id, { status: 'archived' });
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM forms WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static countByOrganization(organizationId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM forms WHERE organization_id = ?');
    const result = stmt.get(organizationId) as { count: number };
    return result.count;
  }

  static isPublished(id: string): boolean {
    const form = this.findById(id);
    return form?.status === 'published';
  }

  private static mapRowToForm(row: any): Form {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      schema: JSON.parse(row.schema),
      status: row.status,
      settings: JSON.parse(row.settings),
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at,
    };
  }
}
