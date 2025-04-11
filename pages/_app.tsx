import { useEffect } from 'react';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import type { AppProps } from 'next/app';
import { useRouter } from 'next/router';

function MyApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  
  // 정적 에러 페이지 확인
  const isStaticErrorPage = ['/404', '/500', '/_error', '/_not-found'].includes(router.pathname);
  
  // 정적 에러 페이지인 경우 ClerkProvider 없이 렌더링
  if (isStaticErrorPage) {
    return <Component {...pageProps} />;
  }
  
  // 일반 페이지에서는 Clerk 사용
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: { 
          colorPrimary: '#2563eb',
          colorTextOnPrimaryBackground: '#fff'
        }
      }}
      redirectUrl="/"
    >
      <AppContent Component={Component} pageProps={pageProps} />
    </ClerkProvider>
  );
}

// Clerk 관련 코드를 분리하여 정적 페이지에서는 실행되지 않도록 함
function AppContent({ Component, pageProps }: { Component: any, pageProps: any }) {
  const { user, isLoaded } = useUser();

  useEffect(() => {
    const cleanDom = () => {
      // 확장 프로그램 요소 제거 강화
      const selectors = [
        '[id^="chrome-extension"]',
        '[class*="extension"]',
        '[data-extension]',
        'iframe[src*="chrome-extension"]'
      ];
      document.querySelectorAll(selectors.join(',')).forEach(el => el.remove());
    };

    const handleLoad = () => {
      cleanDom();
      window.requestAnimationFrame(() => {
        document.documentElement.setAttribute('data-hydrated', 'true');
      });
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('load', handleLoad);
      if (document.readyState === 'complete') handleLoad();
    }
    return () => window.removeEventListener('load', handleLoad);
  }, []);

  useEffect(() => {
    // 사용자가 로그인하고 정보가 로드된 경우에만 실행
    if (!isLoaded || !user) return;
    
    const syncUser = async () => {
      try {
        // 사용자 정보 추출
        const userData = {
          clerk_id: user.id,
          username: user.username || "",
          full_name: user.fullName || "",
          first_name: user.firstName || "",
          last_name: user.lastName || "",
          email: user.emailAddresses[0]?.emailAddress || "",
          image_url: user.imageUrl || "",
          last_sign_in_at: new Date().toISOString(),
        };
        
        // API 호출하여 사용자 정보 저장
        const response = await fetch("/api/save-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });
        
        if (!response.ok) {
          throw new Error("Failed to sync user data");
        }
        
        console.log("사용자 정보가 데이터베이스에 동기화되었습니다.");
      } catch (error) {
        console.error("사용자 동기화 오류:", error);
      }
    };
    
    syncUser();
  }, [user, isLoaded]);

  return <Component {...pageProps} />;
}

export default MyApp; 