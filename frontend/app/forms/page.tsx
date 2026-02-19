'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Eye, Edit, Trash2, MoreHorizontal, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { formsApi, authApi } from '@/lib/api';
import { useFormBuilder } from '@/lib/store';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import type { Form } from '@/types/form';
import { Toaster } from '@/components/ui/sonner';

export default function FormsPage() {
  const router = useRouter();
  const { createNewForm, setForm, resetState } = useFormBuilder();
  const [forms, setForms] = useState<Form[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadForms = async () => {
    try {
      const data = await formsApi.listForms();
      setForms(data);
    } catch (error: any) {
      toast.error('Failed to load forms');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadForms();
  }, []);

  const handleCreateForm = () => {
    createNewForm('Untitled Form');
    router.push('/builder');
  };

  const handleEditForm = (form: Form) => {
    resetState();
    setForm(form);
    router.push('/builder');
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    router.push('/login');
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      await formsApi.deleteForm(id);
      setForms(forms.filter((f) => f.id !== id));
      toast.success('Form deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete form');
    }
  };

  const handlePublish = async (form: Form) => {
    try {
      const updated = await formsApi.publishForm(form.id);
      setForms(forms.map((f) => (f.id === form.id ? updated : f)));
      toast.success('Form published successfully!');
    } catch (error: any) {
      toast.error('Failed to publish form');
    }
  };

  const handlePreviewForm = (form: Form) => {
    // Navigate to preview page - works for both draft and published forms
    window.open(`/preview/${form.id}`, '_blank');
  };

  const handleViewSubmissions = (form: Form) => {
    router.push(`/forms/${form.id}/submissions`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'archived':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">My Forms</h1>
              <p className="text-sm text-gray-500 mt-1">
                Create and manage your forms
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
              <Button onClick={handleCreateForm}>
                <Plus className="w-4 h-4 mr-2" />
                New Form
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Forms List */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : forms.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No forms yet
                </h3>
                <p className="text-gray-500 mb-6">
                  Create your first form to get started
                </p>
                <Button onClick={handleCreateForm}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Form
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.map((form) => (
              <Card key={form.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{form.name}</CardTitle>
                      {form.description && (
                        <CardDescription className="mt-1 line-clamp-2">
                          {form.description}
                        </CardDescription>
                      )}
                    </div>
                    <Badge className={getStatusColor(form.status)}>
                      {form.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-gray-500 space-y-1 mb-4">
                    <p>{form.schema.fields.length} fields</p>
                    {form.slug && (
                      <p className="text-xs">
                        /forms/{form.slug}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleEditForm(form)}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handlePreviewForm(form)}
                        disabled={!form.slug}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Preview
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleViewSubmissions(form)}
                      >
                        View Submissions
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {form.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handlePublish(form)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDeleteForm(form.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
