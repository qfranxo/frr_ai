"use client";

import { usePathname } from "next/navigation";
import Footer from "./Footer";

export default function ClientFooter() {
  const pathname = usePathname() || '';
  
  // 메인 페이지('/')와 커뮤니티 페이지('/community')와 커뮤니티 관련 모든 페이지(community로 시작하는)에서는 푸터를 숨김
  if (pathname === '/' || pathname === '/community' || pathname.startsWith('/community/')) {
    return null;
  }
  
  return <Footer />;
} 