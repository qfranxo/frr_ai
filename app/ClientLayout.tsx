'use client';

import React, { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { logManager, onRouteChangeStart, onRouteChangeComplete } from '@/lib/logger/LogManager';
import { LogPanel } from '@/components/LogPanel';
import Header from "@/components/layout/Header";
import { BlobAnimation } from "@/components/ui/blob-animation";
import GeistWrapper from "@/components/providers/GeistProvider";
import Layout from "@/components/layout/Layout";

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const pathname = usePathname();
  
  // 페이지 전환 감지 및 로그 관리
  useEffect(() => {
    // 최초 로드 시 로그 초기화 및 페이지 설정
    const currentPathname = pathname || '/';
    const pageName = currentPathname === '/' 
      ? '홈' 
      : currentPathname.startsWith('/community') 
        ? '커뮤니티'
        : currentPathname.split('/').pop() || '알 수 없음';
    
    logManager.setCurrentPage(pageName);
    
    // 라우트 변경 감지를 위한 함수 (Next.js App Router는 이벤트가 없음)
    const handleRouteChange = () => {
      if (typeof window !== 'undefined') {
        const newPathname = window.location.pathname;
        if (newPathname !== currentPathname) {
          onRouteChangeStart();
          onRouteChangeComplete(newPathname);
        }
      }
    };
    
    // 클릭 이벤트 감지 (링크 클릭 감지용)
    window.addEventListener('click', handleRouteChange);
    
    return () => {
      window.removeEventListener('click', handleRouteChange);
    };
  }, [pathname]);

  return (
    <>
      {/* 전역 배경 애니메이션 - 한 번만 로드됨 */}
      <BlobAnimation />
      
      <GeistWrapper>
        <Header />
        <main className="flex-grow relative z-10">
          {children}
        </main>
      </GeistWrapper>
      
      {/* 개발 모드에서만 로그 패널 표시 */}
      {process.env.NODE_ENV !== 'production' && <LogPanel />}
    </>
  );
} 