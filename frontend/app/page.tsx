'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    console.group('🏠 Home Page - Authentication Check');

    // Check if user is authenticated
    const token = localStorage.getItem('access_token');
    const user = localStorage.getItem('user');
    const refreshToken = localStorage.getItem('refresh_token');

    console.log('Token exists:', !!token);
    console.log('Token (first 50 chars):', token ? token.substring(0, 50) + '...' : 'N/A');
    console.log('User exists:', !!user);
    console.log('User:', user ? JSON.parse(user) : 'N/A');
    console.log('Refresh Token exists:', !!refreshToken);

    if (!token) {
      console.log('❌ No token found, redirecting to /login');
      router.push('/login');
    } else {
      console.log('✅ Token found, redirecting to /forms');
      router.push('/forms');
    }

    console.groupEnd();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
