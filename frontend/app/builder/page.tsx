'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import FormBuilder from '@/components/form-builder/FormBuilder';
import { Toaster } from '@/components/ui/sonner';

export default function BuilderPage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  return (
    <>
      <FormBuilder />
      <Toaster position="top-right" />
    </>
  );
}
