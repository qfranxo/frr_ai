'use client';

import Link from "next/link";
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">해당 아이디를 찾을 수 없습니다</h2>
        <p className="text-gray-500 mb-8">
          사용자 계정이 존재하지 않거나 이동되었습니다.
        </p>
        <Link href="/" 
          className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:opacity-90 text-white rounded-full shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
          <Home className="w-4 h-4 mr-2" />
          홈페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
} 