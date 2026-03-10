import prisma from '../db/prisma';
import { DraftSubmission, DraftSubmissionCreate } from '../types/forms';
/**
 * Convert Prisma bigint to number for timestamp fields
 * Prisma returns bigint for BigInt columns, but our TypeScript types use number
 */
const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);


/**
 * DraftSubmission Model - Prisma Implementation
 */
export class DraftSubmissionModel {
  static async create(data: DraftSubmissionCreate): Promise<DraftSubmission> {
    const now = Date.now();
    const draft = await prisma.draftSubmission.create({
      data: {
        form_id: data.form_id,
        session_id: data.session_id,
        submission_data: JSON.stringify(data.submission_data),
        current_step: data.current_step || 0,
        created_at: now,
        updated_at: now,
        expires_at: data.expires_at || now + (7 * 24 * 60 * 60 * 1000), // 7 days default
      },
    });

    return this.mapRowToDraft(draft);
  }

  static async findById(id: string): Promise<DraftSubmission | undefined> {
    const draft = await prisma.draftSubmission.findUnique({ where: { id } });
    return draft ? this.mapRowToDraft(draft) : undefined;
  }

  static async findBySession(formId: string, sessionId: string): Promise<DraftSubmission | undefined> {
    const draft = await prisma.draftSubmission.findFirst({
      where: {
        form_id: formId,
        session_id: sessionId,
      },
    });
    return draft ? this.mapRowToDraft(draft) : undefined;
  }

  static async update(id: string, data: Partial<Omit<DraftSubmissionCreate, 'form_id' | 'session_id'>>): Promise<DraftSubmission | undefined> {
    try {
      const now = Date.now();
      const draft = await prisma.draftSubmission.update({
        where: { id },
        data: {
          ...(data.submission_data !== undefined && { submission_data: JSON.stringify(data.submission_data) }),
          ...(data.current_step !== undefined && { current_step: data.current_step }),
          ...(data.expires_at !== undefined && { expires_at: data.expires_at }),
          updated_at: now,
        },
      });
      return this.mapRowToDraft(draft);
    } catch {
      return undefined;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.draftSubmission.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async deleteBySession(formId: string, sessionId: string): Promise<number> {
    const result = await prisma.draftSubmission.deleteMany({
      where: {
        form_id: formId,
        session_id: sessionId,
      },
    });
    return result.count;
  }

  static async findByFormAndSession(formId: string, sessionId: string): Promise<DraftSubmission | undefined> {
    const draft = await prisma.draftSubmission.findFirst({
      where: {
        form_id: formId,
        session_id: sessionId,
        expires_at: { gt: Date.now() },
      },
      orderBy: { updated_at: 'desc' },
    });
    return draft ? this.mapRowToDraft(draft) : undefined;
  }

  static async deleteExpired(): Promise<{ count: number; drafts: DraftSubmission[] }> {
    const now = Date.now();
    const expiredDrafts = await prisma.draftSubmission.findMany({
      where: {
        expires_at: { lt: now },
      },
    });

    const drafts = expiredDrafts.map(d => this.mapRowToDraft(d));

    const result = await prisma.draftSubmission.deleteMany({
      where: {
        expires_at: { lt: now },
      },
    });

    return { count: result.count, drafts };
  }

  static async findByForm(formId: string, limit = 100, offset = 0): Promise<DraftSubmission[]> {
    const drafts = await prisma.draftSubmission.findMany({
      where: { form_id: formId },
      orderBy: { updated_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return drafts.map(d => this.mapRowToDraft(d));
  }

  private static mapRowToDraft(row: any): DraftSubmission {
    return {
      id: row.id,
      form_id: row.form_id,
      session_id: row.session_id,
      submission_data: JSON.parse(row.submission_data),
      current_step: row.current_step,
      created_at: toNum(row.created_at),
      updated_at: toNum(row.updated_at),
      expires_at: toNum(row.expires_at),
    };
  }
}
