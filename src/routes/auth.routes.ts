import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { requireJwt } from '../middleware/auth';
import { RegisterRequest, LoginRequest, RefreshRequest } from '../types/auth';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterRequest = req.body;

    // Validation
    if (!data.email || !data.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Password validation
    if (data.password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const result = await AuthService.register(data);

    res.status(201).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'A user with this email already exists') {
        return res.status(409).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    // Validation
    if (!data.email || !data.password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const result = await AuthService.login(data);

    res.status(200).json(result);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Invalid email or password') {
        return res.status(401).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const data: RefreshRequest = req.body;

    if (!data.refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const tokens = await AuthService.refresh(data.refreshToken);

    res.status(200).json(tokens);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Invalid') || error.message.includes('not found') || error.message.includes('expired')) {
        return res.status(401).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout
 * Logout user (revoke refresh token)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const data: RefreshRequest = req.body;

    if (!data.refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    await AuthService.logout(data.refreshToken);

    res.status(200).json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', requireJwt, async (req: Request, res: Response) => {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await AuthService.findUserById(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
