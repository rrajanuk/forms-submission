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

export interface FieldOption {
  id: string;
  label: string;
  value?: string;
  order: number;
}

export interface FieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customMessage?: string;
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

export type LogicType = 'show' | 'hide' | 'skip' | 'jump';

export interface LogicCondition {
  fieldId: string;
  operator: LogicOperator;
  value: any;
}

export interface LogicRule {
  id: string;
  type: LogicType;
  targetFieldId: string;
  conditions: LogicCondition[];
  action?: {
    jumpToStep?: number;
    setValue?: any;
  };
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
  confirmationMessage: string;
  autoSaveInterval: number;
  redirectUrl?: string;
}

export interface FormSchema {
  version: string;
  fields: FormField[];
  theme: FormTheme;
  settings: FormSettings;
  logic: LogicRule[];
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

export interface CreateFormInput {
  name: string;
  slug?: string;
  description?: string;
  schema: FormSchema;
}

export interface UpdateFormInput {
  name?: string;
  slug?: string;
  description?: string;
  schema?: Partial<FormSchema>;
  status?: 'draft' | 'published' | 'archived';
}
