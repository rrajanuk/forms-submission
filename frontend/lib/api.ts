import axios, { AxiosError } from 'axios';
import type { Form, CreateFormInput, UpdateFormInput } from '@/types/form';
import { config } from './config';

const api = axios.create({
  baseURL: config.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear tokens and redirect to login
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const formsApi = {
  // List all forms for current user's organization
  listForms: async (limit = 50, offset = 0): Promise<Form[]> => {
    const response = await api.get(`/api/forms?limit=${limit}&offset=${offset}`);
    return response.data;
  },

  // Get a single form by ID
  getForm: async (id: string): Promise<Form> => {
    const response = await api.get(`/api/forms/${id}`);
    return response.data;
  },

  // Create a new form
  createForm: async (data: CreateFormInput): Promise<Form> => {
    const response = await api.post('/api/forms', data);
    return response.data;
  },

  // Update a form
  updateForm: async (id: string, data: UpdateFormInput): Promise<Form> => {
    const response = await api.put(`/api/forms/${id}`, data);
    return response.data;
  },

  // Publish a form
  publishForm: async (id: string): Promise<Form> => {
    const response = await api.post(`/api/forms/${id}/publish`);
    return response.data;
  },

  // Archive a form
  archiveForm: async (id: string): Promise<Form> => {
    const response = await api.post(`/api/forms/${id}/archive`);
    return response.data;
  },

  // Delete a form
  deleteForm: async (id: string): Promise<void> => {
    await api.delete(`/api/forms/${id}`);
  },

  // Get form analytics
  getAnalytics: async (id: string): Promise<any> => {
    const response = await api.get(`/api/forms/${id}/analytics`);
    return response.data;
  },

  // Get form for preview (works for drafts)
  getFormForPreview: async (id: string): Promise<Form> => {
    const response = await api.get(`/api/forms/${id}/preview`);
    return response.data;
  },
};

export const authApi = {
  // Register new organization and user
  register: async (data: {
    organization_name: string;
    email: string;
    password: string;
    name?: string;
  }) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  // Login
  login: async (email: string, password: string) => {
    const response = await api.post('/api/auth/login', { email, password });
    return response.data;
  },

  // Refresh token
  refresh: async (refreshToken: string) => {
    const response = await api.post('/api/auth/refresh', { refresh_token: refreshToken });
    return response.data;
  },

  // Logout
  logout: async () => {
    await api.post('/api/auth/logout');
  },
};

export const submissionsApi = {
  // List submissions for a form
  listSubmissions: async (formId: string, limit = 100, offset = 0, status?: string): Promise<any[]> => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (status) params.append('status', status);
    const response = await api.get(`/api/forms/${formId}/submissions?${params}`);
    return response.data;
  },

  // Get a single submission
  getSubmission: async (formId: string, submissionId: string): Promise<any> => {
    const response = await api.get(`/api/forms/${formId}/submissions/${submissionId}`);
    return response.data;
  },

  // Export submissions as CSV
  exportSubmissions: async (formId: string, format = 'csv'): Promise<void> => {
    const response = await api.get(`/api/forms/${formId}/submissions/export?format=${format}`, {
      responseType: 'blob',
    });

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `submissions-${formId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Delete a submission
  deleteSubmission: async (formId: string, submissionId: string): Promise<void> => {
    await api.delete(`/api/forms/${formId}/submissions/${submissionId}`);
  },
};

export default api;
