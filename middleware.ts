import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// 공개 경로 패턴 설정
const isPublicRoute = createRouteMatcher([
  '/',
  '/api/public(.*)',
  '/auth/login(.*)',  // 로그인 페이지 추가
  '/auth/register(.*)'  // 회원가입 페이지 추가
]);

// Clerk 미들웨어 설정
export default clerkMiddleware((auth, req) => {
  // 공개 경로 허용
  if (isPublicRoute(req.nextUrl.pathname)) {
    return NextResponse.next();
  }
  
  // 그 외 요청도 허용 (모든 요청이 클라이언트단에서 처리될 예정)
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