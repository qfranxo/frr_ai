import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 모든 경로를 공개로 설정
const isPublicRoute = createRouteMatcher([
  '/(.*)'  // 모든 경로를 공개 경로로 설정
]);

// 미들웨어에서 인증 보호 제거
export default clerkMiddleware(async (auth, req) => {
  // 모든 경로가 공개이므로 auth.protect()는 호출되지 않음
});

export const config = {
  matcher: [
    // Next.js 내부 리소스와 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 경로는 항상 처리
    '/(api|trpc)(.*)',
  ],
}; 