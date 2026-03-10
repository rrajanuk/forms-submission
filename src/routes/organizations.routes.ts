import { Router, Request, Response } from 'express';
import { OrganizationModel } from '../models/organization.model';
import { UserModel } from '../models/user.model';
import { ApiKeyModel } from '../models/apiKey.model';
import { requireJwt } from '../middleware/auth';

const router = Router();

/**
 * Middleware to check if user is member of organization
 */
const requireOrganizationAccess = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  const apiKeyUser = (req as any).apiKeyUser;
  const organizationId = req.params.id || req.body.organization_id;

  const userOrgId = user?.organization_id || apiKeyUser?.organization_id;

  if (userOrgId !== organizationId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
};

/**
 * GET /api/organizations
 * Get current user's organization
 */
router.get('/', requireJwt, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const organization = await OrganizationModel.findById(user.organization_id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizations/:id
 * Get organization by ID (only if user is member)
 */
router.get('/:id', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const organization = await OrganizationModel.findById(id);

    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(organization);
  } catch (error) {
    console.error('Get organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/organizations/:id
 * Update organization
 */
router.put('/:id', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Only owners and admins can update
    if (user.role !== 'owner' && user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { name, plan } = req.body;

    const updated = await OrganizationModel.update(id, { name, plan });

    if (!updated) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/organizations/:id
 * Delete organization (owner only)
 */
router.delete('/:id', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;

    // Only owners can delete
    if (user.role !== 'owner') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = await OrganizationModel.delete(id);

    if (!deleted) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    res.json({ message: 'Organization deleted successfully' });
  } catch (error) {
    console.error('Delete organization error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizations/:id/members
 * List organization members
 */
router.get('/:id/members', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const members = await UserModel.findByOrganization(id, limit, offset);

    res.json(members);
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/organizations/:id/api-keys
 * List organization API keys
 */
router.get('/:id/api-keys', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const apiKeys = await ApiKeyModel.findByOrganization(id, limit, offset);

    // Don't expose the key_hash
    const sanitized = apiKeys.map((key: any) => ({
      id: key.id,
      user_id: key.user_id,
      organization_id: key.organization_id,
      name: key.name,
      scopes: key.scopes,
      last_used_at: key.last_used_at,
      expires_at: key.expires_at,
      created_at: key.created_at,
    }));

    res.json(sanitized);
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/organizations/:id/api-keys
 * Create new API key
 */
router.post('/:id/api-keys', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = (req as any).user;
    const { name, scopes, expires_at } = req.body;

    if (!name || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'Name and scopes are required' });
    }

    const { apiKey, rawKey } = await ApiKeyModel.create({
      user_id: user.sub,
      organization_id: id,
      name,
      scopes,
      expires_at,
    });

    res.status(201).json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        scopes: apiKey.scopes,
        expires_at: apiKey.expires_at,
        created_at: apiKey.created_at,
      },
      rawKey, // Only shown once
    });
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/organizations/:id/api-keys/:keyId
 * Delete API key
 */
router.delete('/:id/api-keys/:keyId', requireJwt, requireOrganizationAccess, async (req: Request, res: Response) => {
  try {
    const { keyId } = req.params;

    const deleted = await ApiKeyModel.delete(keyId);

    if (!deleted) {
      return res.status(404).json({ error: 'API key not found' });
    }

    res.json({ message: 'API key deleted successfully' });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
