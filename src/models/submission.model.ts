import db from '../db/database';
import { Submission } from '../types';

export class SubmissionModel {
  static create(submission: Omit<Submission, 'created_at'>): Submission {
    const stmt = db.prepare(`
      INSERT INTO submissions (
        id, created_at, name, email, phone, industry, message,
        ip, user_agent, page_url, utm, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const created_at = Date.now();
    
    stmt.run(
      submission.id,
      created_at,
      submission.name,
      submission.email,
      submission.phone || null,
      submission.industry,
      submission.message,
      submission.ip || null,
      submission.user_agent || null,
      submission.page_url || null,
      submission.utm || null,
      submission.status
    );

    return { ...submission, created_at };
  }

  static findById(id: string): Submission | undefined {
    const stmt = db.prepare('SELECT * FROM submissions WHERE id = ? AND status != ?');
    return stmt.get(id, 'deleted') as Submission | undefined;
  }

  static findAll(limit = 100, offset = 0): Submission[] {
    const stmt = db.prepare(
      'SELECT * FROM submissions WHERE status != ? ORDER BY created_at DESC LIMIT ? OFFSET ?'
    );
    return stmt.all('deleted', limit, offset) as Submission[];
  }

  static delete(id: string): boolean {
    // Soft delete by marking as deleted
    const stmt = db.prepare('UPDATE submissions SET status = ? WHERE id = ?');
    const result = stmt.run('deleted', id);
    return result.changes > 0;
  }

  static findDuplicate(email: string, message: string, timeWindowMs: number): Submission | undefined {
    const cutoffTime = Date.now() - timeWindowMs;
    const stmt = db.prepare(`
      SELECT * FROM submissions 
      WHERE email = ? 
      AND message = ? 
      AND created_at > ?
      AND status != 'deleted'
      ORDER BY created_at DESC
      LIMIT 1
    `);
    return stmt.get(email, message, cutoffTime) as Submission | undefined;
  }

  static countByIpInWindow(ip: string, windowMs: number): number {
    const cutoffTime = Date.now() - windowMs;
    const stmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM submissions 
      WHERE ip = ? AND created_at > ?
    `);
    const result = stmt.get(ip, cutoffTime) as { count: number };
    return result.count;
  }
}
