# Clerk 라이브러리 업데이트 수정사항

## 문제점
Clerk 라이브러리의 최신 버전에서는 리디렉션 속성이 변경되었습니다:
- `redirectUrl` 속성이 deprecated되고 `fallbackRedirectUrl` 또는 `forceRedirectUrl`로 대체됨
- ClerkProvider에서는 `signInFallbackRedirectUrl`과 `signUpFallbackRedirectUrl` 속성으로 분리

## 수정 완료된 파일

### 1. app/layout.tsx
- 변경 전: `redirectUrl="/"` 속성 사용
- 변경 후: `signInFallbackRedirectUrl="/"`, `signUpFallbackRedirectUrl="/"` 속성으로 분리

### 2. app/auth/login/[[...sign-in]]/page.tsx
- 변경 전: `redirectUrl="/"`
- 변경 후: `fallbackRedirectUrl="/"`

### 3. app/auth/register/page.tsx
- 변경 전: `redirectUrl="/"`
- 변경 후: `fallbackRedirectUrl="/"`

### 4. app/generate/page.tsx
- 변경 전: `<SignUpButton mode="modal" fallbackRedirectUrl="/generate">`
- 변경 후: `<SignUpButton mode="modal">`

## 주의사항
1. Clerk 최신 버전에서는 `redirectUrl` 속성이 더 이상 지원되지 않음
2. ClerkProvider에서는 `signInFallbackRedirectUrl`과 `signUpFallbackRedirectUrl` 속성을 분리해서 사용해야 함
3. 모달 모드의 `SignUpButton`, `SignInButton`에서는 별도의 리디렉션 속성이 필요 없음

## 추가 확인이 필요한 파일
다음 파일들에서 Clerk 관련 컴포넌트를 사용하고 있으나, 현재는 문제가 없는 것으로 확인됨:

1. components/Header.tsx
2. components/layout/Header.tsx
3. components/shared/ImageCard.tsx
4. components/shared/AuthButtons.tsx
5. components/home/RecentImageCards.tsx
6. app/pricing/page.tsx
7. app/about/page.tsx
8. app/community/page.tsx