import prisma from '../db/prisma';
import { RefreshToken } from '../types/auth';

const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);

export class RefreshTokenModel {
  static async create(userId: string): Promise<RefreshToken> {
    // Generate a random token
    const generatedToken = Array.from({ length: 32 }, () => 
      Math.random().toString(36)[2] || '0'
    ).join('');
    
    const result = await prisma.refreshToken.create({
      data: {
        user_id: userId,
        token: generatedToken,
        expires_at: Date.now() + (7 * 24 * 60 * 60 * 1000),
        created_at: Date.now(),
      },
    });
    return this.mapRowToToken(result);
  }

  static async findByToken(token: string): Promise<RefreshToken | undefined> {
    const row = await prisma.refreshToken.findUnique({ where: { token } });
    return row ? this.mapRowToToken(row) : undefined;
  }

  static async findByUserId(userId: string): Promise<RefreshToken[]> {
    const tokens = await prisma.refreshToken.findMany({
      where: { user_id: userId },
      orderBy: { created_at: 'desc' },
    });
    return tokens.map(t => this.mapRowToToken(t));
  }

  static async revoke(token: string): Promise<boolean> {
    try {
      await prisma.refreshToken.update({
        where: { token },
        data: { revoked_at: Date.now() },
      });
      return true;
    } catch {
      return false;
    }
  }

  static async revokeAllForUser(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: { revoked_at: Date.now() },
    });
  }

  static async delete(token: string): Promise<boolean> {
    try {
      await prisma.refreshToken.delete({ where: { token } });
      return true;
    } catch {
      return false;
    }
  }

  static async deleteExpired(): Promise<number> {
    const result = await prisma.refreshToken.deleteMany({
      where: {
        expires_at: { lt: Date.now() },
      },
    });
    return result.count;
  }

  static async isValid(refreshToken: string): Promise<boolean> {
    const tokenRecord = await this.findByToken(refreshToken);
    if (!tokenRecord) return false;
    if (tokenRecord.revoked_at) return false;
    if (tokenRecord.expires_at < Date.now()) return false;
    return true;
  }

  private static mapRowToToken(row: any): RefreshToken {
    return {
      id: row.id,
      user_id: row.user_id,
      token: row.token,
      expires_at: toNum(row.expires_at),
      created_at: toNum(row.created_at),
      revoked_at: row.revoked_at ? toNum(row.revoked_at) : undefined,
    };
  }
}
