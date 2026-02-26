'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

interface VerificationWarningProps {
  onVerified?: () => void;
}

export function VerificationWarning({ onVerified }: VerificationWarningProps) {
  const router = useRouter();
  const [emailVerified, setEmailVerified] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string>('');

  useEffect(() => {
    checkVerificationStatus();

    // Get verification token from localStorage
    const token = localStorage.getItem('verification_token');
    if (token) {
      setVerificationToken(token);
    }
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await api.post('/api/auth/me', {});
      // For now, we'll check if we have a verification token
      // In production, check email_verified field from response
      const hasToken = localStorage.getItem('verification_token');
      setEmailVerified(!hasToken);
    } catch (error) {
      // Silently fail
    }
  };

  const handleVerifyNow = async () => {
    if (!verificationToken) {
      toast.error('No verification token found. Please try registering again.');
      return;
    }

    setIsVerifying(true);
    try {
      await api.post('/api/auth/verify-email', { token: verificationToken });
      setEmailVerified(true);
      localStorage.removeItem('verification_token');
      toast.success('Email verified successfully!');
      onVerified?.();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    // Set flag so user won't be redirected again
    sessionStorage.setItem('verification_warning_dismissed', 'true');
    toast.info('You can continue, but some features may be limited');
  };

  const handleGoToWelcome = () => {
    router.push('/welcome');
  };

  if (emailVerified === null || emailVerified || dismissed) {
    return null;
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">
                Please verify your email address to unlock all features
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                Some features may be limited until verification is complete
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {verificationToken && (
              <Button
                size="sm"
                onClick={handleVerifyNow}
                disabled={isVerifying}
                className="bg-amber-600 hover:bg-amber-700 text-white"
              >
                {isVerifying ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Verifying...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    Verify Now
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleGoToWelcome}
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Go to Welcome Page
            </Button>
            <button
              onClick={handleDismiss}
              className="ml-2 text-amber-600 hover:text-amber-800 p-1 rounded hover:bg-amber-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
