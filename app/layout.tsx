import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/layout/Header";
import ClientFooter from "@/components/layout/ClientFooter";
import GeistWrapper from "@/components/providers/GeistProvider";
import Script from "next/script";
import { BlobAnimation } from "@/components/ui/blob-animation";
import ToasterProvider from "@/components/providers/ToasterProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Frr AI",
  description: "AI 모델로 나를 만들어보세요",
};

// Next.js 15에서는 정적 사이트 생성 시 서버 컴포넌트에서 현재 경로를 알기 어렵습니다.
// 대신 NEXT_PUBLIC_BYPASS_CLERK 환경 변수로 클라이언트에서 전체 처리합니다.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider 
      appearance={{
        variables: { 
          colorPrimary: '#2563eb',
          colorTextOnPrimaryBackground: '#fff'
        }
      }}
    >
      <html lang="ko" suppressHydrationWarning>
        <head>
          {/* Font Awesome 추가 */}
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
            integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
        </head>
        <body className={inter.className}>
          {/* 전역 배경 애니메이션 - 한 번만 로드됨 */}
          <BlobAnimation />
          
          <GeistWrapper>
            <div className="min-h-screen flex flex-col relative z-10">
              <Header />
              <main className="flex-grow">
                {children}
              </main>
              <ClientFooter />
            </div>
          </GeistWrapper>
          <ToasterProvider />
          <Script id="scroll-handler" strategy="afterInteractive">
            {`
              (function() {
                // 클라이언트에서만 실행
                if (typeof window === 'undefined') return;
                
                // 스크롤바 너비를 정확히 계산하는 함수
                function getScrollbarWidth() {
                  // 외부 컨테이너 생성
                  const outer = document.createElement('div');
                  outer.style.visibility = 'hidden';
                  outer.style.overflow = 'scroll';
                  document.body.appendChild(outer);
                  
                  // 내부 컨테이너 생성
                  const inner = document.createElement('div');
                  outer.appendChild(inner);
                  
                  // 너비 차이 계산
                  const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
                  
                  // 임시 요소 제거
                  outer.parentNode.removeChild(outer);
                  
                  return scrollbarWidth;
                }

                // 초기화 함수
                function initializeScrollHandling() {
                  try {
                    // 스크롤바 너비 계산 및 CSS 변수 설정
                    const scrollbarWidth = getScrollbarWidth();
                    document.documentElement.style.setProperty('--scrollbar-width', scrollbarWidth + 'px');
                    
                    // 페이지 로드 시 스크롤 위치 저장
                    let savedScrollY = 0;
                    
                    // Clerk 모달 감지를 위한 MutationObserver 설정
                    const observer = new MutationObserver((mutations) => {
                      for (const mutation of mutations) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                          // 모달이 추가되었는지 확인
                          const modalAdded = Array.from(mutation.addedNodes).some(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                              const element = node;
                              return element.classList?.contains('cl-modalBackdrop') || 
                                     element.querySelector('.cl-modalBackdrop') !== null;
                            }
                            return false;
                          });
                          
                          if (modalAdded) {
                            // 모달이 열릴 때 현재 스크롤 위치 저장
                            savedScrollY = window.scrollY;
                            document.documentElement.style.setProperty('--scroll-top', \`-\${savedScrollY}px\`);
                            
                            // body에 modal-open 클래스 추가
                            document.body.classList.add('modal-open');
                          }
                        }
                        
                        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
                          // 모달이 제거되었는지 확인
                          const modalRemoved = Array.from(mutation.removedNodes).some(node => {
                            if (node.nodeType === Node.ELEMENT_NODE) {
                              const element = node;
                              return element.classList?.contains('cl-modalBackdrop') || 
                                     element.querySelector('.cl-modalBackdrop') !== null;
                            }
                            return false;
                          });
                          
                          if (modalRemoved) {
                            // body에서 modal-open 클래스 제거
                            document.body.classList.remove('modal-open');
                            
                            // 저장된 스크롤 위치로 이동
                            window.scrollTo(0, savedScrollY);
                          }
                        }
                      }
                    });
                    
                    // body의 모든 자식 변화 감지
                    observer.observe(document.body, { childList: true, subtree: true });
                  } catch (err) {
                    console.error('스크롤 처리 초기화 중 오류 발생:', err);
                  }
                }
                
                // 문서가 완전히 로드된 후에만 초기화 실행
                if (document.readyState === 'complete') {
                  initializeScrollHandling();
                } else {
                  window.addEventListener('load', initializeScrollHandling);
                }
              })();
            `}
          </Script>
        </body>
      </html>
    </ClerkProvider>
  )
}
