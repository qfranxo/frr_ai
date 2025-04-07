import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 공개 경로 설정
export default clerkMiddleware(() => {
  // 모든 요청을 허용
  return NextResponse.next();
});

export const config = {
  matcher: [
    // Next.js 내부 리소스와 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 경로는 항상 처리
    '/(api|trpc)(.*)'
  ],
}; 