'use client';

import { useMediaQuery } from 'react-responsive';

export default function ClientComponents({ displayText }: { displayText: string }) {
  const isMobile = useMediaQuery({ maxWidth: 767 });

  return (
    <>
      {/* 모바일 버전 */}
      <div className="block md:hidden">
        <button
          className="flex items-center gap-3 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          onClick={() => console.log('Mobile action')}
        >
          📱 {displayText}
        </button>
      </div>

      {/* 데스크탑 버전 */}
      <div className="hidden md:block">
        <a
          href="/"
          className="px-6 py-3 text-blue-600 hover:text-purple-600 transition-colors border-b-2 border-transparent hover:border-purple-600"
        >
          🖥️ {displayText}
        </a>
      </div>
    </>
  );
} 