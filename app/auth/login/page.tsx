'use client';

import { SignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">로그인</h1>
          <p className="mt-2 text-sm text-gray-600">
            계정에 로그인하세요
          </p>
        </div>
        
        <SignIn 
          path="/auth/login"
          routing="path" 
          signUpUrl="/auth/register"
          redirectUrl="/"
        />
        
        <div className="text-center mt-4">
          <button
            onClick={() => router.push('/')}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
} 