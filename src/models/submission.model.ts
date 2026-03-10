import prisma from '../db/prisma';
import { Submission } from '../types/index';

const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);

interface SubmissionCreateInput {
  id: string;
  name: string;
  email: string;
  phone?: string;
  industry: string;
  message: string;
  ip?: string;
  user_agent?: string;
  page_url?: string;
  utm?: string;
  status?: 'new' | 'spam' | 'deleted';
}

export class SubmissionModel {
  static async create(data: SubmissionCreateInput): Promise<Submission> {
    const submission = await prisma.submission.create({
      data: {
        id: data.id,
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        industry: data.industry,
        message: data.message,
        ip: data.ip || null,
        user_agent: data.user_agent || null,
        page_url: data.page_url || null,
        utm: data.utm || null,
        status: data.status || 'new',
        created_at: Date.now(),
      },
    });

    return {
      id: submission.id,
      created_at: toNum(submission.created_at),
      name: submission.name,
      email: submission.email,
      phone: submission.phone || undefined,
      industry: submission.industry,
      message: submission.message,
      ip: submission.ip || undefined,
      user_agent: submission.user_agent || undefined,
      page_url: submission.page_url || undefined,
      utm: submission.utm || undefined,
      status: submission.status as Submission['status'],
    };
  }

  static async findById(id: string): Promise<Submission | undefined> {
    const row = await prisma.submission.findUnique({ where: { id } });
    if (!row) return undefined;

    return {
      id: row.id,
      created_at: toNum(row.created_at),
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      industry: row.industry,
      message: row.message,
      ip: row.ip || undefined,
      user_agent: row.user_agent || undefined,
      page_url: row.page_url || undefined,
      utm: row.utm || undefined,
      status: row.status as Submission['status'],
    };
  }

  static async findAll(limit = 100, offset = 0): Promise<Submission[]> {
    const rows = await prisma.submission.findMany({
      where: {
        status: {
          not: 'deleted',
        },
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map(row => ({
      id: row.id,
      created_at: toNum(row.created_at),
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      industry: row.industry,
      message: row.message,
      ip: row.ip || undefined,
      user_agent: row.user_agent || undefined,
      page_url: row.page_url || undefined,
      utm: row.utm || undefined,
      status: row.status as Submission['status'],
    }));
  }

  static async findDuplicate(email: string, message: string, timeWindowMs = 60000): Promise<Submission | undefined> {
    const cutoff = Date.now() - timeWindowMs;
    const row = await prisma.submission.findFirst({
      where: {
        email,
        message,
        created_at: { gt: cutoff },
      },
    });

    if (!row) return undefined;

    return {
      id: row.id,
      created_at: toNum(row.created_at),
      name: row.name,
      email: row.email,
      phone: row.phone || undefined,
      industry: row.industry,
      message: row.message,
      ip: row.ip || undefined,
      user_agent: row.user_agent || undefined,
      page_url: row.page_url || undefined,
      utm: row.utm || undefined,
      status: row.status as Submission['status'],
    };
  }

  static async updateStatus(id: string, status: Submission['status']): Promise<boolean> {
    try {
      await prisma.submission.update({
        where: { id },
        data: { status },
      });
      return true;
    } catch {
      return false;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.submission.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async count(): Promise<number> {
    return prisma.submission.count();
  }
}
