import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { FormSubmission, SubmissionMetadata } from '../types/forms';

export class FormSubmissionModel {
  static create(data: {
    form_id: string;
    organization_id: string;
    submission_data: Record<string, any>;
    status?: 'draft' | 'complete' | 'abandoned';
    metadata?: SubmissionMetadata;
  }): FormSubmission {
    const stmt = db.prepare(`
      INSERT INTO form_submissions (id, form_id, organization_id, submission_data, status, metadata, submitted_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const now = Date.now();
    const isComplete = data.status === 'complete';

    stmt.run(
      id,
      data.form_id,
      data.organization_id,
      JSON.stringify(data.submission_data),
      data.status || 'complete',
      data.metadata ? JSON.stringify(data.metadata) : null,
      isComplete ? now : null,
      now,
      now
    );

    return {
      id,
      form_id: data.form_id,
      organization_id: data.organization_id,
      submission_data: data.submission_data,
      status: data.status || 'complete',
      metadata: data.metadata,
      submitted_at: isComplete ? now : undefined,
      created_at: now,
      updated_at: now,
    };
  }

  static findById(id: string): FormSubmission | undefined {
    const stmt = db.prepare('SELECT * FROM form_submissions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return this.mapRowToSubmission(row);
  }

  static findByForm(formId: string, limit = 100, offset = 0): FormSubmission[] {
    const stmt = db.prepare(`
      SELECT * FROM form_submissions
      WHERE form_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(formId, limit, offset) as any[];
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static findByOrganization(organizationId: string, limit = 100, offset = 0): FormSubmission[] {
    const stmt = db.prepare(`
      SELECT * FROM form_submissions
      WHERE organization_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(organizationId, limit, offset) as any[];
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static findByStatus(status: 'draft' | 'complete' | 'abandoned', limit = 100, offset = 0): FormSubmission[] {
    const stmt = db.prepare(`
      SELECT * FROM form_submissions
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(status, limit, offset) as any[];
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static update(id: string, data: {
    submission_data?: Record<string, any>;
    status?: 'draft' | 'complete' | 'abandoned';
    metadata?: SubmissionMetadata;
  }): FormSubmission | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.submission_data !== undefined) {
      updates.push('submission_data = ?');
      values.push(JSON.stringify(data.submission_data));
    }
    if (data.status !== undefined) {
      updates.push('status = ?');
      values.push(data.status);

      // Set submitted_at when completing
      if (data.status === 'complete') {
        const current = this.findById(id);
        if (current && !current.submitted_at) {
          updates.push('submitted_at = ?');
          values.push(Date.now());
        }
      }
    }
    if (data.metadata !== undefined) {
      updates.push('metadata = ?');
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE form_submissions SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM form_submissions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static countByForm(formId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE form_id = ?');
    const result = stmt.get(formId) as { count: number };
    return result.count;
  }

  static countByOrganization(organizationId: string): number {
    const stmt = db.prepare('SELECT COUNT(*) as count FROM form_submissions WHERE organization_id = ?');
    const result = stmt.get(organizationId) as { count: number };
    return result.count;
  }

  private static mapRowToSubmission(row: any): FormSubmission {
    return {
      id: row.id,
      form_id: row.form_id,
      organization_id: row.organization_id,
      submission_data: JSON.parse(row.submission_data),
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      submitted_at: row.submitted_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
