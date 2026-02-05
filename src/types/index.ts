// Legacy submission types (for backward compatibility)
export interface Submission {
  id: string;
  created_at: number;
  name: string;
  email: string;
  phone?: string;
  industry: string;
  message: string;
  ip?: string;
  user_agent?: string;
  page_url?: string;
  utm?: string;
  status: 'new' | 'spam' | 'deleted';
}

export interface SubmissionInput {
  name: string;
  email: string;
  phone?: string;
  industry: string;
  message: string;
  page_url?: string;
  utm?: string;
  // Spam protection fields
  hp_field?: string; // Honeypot
  form_start_ts?: number; // Time check
  captcha_token?: string; // CAPTCHA token
}

export interface IdempotencyKey {
  key: string;
  response: string;
  created_at: number;
}

export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Re-export new types
export * from './auth';
export * from './forms';
