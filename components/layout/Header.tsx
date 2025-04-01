"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserButton, SignInButton, SignUpButton, useUser, useClerk } from "@clerk/nextjs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePathname } from 'next/navigation';
import Image from "next/image";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Menu, X } from "lucide-react";

// 네비게이션 항목을 컴포넌트 외부로 이동
const NAVIGATION_ITEMS = [
  { name: 'About', href: '/about' },
  { name: 'Pricing', href: '/pricing' },
  { name: 'Community', href: '/community' },
] as const;

// 모바일 버튼 스타일 수정
const mobileButtonClassName = "block w-full py-4 px-4 text-base text-center font-medium rounded-xl transition-all";

// 시작하기 버튼 스타일
const gradientBtnClass = "h-10 px-5 text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:shadow-md transition-all duration-200";

// 로그인 버튼 스타일
const loginBtnClass = "text-gray-600 hover:text-gray-900 bg-transparent hover:bg-gray-100/50";

// 헤더 컴포넌트
export default function Header() {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const [language, setLanguage] = useState<'ko' | 'en'>('en');
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // 외부 클릭 감지 핸들러
  useEffect(() => {
    // 모바일 메뉴가 열려있을 때만 이벤트 리스너 추가
    if (!isMobileMenuOpen) return;
    
    const handleOutsideClick = (event: MouseEvent) => {
      // 클릭된 요소가 메뉴나 버튼 내부가 아니면 메뉴 닫기
      if (
        menuRef.current && 
        buttonRef.current && 
        !menuRef.current.contains(event.target as Node) && 
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsMobileMenuOpen(false);
      }
    };
    
    // 이벤트 리스너 등록
    document.addEventListener('mousedown', handleOutsideClick);
    
    // 클린업 함수
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  // 스크롤 이벤트 핸들러 최적화
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 10);
    };

    // 초기 상태 설정
    handleScroll();

    // 패시브 리스너로 변경
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // 클라이언트 사이드에서만 언어 감지
    const savedLang = localStorage.getItem('language') as 'ko' | 'en' || 
                     (navigator.language.startsWith('ko') ? 'ko' : 'en');
    setLanguage(savedLang);
  }, []);

  // 사용자가 로그인한 경우 설정 페이지 데이터 프리로딩
  useEffect(() => {
    if (isSignedIn) {
      // 계정 설정 페이지 미리 가져오기
      const prefetchSettings = async () => {
        try {
          // 구독 정보 API 프리페치
          const subscriptionData = await fetch("/api/subscription", {
            priority: "low",
            cache: "force-cache"
          });
          
          // 프리페치 완료 확인용 로그
          if (process.env.NODE_ENV === 'development') {
            console.log('Settings data prefetched successfully');
          }
        } catch (error) {
          // 프리페치 실패 시 조용히 무시 (UX에 영향 없음)
        }
      };
      
      // 약간의 지연 후 프리페치 실행 (초기 로딩에 영향 없도록)
      const timer = setTimeout(() => {
        prefetchSettings();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isSignedIn]);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out border-b-0",
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-[0_1px_3px_rgba(0,0,0,0.05)]" 
          : "bg-transparent backdrop-blur-none border-b-0"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-16">
          {/* 데스크톱 로고 추가 */}
          <div className="hidden md:block">
            <Link 
              href="/" 
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-102 transition-transform"
            >
              Frr AI
            </Link>
          </div>

          {/* 기존 모바일 로고 유지 (데스크톱에서 숨김 처리) */}
          <div className="md:hidden flex items-center gap-3">
            <Link 
              href="/" 
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-102 transition-transform"
            >
              Frr AI
            </Link>
          </div>

          {/* 데스크톱 네비게이션 (중앙) */}
          <nav className="hidden md:flex items-center gap-8 mx-auto justify-center flex-1">
            {NAVIGATION_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "text-sm font-medium px-3 py-1.5 rounded-lg transition-colors",
                  pathname === item.href
                    ? 'text-blue-600 bg-blue-50'
                    : 'text-gray-600 hover:text-blue-600 hover:bg-gray-100/50'
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* 데스크톱 인증 버튼 (오른쪽) */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {isSignedIn ? (
              <>
                <Link 
                  href="/settings/account"
                  prefetch={true}
                  className="flex items-center justify-center h-9 w-9 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-700"
                  title="Settings"
                >
                  <span className="text-xl">🛠️</span>
                </Link>
                <div className="flex items-center gap-2">
                  <UserButton />
                </div>
              </>
            ) : (
              <>
                <SignInButton mode="modal">
                  <Button 
                    variant="ghost" 
                    className={loginBtnClass}
                  >
                    Sign In
                  </Button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <Button className={gradientBtnClass}>
                    Get Started
                  </Button>
                </SignUpButton>
              </>
            )}
          </div>

          {/* 모바일 메뉴 버튼 (오른쪽) - 터치 영역 확장 */}
          <div className="md:hidden flex items-center gap-3 ml-auto">
            {/* 모바일에서는 로그인 상태일 때만 유저 정보 표시 */}
            {isSignedIn && (
              <div className="flex items-center gap-2">
                <UserButton />
              </div>
            )}
            <button 
              ref={buttonRef}
              className="p-3 touch-manipulation mr-8"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-600" />
              ) : (
                <Menu className="w-6 h-6 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* 모바일 메뉴 */}
        <div 
          ref={menuRef}
          className={cn(
            "md:hidden fixed left-0 right-0 top-16 bg-white/95 backdrop-blur-md border-t-0 transition-all duration-300 ease-in-out overflow-auto",
            isMobileMenuOpen ? "opacity-100 visible max-h-[calc(100vh-4rem)]" : "opacity-0 invisible max-h-0"
          )}
        >
          <div className="container mx-auto px-2 py-2">
            <div className="py-4 space-y-3 w-[90%] max-w-[280px] ml-[5%] md:mx-auto">
              {/* 네비게이션 항목 */}
              {NAVIGATION_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "block w-full p-0 text-sm bg-transparent px-3 py-3 rounded-lg transition-colors touch-manipulation text-left",
                    pathname === item.href
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-600 hover:text-blue-600 hover:bg-gray-100/50"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              
              {/* 로그인/시작하기 버튼 */}
              <div className="pt-3 mt-2 border-t border-gray-100">
                {isSignedIn ? (
                  <>
                    <Link 
                      href="/settings/account"
                      prefetch={true}
                      className="block w-full py-2.5 mb-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm rounded-lg text-center font-medium shadow-sm hover:shadow-md transition-all"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-xl">🛠️</span>
                        <span>Settings</span>
                      </span>
                    </Link>
                  </>
                ) : (
                  <div className="grid gap-2.5">
                    <SignInButton mode="modal">
                      <Button className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm h-auto rounded-lg text-center">
                        Sign In
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:shadow-md text-sm h-auto rounded-lg text-center">
                        Get Started
                      </Button>
                    </SignUpButton>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
} 