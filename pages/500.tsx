import Link from "next/link";
import { ChevronLeft } from 'lucide-react';

export default function ServerError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 py-12 text-center">
      <div className="max-w-md">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">500</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">서버 오류가 발생했습니다</h2>
        <p className="text-gray-500 mb-8">
          죄송합니다. 서버에 문제가 발생했습니다. 나중에 다시 시도해주세요.
        </p>
        <Link href="/" 
          className="inline-flex items-center justify-center px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500">
          <ChevronLeft className="w-4 h-4 mr-2" />
          홈페이지로 돌아가기
        </Link>
      </div>
    </div>
  );
} 