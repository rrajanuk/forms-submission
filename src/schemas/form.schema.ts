import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { FormSchema } from '../types/forms';

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  allowUnionTypes: true,
});
addFormats(ajv);

/**
 * JSON Schema for validating form schemas
 */
export const formSchemaJson = {
  type: 'object',
  required: ['version', 'fields', 'theme', 'settings'],
  properties: {
    version: {
      type: 'string',
      enum: ['1.0'],
    },
    title: {
      type: 'string',
      maxLength: 200,
    },
    description: {
      type: 'string',
      maxLength: 1000,
    },
    fields: {
      type: 'array',
      minItems: 1,
      items: {
        type: 'object',
        required: ['id', 'type', 'label', 'required', 'order'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$',
            maxLength: 50,
          },
          type: {
            type: 'string',
            enum: [
              'short_text',
              'long_text',
              'email',
              'phone',
              'number',
              'date',
              'rating',
              'dropdown',
              'multiple_choice',
              'checkboxes',
              'file_upload',
              'signature',
              'hidden',
            ],
          },
          label: {
            type: 'string',
            maxLength: 200,
          },
          description: {
            type: 'string',
            maxLength: 1000,
          },
          placeholder: {
            type: 'string',
            maxLength: 200,
          },
          required: {
            type: 'boolean',
          },
          validation: {
            type: 'object',
            properties: {
              min: { type: 'number' },
              max: { type: 'number' },
              pattern: { type: 'string' },
              customMessage: { type: 'string' },
            },
            additionalProperties: false,
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['id', 'label', 'order'],
              properties: {
                id: {
                  type: 'string',
                  pattern: '^[a-zA-Z0-9_-]+$',
                },
                label: {
                  type: 'string',
                  maxLength: 200,
                },
                value: {
                  type: 'string',
                },
                order: {
                  type: 'number',
                },
              },
            },
          },
          properties: {
            type: 'object',
          },
          order: {
            type: 'number',
          },
        },
      },
    },
    theme: {
      type: 'object',
      required: ['colors', 'font', 'layout'],
      properties: {
        colors: {
          type: 'object',
          required: ['primary', 'background', 'text', 'button'],
          properties: {
            primary: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
            background: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
            text: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
            button: {
              type: 'string',
              pattern: '^#[0-9A-Fa-f]{6}$',
            },
          },
        },
        font: {
          type: 'string',
          maxLength: 100,
        },
        layout: {
          type: 'string',
          enum: ['classic', 'modern', 'minimal'],
        },
        coverImage: {
          type: 'string',
        },
      },
    },
    settings: {
      type: 'object',
      required: [
        'allowAnonymous',
        'requireAuth',
        'oneResponsePerUser',
        'showProgressBar',
        'showQuestionNumbers',
        'shuffleQuestions',
        'confirmationMessage',
        'autoSaveInterval',
      ],
      properties: {
        allowAnonymous: { type: 'boolean' },
        requireAuth: { type: 'boolean' },
        oneResponsePerUser: { type: 'boolean' },
        showProgressBar: { type: 'boolean' },
        showQuestionNumbers: { type: 'boolean' },
        shuffleQuestions: { type: 'boolean' },
        timedForm: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            duration: { type: 'number' },
          },
        },
        confirmationMessage: {
          type: 'string',
          maxLength: 1000,
        },
        redirectUrl: {
          type: 'string',
          format: 'uri',
        },
        autoSaveInterval: {
          type: 'number',
          minimum: 5,
          maximum: 300,
        },
      },
    },
    logic: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'type', 'targetFieldId', 'conditions'],
        properties: {
          id: {
            type: 'string',
            pattern: '^[a-zA-Z0-9_-]+$',
          },
          type: {
            type: 'string',
            enum: ['show', 'hide', 'skip', 'jump'],
          },
          targetFieldId: {
            type: 'string',
          },
          conditions: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['fieldId', 'operator', 'value'],
              properties: {
                fieldId: {
                  type: 'string',
                },
                operator: {
                  type: 'string',
                  enum: [
                    'equals',
                    'not_equals',
                    'contains',
                    'greater_than',
                    'less_than',
                    'is_empty',
                    'is_not_empty',
                    'includes_any',
                    'includes_all',
                  ],
                },
                value: {
                  oneOf: [
                    { type: 'string' },
                    { type: 'number' },
                    { type: 'boolean' },
                    { type: 'array', items: { type: 'string' } },
                  ],
                },
              },
            },
          },
          action: {
            type: 'object',
            properties: {
              jumpToStep: {
                type: 'number',
                minimum: 0,
              },
              setValue: {
                oneOf: [
                  { type: 'string' },
                  { type: 'number' },
                  { type: 'boolean' },
                ],
              },
            },
          },
        },
      },
    },
  },
};

// Compile the validator
const validateFormSchema = ajv.compile(formSchemaJson);

/**
 * Validate a form schema against JSON Schema
 */
export function validate(schema: FormSchema): { valid: boolean; errors: string[] } {
  const valid = validateFormSchema(schema);

  if (!valid && validateFormSchema.errors) {
    const errors = validateFormSchema.errors.map(err => {
      const path = err.instancePath || 'root';
      return `${path}: ${err.message}`;
    });

    return {
      valid: false,
      errors,
    };
  }

  return {
    valid: true,
    errors: [],
  };
}
