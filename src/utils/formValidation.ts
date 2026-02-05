import validator from 'validator';
import { FormSchema, FormField, FieldType } from '../types/forms';

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate submission data against form schema
 */
export function validateSubmissionData(
  schema: FormSchema,
  submissionData: Record<string, any>
): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of schema.fields) {
    const value = submissionData[field.id];
    const fieldLabel = field.label || field.id;

    // Check if field should be validated (might be hidden by logic)
    // For now, validate all fields - caller can filter based on logic evaluation

    // Required check
    if (field.required && isEmpty(value)) {
      errors.push({
        field: field.id,
        message: `${fieldLabel} is required`,
      });
      continue; // Skip other validation if missing required field
    }

    // Skip validation if field is empty and not required
    if (isEmpty(value)) {
      continue;
    }

    // Type-specific validation
    const typeErrors = validateFieldType(field, value);
    errors.push(...typeErrors);
  }

  return errors;
}

/**
 * Validate a single field's value
 */
function validateFieldType(field: FormField, value: any): ValidationError[] {
  const errors: ValidationError[] = [];
  const fieldLabel = field.label || field.id;

  switch (field.type) {
    case 'email':
      if (!validator.isEmail(String(value))) {
        errors.push({
          field: field.id,
          message: `${fieldLabel} must be a valid email address`,
        });
      }
      break;

    case 'phone':
      // Basic phone validation - can be enhanced
      if (!validator.isMobilePhone(String(value), 'any')) {
        // Allow flexible phone format
        const phoneRegex = /^[\d\s\-\+\(\)]+$/;
        if (!phoneRegex.test(String(value)) || String(value).length < 7) {
          errors.push({
            field: field.id,
            message: `${fieldLabel} must be a valid phone number`,
          });
        }
      }
      break;

    case 'number':
      if (!validator.isNumeric(String(value))) {
        errors.push({
          field: field.id,
          message: `${fieldLabel} must be a number`,
        });
      }
      break;

    case 'rating':
      const rating = parseInt(value);
      if (isNaN(rating)) {
        errors.push({
          field: field.id,
          message: `${fieldLabel} must be a number`,
        });
      } else {
        const scale = field.properties?.scale || 10;
        if (rating < 1 || rating > scale) {
          errors.push({
            field: field.id,
            message: `${fieldLabel} must be between 1 and ${scale}`,
          });
        }
      }
      break;

    case 'dropdown':
    case 'multiple_choice':
      // Validate that value is one of the options
      if (field.options && field.options.length > 0) {
        const validValues = field.options.map(opt => opt.value || opt.id);
        const values = Array.isArray(value) ? value : [value];

        for (const v of values) {
          if (!validValues.includes(v)) {
            errors.push({
              field: field.id,
              message: `${fieldLabel}: '${v}' is not a valid option`,
            });
          }
        }
      }
      break;

    case 'checkboxes':
      // Validate that all values are valid options
      if (field.options && field.options.length > 0) {
        const validValues = field.options.map(opt => opt.value || opt.id);
        const values = Array.isArray(value) ? value : [value];

        for (const v of values) {
          if (!validValues.includes(v)) {
            errors.push({
              field: field.id,
              message: `${fieldLabel}: '${v}' is not a valid option`,
            });
          }
        }
      }
      break;

    case 'date':
      if (!validator.isDate(String(value))) {
        errors.push({
          field: field.id,
          message: `${fieldLabel} must be a valid date`,
        });
      }
      break;

    case 'file_upload':
      // File validation would be done at upload time
      // For now, just check that we have a file ID or URL
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push({
          field: field.id,
          message: `${fieldLabel} must be a valid file reference`,
        });
      }
      break;

    default:
      // For text fields and others, do basic string validation
      break;
  }

  // Custom validation rules
  if (field.validation) {
    const customErrors = validateFieldRules(field, value, fieldLabel);
    errors.push(...customErrors);
  }

  return errors;
}

/**
 * Validate custom field rules
 */
function validateFieldRules(
  field: FormField,
  value: any,
  fieldLabel: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!field.validation) {
    return errors;
  }

  const { min, max, pattern, customMessage } = field.validation;
  const valueStr = String(value);
  const valueLength = valueStr.length;
  const valueNum = parseFloat(value);

  // Minimum length/value
  if (min !== undefined) {
    if (field.type === 'number' || field.type === 'rating') {
      if (!isNaN(valueNum) && valueNum < min) {
        errors.push({
          field: field.id,
          message: customMessage || `${fieldLabel} must be at least ${min}`,
        });
      }
    } else if (valueLength < min) {
      errors.push({
        field: field.id,
        message: customMessage || `${fieldLabel} must be at least ${min} characters`,
      });
    }
  }

  // Maximum length/value
  if (max !== undefined) {
    if (field.type === 'number' || field.type === 'rating') {
      if (!isNaN(valueNum) && valueNum > max) {
        errors.push({
          field: field.id,
          message: customMessage || `${fieldLabel} must be at most ${max}`,
        });
      }
    } else if (valueLength > max) {
      errors.push({
        field: field.id,
        message: customMessage || `${fieldLabel} must be at most ${max} characters`,
      });
    }
  }

  // Pattern validation
  if (pattern && valueStr) {
    const regex = new RegExp(pattern);
    if (!regex.test(valueStr)) {
      errors.push({
        field: field.id,
        message: customMessage || `${fieldLabel} format is invalid`,
      });
    }
  }

  return errors;
}

/**
 * Check if value is empty
 */
function isEmpty(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return true;
  }
  if (Array.isArray(value) && value.length === 0) {
    return true;
  }
  return false;
}

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeFieldValue(value: any): any {
  if (typeof value === 'string') {
    return validator.escape(value.trim());
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeFieldValue);
  }
  if (typeof value === 'object' && value !== null) {
    const sanitized: any = {};
    for (const key in value) {
      if (Object.prototype.hasOwnProperty.call(value, key)) {
        sanitized[key] = sanitizeFieldValue(value[key]);
      }
    }
    return sanitized;
  }
  return value;
}

/**
 * Validate form schema structure
 */
export function validateFormSchema(schema: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check version
  if (!schema.version || schema.version !== '1.0') {
    errors.push('Schema must have version "1.0"');
  }

  // Check fields
  if (!schema.fields || !Array.isArray(schema.fields)) {
    errors.push('Schema must have a fields array');
  } else if (schema.fields.length === 0) {
    errors.push('Schema must have at least one field');
  } else {
    // Validate each field
    schema.fields.forEach((field: any, index: number) => {
      if (!field.id) {
        errors.push(`Field at index ${index}: Missing id`);
      }
      if (!field.type) {
        errors.push(`Field ${field.id || index}: Missing type`);
      }
      if (!field.label) {
        errors.push(`Field ${field.id || index}: Missing label`);
      }
      if (field.required === undefined) {
        errors.push(`Field ${field.id || index}: Missing required property`);
      }

      // Validate options for select/radio/checkbox fields
      if (['dropdown', 'multiple_choice', 'checkboxes'].includes(field.type)) {
        if (!field.options || !Array.isArray(field.options) || field.options.length === 0) {
          errors.push(`Field ${field.id}: Must have options array`);
        }
      }
    });
  }

  // Check theme
  if (!schema.theme) {
    errors.push('Schema must have a theme object');
  } else {
    if (!schema.theme.colors) {
      errors.push('Theme must have colors');
    }
  }

  // Check settings
  if (!schema.settings) {
    errors.push('Schema must have a settings object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
