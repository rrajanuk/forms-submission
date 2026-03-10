import prisma from '../db/prisma';
import { FormSubmission, SubmissionMetadata } from '../types/forms';

/**
 * Convert Prisma bigint to number
 */
const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);

/**
 * Form Submission Model - Prisma Implementation
 * All methods are now async
 */
export class FormSubmissionModel {
  static async create(data: {
    form_id: string;
    organization_id: string;
    submission_data: Record<string, any>;
    status?: 'draft' | 'complete' | 'abandoned';
    metadata?: SubmissionMetadata;
  }): Promise<FormSubmission> {
    const now = Date.now();
    const isComplete = data.status === 'complete';

    const submission = await prisma.formSubmission.create({
      data: {
        form_id: data.form_id,
        organization_id: data.organization_id,
        submission_data: JSON.stringify(data.submission_data),
        status: data.status || 'complete',
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        submitted_at: isComplete ? now : null,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: submission.id,
      form_id: submission.form_id,
      organization_id: submission.organization_id,
      submission_data: data.submission_data,
      status: data.status || 'complete',
      metadata: data.metadata,
      submitted_at: isComplete ? now : undefined,
      created_at: now,
      updated_at: now,
    };
  }

  static async findById(id: string): Promise<FormSubmission | undefined> {
    const row = await prisma.formSubmission.findUnique({
      where: { id },
    });
    if (!row) return undefined;

    return this.mapRowToSubmission(row);
  }

  static async findByForm(formId: string, limit = 100, offset = 0): Promise<FormSubmission[]> {
    const rows = await prisma.formSubmission.findMany({
      where: { form_id: formId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static async findByOrganization(organizationId: string, limit = 100, offset = 0): Promise<FormSubmission[]> {
    const rows = await prisma.formSubmission.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static async findByStatus(status: 'draft' | 'complete' | 'abandoned', limit = 100, offset = 0): Promise<FormSubmission[]> {
    const rows = await prisma.formSubmission.findMany({
      where: { status: status },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return rows.map(row => this.mapRowToSubmission(row));
  }

  static async update(id: string, data: {
    submission_data?: Record<string, any>;
    status?: 'draft' | 'complete' | 'abandoned';
    metadata?: SubmissionMetadata;
  }): Promise<FormSubmission | undefined> {
    try {
      const current = await this.findById(id);

      const submission = await prisma.formSubmission.update({
        where: { id },
        data: {
          ...(data.submission_data !== undefined && {
            submission_data: JSON.stringify(data.submission_data),
          }),
          ...(data.status !== undefined && {
            status: data.status,
            ...(data.status === 'complete' && current && !current.submitted_at && {
              submitted_at: Date.now(),
            }),
          }),
          ...(data.metadata !== undefined && {
            metadata: JSON.stringify(data.metadata),
          }),
          updated_at: BigInt(Date.now()),
        },
      });

      return this.mapRowToSubmission(submission);
    } catch {
      return undefined;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.formSubmission.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  static async countByForm(formId: string): Promise<number> {
    return prisma.formSubmission.count({
      where: { form_id: formId },
    });
  }

  static async countByOrganization(organizationId: string): Promise<number> {
    return prisma.formSubmission.count({
      where: { organization_id: organizationId },
    });
  }

  private static mapRowToSubmission(row: any): FormSubmission {
    return {
      id: row.id,
      form_id: row.form_id,
      organization_id: row.organization_id,
      submission_data: JSON.parse(row.submission_data),
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      submitted_at: row.submitted_at ? toNum(row.submitted_at) : undefined,
      created_at: toNum(row.created_at),
      updated_at: toNum(row.updated_at),
    };
  }
}
