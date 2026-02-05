import request from 'supertest';
import app from '../app';
import db from '../db/database';
import migrate from '../db/migrate';

// Set test environment
process.env.ADMIN_API_KEY = 'test-api-key';
process.env.DATABASE_PATH = ':memory:';
process.env.CORS_ORIGIN = 'http://localhost:8080';

describe('Form Submission API', () => {
  beforeAll(() => {
    migrate();
  });

  afterAll(() => {
    db.close();
  });

  describe('POST /api/submissions', () => {
    it('should accept a valid form submission', async () => {
      const validSubmission = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+1234567890',
        industry: 'Technology',
        message: 'This is a test message that is long enough to pass validation.',
        page_url: 'http://example.com/contact',
        utm: 'utm_source=test',
        form_start_ts: Date.now() - 5000, // 5 seconds ago
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(validSubmission)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('success');
    });

    it('should reject submission with honeypot field filled', async () => {
      const submission = {
        name: 'Bot User',
        email: 'bot@example.com',
        industry: 'Spam',
        message: 'This is spam message that is long enough to pass validation.',
        hp_field: 'bot-filled-this', // Honeypot
        form_start_ts: Date.now() - 5000,
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(400);

      expect(response.body.error).toContain('Spam');
    });

    it('should reject submission filled too quickly', async () => {
      const submission = {
        name: 'Speed User',
        email: 'speed@example.com',
        industry: 'Technology',
        message: 'This message was filled too quickly to be human typed.',
        form_start_ts: Date.now() - 500, // Only 0.5 seconds ago
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(400);

      expect(response.body.error).toContain('quickly');
    });

    it('should reject submission with invalid email', async () => {
      const submission = {
        name: 'Invalid Email',
        email: 'not-an-email',
        industry: 'Technology',
        message: 'This is a test message with invalid email format.',
        form_start_ts: Date.now() - 5000,
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(400);

      expect(response.body.error).toContain('Validation');
    });

    it('should reject submission with disposable email', async () => {
      const submission = {
        name: 'Disposable User',
        email: 'test@tempmail.com',
        industry: 'Technology',
        message: 'This is a test with a disposable email address.',
        form_start_ts: Date.now() - 5000,
      };

      const response = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(400);

      expect(response.body.error).toContain('Disposable');
    });

    it('should detect duplicate submissions', async () => {
      const submission = {
        name: 'Duplicate User',
        email: 'duplicate@example.com',
        industry: 'Technology',
        message: 'This is a unique message for duplicate test.',
        form_start_ts: Date.now() - 5000,
      };

      // First submission should succeed
      await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(201);

      // Second identical submission should be rejected
      const response = await request(app)
        .post('/api/submissions')
        .send({ ...submission, form_start_ts: Date.now() - 5000 })
        .expect(409);

      expect(response.body.error).toContain('Duplicate');
    });

    it('should respect idempotency key', async () => {
      const submission = {
        name: 'Idempotent User',
        email: 'idempotent@example.com',
        industry: 'Technology',
        message: 'This is a test message for idempotency testing.',
        form_start_ts: Date.now() - 5000,
      };

      const idempotencyKey = 'test-key-12345';

      // First request
      const response1 = await request(app)
        .post('/api/submissions')
        .set('Idempotency-Key', idempotencyKey)
        .send(submission)
        .expect(201);

      // Second request with same key should return same response
      const response2 = await request(app)
        .post('/api/submissions')
        .set('Idempotency-Key', idempotencyKey)
        .send(submission)
        .expect(201);

      expect(response1.body.id).toBe(response2.body.id);
    });
  });

  describe('GET /api/submissions', () => {
    it('should require API key for admin endpoints', async () => {
      await request(app)
        .get('/api/submissions')
        .expect(401);
    });

    it('should list submissions with valid API key', async () => {
      const response = await request(app)
        .get('/api/submissions')
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body).toHaveProperty('submissions');
      expect(Array.isArray(response.body.submissions)).toBe(true);
    });
  });

  describe('GET /api/submissions/:id', () => {
    it('should get a specific submission with valid API key', async () => {
      // Create a submission first
      const submission = {
        name: 'Test User',
        email: 'gettest@example.com',
        industry: 'Technology',
        message: 'This is a test message for GET endpoint testing.',
        form_start_ts: Date.now() - 5000,
      };

      const createResponse = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(201);

      const id = createResponse.body.id;

      // Get the submission
      const response = await request(app)
        .get(`/api/submissions/${id}`)
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      expect(response.body.id).toBe(id);
      expect(response.body.email).toBe(submission.email);
    });

    it('should return 404 for non-existent submission', async () => {
      await request(app)
        .get('/api/submissions/non-existent-id')
        .set('X-API-Key', 'test-api-key')
        .expect(404);
    });
  });

  describe('DELETE /api/submissions/:id', () => {
    it('should delete a submission with valid API key', async () => {
      // Create a submission first
      const submission = {
        name: 'Delete Test',
        email: 'deletetest@example.com',
        industry: 'Technology',
        message: 'This submission will be deleted for testing purposes.',
        form_start_ts: Date.now() - 5000,
      };

      const createResponse = await request(app)
        .post('/api/submissions')
        .send(submission)
        .expect(201);

      const id = createResponse.body.id;

      // Delete the submission
      await request(app)
        .delete(`/api/submissions/${id}`)
        .set('X-API-Key', 'test-api-key')
        .expect(200);

      // Verify it's deleted (soft delete)
      await request(app)
        .get(`/api/submissions/${id}`)
        .set('X-API-Key', 'test-api-key')
        .expect(404);
    });
  });

  describe('Health Check', () => {
    it('should return OK status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('ok');
    });
  });
});
