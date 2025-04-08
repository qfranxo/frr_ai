"use client";

import { useState, useEffect, useRef, useCallback, memo } from "react";
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

// 네비게이션 항목 타입 정의
type NavigationItem = typeof NAVIGATION_ITEMS[number];

// 메모이제이션된 네비게이션 아이템 컴포넌트
const NavItem = memo(({ item, pathname, onClick }: { 
  item: NavigationItem, 
  pathname: string | null,
  onClick?: () => void 
}) => (
  <Link
    href={item.href}
    onClick={onClick}
    className={cn(
      "text-sm font-medium px-3 py-1.5 rounded-md transition-all duration-200",
      pathname === item.href
        ? 'text-blue-600 bg-blue-50'
        : 'text-gray-600 hover:text-blue-600 hover:bg-blue-50/50'
    )}
  >
    {item.name}
  </Link>
));

NavItem.displayName = 'NavItem';

// 메모이제이션된 모바일 네비게이션 아이템 컴포넌트
const MobileNavItem = memo(({ item, pathname, onClick }: { 
  item: NavigationItem, 
  pathname: string | null,
  onClick: () => void 
}) => (
  <Link
    href={item.href}
    onClick={onClick}
    className={cn(
      "block w-full p-0 text-sm bg-transparent px-3 py-2.5 rounded-md transition-all touch-manipulation text-left",
      pathname === item.href
        ? "text-blue-600 bg-blue-50"
        : "text-gray-600 hover:text-blue-600 hover:bg-blue-50/50"
    )}
  >
    {item.name}
  </Link>
));

MobileNavItem.displayName = 'MobileNavItem';

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

  // 메뉴 토글 핸들러 메모이제이션
  const toggleMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  // 메뉴 닫기 핸들러 메모이제이션
  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

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
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const scrollPosition = window.scrollY;
          setIsScrolled(scrollPosition > 10);
          ticking = false;
        });
        ticking = true;
      }
    };

    // 초기 상태 설정
    handleScroll();

    // 패시브 리스너로 변경
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // 클라이언트 사이드에서만 언어 감지
    const savedLang = localStorage.getItem('language');
    const detectedLang = savedLang === 'ko' || savedLang === 'en' 
      ? savedLang 
      : (navigator.language.startsWith('ko') ? 'ko' : 'en');
    
    setLanguage(detectedLang);
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
          
          // 프리페치 완료 확인용 로그 (주석 처리)
          // if (process.env.NODE_ENV === 'development') {
          //   console.log('Settings data prefetched successfully');
          // }
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

  // 모바일 메뉴 애니메이션 클래스 최적화 (계산 비용 줄이기)
  const mobileMenuClasses = cn(
    "md:hidden fixed left-0 right-0 top-16 bg-white/95 backdrop-blur-md border-t-0 transition-all duration-300 ease-in-out overflow-auto",
    isMobileMenuOpen ? "opacity-100 visible max-h-[calc(100vh-4rem)]" : "opacity-0 invisible max-h-0"
  );

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out border-b-0 bg-white shadow-[0_2px_4px_rgba(0,0,0,0.08)]"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-16">
          {/* 통합된 로고 */}
          <div className="flex items-center gap-3">
            <Link 
              href="/" 
              className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:scale-102 transition-transform"
            >
              Frr AI
            </Link>
          </div>

          {/* 데스크톱 네비게이션 (중앙) */}
          <nav className="hidden md:flex items-center gap-6 mx-auto justify-center flex-1">
            {NAVIGATION_ITEMS.map((item) => (
              <NavItem key={item.href} item={item} pathname={pathname} />
            ))}
          </nav>

          {/* 데스크톱 인증 버튼 (오른쪽) */}
          <div className="hidden md:flex items-center gap-3 ml-auto">
            {isSignedIn ? (
              <>
                <Link 
                  href="/settings/account"
                  prefetch={true}
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-50 hover:bg-blue-100 transition-all text-blue-600"
                  title="Settings"
                >
                  <span className="text-lg">🛠️</span>
                </Link>
                <div className="flex items-center gap-2">
                  <UserButton />
                </div>
              </>
            ) : (
              <>
                <SignUpButton mode="modal">
                  <Button className="w-full py-2 text-blue-600 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300 transition-all duration-200 text-xs h-auto rounded-lg text-center">
                    Sign Up
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
              onClick={toggleMobileMenu}
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
          className={mobileMenuClasses}
        >
          <div className="container mx-auto px-2 py-2">
            <div className="py-4 space-y-3 w-[90%] max-w-[280px] ml-[5%] md:mx-auto">
              {/* 네비게이션 항목 */}
              {NAVIGATION_ITEMS.map((item) => (
                <MobileNavItem 
                  key={item.href} 
                  item={item} 
                  pathname={pathname} 
                  onClick={closeMobileMenu} 
                />
              ))}
              
              {/* 로그인/시작하기 버튼 */}
              <div className="pt-3 mt-2 border-t border-gray-100">
                {isSignedIn ? (
                  <>
                    <Link 
                      href="/settings/account"
                      prefetch={true}
                      className="block w-full py-2.5 mb-2.5 bg-blue-50 text-blue-600 text-sm rounded-md text-center font-medium hover:bg-blue-100 transition-all"
                      onClick={closeMobileMenu}
                    >
                      <span className="flex items-center justify-center gap-2">
                        <span className="text-lg">🛠️</span>
                        <span>Settings</span>
                      </span>
                    </Link>
                  </>
                ) : (
                  <div className="grid gap-2.5">
                    <SignUpButton mode="modal">
                      <Button className="w-full py-2 text-blue-600 border border-blue-200 bg-blue-50/50 hover:bg-blue-100/60 hover:border-blue-300 transition-all duration-200 text-xs h-auto rounded-lg text-center">
                        Sign Up
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