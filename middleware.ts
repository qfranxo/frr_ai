import { NextResponse } from 'next/server';
import { getAuth } from '@clerk/nextjs/server';
import type { NextRequest } from 'next/server';

// 공개 경로 목록
const publicPaths = [
  '/',
  '/api/public',
  '/sign-in',
  '/sign-up',
  '/auth/login',
  '/auth/register',
  '/api/clerk-webhook',
  '/sso-callback'
];

// 정적 파일 접두사
const staticFilePrefixes = [
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts'
];

export default function middleware(req: NextRequest) {
  // 정적 파일 확인
  const isStaticFile = staticFilePrefixes.some(prefix => 
    req.nextUrl.pathname.startsWith(prefix)
  );
  
  if (isStaticFile) {
    return NextResponse.next();
  }

  // 공개 경로 확인
  const isPublicPath = publicPaths.some(path => {
    if (path.endsWith('*')) {
      return req.nextUrl.pathname.startsWith(path.slice(0, -1));
    }
    return req.nextUrl.pathname === path || req.nextUrl.pathname.startsWith(`${path}/`);
  });

  // 공개 경로면 그대로 통과
  if (isPublicPath) {
    return NextResponse.next();
  }

  // 그 외의 경우 - 일단 모든 요청 허용
  // 실제 인증이 필요한 경우 여기서 체크하면 됨
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api/clerk-webhook|api/public|_next/static|_next/image|favicon.ico).*)'
  ],
}; 