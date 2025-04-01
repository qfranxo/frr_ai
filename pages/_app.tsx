import { useEffect } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import type { AppProps } from 'next/app';

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
        }
      }}
    >
      <Component {...pageProps} />
    </ClerkProvider>
  );
}

export default MyApp; 