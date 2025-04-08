'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignInRedirect() {
  const router = useRouter();

  useEffect(() => {
    // 로딩 지연을 줘서 리다이렉트가 자연스럽게 이루어지도록 함
    const redirectTimer = setTimeout(() => {
      router.push('/auth/login');
    }, 100);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      <p className="mt-4 text-gray-600">리다이렉트 중...</p>
    </div>
  );
} 