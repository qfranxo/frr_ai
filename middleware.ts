import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

// 공개 경로 설정
const isPublicRoute = createRouteMatcher([
  '/',                      // 홈페이지
  '/community',             // 커뮤니티 페이지
  '/community/:path*',      // 커뮤니티 하위 경로
  '/generate',              // 생성 페이지
  '/subscription',          // 구독 페이지
  '/about',                 // 소개 페이지
  '/legal/:path*',          // 법적 문서
  '/static-assets/:path*',  // 정적 자산
  '/api/:path*'             // API 경로
]);

// 미들웨어에서 인증 보호 제거 및 정적 오류 페이지 처리
export default clerkMiddleware(async (auth, req) => {
  // 정적 오류 페이지인 경우 Clerk 관련 코드를 실행하지 않음
  const pathname = req.nextUrl.pathname;
  const staticErrorPages = ['/404', '/500', '/_error', '/_not-found'];
  
  if (staticErrorPages.includes(pathname)) {
    return;
  }
  
  // 모든 경로가 공개이므로 auth.protect()는 호출되지 않음
});

export const config = {
  matcher: [
    // Next.js 내부 리소스와 정적 파일 제외
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // API 경로는 항상 처리
    '/(api|trpc)(.*)'
  ],
}; 