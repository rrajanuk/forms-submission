import prisma from '../db/prisma';

/**
 * Convert Prisma bigint to number for timestamp fields
 * Prisma returns bigint for BigInt columns, but our TypeScript types use number
 */
interface IdempotencyKey {
  key: string;
  response: any;
  created_at: number;
}

const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);


/**
 * IdempotencyKey Model - Prisma Implementation
 */
export class IdempotencyModel {
  static async create(key: string, response: string): Promise<void> {
    await prisma.idempotencyKey.create({
      data: {
        key,
        response: JSON.stringify(response),
        created_at: Date.now(),
      },
    });
  }

  static async findByKey(key: string): Promise<IdempotencyKey | undefined> {
    const row = await prisma.idempotencyKey.findUnique({ where: { key } });
    if (!row) return undefined;

    return {
      key: row.key,
      response: JSON.parse(row.response),
      created_at: toNum(row.created_at),
    };
  }

  static async save(key: string, response: string): Promise<void> {
    await prisma.idempotencyKey.upsert({
      where: { key },
      create: {
        key,
        response: JSON.stringify(response),
        created_at: Date.now(),
      },
      update: {
        response: JSON.stringify(response),
        created_at: Date.now(),
      },
    });
  }

  static async delete(key: string): Promise<boolean> {
    try {
      await prisma.idempotencyKey.delete({ where: { key } });
      return true;
    } catch {
      return false;
    }
  }

  static async deleteMany(keys: string[]): Promise<number> {
    const result = await prisma.idempotencyKey.deleteMany({
      where: { key: { in: keys } },
    });
    return result.count;
  }

  static async cleanup(olderThanMs: number): Promise<number> {
    const cutoff = Date.now() - olderThanMs;
    const result = await prisma.idempotencyKey.deleteMany({
      where: { created_at: { lt: cutoff } },
    });
    return result.count;
  }

  static async count(): Promise<number> {
    return prisma.idempotencyKey.count();
  }
}
