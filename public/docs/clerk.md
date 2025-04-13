# Next.js에 Clerk 인증 시스템 연동하기

## 1. Clerk 패키지 설치

프로젝트에 Clerk 패키지를 설치합니다:

```bash
npm install @clerk/nextjs
```

## 2. 환경 변수 설정

프로젝트 루트에 `.env.local` 파일을 생성하고 Clerk 대시보드에서 발급받은 키를 추가합니다:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_**********
CLERK_SECRET_KEY=sk_test_**********

# 선택적 환경변수
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
```

## 3. ClerkProvider 설정

`app/layout.tsx`에 ClerkProvider를 추가하여 전역적으로 인증 상태를 관리합니다:

```typescript
import { ClerkProvider } from '@clerk/nextjs'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
    children
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider>
            <html lang="en">
                <body className={inter.className}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    )
}
```

## 4. 미들웨어 설정

프로젝트 루트에 `middleware.ts` 파일을 생성하여 보호된 라우트를 설정합니다:

```typescript
import { authMiddleware } from "@clerk/nextjs";
 
export default authMiddleware({
    // 공개 접근 가능한 경로 설정
    publicRoutes: ["/", "/api/public"],
    
    // 인증이 필요없는 경로 설정 (선택사항)
    ignoredRoutes: ["/api/ignore"]
});
 
export const config = {
    matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

## 5. 로그인/회원가입 페이지 설정

### 5.1 로그인 페이지 (app/sign-in/[[...sign-in]]/page.tsx)

```typescript
import { SignIn } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <SignIn />
        </div>
    );
}
```

### 5.2 회원가입 페이지 (app/sign-up/[[...sign-up]]/page.tsx)

```typescript
import { SignUp } from "@clerk/nextjs";

export default function Page() {
    return (
        <div className="flex min-h-screen items-center justify-center">
            <SignUp />
        </div>
    );
}
```

## 6. 인증 상태 확인 및 사용자 정보 접근

### 6.1 서버 컴포넌트에서 사용

```typescript
import { auth, currentUser } from "@clerk/nextjs";

export default async function Page() {
    const { userId } = auth();
    const user = await currentUser();
    
    if (!userId) {
        return <div>Please sign in</div>;
    }
    
    return <div>Hello, {user?.firstName}!</div>;
}
```

### 6.2 클라이언트 컴포넌트에서 사용

```typescript
'use client';
import { useUser } from "@clerk/nextjs";

export default function UserProfile() {
    const { user } = useUser();
    
    return <div>Hello, {user?.firstName}!</div>;
}
```

## 7. 보호된 API 라우트 설정

```typescript
import { auth } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
    const { userId } = auth();
    
    if (!userId) {
        return new NextResponse("Unauthorized", { status: 401 });
    }
    
    // 인증된 요청 처리
    return NextResponse.json({ message: "Protected data!" });
}
```

## 8. 유용한 컴포넌트

- `<SignedIn>`: 인증된 사용자에게만 보이는 컨텐츠
- `<SignedOut>`: 비인증 사용자에게만 보이는 컨텐츠
- `<UserButton />`: 사용자 프로필 관리 및 로그아웃 버튼
- `<SignInButton />`: 로그인 버튼
- `<SignUpButton />`: 회원가입 버튼

## 9. 유용한 팁

- Clerk 대시보드에서 다양한 소셜 로그인(Google, GitHub 등) 설정이 가능합니다.
- 개발 모드에서는 테스트 이메일을 사용하여 쉽게 테스트할 수 있습니다.
- 사용자 정의 테마와 스타일링이 가능합니다.
- Webhooks를 통해 인증 이벤트를 처리할 수 있습니다.



