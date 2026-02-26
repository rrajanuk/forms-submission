'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, Mail, ArrowRight, Sparkles, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function WelcomePage() {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string>('');
  const [verificationToken, setVerificationToken] = useState<string>('');
  const [isVerified, setIsVerified] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      setUserEmail(user.email);
    }

    // Get verification token from localStorage (stored during registration)
    const token = localStorage.getItem('verification_token');
    if (token) {
      setVerificationToken(token);
    }
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const handleVerifyEmail = async () => {
    setIsLoading(true);

    try {
      const response = await api.post('/api/auth/verify-email', {
        token: verificationToken,
      });

      setIsVerified(true);
      toast.success('Email verified successfully! You can now access all features.');

      // Clear the verification token from localStorage
      localStorage.removeItem('verification_token');

      // Clear the warning dismissed flag
      sessionStorage.removeItem('verification_warning_dismissed');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to verify email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueToDashboard = () => {
    // Set flag to allow access to dashboard without verification
    sessionStorage.setItem('verification_warning_dismissed', 'true');
    router.push('/forms');
  };

  const handleResendVerification = async () => {
    setResendDisabled(true);
    setCountdown(60);

    try {
      const response = await api.post('/api/auth/resend-verification', {});

      // In development mode, the token is returned in the response
      if (response.data.verificationToken) {
        setVerificationToken(response.data.verificationToken);
        localStorage.setItem('verification_token', response.data.verificationToken);
      }

      toast.success('Verification email resent! Please check your inbox.');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to resend verification email');
    } finally {
      setTimeout(() => setResendDisabled(false), 60000);
    }
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(verificationToken);
    setCopied(true);
    toast.success('Verification token copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = [
    {
      icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
      title: 'Account Created',
      description: 'Your account has been successfully created',
    },
    {
      icon: isVerified ? <CheckCircle2 className="w-6 h-6 text-green-600" /> : <Mail className="w-6 h-6 text-blue-600" />,
      title: isVerified ? 'Email Verified' : 'Verify Your Email',
      description: isVerified ? 'Your email has been verified' : 'Click the button below to verify your email',
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-600" />,
      title: 'Start Building Forms',
      description: 'Create beautiful forms with our drag-and-drop builder',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            {isVerified ? 'Welcome Aboard!' : 'Welcome to Form Builder!'}
          </h1>
          <p className="text-lg text-gray-600">
            {isVerified
              ? 'Your account is ready. Start creating beautiful forms!'
              : 'You\'re just one step away from creating beautiful forms'}
          </p>
        </div>

        {/* Main Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Get Started in 3 Simple Steps</CardTitle>
            <CardDescription>
              {isVerified
                ? 'All steps completed! You\'re ready to go.'
                : 'Follow these steps to activate your account and start building forms'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {steps.map((step, index) => (
                <div key={index} className={`flex items-start gap-4 p-4 rounded-lg transition-colors ${index === 1 && !isVerified ? 'bg-blue-50 border-2 border-blue-200' : 'bg-gray-50 hover:bg-gray-100'}`}>
                  <div className="flex-shrink-0 mt-1">
                    {step.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      {step.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {step.description}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <div className="flex-shrink-0">
                      <ArrowRight className="w-5 h-5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Verification Section */}
        {!isVerified && (
          <Card className="mb-8 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Mail className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Verify Your Email Address
                  </h3>
                  <p className="text-sm text-blue-700 mb-4">
                    Please verify <strong>{userEmail}</strong> to activate your account and unlock all features.
                  </p>

                  {verificationToken && (
                    <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200">
                      <p className="text-xs text-gray-600 mb-2">
                        <strong>Development Mode:</strong> Your verification token is shown below.
                        In production, this would be sent via email.
                      </p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded break-all">
                          {verificationToken}
                        </code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCopyToken}
                          className="flex-shrink-0"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handleVerifyEmail}
                      disabled={isLoading || isVerified}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2" />
                          Verify Email
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={resendDisabled}
                      className="border-blue-300 text-blue-700 hover:bg-blue-100"
                    >
                      {resendDisabled ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Resend in {countdown}s
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4 mr-2" />
                          Resend Token
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* What's Next */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Create forms</strong> using our drag-and-drop builder with 13 field types</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Add conditional logic</strong> to show/hide fields based on user input</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Embed forms</strong> on your website with our JavaScript SDK</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>View submissions</strong> in real-time and export to CSV</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span><strong>Set up notifications</strong> via email or webhooks</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            onClick={handleContinueToDashboard}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            Continue to Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="mt-4 text-sm text-gray-500">
            {isVerified
              ? 'Your account is fully activated and ready to use!'
              : 'You can access the dashboard, but some features may be limited until verification'}
          </p>
        </div>
      </div>
    </div>
  );
}
