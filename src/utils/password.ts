import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

/**
 * Hash a password using bcrypt
 */
export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

/**
 * Compare a plain text password with a hashed password
 */
export function comparePassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}

/**
 * Generate a random API key
 */
export function generateApiKey(): string {
  const buffer = crypto.randomBytes(32);
  return `fp_${buffer.toString('base64url')}`;
}

/**
 * Generate a random token for refresh tokens, etc.
 */
export function generateRandomToken(): string {
  const buffer = crypto.randomBytes(32);
  return buffer.toString('base64url');
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}
