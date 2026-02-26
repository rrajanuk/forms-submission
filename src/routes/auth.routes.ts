import { Router, Request, Response } from 'express';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import { RefreshTokenModel } from '../models/refreshToken.model';
import { ApiKeyModel } from '../models/apiKey.model';
import { generateAccessToken, verifyToken } from '../utils/jwt';
import { comparePassword } from '../utils/password';
import { RegisterRequest, LoginRequest, RefreshRequest, AuthResponse } from '../types/auth';
import { sendVerificationEmail } from '../services/email.service';

const router = Router();

/**
 * Helper to generate slug from organization name
 */
function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');

  let slug = base;
  let counter = 1;

  // Ensure slug is unique
  while (OrganizationModel.findBySlug(slug)) {
    slug = `${base}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * POST /api/auth/register
 * Register a new organization and user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterRequest = req.body;

    // Validation
    if (!data.organization_name || !data.email || !data.password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (data.password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = UserModel.findByEmail(data.email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Check if slug is taken
    const slug = data.organization_slug || generateSlug(data.organization_name);

    if (OrganizationModel.findBySlug(slug)) {
      return res.status(409).json({ error: 'Organization slug already taken' });
    }

    // Create organization
    const organization = OrganizationModel.create({
      name: data.organization_name,
      slug,
      plan: 'free',
    });

    // Create user with verification token
    const { user, verificationToken } = UserModel.createWithVerificationToken({
      organization_id: organization.id,
      email: data.email,
      password: data.password,
      name: data.name,
      role: 'owner',
    });

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    });

    const refreshToken = RefreshTokenModel.create(user.id);

    // Create default API key for convenience
    const { rawKey } = ApiKeyModel.create({
      user_id: user.id,
      organization_id: organization.id,
      name: 'Default API Key',
      scopes: ['forms:read', 'forms:write', 'submissions:read'],
    });

    const response: AuthResponse = {
      user,
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
        expiresIn: 15 * 60, // 15 minutes in seconds
      },
      organization,
    };

    // Include the raw API key in the response (only shown once)
    (response as any).apiKey = rawKey;

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name || user.email.split('@')[0],
      verificationToken
    );

    if (emailResult.success) {
      // Don't include token in response if email was sent successfully
    } else {
      // Include token in response as fallback if email failed
      if (emailResult.fallbackToken) {
        (response as any).verificationToken = verificationToken;
      }
    }

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login with email and password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    // Validation
    if (!data.email || !data.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = UserModel.findByEmail(data.email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    if (!comparePassword(data.password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get organization
    const organization = OrganizationModel.findById(user.organization_id);
    if (!organization) {
      return res.status(500).json({ error: 'Organization not found' });
    }

    // Update last login
    UserModel.updateLastLogin(user.id);

    // Generate tokens
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    });

    const refreshToken = RefreshTokenModel.create(user.id);

    const response: AuthResponse = {
      user: {
        id: user.id,
        organization_id: user.organization_id,
        email: user.email,
        name: user.name,
        role: user.role,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
      },
      tokens: {
        accessToken,
        refreshToken: refreshToken.token,
        expiresIn: 15 * 60,
      },
      organization,
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const data: RefreshRequest = req.body;

    if (!data.refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Find refresh token
    const refreshToken = RefreshTokenModel.findByToken(data.refreshToken);
    if (!refreshToken) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Check if token is valid
    if (!RefreshTokenModel.isValid(refreshToken)) {
      // Revoke the token
      RefreshTokenModel.revoke(data.refreshToken);
      return res.status(401).json({ error: 'Refresh token expired or revoked' });
    }

    // Get user
    const user = UserModel.findById(refreshToken.user_id);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Get organization
    const organization = OrganizationModel.findById(user.organization_id);
    if (!organization) {
      return res.status(500).json({ error: 'Organization not found' });
    }

    // Generate new access token
    const accessToken = generateAccessToken({
      sub: user.id,
      email: user.email,
      organization_id: user.organization_id,
      role: user.role,
    });

    res.json({
      accessToken,
      expiresIn: 15 * 60,
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout by revoking refresh token
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      RefreshTokenModel.revoke(refreshToken);
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/me
 * Get current user info (requires auth)
 */
router.post('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = UserModel.findById(payload.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const organization = OrganizationModel.findById(user.organization_id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({
      user,
      organization,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email with token
 */
router.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    const user = UserModel.findByVerificationToken(token);
    if (!user) {
      return res.status(404).json({ error: 'Invalid verification token' });
    }

    // Check if token has expired
    if (user.verification_token_expires_at && user.verification_token_expires_at < Date.now()) {
      return res.status(400).json({ error: 'Verification token has expired' });
    }

    // Verify email
    const verified = UserModel.verifyEmail(user.id);
    if (!verified) {
      return res.status(500).json({ error: 'Failed to verify email' });
    }

    res.json({
      message: 'Email verified successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerified: true,
      },
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/resend-verification
 * Resend verification email (requires auth)
 */
router.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const user = UserModel.findByIdWithPassword(payload.sub);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already verified
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email is already verified' });
    }

    // Generate new verification token
    const verificationToken = require('crypto').randomBytes(32).toString('hex');
    UserModel.setVerificationToken(user.id, verificationToken);

    // Send verification email
    const emailResult = await sendVerificationEmail(
      user.email,
      user.name || user.email.split('@')[0],
      verificationToken
    );

    if (emailResult.success) {
      res.json({
        message: 'Verification email sent! Please check your inbox.',
      });
    } else {
      // Include token in response as fallback if email failed
      res.json({
        message: 'Verification email resent! Please check your inbox.',
        // Include token only if email sending failed
        ...(emailResult.fallbackToken && { verificationToken: emailResult.fallbackToken }),
      });
    }
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
