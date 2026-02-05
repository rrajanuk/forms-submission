import { Router, Request, Response } from 'express';
import { FormModel } from '../models/form.model';
import { FormSubmissionModel } from '../models/formSubmission.model';
import { DraftSubmissionModel } from '../models/draftSubmission.model';
import { LogicEngine } from '../services/logicEngine.service';
import { AutoSaveService } from '../services/autoSave.service';
import { validateSubmissionData, sanitizeFieldValue } from '../utils/formValidation';

const router = Router();

/**
 * GET /api/public/forms/:slug
 * Get published form schema by slug (no auth required)
 */
router.get('/forms/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;

    // Find published form by slug
    const form = FormModel.findPublishedBySlug(slug);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Return form without sensitive info
    res.json({
      id: form.id,
      name: form.name,
      description: form.description,
      schema: form.schema,
    });
  } catch (error) {
    console.error('Get public form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/public/forms/:slug/draft
 * Save or update draft submission (auto-save)
 */
router.post('/forms/:slug/draft', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { session_id, submission_data, current_step } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Use AutoSaveService
    const result = await AutoSaveService.saveDraft({
      formSlug: slug,
      sessionId: session_id,
      submissionData: submission_data || {},
      currentStep: current_step || 0,
    });

    res.json({
      id: result.id,
      isNew: result.isNew,
      message: result.message,
    });
  } catch (error: any) {
    if (error.message === 'Form not found') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Save draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/public/forms/:slug/draft/:sessionId
 * Retrieve draft for a session
 */
router.get('/forms/:slug/draft/:sessionId', async (req: Request, res: Response) => {
  try {
    const { slug, sessionId } = req.params;

    const draft = await AutoSaveService.loadDraft(slug, sessionId);

    if (!draft) {
      return res.status(404).json({ error: 'No draft found' });
    }

    res.json({
      id: draft.id,
      formId: draft.formId,
      submissionData: draft.submissionData,
      currentStep: draft.currentStep,
      expiresAt: draft.expiresAt,
    });
  } catch (error) {
    console.error('Load draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/public/forms/:slug/submit
 * Submit a form publicly (no auth required, but form must be published)
 */
router.post('/forms/:slug/submit', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { submission_data, session_id } = req.body;

    // Find form
    const form = FormModel.findPublishedBySlug(slug);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Validate submission data
    const errors = validateSubmissionData(form.schema, submission_data);
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    // Sanitize input
    const sanitizedData = sanitizeFieldValue(submission_data);

    // Collect metadata
    const metadata = {
      ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer,
    };

    // Create submission
    const submission = FormSubmissionModel.create({
      form_id: form.id,
      organization_id: form.organization_id,
      submission_data: sanitizedData,
      status: 'complete',
      metadata,
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
    console.error('Submit form error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/public/forms/:slug/schema
 * Get form schema for rendering (with evaluated visibility based on data)
 */
router.post('/forms/:slug/schema', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { submission_data } = req.body;

    // Find form
    const form = FormModel.findPublishedBySlug(slug);

    if (!form) {
      return res.status(404).json({ error: 'Form not found' });
    }

    // Evaluate conditional logic to determine visible fields
    const logic = form.schema.logic || [];
    const fields = form.schema.fields || [];

    let visibleFields = fields;
    if (submission_data && Object.keys(submission_data).length > 0) {
      visibleFields = LogicEngine.getVisibleFields(fields, submission_data, logic);
    }

    // Return form schema with evaluated fields
    res.json({
      id: form.id,
      name: form.name,
      description: form.description,
      schema: {
        ...form.schema,
        fields: visibleFields,
      },
    });
  } catch (error) {
    console.error('Get form schema error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/public/forms/:slug/draft/:sessionId
 * Delete a draft
 */
router.delete('/forms/:slug/draft/:sessionId', async (req: Request, res: Response) => {
  try {
    const { slug, sessionId } = req.params;

    const deleted = await AutoSaveService.deleteDraft(slug, sessionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    res.json({ message: 'Draft deleted successfully' });
  } catch (error) {
    console.error('Delete draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/public/forms/:slug/draft/submit
 * Submit a draft and convert it to a complete submission
 */
router.post('/forms/:slug/draft/submit', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const { session_id, metadata: userMetadata } = req.body;

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Prepare metadata with request info
    const submissionMetadata = {
      ...userMetadata,
      ip: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress,
      user_agent: req.headers['user-agent'],
      referrer: req.headers.referer,
    };

    const submission = await AutoSaveService.completeDraft(slug, session_id, submissionMetadata);

    res.status(201).json(submission);
  } catch (error: any) {
    if (error.message === 'Form not found' || error.message === 'Draft not found' || error.message === 'Draft has expired') {
      return res.status(404).json({ error: error.message });
    }
    console.error('Submit draft error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
