'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Download, Trash2, Eye, Loader2, Calendar, User, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { submissionsApi, formsApi } from '@/lib/api';
import { toast } from 'sonner';
import type { Form, FormSubmission } from '@/types/form';
import { Toaster } from '@/components/ui/sonner';

interface SubmissionWithMeta extends FormSubmission {
  submittedAt?: string;
  createdAt: string;
}

export default function FormSubmissionsPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<Form | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionWithMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadSubmissions = async () => {
    try {
      const [formData, submissionsData] = await Promise.all([
        formsApi.getForm(formId),
        submissionsApi.listSubmissions(formId, 100, 0, statusFilter === 'all' ? undefined : statusFilter),
      ]);

      setForm(formData);

      // Transform submissions data
      const transformed = submissionsData.map((sub: any) => ({
        ...sub,
        submittedAt: sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : undefined,
        createdAt: new Date(sub.created_at).toLocaleString(),
      }));

      setSubmissions(transformed);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('Form not found');
        router.push('/forms');
      } else {
        toast.error('Failed to load submissions');
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [formId, statusFilter]);

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await submissionsApi.exportSubmissions(formId, 'csv');
      toast.success('Submissions exported successfully!');
    } catch (error: any) {
      toast.error('Failed to export submissions');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteSubmission = async (submissionId: string) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      await submissionsApi.deleteSubmission(formId, submissionId);
      setSubmissions(submissions.filter((s) => s.id !== submissionId));
      toast.success('Submission deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete submission');
    }
  };

  const getFieldLabel = (fieldId: string) => {
    const field = form?.schema.fields.find((f) => f.id === fieldId);
    return field?.label || fieldId;
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(', ');
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'complete':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      case 'abandoned':
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/forms')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Forms
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Submissions</h1>
                <p className="text-sm text-gray-500 mt-1">
                  {form?.name || 'Loading...'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 mr-4">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="border rounded-md px-3 py-1.5 text-sm"
                >
                  <option value="all">All</option>
                  <option value="complete">Complete</option>
                  <option value="draft">Draft</option>
                  <option value="abandoned">Abandoned</option>
                </select>
              </div>
              <Button
                variant="outline"
                onClick={handleExport}
                disabled={isExporting || submissions.length === 0}
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Export CSV
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Submissions</p>
                  <p className="text-2xl font-bold">{submissions.length}</p>
                </div>
                <User className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Complete</p>
                  <p className="text-2xl font-bold text-green-600">
                    {submissions.filter((s) => s.status === 'complete').length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {submissions.filter((s) => s.status === 'draft').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Abandoned</p>
                  <p className="text-2xl font-bold text-gray-600">
                    {submissions.filter((s) => s.status === 'abandoned').length}
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <Card>
          <CardHeader>
            <CardTitle>All Submissions</CardTitle>
            <CardDescription>View and manage all form submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No submissions yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Status</TableHead>
                      {form?.schema.fields.slice(0, 5).map((field) => (
                        <TableHead key={field.id}>{field.label || field.id}</TableHead>
                      ))}
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id}>
                        <TableCell className="text-sm">
                          {submission.submittedAt || submission.createdAt}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeVariant(submission.status)}>
                            {submission.status}
                          </Badge>
                        </TableCell>
                        {form?.schema.fields.slice(0, 5).map((field) => (
                          <TableCell key={field.id} className="max-w-xs truncate">
                            {formatValue(submission.submission_data[field.id])}
                          </TableCell>
                        ))}
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSubmission(submission.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}
