import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import submissionsRouter from './routes/submissions.routes';
import authRouter from './routes/auth.routes';
import organizationsRouter from './routes/organizations.routes';
import formsRouter from './routes/forms.routes';
import formSubmissionsRouter from './routes/formSubmissions.routes';
import publicRouter from './routes/public.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:8080';
app.use(
  cors({
    origin: corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files (embed.js, embed.css, etc.)
app.use('/embed', express.static(path.join(__dirname, '..', 'public')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRouter);
app.use('/api/organizations', organizationsRouter);
app.use('/api/forms', formsRouter);
app.use('/api/forms', formSubmissionsRouter);
app.use('/api/public', publicRouter);
app.use('/api/submissions', submissionsRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;
