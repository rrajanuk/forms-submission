import { Router, Request, Response } from 'express';
import { FormModel } from '../models/form.model';
import { FormSubmissionModel } from '../models/formSubmission.model';
import { DraftSubmissionModel } from '../models/draftSubmission.model';
import { validateSubmissionData, sanitizeFieldValue } from '../utils/formValidation';
import { requireJwt } from '../middleware/auth';
import type { FormField } from '../types/forms';

const router = Router();

/**
 * Helper to get client IP
 */
const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

/**
 * Middleware to verify form exists and is published
 */
const requirePublishedForm = async (req: Request, res: Response, next: Function) => {
  const formId = req.params.formId;

  if (!formId) {
    return res.status(400).json({ error: 'Form ID required' });
  }

  const form = FormModel.findById(formId);
  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  if (form.status !== 'published') {
    return res.status(403).json({ error: 'Form is not published' });
  }

  (req as any).form = form;
  next();
};

/**
 * Middleware to verify form belongs to user's organization
 */
const requireFormAccess = (req: Request, res: Response, next: Function) => {
  const user = (req as any).user;
  const apiKeyUser = (req as any).apiKeyUser;
  const formId = req.params.formId;

  const userOrgId = user?.organization_id || apiKeyUser?.organization_id;

  const form = FormModel.findById(formId);
  if (!form) {
    return res.status(404).json({ error: 'Form not found' });
  }

  if (form.organization_id !== userOrgId) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  (req as any).form = form;
  next();
};

/**
 * GET /api/forms/:formId/submissions
 * List submissions for a form (authenticated)
 */
router.get('/:formId/submissions', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { form } = req as any;
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;
    const status = req.query.status as 'draft' | 'complete' | 'abandoned' | undefined;

    let submissions;
    if (status) {
      submissions = FormSubmissionModel.findByStatus(status, limit, offset)
        .filter(s => s.form_id === form.id);
    } else {
      submissions = FormSubmissionModel.findByForm(form.id, limit, offset);
    }

    res.json(submissions);
  } catch (error) {
    console.error('List submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/forms/:formId/submissions/:id
 * Get a specific submission
 */
router.get('/:formId/submissions/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { form } = req as any;

    const submission = FormSubmissionModel.findById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.form_id !== form.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/forms/:formId/submissions
 * Create a new submission (public or authenticated)
 */
router.post('/:formId/submissions', requirePublishedForm, async (req: Request, res: Response) => {
  try {
    const form = (req as any).form;
    const { submission_data, session_id, metadata } = req.body;

    // Validate submission data against form schema
    const errors = validateSubmissionData(form.schema, submission_data);

    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Sanitize input data
    const sanitizedData = sanitizeFieldValue(submission_data);

    // Collect metadata
    const submissionMetadata: any = {
      ...metadata,
      ip: getClientIp(req),
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer,
    };

    // Check if user is authenticated
    const authHeader = req.headers.authorization;
    const apiKey = req.headers['x-api-key'] as string;

    if (authHeader?.startsWith('Bearer ')) {
      const { verifyToken } = require('../utils/jwt');
      const payload = verifyToken(authHeader.substring(7));
      if (payload) {
        submissionMetadata.user_id = payload.sub;
      }
    } else if (apiKey) {
      // API key submission
      const { ApiKeyModel } = require('../models/apiKey.model');
      const apiKeyData = ApiKeyModel.validate(apiKey);
      if (apiKeyData) {
        submissionMetadata.api_key_id = apiKeyData.id;
      }
    }

    // Create submission
    const submission = FormSubmissionModel.create({
      form_id: form.id,
      organization_id: form.organization_id,
      submission_data: sanitizedData,
      status: 'complete',
      metadata: submissionMetadata,
    });

    // Delete draft if exists
    if (session_id) {
      const draft = DraftSubmissionModel.findByFormAndSession(form.id, session_id);
      if (draft) {
        DraftSubmissionModel.delete(draft.id);
      }
    }

    res.status(201).json(submission);
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/forms/:formId/submissions/:id
 * Update a submission (for drafts or edits)
 */
router.put('/:formId/submissions/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { submission_data, status } = req.body;
    const { form } = req as any;

    const submission = FormSubmissionModel.findById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.form_id !== form.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    // Validate if updating data
    if (submission_data) {
      const errors = validateSubmissionData(form.schema, submission_data);
      if (errors.length > 0) {
        return res.status(400).json({
          error: 'Validation failed',
          details: errors,
        });
      }
    }

    const sanitizedData = submission_data ? sanitizeFieldValue(submission_data) : undefined;

    // Update submission
    const updated = FormSubmissionModel.update(id, {
      submission_data: sanitizedData,
      status,
    });

    res.json(updated);
  } catch (error) {
    console.error('Update submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/forms/:formId/submissions/:id
 * Delete a submission
 */
router.delete('/:formId/submissions/:id', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { form } = req as any;

    const submission = FormSubmissionModel.findById(id);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.form_id !== form.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const deleted = FormSubmissionModel.delete(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/forms/:formId/submissions/export
 * Export submissions as CSV
 */
router.get('/:formId/submissions/export', requireJwt, requireFormAccess, async (req: Request, res: Response) => {
  try {
    const { form } = req as any;
    const format = req.query.format as string || 'csv';

    const submissions = FormSubmissionModel.findByForm(form.id, 1000, 0);

    if (format === 'json') {
      res.json(submissions);
      return;
    }

    // Generate CSV
    const fields = form.schema.fields;
    const headers = ['Submitted At', ...fields.map((f: FormField) => f.label || f.id)];

    const rows = submissions.map(sub => {
      const row = [new Date(sub.submitted_at || sub.created_at).toISOString()];
      fields.forEach((field: FormField) => {
        const value = sub.submission_data[field.id];
        if (Array.isArray(value)) {
          row.push(value.join(', '));
        } else if (value === undefined || value === null) {
          row.push('');
        } else {
          row.push(String(value));
        }
      });
      return row;
    });

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${form.name}-submissions.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
