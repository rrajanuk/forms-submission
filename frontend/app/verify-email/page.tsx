'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { toast } from 'sonner';
import { Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found. Please check your email link or request a new one.');
        return;
      }

      try {
        const response = await api.post('/api/auth/verify-email', { token });

        // Check if verification was successful
        if (response.data.user?.emailVerified || response.data.message) {
          setStatus('success');
          setMessage('Your email has been verified successfully!');

          // Clear verification token from localStorage
          localStorage.removeItem('verification_token');

          // Clear dismissal flag
          sessionStorage.removeItem('verification_warning_dismissed');

          toast.success('Email verified successfully!');

          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push('/forms');
          }, 2000);
        } else {
          throw new Error('Verification response missing expected data');
        }
      } catch (error: any) {
        setStatus('error');
        setMessage(
          error.response?.data?.error ||
            'Verification failed. The link may be expired or invalid. Please request a new verification email.'
        );
        toast.error(error.response?.data?.error || 'Verification failed');
      }
    };

    verifyEmail();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {status === 'loading' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Loader2 className="w-16 h-16 text-indigo-600 animate-spin" />
                  <Mail className="w-8 h-8 text-indigo-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verifying Your Email</h1>
              <p className="text-gray-600">Please wait while we confirm your email address...</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Email Verified!</h1>
              <p className="text-gray-600 mb-6">{message}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  ✅ You now have full access to all features
                </p>
              </div>
              <p className="text-sm text-gray-500">Redirecting you to the dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-10 h-10 text-red-600" />
                </div>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Verification Failed</h1>
              <p className="text-gray-600 mb-6">{message}</p>

              <div className="space-y-3">
                <button
                  onClick={() => router.push('/welcome')}
                  className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Back to Verification Page
                </button>
                <button
                  onClick={() => router.push('/login')}
                  className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                >
                  Go to Login
                </button>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Troubleshooting:</strong>
                  <br />• Make sure you clicked the complete link in your email
                  <br />• Verification links expire after 24 hours
                  <br />• Request a new verification email if needed
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Wrapper component with Suspense boundary
export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
