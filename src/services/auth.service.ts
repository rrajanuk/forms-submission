import prisma from '../lib/prisma';
import { hashPassword, comparePassword } from '../utils/password';
import { generateAccessToken, generateRefreshToken, verifyToken, getTokenExpiresIn } from '../utils/jwt';
import type { User, RegisterRequest, LoginRequest, AuthResponse, AuthTokens } from '../types/auth';

/**
 * Authentication Service
 * Handles user registration, login, and token management
 */

export class AuthService {
  /**
   * Register a new user
   */
  static async register(data: RegisterRequest): Promise<AuthResponse> {
    const { email, password, name } = data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new Error('A user with this email already exists');
    }

    // Hash password
    const passwordHash = hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        emailVerified: false,
      },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Login user with email and password
   */
  static async login(data: LoginRequest): Promise<AuthResponse> {
    const { email, password } = data;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    // Verify password
    const isValid = comparePassword(password, user.passwordHash);
    if (!isValid) {
      throw new Error('Invalid email or password');
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email);

    return {
      user: this.sanitizeUser(user),
      tokens,
    };
  }

  /**
   * Refresh access token using refresh token
   */
  static async refresh(refreshToken: string): Promise<AuthTokens> {
    // Verify refresh token
    const payload = verifyToken(refreshToken);
    if (!payload || !payload.sub) {
      throw new Error('Invalid refresh token');
    }

    // Find refresh token in database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!storedToken) {
      throw new Error('Refresh token not found');
    }

    // Check if token is revoked
    if (storedToken.revokedAt) {
      throw new Error('Refresh token has been revoked');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      throw new Error('Refresh token has expired');
    }

    // Generate new tokens
    const tokens = await this.generateTokens(storedToken.user.id, storedToken.user.email);

    // Revoke old refresh token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    return tokens;
  }

  /**
   * Logout user (revoke refresh token)
   */
  static async logout(refreshToken: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { token: refreshToken },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Find user by ID
   */
  static async findUserById(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Find user by email
   */
  static async findUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Generate access and refresh tokens
   */
  private static async generateTokens(userId: string, email: string): Promise<AuthTokens> {
    // Generate access token
    const accessToken = generateAccessToken({ sub: userId, email });

    // Generate refresh token
    const refreshTokenValue = generateRefreshToken(userId);

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Store refresh token in database
    await prisma.refreshToken.create({
      data: {
        userId,
        token: refreshTokenValue,
        expiresAt,
      },
    });

    // Get expiration time for access token (in milliseconds)
    const expiresIn = getTokenExpiresIn(accessToken) || 15 * 60 * 1000; // Default 15 minutes

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn,
    };
  }

  /**
   * Remove sensitive data from user object
   */
  private static sanitizeUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
