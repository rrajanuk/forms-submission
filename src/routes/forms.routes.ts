import { Router, Request, Response } from 'express';
import { FormModel } from '../models/form.model';
import { FormSubmissionModel } from '../models/formSubmission.model';
import { validate as validateFormSchema } from '../schemas/form.schema';
import { LogicEngine } from '../services/logicEngine.service';
import { requireJwt } from '../middleware/auth';

const router = Router();

/**
 * Middleware to check form access and organization membership
 */
const requireFormAccess = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  const formId = req.params.id || req.params.formId;

  if (!formId) {
    return res.status(400).json({ error: 'Form ID required' });
  }

  const form = FormModel.findById(formId);
  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  // Check if user belongs to the form's organization
  if (form.organization_id !== user.organization_id) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Attach form to request for use in handlers
  (req as any).form = form;
  next();
};

/**
 * GET /api/forms
 * List all forms for the user's organization
 */
router.get('/', requireJwt, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as 'draft' | 'published' | 'archived' | undefined;

    let forms;
    if (status) {
      forms = FormModel.findByStatus(user.organization_id, status, limit, offset);
    } else {
      forms = FormModel.findByOrganization(user.organization_id, limit, offset);
    }

    res.json(forms);
  } catch (error) {
    console.error('List forms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/forms/:id
 * Get a specific form
 */
router.get('/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;
    res.json(form);
  } catch (error) {
    console.error('Get form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/forms/:id/preview
 * Get form for preview (works for draft forms, requires auth)
 */
router.get('/:id/preview', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;

    // Return full schema including status for preview
    res.json({
      id: form.id,
      name: form.name,
      slug: form.slug,
      description: form.description,
      schema: form.schema,
      status: form.status,
      created_at: form.created_at,
      updated_at: form.updated_at,
    });
  } catch (error) {
    console.error('Get form preview error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/forms
 * Create a new form
 */
router.post('/', requireJwt, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const { name, slug, description, schema } = req.body;

    // Validation
    if (!name || !schema) {
      return res.status(400).json({ error: 'Name and schema are required' });
    }

    // Validate schema structure
    const schemaValidation = validateFormSchema(schema);
    if (!schemaValidation.valid) {
      return res.status(400).json({
        error: 'Invalid form schema',
        details: schemaValidation.errors,
      });
    }

    // Validate conditional logic
    const fieldIds = schema.fields.map((f: any) => f.id);
    if (schema.logic && schema.logic.length > 0) {
      const logicValidation = LogicEngine.validateLogic(schema.logic, fieldIds);
      if (!logicValidation.valid) {
        return res.status(400).json({
          error: 'Invalid conditional logic',
          details: logicValidation.errors,
        });
      }
    }

    // Check if slug is unique for organization
    if (slug) {
      const existing = FormModel.findBySlug(user.organization_id, slug);
      if (existing) {
        return res.status(409).json({ error: 'Slug already taken' });
      }
    }

    // Create form
    const form = FormModel.create({
      organization_id: user.organization_id,
      name,
      slug,
      description,
      schema,
    });

    res.status(201).json(form);
  } catch (error) {
    console.error('Create form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/forms/:id
 * Update a form
 */
router.put('/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { name, slug, description, schema, status } = req.body;

    // Check slug uniqueness if changing
    if (slug && slug !== (req as any).form.slug) {
      const existing = FormModel.findBySlug((req as any).form.organization_id, slug);
      if (existing) {
        return res.status(409).json({ error: 'Slug already taken' });
      }
    }

    // Validate schema if provided
    if (schema) {
      const schemaValidation = validateFormSchema(schema);
      if (!schemaValidation.valid) {
        return res.status(400).json({
          error: 'Invalid form schema',
          details: schemaValidation.errors,
        });
      }

      // Validate conditional logic
      const fieldIds = schema.fields.map((f: any) => f.id);
      if (schema.logic && schema.logic.length > 0) {
        const logicValidation = LogicEngine.validateLogic(schema.logic, fieldIds);
        if (!logicValidation.valid) {
          return res.status(400).json({
            error: 'Invalid conditional logic',
            details: logicValidation.errors,
          });
        }
      }
    }

    // Can't change status to published if schema is invalid
    if (status === 'published') {
      const formSchema = schema || (req as any).form.schema;
      const schemaValidation = validateFormSchema(formSchema);
      if (!schemaValidation.valid) {
        return res.status(400).json({
          error: 'Cannot publish form with invalid schema',
          details: schemaValidation.errors,
        });
      }
    }

    // Update form
    const updated = FormModel.update(req.params.id, {
      name,
      slug,
      description,
      schema,
      status,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json(updated);
  } catch (error) {
    console.error('Update form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/forms/:id/publish
 * Publish a form
 */
router.post('/:id/publish', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;

    // Validate schema before publishing
    const schemaValidation = validateFormSchema(form.schema);
    if (!schemaValidation.valid) {
      return res.status(400).json({
        error: 'Cannot publish form with invalid schema',
        details: schemaValidation.errors,
      });
    }

    const published = FormModel.publish(req.params.id);
    res.json(published);
  } catch (error) {
    console.error('Publish form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/forms/:id/archive
 * Archive a form
 */
router.post('/:id/archive', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const archived = FormModel.archive(req.params.id);
    res.json(archived);
  } catch (error) {
    console.error('Archive form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/forms/:id
 * Delete a form
 */
router.delete('/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const deleted = FormModel.delete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: 'Form not found' });
    }

    res.json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Delete form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/forms/:id/analytics
 * Get form analytics
 */
router.get('/:id/analytics', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;

    const totalSubmissions = FormSubmissionModel.countByForm(form.id);
    const completedSubmissions = FormSubmissionModel.countByForm(form.id);

    // Get submissions by status
    const draftSubmissions = FormSubmissionModel.findByStatus('draft', 1000, 0).length;
    const abandonedSubmissions = FormSubmissionModel.findByStatus('abandoned', 1000, 0).length;

    res.json({
      form_id: form.id,
      name: form.name,
      status: form.status,
      created_at: form.created_at,
      published_at: form.published_at,
      total_submissions: totalSubmissions,
      completed_submissions: completedSubmissions - draftSubmissions - abandonedSubmissions,
      draft_submissions: draftSubmissions,
      abandoned_submissions: abandonedSubmissions,
      completion_rate: totalSubmissions > 0
        ? ((completedSubmissions - draftSubmissions - abandonedSubmissions) / totalSubmissions * 100).toFixed(2) + '%'
        : '0%',
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/forms/:id/duplicate
 * Duplicate a form
 */
router.post('/:id/duplicate', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;

    // Create duplicate with modified name
    const duplicate = FormModel.create({
      organization_id: form.organization_id,
      name: `${form.name} (Copy)`,
      description: form.description,
      schema: form.schema,
    });

    res.status(201).json(duplicate);
  } catch (error) {
    console.error('Duplicate form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
