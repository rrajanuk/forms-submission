import prisma from '../db/prisma';
import { Form } from '../types/forms';

interface FormCreate {
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  schema: Record<string, any>;
  status?: 'draft' | 'published' | 'archived';
  settings?: Record<string, any>;
  published_at?: number;
}
/**
 * Convert Prisma bigint to number for timestamp fields
 * Prisma returns bigint for BigInt columns, but our TypeScript types use number
 */
const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);


/**
 * Form Model - Prisma Implementation
 */
export class FormModel {
  static async create(data: FormCreate): Promise<Form> {
    const now = Date.now();
    const form = await prisma.form.create({
      data: {
        organization_id: data.organization_id,
        name: data.name,
        slug: data.slug,
        description: data.description,
        schema: JSON.stringify(data.schema),
        status: data.status || 'draft',
        settings: data.settings ? JSON.stringify(data.settings) : null,
        created_at: now,
        updated_at: now,
        published_at: data.published_at || null,
      },
    });
    return this.mapRowToForm(form);
  }

  static async findById(id: string): Promise<Form | undefined> {
    const form = await prisma.form.findUnique({ where: { id } });
    return form ? this.mapRowToForm(form) : undefined;
  }

  static async findByOrganization(organizationId: string, limit = 100, offset = 0): Promise<Form[]> {
    const forms = await prisma.form.findMany({
      where: { organization_id: organizationId },
      orderBy: { updated_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return forms.map(f => this.mapRowToForm(f));
  }

  static async findByStatus(status: 'draft' | 'published' | 'archived', organizationId?: string): Promise<Form[]> {
    const forms = await prisma.form.findMany({
      where: {
        status,
        ...(organizationId && { organization_id: organizationId }),
      },
      orderBy: { updated_at: 'desc' },
    });
    return forms.map(f => this.mapRowToForm(f));
  }

  static async findBySlug(slug: string): Promise<Form | undefined> {
    const form = await prisma.form.findFirst({ where: { slug } });
    return form ? this.mapRowToForm(form) : undefined;
  }

  static async update(id: string, data: Partial<Omit<FormCreate, 'organization_id'>>): Promise<Form | undefined> {
    try {
      const form = await prisma.form.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.schema !== undefined && { schema: JSON.stringify(data.schema) }),
          ...(data.status !== undefined && { status: data.status }),
          ...(data.settings !== undefined && { settings: JSON.stringify(data.settings) }),
          ...(data.published_at !== undefined && { published_at: data.published_at || null }),
          updated_at: Date.now(),
        },
      });
      return this.mapRowToForm(form);
    } catch {
      return undefined;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.form.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async findPublishedBySlug(slug: string): Promise<Form | undefined> {
    const form = await prisma.form.findFirst({
      where: { slug, status: 'published' },
    });
    return form ? this.mapRowToForm(form) : undefined;
  }

  static async publish(id: string): Promise<Form | undefined> {
    const form = await prisma.form.update({
      where: { id },
      data: {
        status: 'published',
        published_at: Date.now(),
      },
    });
    return this.mapRowToForm(form);
  }

  static async archive(id: string): Promise<Form | undefined> {
    const form = await prisma.form.update({
      where: { id },
      data: { status: 'archived' },
    });
    return this.mapRowToForm(form);
  }

  static async countByOrganization(organizationId: string): Promise<number> {
    return prisma.form.count({ where: { organization_id: organizationId } });
  }

  private static mapRowToForm(row: any): Form {
    return {
      id: row.id,
      organization_id: row.organization_id,
      name: row.name,
      slug: row.slug ?? undefined,
      description: row.description ?? undefined,
      schema: JSON.parse(row.schema),
      status: row.status as Form['status'],
      settings: JSON.parse(row.settings ?? '{}'),
      created_at: toNum(row.created_at),
      updated_at: toNum(row.updated_at),
      published_at: row.published_at ? toNum(row.published_at) : undefined,
    };
  }
}
