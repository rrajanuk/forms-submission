/**
 * Form and Submission Types
 */

export type FieldType =
  | 'short_text'
  | 'long_text'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'rating'
  | 'dropdown'
  | 'multiple_choice'
  | 'checkboxes'
  | 'file_upload'
  | 'signature'
  | 'hidden';

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
}

export interface FieldOption {
  id: string;
  label: string;
  value?: string;
  order: number;
}

export interface FormField {
  id: string;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  validation?: FieldValidation;
  options?: FieldOption[];
  properties?: Record<string, any>;
  order: number;
}

export interface FormTheme {
  colors: {
    primary: string;
    background: string;
    text: string;
    button: string;
  };
  font: string;
  layout: 'classic' | 'modern' | 'minimal';
  coverImage?: string;
}

export interface FormSettings {
  allowAnonymous: boolean;
  requireAuth: boolean;
  oneResponsePerUser: boolean;
  showProgressBar: boolean;
  showQuestionNumbers: boolean;
  shuffleQuestions: boolean;
  timedForm?: {
    enabled: boolean;
    duration: number;
  };
  confirmationMessage: string;
  redirectUrl?: string;
  autoSaveInterval: number;
}

export type LogicOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'greater_than'
  | 'less_than'
  | 'is_empty'
  | 'is_not_empty'
  | 'includes_any'
  | 'includes_all';

export interface LogicCondition {
  fieldId: string;
  operator: LogicOperator;
  value: any;
}

export interface ConditionalLogic {
  id: string;
  type: 'show' | 'hide' | 'skip' | 'jump';
  targetFieldId: string;
  conditions: LogicCondition[];
  action?: {
    jumpToStep?: number;
    setValue?: any;
  };
}

export interface FormSchema {
  version: '1.0';
  title?: string;
  description?: string;
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  logic: ConditionalLogic[];
}

export interface Form {
  id: string;
  organization_id: string;
  name: string;
  slug?: string;
  description?: string;
  schema: FormSchema;
  status: 'draft' | 'published' | 'archived';
  settings: FormSettings;
  created_at: number;
  updated_at: number;
  published_at?: number;
}

export interface FormCreateInput {
  name: string;
  slug?: string;
  description?: string;
  schema: FormSchema;
}

export interface FormUpdateInput {
  name?: string;
  slug?: string;
  description?: string;
  schema?: FormSchema;
  status?: 'draft' | 'published' | 'archived';
}

export interface SubmissionMetadata {
  ip?: string;
  user_agent?: string;
  referrer?: string;
  utm?: Record<string, string>;
  device_info?: {
    type?: string;
    os?: string;
    browser?: string;
  };
  location?: {
    country?: string;
    city?: string;
  };
}

export interface FormSubmission {
  id: string;
  form_id: string;
  organization_id: string;
  submission_data: Record<string, any>;
  status: 'draft' | 'complete' | 'abandoned';
  metadata?: SubmissionMetadata;
  submitted_at?: number;
  created_at: number;
  updated_at: number;
}

export interface DraftSubmissionCreate {
  form_id: string;
  session_id: string;
  submission_data: Record<string, any>;
  current_step?: number;
  expires_at?: number;
}

export interface DraftSubmission {
  id: string;
  form_id: string;
  session_id: string;
  submission_data: Record<string, any>;
  current_step: number;
  created_at: number;
  updated_at: number;
  expires_at: number;
}

export interface FormSubmissionCreateInput {
  form_id: string;
  submission_data: Record<string, any>;
  metadata?: SubmissionMetadata;
}

export interface Webhook {
  id: string;
  organization_id: string;
  form_id?: string;
  url: string;
  events: string[];
  secret?: string;
  active: boolean;
  created_at: number;
}

export interface WebhookCreateInput {
  form_id?: string;
  url: string;
  events: string[];
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  webhook_id: string;
  event_type: string;
  payload: string;
  response_code?: number;
  response_body?: string;
  attempted_at: number;
  success: boolean;
}
