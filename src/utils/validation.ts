import validator from 'validator';
import { SubmissionInput } from '../types';

export interface ValidationError {
  field: string;
  message: string;
}

export const validateSubmission = (data: SubmissionInput): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Name validation
  if (!data.name || typeof data.name !== 'string') {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (data.name.length < 2 || data.name.length > 100) {
    errors.push({ field: 'name', message: 'Name must be between 2 and 100 characters' });
  }

  // Email validation
  if (!data.email || typeof data.email !== 'string') {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!validator.isEmail(data.email)) {
    errors.push({ field: 'email', message: 'Invalid email format' });
  } else if (data.email.length > 255) {
    errors.push({ field: 'email', message: 'Email is too long' });
  }

  // Phone validation (optional)
  if (data.phone && typeof data.phone === 'string') {
    if (data.phone.length > 20) {
      errors.push({ field: 'phone', message: 'Phone number is too long' });
    }
  }

  // Industry validation
  if (!data.industry || typeof data.industry !== 'string') {
    errors.push({ field: 'industry', message: 'Industry is required' });
  } else if (data.industry.length < 2 || data.industry.length > 100) {
    errors.push({ field: 'industry', message: 'Industry must be between 2 and 100 characters' });
  }

  // Message validation
  if (!data.message || typeof data.message !== 'string') {
    errors.push({ field: 'message', message: 'Message is required' });
  } else if (data.message.length < 10 || data.message.length > 5000) {
    errors.push({ field: 'message', message: 'Message must be between 10 and 5000 characters' });
  }

  // Optional fields length validation
  if (data.page_url && data.page_url.length > 500) {
    errors.push({ field: 'page_url', message: 'Page URL is too long' });
  }

  if (data.utm && data.utm.length > 500) {
    errors.push({ field: 'utm', message: 'UTM is too long' });
  }

  return errors;
};

export const sanitizeString = (str: string): string => {
  return validator.escape(str.trim());
};
