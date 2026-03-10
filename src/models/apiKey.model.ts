import prisma from '../db/prisma';
import { ApiKey, ApiKeyCreate } from '../types/auth';
import { generateApiKey, hashApiKey } from '../utils/password';
/**
 * Convert Prisma bigint to number for timestamp fields
 * Prisma returns bigint for BigInt columns, but our TypeScript types use number
 */
const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);


/**
 * API Key Model - Prisma Implementation
 */
export class ApiKeyModel {
  static async create(data: ApiKeyCreate & { raw_key?: string }): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const now = Date.now();
    const rawKey = data.raw_key || generateApiKey();
    const key_hash = hashApiKey(rawKey);

    const apiKey = await prisma.apiKey.create({
      data: {
        user_id: data.user_id,
        organization_id: data.organization_id,
        key_hash,
        name: data.name,
        scopes: JSON.stringify(data.scopes),
        expires_at: data.expires_at || null,
        created_at: now,
      },
    });

    return {
      apiKey: {
        id: apiKey.id,
        user_id: apiKey.user_id,
        organization_id: apiKey.organization_id,
        key_hash: apiKey.key_hash,
        name: apiKey.name || undefined,
        scopes: data.scopes,
        expires_at: apiKey.expires_at ? toNum(apiKey.expires_at) : undefined,
        created_at: toNum(apiKey.created_at),
      },
      rawKey,
    };
  }

  static async findById(id: string): Promise<ApiKey | undefined> {
    const row = await prisma.apiKey.findUnique({ where: { id } });
    if (!row) return undefined;

    return {
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      key_hash: row.key_hash,
      name: row.name || undefined,
      scopes: JSON.parse(row.scopes),
      last_used_at: row.last_used_at ? toNum(row.last_used_at) : undefined,
      expires_at: row.expires_at ? toNum(row.expires_at) : undefined,
      created_at: toNum(row.created_at),
    };
  }

  static async findByKeyHash(keyHash: string): Promise<ApiKey | undefined> {
    const row = await prisma.apiKey.findUnique({ where: { key_hash: keyHash } });
    if (!row) return undefined;

    return {
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      key_hash: row.key_hash,
      name: row.name || undefined,
      scopes: JSON.parse(row.scopes),
      last_used_at: row.last_used_at ? toNum(row.last_used_at) : undefined,
      expires_at: row.expires_at ? toNum(row.expires_at) : undefined,
      created_at: toNum(row.created_at),
    };
  }

  static async validate(rawKey: string): Promise<ApiKey | null> {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await this.findByKeyHash(keyHash);

    if (!apiKey) {
      return null;
    }

    // Check if expired
    if (apiKey.expires_at && apiKey.expires_at < Date.now()) {
      return null;
    }

    return apiKey;
  }

  static async findByOrganization(organizationId: string, limit = 100, offset = 0): Promise<ApiKey[]> {
    const rows = await prisma.apiKey.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      key_hash: row.key_hash,
      name: row.name || undefined,
      scopes: JSON.parse(row.scopes),
      last_used_at: row.last_used_at ? toNum(row.last_used_at) : undefined,
      expires_at: row.expires_at ? toNum(row.expires_at) : undefined,
      created_at: toNum(row.created_at),
    }));
  }

  static async findByUser(userId: string, limit = 100, offset = 0): Promise<ApiKey[]> {
    const rows = await prisma.apiKey.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return rows.map(row => ({
      id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      key_hash: row.key_hash,
      name: row.name || undefined,
      scopes: JSON.parse(row.scopes),
      last_used_at: row.last_used_at ? toNum(row.last_used_at) : undefined,
      expires_at: row.expires_at ? toNum(row.expires_at) : undefined,
      created_at: toNum(row.created_at),
    }));
  }

  static async updateLastUsed(id: string): Promise<void> {
    await prisma.apiKey.update({
      where: { id },
      data: { last_used_at: Date.now() },
    });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.apiKey.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async deleteByUser(userId: string): Promise<number> {
    const result = await prisma.apiKey.deleteMany({
      where: { user_id: userId },
    });
    return result.count;
  }

  static async countByOrganization(organizationId: string): Promise<number> {
    return prisma.apiKey.count({
      where: { organization_id: organizationId },
    });
  }

  static async cleanupExpired(): Promise<number> {
    const result = await prisma.apiKey.deleteMany({
      where: {
        expires_at: { lt: Date.now() },
      },
    });
    return result.count;
  }
}
