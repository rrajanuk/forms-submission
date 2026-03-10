import prisma from '../db/prisma';
import { User, UserCreate, UserWithPassword } from '../types/auth';
import { hashPassword } from '../utils/password';
/**
 * Convert Prisma bigint to number for timestamp fields
 * Prisma returns bigint for BigInt columns, but our TypeScript types use number
 */
const toNum = (v: any): any => (typeof v === 'bigint' ? Number(v) : v ?? undefined);


/**
 * User Model - Prisma Implementation
 */
export class UserModel {
  static async create(data: UserCreate): Promise<User> {
    const password_hash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        organization_id: data.organization_id,
        email: data.email,
        password_hash,
        name: data.name,
        role: data.role || 'member',
        created_at: Date.now(),
      },
    });

    return {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at ? toNum(user.email_verified_at) : undefined,
    };
  }

  static async findById(id: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) return undefined;

    return {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at ? toNum(user.email_verified_at) : undefined,
    };
  }

  static async findByEmail(email: string): Promise<User | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;

    return {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at ? toNum(user.email_verified_at) : undefined,
    };
  }

  static async findByEmailWithPassword(email: string): Promise<UserWithPassword | undefined> {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;

    return {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      password_hash: user.password_hash,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      
      
    };
  }

  static async findByOrganization(organizationId: string, limit = 100, offset = 0): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { organization_id: organizationId },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
    });

    return users.map(user => ({
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      
      
    }));
  }

  static async updateLastLogin(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: { last_login_at: Date.now() },
    });
  }

  static async updateEmailVerified(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        email_verified: 1,
        email_verified_at: Date.now(),
      },
    });
  }

  static async setVerificationToken(id: string, token: string, expiresAt: number): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        verification_token: token,
        verification_token_expires_at: expiresAt,
      },
    });
  }

  static async createWithVerificationToken(data: UserCreate, token: string, expiresAt: number): Promise<{ user: User; verificationToken: string }> {
    const password_hash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        organization_id: data.organization_id,
        email: data.email,
        password_hash,
        name: data.name,
        role: data.role || 'owner',
        created_at: Date.now(),
        verification_token: token,
        verification_token_expires_at: expiresAt,
      },
    });

    return {
      user: {
        id: user.id,
        organization_id: user.organization_id,
        email: user.email,
        name: user.name || undefined,
        role: user.role as User['role'],
        created_at: toNum(user.created_at),
        last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      },
      verificationToken: token,
    };
  }

  static async clearVerificationToken(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        verification_token: null,
        verification_token_expires_at: null,
      },
    });
  }

  static async findByVerificationToken(token: string): Promise<User | undefined> {
    const user = await prisma.user.findFirst({
      where: {
        verification_token: token,
        verification_token_expires_at: { gt: Date.now() },
      },
    });

    if (!user) return undefined;

    return {
      id: user.id,
      organization_id: user.organization_id,
      email: user.email,
      name: user.name || undefined,
      role: user.role as User['role'],
      created_at: toNum(user.created_at),
      last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
      email_verified: user.email_verified,
      email_verified_at: user.email_verified_at ? toNum(user.email_verified_at) : undefined,
    };
  }

  static async update(id: string, data: Partial<Pick<User, 'name' | 'role'>>): Promise<User | undefined> {
    try {
      const user = await prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.role !== undefined && { role: data.role }),
        },
      });

      return {
        id: user.id,
        organization_id: user.organization_id,
        email: user.email,
        name: user.name || undefined,
        role: user.role as User['role'],
        created_at: toNum(user.created_at),
        last_login_at: user.last_login_at ? toNum(user.last_login_at) : undefined,
        
        
      };
    } catch {
      return undefined;
    }
  }

  static async verifyEmail(id: string): Promise<void> {
    await prisma.user.update({
      where: { id },
      data: {
        email_verified: 1,
        email_verified_at: Date.now(),
        verification_token: null,
        verification_token_expires_at: null,
      },
    });
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await prisma.user.delete({ where: { id } });
      return true;
    } catch {
      return false;
    }
  }

  static async countByOrganization(organizationId: string): Promise<number> {
    return prisma.user.count({ where: { organization_id: organizationId } });
  }
}
