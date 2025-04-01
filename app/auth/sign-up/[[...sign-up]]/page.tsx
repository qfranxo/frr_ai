'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";

export default function Page() {
  const router = useRouter();
  const { openSignUp } = useClerk();
  
  useEffect(() => {
    // 모달 창 열기
    openSignUp();
    
    // 홈페이지로 리디렉션
    router.push('/');
  }, [openSignUp, router]);
  
  return (
    <div className="flex justify-center items-center min-h-screen">
      {/* 내용 없음 - 모달 창이 표시되고 홈페이지로 리디렉션됨 */}
    </div>
  );
} 