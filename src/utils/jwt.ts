import jwt, { SignOptions } from 'jsonwebtoken';
import { JwtPayload } from '../types/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'change-this-secret-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

/**
 * Generate an access token for a user
 */
export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

/**
 * Generate a refresh token for a user
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Decode a JWT without verification (for getting expiration, etc.)
 */
export function decodeToken(token: string): JwtPayload | null {
  try {
    const decoded = jwt.decode(token) as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Get token expiration time in seconds
 */
export function getTokenExpiration(token: string): number | null {
  const decoded = decodeToken(token);
  return decoded?.exp ?? null;
}

/**
 * Calculate when a token will expire (in milliseconds from now)
 */
export function getTokenExpiresIn(token: string): number | null {
  const exp = getTokenExpiration(token);
  if (!exp) return null;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = exp - now;
  return expiresIn > 0 ? expiresIn * 1000 : 0;
}
