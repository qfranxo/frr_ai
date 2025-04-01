'use client';

import { useMediaQuery } from 'react-responsive';

export default function ClientSideUI({ dateString }: { dateString: string }) {
  const isMobile = useMediaQuery({ maxWidth: 767 });

  return (
    <div className="mt-4">
      {isMobile ? (
        <button
          className="md:hidden flex items-center gap-3 p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          onClick={() => console.log('Mobile action')}
        >
          📱 {dateString}
        </button>
      ) : (
        <a
          href="/"
          className="hidden md:inline-block px-4 py-2 text-blue-600 hover:text-purple-600 transition-colors border-b-2 border-transparent hover:border-purple-600"
        >
          🖥️ {dateString}
        </a>
      )}
    </div>
  );
} 