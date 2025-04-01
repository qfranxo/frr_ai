import dynamic from 'next/dynamic';

const SignInButton = dynamic(
  () => import('@clerk/nextjs').then((mod) => mod.SignInButton),
  {
    ssr: false,
    loading: () => (
      <div className="h-10 w-32 animate-pulse bg-gray-200 rounded-md" 
           suppressHydrationWarning />
    )
  }
);

export default function Header() {
  return (
    <header className="fixed top-0 w-full bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 통합 버튼 - CSS 반응형 처리 */}
          <div suppressHydrationWarning>
            <SignInButton mode="modal">
              <button
                className="md:hidden flex items-center gap-2 p-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                aria-label="Mobile Login"
              >
                로그인
              </button>
              <a
                href="#"
                className="hidden md:inline-block p-2 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent cursor-pointer"
                aria-label="Desktop Login"
                onClick={(e) => e.preventDefault()}
              >
                회원가입/로그인
              </a>
            </SignInButton>
          </div>
        </div>
      </div>
    </header>
  );
} 