'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formsApi } from '@/lib/api';
import InteractiveFormPreview from '@/components/preview/InteractiveFormPreview';
import type { Form } from '@/types/form';

export default function PreviewPage() {
  const params = useParams();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadForm = async () => {
      try {
        const data = await formsApi.getFormForPreview(params.formId as string);
        setForm(data);
      } catch (err: any) {
        if (err.response?.status === 401) {
          router.push('/login');
        } else if (err.response?.status === 404) {
          setError('Form not found');
        } else {
          setError('Failed to load form');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadForm();
  }, [params.formId, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Form not found'}</p>
          <Button variant="outline" onClick={() => router.push('/forms')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Forms
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Preview Banner */}
      <div className="bg-yellow-100 border-b border-yellow-200 px-4 py-3 sticky top-0 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-yellow-800">
              ⚠️ PREVIEW MODE
            </span>
            <span className="text-xs text-yellow-700">
              • This is how your form will appear to users
            </span>
            <span className="text-xs text-yellow-700">
              • Submissions are not saved
            </span>
          </div>
          <div className="flex items-center gap-2">
            {form.status === 'draft' && (
              <span className="text-xs bg-yellow-200 text-yellow-800 px-3 py-1 rounded-full font-medium">
                Draft
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/builder')}
              className="text-xs"
            >
              Edit Form
            </Button>
          </div>
        </div>
      </div>

      {/* Form Preview */}
      <div className="py-8">
        <InteractiveFormPreview form={form} />
      </div>
    </div>
  );
}
