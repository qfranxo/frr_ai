'use client';

export default function ClientSideButton({ displayText }: { displayText: string }) {
  return (
    <>
      {/* 모바일 버전 */}
      <button
        className="md:hidden flex items-center gap-3 p-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        onClick={() => console.log('Mobile action')}
      >
        📱 {displayText}
      </button>

      {/* 데스크탑 버전 */}
      <a
        href="/"
        className="hidden md:inline-block px-6 py-3 text-blue-600 hover:text-purple-600 transition-colors border-b-2 border-transparent hover:border-purple-600"
      >
        🖥️ {displayText}
      </a>
    </>
  );
} 