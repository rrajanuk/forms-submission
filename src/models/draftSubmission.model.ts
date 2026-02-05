import db from '../db/database';
import { v4 as uuidv4 } from 'uuid';
import { DraftSubmission } from '../types/forms';

export class DraftSubmissionModel {
  static create(data: {
    form_id: string;
    session_id: string;
    submission_data: Record<string, any>;
    current_step?: number;
  }): DraftSubmission {
    const stmt = db.prepare(`
      INSERT INTO draft_submissions (id, form_id, session_id, submission_data, current_step, created_at, updated_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const id = uuidv4();
    const now = Date.now();
    const expiryDays = parseInt(process.env.DRAFT_EXPIRY_DAYS || '7');
    const expires_at = now + (expiryDays * 24 * 60 * 60 * 1000);

    stmt.run(
      id,
      data.form_id,
      data.session_id,
      JSON.stringify(data.submission_data),
      data.current_step || 0,
      now,
      now,
      expires_at
    );

    return {
      id,
      form_id: data.form_id,
      session_id: data.session_id,
      submission_data: data.submission_data,
      current_step: data.current_step || 0,
      created_at: now,
      updated_at: now,
      expires_at,
    };
  }

  static findById(id: string): DraftSubmission | undefined {
    const stmt = db.prepare('SELECT * FROM draft_submissions WHERE id = ?');
    const row = stmt.get(id) as any;
    if (!row) return undefined;

    return this.mapRowToDraft(row);
  }

  static findByFormAndSession(formId: string, sessionId: string): DraftSubmission | undefined {
    const stmt = db.prepare('SELECT * FROM draft_submissions WHERE form_id = ? AND session_id = ?');
    const row = stmt.get(formId, sessionId) as any;
    if (!row) return undefined;

    return this.mapRowToDraft(row);
  }

  static findBySession(sessionId: string): DraftSubmission[] {
    const stmt = db.prepare('SELECT * FROM draft_submissions WHERE session_id = ?');
    const rows = stmt.all(sessionId) as any[];
    return rows.map(row => this.mapRowToDraft(row));
  }

  static findByForm(formId: string, limit = 100, offset = 0): DraftSubmission[] {
    const stmt = db.prepare(`
      SELECT * FROM draft_submissions
      WHERE form_id = ?
      ORDER BY updated_at DESC
      LIMIT ? OFFSET ?
    `);
    const rows = stmt.all(formId, limit, offset) as any[];
    return rows.map(row => this.mapRowToDraft(row));
  }

  static update(id: string, data: {
    submission_data?: Record<string, any>;
    current_step?: number;
  }): DraftSubmission | undefined {
    const updates: string[] = [];
    const values: any[] = [];

    if (data.submission_data !== undefined) {
      updates.push('submission_data = ?');
      values.push(JSON.stringify(data.submission_data));
    }
    if (data.current_step !== undefined) {
      updates.push('current_step = ?');
      values.push(data.current_step);
    }

    if (updates.length === 0) {
      return this.findById(id);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = db.prepare(`UPDATE draft_submissions SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    return this.findById(id);
  }

  static upsert(data: {
    form_id: string;
    session_id: string;
    submission_data: Record<string, any>;
    current_step?: number;
  }): DraftSubmission {
    const existing = this.findByFormAndSession(data.form_id, data.session_id);

    if (existing) {
      return this.update(existing.id, data) || existing;
    }

    return this.create(data);
  }

  static delete(id: string): boolean {
    const stmt = db.prepare('DELETE FROM draft_submissions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  static deleteBySession(sessionId: string): number {
    const stmt = db.prepare('DELETE FROM draft_submissions WHERE session_id = ?');
    const result = stmt.run(sessionId);
    return result.changes;
  }

  static deleteExpired(): number {
    const stmt = db.prepare('DELETE FROM draft_submissions WHERE expires_at < ?');
    const result = stmt.run(Date.now());
    return result.changes;
  }

  private static mapRowToDraft(row: any): DraftSubmission {
    return {
      id: row.id,
      form_id: row.form_id,
      session_id: row.session_id,
      submission_data: JSON.parse(row.submission_data),
      current_step: row.current_step,
      created_at: row.created_at,
      updated_at: row.updated_at,
      expires_at: row.expires_at,
    };
  }
}
