import axios from 'axios';

// Disposable email domains list (minimal set, expand as needed)
const DISPOSABLE_EMAIL_DOMAINS = [
  'tempmail.com',
  'guerrillamail.com',
  'mailinator.com',
  '10minutemail.com',
  'throwaway.email',
  'temp-mail.org',
  'yopmail.com',
  'trashmail.com',
  'getnada.com',
  'maildrop.cc',
];

export const isDisposableEmail = (email: string): boolean => {
  const domain = email.split('@')[1]?.toLowerCase();
  return DISPOSABLE_EMAIL_DOMAINS.includes(domain);
};

export const checkHoneypot = (honeypotValue: any): boolean => {
  // If honeypot field is present and not empty, it's likely a bot
  return !!(honeypotValue && String(honeypotValue).trim().length > 0);
};

export const checkTimeValidity = (formStartTs: number | undefined): {
  valid: boolean;
  reason?: string;
} => {
  if (!formStartTs || typeof formStartTs !== 'number') {
    return { valid: false, reason: 'Missing form start timestamp' };
  }

  const now = Date.now();
  const timeDelta = now - formStartTs;

  const minTime = parseInt(process.env.MIN_FORM_FILL_TIME_MS || '2000');
  const maxTime = parseInt(process.env.MAX_FORM_FILL_TIME_MS || '604800000'); // 7 days

  if (timeDelta < minTime) {
    return { valid: false, reason: 'Form submitted too quickly (likely bot)' };
  }

  if (timeDelta > maxTime) {
    return { valid: false, reason: 'Form submission expired' };
  }

  return { valid: true };
};

export const verifyTurnstileCaptcha = async (token: string): Promise<boolean> => {
  const secretKey = process.env.TURNSTILE_SECRET_KEY;
  if (!secretKey) {
    console.warn('Turnstile secret key not configured');
    return false;
  }

  try {
    const response = await axios.post(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      {
        secret: secretKey,
        response: token,
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      }
    );

    return response.data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
};

export const verifyRecaptcha = async (token: string): Promise<boolean> => {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.warn('reCAPTCHA secret key not configured');
    return false;
  }

  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: secretKey,
          response: token,
        },
        timeout: 5000,
      }
    );

    return response.data.success === true && response.data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

export const verifyCaptcha = async (token: string): Promise<boolean> => {
  // Try Turnstile first, then reCAPTCHA
  if (process.env.TURNSTILE_SECRET_KEY) {
    return await verifyTurnstileCaptcha(token);
  } else if (process.env.RECAPTCHA_SECRET_KEY) {
    return await verifyRecaptcha(token);
  }
  return false;
};
