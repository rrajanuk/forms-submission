import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { SubmissionModel } from '../models/submission.model';
import { IdempotencyModel } from '../models/idempotency.model';
import { validateSubmission, sanitizeString } from '../utils/validation';
import {
  checkHoneypot,
  checkTimeValidity,
  isDisposableEmail,
  verifyCaptcha,
} from '../utils/spamProtection';
import { rateLimiter } from '../utils/rateLimiter';
import { notifySubmission } from '../services/notification.service';
import { requireApiKey } from '../middleware/auth';
import { SubmissionInput } from '../types';

const router = Router();

// Helper to get client IP
const getClientIp = (req: Request): string => {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
    req.socket.remoteAddress ||
    'unknown'
  );
};

// POST /api/submissions - Create new submission
router.post('/', async (req: Request, res: Response) => {
  try {
    const ip = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Check idempotency key
    const idempotencyKey = req.headers['idempotency-key'] as string;
    if (idempotencyKey) {
      const existing = IdempotencyModel.findByKey(idempotencyKey);
      if (existing) {
        const cachedResponse = JSON.parse(existing.response);
        return res.status(cachedResponse.status).json(cachedResponse.body);
      }
    }

    // Rate limiting
    const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '3600000');
    const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '5');

    if (!rateLimiter.check(ip, rateLimitMax, rateLimitWindow)) {
      const response = {
        status: 429,
        body: { error: 'Too many requests. Please try again later.' },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(429).json(response.body);
    }

    const data: SubmissionInput = req.body;

    // Honeypot check
    if (checkHoneypot(data.hp_field)) {
      const response = {
        status: 400,
        body: { error: 'Spam detected' },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(400).json(response.body);
    }

    // Time check
    const timeCheck = checkTimeValidity(data.form_start_ts);
    if (!timeCheck.valid) {
      const response = {
        status: 400,
        body: { error: timeCheck.reason },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(400).json(response.body);
    }

    // CAPTCHA verification (if enabled and token provided)
    if (process.env.ENABLE_CAPTCHA === 'true' && data.captcha_token) {
      const captchaValid = await verifyCaptcha(data.captcha_token);
      if (!captchaValid) {
        const response = {
          status: 400,
          body: { error: 'CAPTCHA verification failed' },
        };
        if (idempotencyKey) {
          IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
        }
        return res.status(400).json(response.body);
      }
    }

    // Validation
    const validationErrors = validateSubmission(data);
    if (validationErrors.length > 0) {
      const response = {
        status: 400,
        body: { error: 'Validation failed', errors: validationErrors },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(400).json(response.body);
    }

    // Disposable email check
    if (isDisposableEmail(data.email)) {
      const response = {
        status: 400,
        body: { error: 'Disposable email addresses are not allowed' },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(400).json(response.body);
    }

    // Duplicate detection (same email + message within 1 hour)
    const duplicate = SubmissionModel.findDuplicate(
      data.email,
      data.message,
      60 * 60 * 1000 // 1 hour
    );
    if (duplicate) {
      const response = {
        status: 409,
        body: {
          error: 'Duplicate submission detected',
          id: duplicate.id,
        },
      };
      if (idempotencyKey) {
        IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
      }
      return res.status(409).json(response.body);
    }

    // Create submission
    const submission = SubmissionModel.create({
      id: uuidv4(),
      name: sanitizeString(data.name),
      email: sanitizeString(data.email),
      phone: data.phone ? sanitizeString(data.phone) : undefined,
      industry: sanitizeString(data.industry),
      message: sanitizeString(data.message),
      page_url: data.page_url ? sanitizeString(data.page_url) : undefined,
      utm: data.utm ? sanitizeString(data.utm) : undefined,
      ip,
      user_agent: userAgent,
      status: 'new',
    });

    // Send notifications asynchronously
    notifySubmission(submission).catch((err) => {
      console.error('Notification error:', err);
    });

    const response = {
      status: 201,
      body: {
        id: submission.id,
        message: 'Submission received successfully',
      },
    };

    // Save idempotency key
    if (idempotencyKey) {
      IdempotencyModel.save(idempotencyKey, JSON.stringify(response));
    }

    return res.status(201).json(response.body);
  } catch (error) {
    console.error('Submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/submissions - List all submissions (admin)
router.get('/', requireApiKey, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const offset = parseInt(req.query.offset as string) || 0;

    const submissions = SubmissionModel.findAll(limit, offset);
    return res.json({
      submissions,
      count: submissions.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error('List submissions error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/submissions/:id - Get single submission (admin)
router.get('/:id', requireApiKey, async (req: Request, res: Response) => {
  try {
    const submission = SubmissionModel.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json(submission);
  } catch (error) {
    console.error('Get submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/submissions/:id - Delete submission (admin / GDPR)
router.delete('/:id', requireApiKey, async (req: Request, res: Response) => {
  try {
    const deleted = SubmissionModel.delete(req.params.id);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    return res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error('Delete submission error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
