import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// 공개 접근 가능한 경로 패턴
const publicPaths = [
  "/", 
  "/sign-in",
  "/sign-up",
  "/auth/login(.*)",
  "/auth/register(.*)",
  "/sso-callback(.*)",
  "/api/public(.*)",
  "/api/(.*)",
  "/pricing",
  "/about",
  "/community"
];

// 경로가 공개 접근 가능한지 확인하는 함수
const isPublic = (path: string) => {
  return publicPaths.some(publicPath => {
    if (publicPath.endsWith("(.*)")) {
      const base = publicPath.slice(0, -4);
      return path.startsWith(base);
    }
    return publicPath === path;
  });
}

export default clerkMiddleware((auth, req) => {
  // 현재 경로
  const path = req.nextUrl.pathname;
  
  // 공개 경로면 접근 허용
  if (isPublic(path)) {
    return NextResponse.next();
  }

  // 다른 모든 경로도 일단 허용 (필요에 따라 여기서 인증 체크 구현)
  return NextResponse.next();
});

export const config = {
  matcher: [
    // API 라우트
    '/(api|trpc)(.*)',
    // 페이지 라우트, 정적 파일 제외
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'
  ],
}; 