import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiKeyModel } from '../models/apiKey.model';
import { JwtPayload } from '../types/auth';

// Extend Express Request type to include user and organization
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      organization?: {
        id: string;
        plan: string;
      };
      apiKeyUser?: {
        id: string;
        organization_id: string;
      };
    }
  }
}

/**
 * Legacy API key authentication (for backward compatibility)
 * Uses the ADMIN_API_KEY environment variable
 */
export const requireApiKey = (req: Request, res: Response, next: NextFunction): void => {
  const apiKey = req.headers['x-api-key'];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  if (!apiKey || apiKey !== expectedKey) {
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    return;
  }

  next();
};

/**
 * JWT authentication
 * Validates Bearer token from Authorization header
 */
export const requireJwt = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized - No token provided' });
    return;
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Unauthorized - Invalid token' });
    return;
  }

  // Attach user info to request
  req.user = payload;
  next();
};

/**
 * Multi-tenant API key authentication
 * Validates X-API-Key header against database
 */
export const requireApiKeyMultiTenant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    res.status(401).json({ error: 'Unauthorized - No API key provided' });
    return;
  }

  // Check if it's the legacy admin key
  const legacyKey = process.env.ADMIN_API_KEY;
  if (legacyKey && apiKey === legacyKey) {
    // Legacy key has full access
    next();
    return;
  }

  // Validate against database
  const apiKeyData = ApiKeyModel.validate(apiKey);

  if (!apiKeyData) {
    res.status(401).json({ error: 'Unauthorized - Invalid API key' });
    return;
  }

  // Update last used timestamp
  ApiKeyModel.updateLastUsed(apiKeyData.id);

  // Attach user and organization info to request
  req.apiKeyUser = {
    id: apiKeyData.user_id,
    organization_id: apiKeyData.organization_id,
  };

  req.organization = {
    id: apiKeyData.organization_id,
    plan: 'free', // Will be loaded from DB if needed
  };

  next();
};

/**
 * Check if user has required scope
 * Use after requireJwt or requireApiKeyMultiTenant
 */
export const requireScope = (...requiredScopes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // For JWT users, we'd need to check user's permissions
    // For API key users, check the key's scopes
    const apiKeyId = req.headers['x-api-key'];

    if (apiKeyId) {
      const apiKeyData = ApiKeyModel.validate(apiKeyId as string);
      if (!apiKeyData) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const hasAllScopes = requiredScopes.every(scope => apiKeyData.scopes.includes(scope));
      if (!hasAllScopes) {
        res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
        return;
      }
    }

    next();
  };
};

/**
 * Check if user has required role
 */
export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden - Insufficient permissions' });
      return;
    }

    next();
  };
};
