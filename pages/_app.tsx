import { useEffect } from 'react';
import { ClerkProvider, useUser } from '@clerk/nextjs';
import type { AppProps } from 'next/app';

// ClerkProvider 내부에서 useUser를 사용하기 위한 별도 컴포넌트
function UserSync() {
  const { user, isLoaded } = useUser();

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

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}

function MyApp({ Component, pageProps }: AppProps) {
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

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        variables: { 
          colorPrimary: '#2563eb',
          colorTextOnPrimaryBackground: '#fff'
        },
        elements: {
          footerAction: {
            display: "none"
          }
        }
      }}
      signInFallbackRedirectUrl="/"
    >
      <UserSync />
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp; 