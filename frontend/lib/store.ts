import { create } from 'zustand';
import type {
  Form,
  FormField,
  FormSchema,
  LogicRule,
  FormTheme,
  FormSettings,
} from '@/types/form';

interface FormBuilderState {
  // Current form being edited
  form: Form | null;
  fields: FormField[];
  logic: LogicRule[];
  theme: FormTheme;
  settings: FormSettings;

  // UI state
  selectedFieldId: string | null;
  selectedLogicId: string | null;
  activeTab: 'fields' | 'logic' | 'theme' | 'settings';
  isDirty: boolean;
  isSaving: boolean;

  // Actions
  setForm: (form: Form) => void;
  createNewForm: (name: string) => void;
  updateFormMetadata: (data: { name?: string; slug?: string; description?: string }) => void;

  // Field actions
  addField: (type: FormField['type']) => void;
  updateField: (id: string, data: Partial<FormField>) => void;
  deleteField: (id: string) => void;
  reorderFields: (fields: FormField[]) => void;
  duplicateField: (id: string) => void;
  selectField: (id: string | null) => void;

  // Logic actions
  addLogicRule: () => void;
  updateLogicRule: (id: string, data: Partial<LogicRule>) => void;
  deleteLogicRule: (id: string) => void;
  selectLogic: (id: string | null) => void;

  // Theme actions
  updateTheme: (theme: Partial<FormTheme>) => void;

  // Settings actions
  updateSettings: (settings: Partial<FormSettings>) => void;

  // Tab actions
  setActiveTab: (tab: 'fields' | 'logic' | 'theme' | 'settings') => void;

  // Form actions
  saveForm: () => Promise<void>;
  publishForm: () => Promise<void>;
  resetState: () => void;
}

const defaultTheme: FormTheme = {
  colors: {
    primary: '#4F46E5',
    background: '#FFFFFF',
    text: '#1F2937',
    button: '#4F46E5',
  },
  font: 'Inter',
  layout: 'classic',
};

const defaultSettings: FormSettings = {
  allowAnonymous: true,
  requireAuth: false,
  oneResponsePerUser: false,
  showProgressBar: true,
  showQuestionNumbers: false,
  shuffleQuestions: false,
  confirmationMessage: 'Thank you for your submission!',
  autoSaveInterval: 30,
};

export const useFormBuilder = create<FormBuilderState>((set, get) => ({
  // Initial state
  form: null,
  fields: [],
  logic: [],
  theme: defaultTheme,
  settings: defaultSettings,
  selectedFieldId: null,
  selectedLogicId: null,
  activeTab: 'fields',
  isDirty: false,
  isSaving: false,

  // Set existing form
  setForm: (form) => {
    set({
      form,
      fields: form.schema.fields || [],
      logic: form.schema.logic || [],
      theme: form.schema.theme,
      settings: form.schema.settings,
      isDirty: false,
    });
  },

  // Create new form
  createNewForm: (name) => {
    const newForm: Form = {
      id: '',
      organization_id: '',
      name,
      schema: {
        version: '1.0',
        fields: [],
        theme: defaultTheme,
        settings: defaultSettings,
        logic: [],
      },
      status: 'draft',
      settings: defaultSettings,
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    set({
      form: newForm,
      fields: [],
      logic: [],
      theme: defaultTheme,
      settings: defaultSettings,
      isDirty: true,
    });
  },

  // Update form metadata
  updateFormMetadata: (data) => {
    set((state) => ({
      form: state.form ? { ...state.form, ...data } : null,
      isDirty: true,
    }));
  },

  // Add field
  addField: (type) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      label: `New ${type.replace(/_/g, ' ')} field`,
      required: false,
      order: get().fields.length,
    };
    set((state) => ({
      fields: [...state.fields, newField],
      selectedFieldId: newField.id,
      isDirty: true,
    }));
  },

  // Update field
  updateField: (id, data) => {
    set((state) => ({
      fields: state.fields.map((f) => (f.id === id ? { ...f, ...data } : f)),
      isDirty: true,
    }));
  },

  // Delete field
  deleteField: (id) => {
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
      isDirty: true,
    }));
  },

  // Reorder fields
  reorderFields: (fields) => {
    set({ fields, isDirty: true });
  },

  // Duplicate field
  duplicateField: (id) => {
    const field = get().fields.find((f) => f.id === id);
    if (!field) return;

    const duplicatedField: FormField = {
      ...field,
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: `${field.label} (copy)`,
      order: get().fields.length,
    };

    set((state) => ({
      fields: [...state.fields, duplicatedField],
      selectedFieldId: duplicatedField.id,
      isDirty: true,
    }));
  },

  // Select field
  selectField: (id) => {
    set({ selectedFieldId: id });
  },

  // Add logic rule
  addLogicRule: () => {
    const newRule: LogicRule = {
      id: `logic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'show',
      targetFieldId: '',
      conditions: [],
    };
    set((state) => ({
      logic: [...state.logic, newRule],
      selectedLogicId: newRule.id,
      isDirty: true,
    }));
  },

  // Update logic rule
  updateLogicRule: (id, data) => {
    set((state) => ({
      logic: state.logic.map((l) => (l.id === id ? { ...l, ...data } : l)),
      isDirty: true,
    }));
  },

  // Delete logic rule
  deleteLogicRule: (id) => {
    set((state) => ({
      logic: state.logic.filter((l) => l.id !== id),
      selectedLogicId: state.selectedLogicId === id ? null : state.selectedLogicId,
      isDirty: true,
    }));
  },

  // Select logic
  selectLogic: (id) => {
    set({ selectedLogicId: id });
  },

  // Update theme
  updateTheme: (theme) => {
    set((state) => ({
      theme: { ...state.theme, ...theme },
      isDirty: true,
    }));
  },

  // Update settings
  updateSettings: (settings) => {
    set((state) => ({
      settings: { ...state.settings, ...settings },
      isDirty: true,
    }));
  },

  // Set active tab
  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  // Save form
  saveForm: async () => {
    const state = get();
    if (!state.form) return;

    set({ isSaving: true });

    try {
      const { formsApi } = await import('@/lib/api');

      const schema: FormSchema = {
        version: '1.0',
        fields: state.fields,
        theme: state.theme,
        settings: state.settings,
        logic: state.logic,
      };

      if (state.form.id) {
        // Update existing form
        const updated = await formsApi.updateForm(state.form.id, {
          name: state.form.name,
          slug: state.form.slug,
          description: state.form.description,
          schema,
        });
        set({ form: updated, isDirty: false, isSaving: false });
      } else {
        // Create new form
        const created = await formsApi.createForm({
          name: state.form.name,
          slug: state.form.slug,
          description: state.form.description,
          schema,
        });
        set({ form: created, isDirty: false, isSaving: false });
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  // Publish form
  publishForm: async () => {
    const state = get();
    if (!state.form?.id) return;

    set({ isSaving: true });

    try {
      const { formsApi } = await import('@/lib/api');
      const published = await formsApi.publishForm(state.form.id);
      set({ form: published, isDirty: false, isSaving: false });
    } catch (error) {
      console.error('Failed to publish form:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  // Reset state
  resetState: () => {
    set({
      form: null,
      fields: [],
      logic: [],
      theme: defaultTheme,
      settings: defaultSettings,
      selectedFieldId: null,
      selectedLogicId: null,
      activeTab: 'fields',
      isDirty: false,
      isSaving: false,
    });
  },
}));
