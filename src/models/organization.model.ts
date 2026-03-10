import prisma from '../db/prisma';
import { Organization } from '../types/auth';

const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);

/**
 * Organization Model - Prisma Implementation
 */
export class OrganizationModel {
  static async create(data: Omit<Organization, 'id' | 'created_at' | 'updated_at'>): Promise<Organization> {
    const now = Date.now();
    const org = await prisma.organization.create({
      data: {
        name: data.name,
        slug: data.slug,
        plan: data.plan,
        created_at: now,
        updated_at: now,
      },
    });
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan as Organization['plan'],
      created_at: toNum(org.created_at),
      updated_at: toNum(org.updated_at),
    };
  }

  static async findById(id: string): Promise<Organization | undefined> {
    const org = await prisma.organization.findUnique({
      where: { id },
    });
    if (!org) return undefined;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan as Organization['plan'],
      created_at: toNum(org.created_at),
      updated_at: toNum(org.updated_at),
    };
  }

  static async findBySlug(slug: string): Promise<Organization | undefined> {
    const org = await prisma.organization.findUnique({
      where: { slug },
    });
    if (!org) return undefined;
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.plan as Organization['plan'],
      created_at: toNum(org.created_at),
      updated_at: toNum(org.updated_at),
    };
  }

  static async findAll(limit = 100, offset = 0): Promise<Organization[]> {
    const orgs = await prisma.organization.findMany({
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });
    return orgs.map(o => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      plan: o.plan as Organization['plan'],
      created_at: toNum(o.created_at),
      updated_at: toNum(o.updated_at),
    }));
  }

  static async update(id: string, data: Partial<Omit<Organization, 'id' | 'created_at'>>): Promise<Organization | undefined> {
    try {
      const org = await prisma.organization.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.slug !== undefined && { slug: data.slug }),
          ...(data.plan !== undefined && { plan: data.plan }),
          updated_at: Date.now(),
        },
      });
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.plan as Organization['plan'],
        created_at: toNum(org.created_at),
        updated_at: toNum(org.updated_at),
      };
    } catch {
      return undefined;
    }
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.organization.delete({
        where: { id },
      });
      return true;
    } catch {
      return false;
    }
  }

  static async count(): Promise<number> {
    return prisma.organization.count();
  }
}
