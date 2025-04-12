'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SSOCallback() {
  const router = useRouter();
  const [message, setMessage] = useState('로그인 처리 중입니다...');

  useEffect(() => {
    const timeout = setTimeout(() => {
      // 로그인 완료 후 메인 페이지로 리다이렉트
      router.push('/');
    }, 1500);

    return () => clearTimeout(timeout);
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-lg font-medium text-gray-700">{message}</p>
      <p className="mt-2 text-sm text-gray-500">잠시 후 자동으로 메인 페이지로 이동합니다.</p>
    </div>
  );
} 