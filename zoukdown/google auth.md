# 구글 로그인 및 회원가입 문제 해결 가이드

## 문제 상황
Clerk 라이브러리를 사용한 구글 로그인 중 `https://www.frrai.com/auth/register/sso-callback/` 경로에서 404 에러가 발생했습니다. 이는 소셜 로그인 중 콜백 URL이 올바르게 설정되지 않아 발생한 문제였습니다.

## 해결 방법

### 1. `.env.local` 파일 수정
기존의 환경 변수가 잘못 설정되어 있어서 콜백 URL이 올바르게 동작하지 않았습니다.

```
# 기존 코드
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard

# 수정된 코드
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=
NEXT_PUBLIC_CLERK_SSO_CALLBACK_URL=/sso-callback
```

### 2. `middleware.ts` 파일 수정
미들웨어에서 Public Path 설정이 누락되어 소셜 로그인 경로에 접근할 수 없었습니다.

```javascript
// 기존 코드
const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/api/public(.*)",
  "/api/(.*)",
  "/pricing",
  "/about",
  "/community"
];

// 수정된 코드
const publicPaths = [
  "/", 
  "/sign-in",
  "/sign-up",
  "/auth/login(.*)",
  "/auth/register(.*)",
  "/sso-callback(.*)",  // SSO 콜백 경로 추가
  "/api/public(.*)",
  "/api/(.*)",
  "/pricing",
  "/about",
  "/community"
];
```

## 처음부터 올바른 구현 방법

### 1. Clerk 설정하기

1. **필요한 패키지 설치**:
   ```bash
   npm install @clerk/nextjs
   # 또는
   yarn add @clerk/nextjs
   ```

2. **환경 변수 설정** (`.env.local`):
   ```
   # Clerk API 키 (대시보드에서 확인)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_publishable_key
   CLERK_SECRET_KEY=sk_live_your_secret_key
   
   # 앱 URL (배포 환경에 맞게 설정)
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   
   # 소셜 로그인 관련 설정
   NEXT_PUBLIC_CLERK_SSO_CALLBACK_URL=/sso-callback
   ```

3. **Provider 설정** (`layout.tsx`):
   ```jsx
   import { ClerkProvider } from '@clerk/nextjs';
   
   export default function RootLayout({
     children,
   }: {
     children: React.ReactNode;
   }) {
     return (
       <html lang="en">
         <ClerkProvider>
           <body>{children}</body>
         </ClerkProvider>
       </html>
     );
   }
   ```

4. **미들웨어 설정** (`middleware.ts`):
   ```javascript
   import { authMiddleware } from "@clerk/nextjs";
   
   export default authMiddleware({
     publicRoutes: [
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
     ],
   });
   
   export const config = {
     matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
   };
   ```

5. **소셜 로그인 컴포넌트 추가** (`app/sign-in/page.tsx`):
   ```jsx
   import { SignIn } from "@clerk/nextjs";
   
   export default function SignInPage() {
     return (
       <div className="flex justify-center items-center min-h-screen">
         <SignIn
           path="/sign-in"
           routing="path"
           signUpUrl="/sign-up"
           redirectUrl="/"
           appearance={{
             elements: {
               formButtonPrimary: "bg-primary text-white hover:bg-primary-dark",
             },
           }}
         />
       </div>
     );
   }
   ```

6. **SSO 콜백 페이지 생성** (`app/sso-callback/page.tsx`):
   ```jsx
   "use client";
   import { useEffect } from "react";
   import { useRouter, useSearchParams } from "next/navigation";
   
   export default function SSOCallbackPage() {
     const router = useRouter();
     const searchParams = useSearchParams();
     
     useEffect(() => {
       // 로딩 상태 표시 후 홈으로 리다이렉트
       const timer = setTimeout(() => {
         router.push("/");
       }, 2000);
       
       return () => clearTimeout(timer);
     }, [router]);
     
     return (
       <div className="flex flex-col items-center justify-center min-h-screen">
         <h2 className="text-2xl font-semibold mb-4">소셜 로그인 진행 중...</h2>
         <p>잠시만 기다려주세요. 자동으로 메인 페이지로 이동합니다.</p>
       </div>
     );
   }
   ```

7. **Clerk 대시보드 설정**:
   - Clerk 대시보드에서 소셜 로그인(Google, GitHub 등)을 활성화
   - 각 소셜 로그인 서비스의 client ID와 secret을 설정
   - 리다이렉트 URL을 `/sso-callback`으로 설정
   - OAuth 설정에서 도메인을 올바르게 설정

### 추가 팁과 주의사항

1. **개발 및 프로덕션 환경 분리**:
   - Clerk은 개발/프로덕션 인스턴스를 별도로 관리합니다.
   - 각 환경에 맞는 API 키를 사용해야 합니다.

2. **도메인 설정**:
   - 개발 중에는 `localhost`가 허용됩니다.
   - 프로덕션에서는 실제 도메인을 Clerk 대시보드에 등록해야 합니다.

3. **콜백 URL 문제 디버깅**:
   - 브라우저 개발자 도구의 네트워크 탭에서 리다이렉션 체인을 확인
   - Clerk 로그에서 오류 메시지 확인
   - 모든 URL이 정확히 일치하는지 확인 (대소문자, 슬래시 등)

4. **미들웨어 설정 확인**:
   - 모든 관련 경로가 publicRoutes에 포함되어 있는지 확인
   - 와일드카드 패턴(`(.*)`)이 올바르게 설정되었는지 확인

이렇게 설정하면 구글 로그인과 회원가입이 원활하게 작동하게 됩니다. 문제가 지속되면 클라이언트 측 콘솔과 서버 로그를 함께 확인하여 정확한 오류 원인을 파악해야 합니다.
