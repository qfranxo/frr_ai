'use client';

import { setupSecureLogging } from "@/lib/security-logger";
import { useEffect } from "react";

/**
 * 클라이언트 측 로직만 담당하는 래퍼 컴포넌트
 * 보안 로깅 시스템 초기화와 같은 클라이언트 측 설정을 처리합니다.
 */
export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  // 보안 로깅 시스템 설정
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 전역 console 객체 오버라이드
      setupSecureLogging();
      
      // 설정 완료 알림
      console.log('보안 로깅 시스템이 활성화되었습니다.');
    }
  }, []);

  // 컴포넌트 자체는 아무런 UI 변경을 가하지 않음
  return <>{children}</>;
} 