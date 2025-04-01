import React from 'react';

interface LoadingScreenProps {
  message?: string;
  subMessage?: string;
  type?: 'spinner' | 'skeleton' | 'pulse';
  className?: string;
  bgGradient?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * 재사용 가능한 로딩 화면 컴포넌트
 * 
 * @param message - 메인 로딩 메시지
 * @param subMessage - 부가 설명 메시지
 * @param type - 로딩 애니메이션 타입 (spinner, skeleton, pulse)
 * @param className - 추가 CSS 클래스
 * @param bgGradient - 배경 그라데이션 사용 여부
 * @param size - 로딩 요소 크기
 */
export default function LoadingScreen({
  message = 'Loading',
  subMessage = 'Please wait...',
  type = 'spinner',
  className = '',
  bgGradient = true,
  size = 'md'
}: LoadingScreenProps) {
  // 사이즈에 따른 스타일 계산
  const sizeClasses = {
    sm: {
      container: 'p-4 max-w-xs',
      spinner: 'w-10 h-10 mb-4',
      innerSpinner: 'top-1 left-1 w-8 h-8',
      title: 'text-base',
      subtitle: 'text-xs',
      skeleton: 'space-y-2 mt-6'
    },
    md: {
      container: 'p-6 max-w-sm',
      spinner: 'w-16 h-16 mb-6',
      innerSpinner: 'top-2 left-2 w-12 h-12',
      title: 'text-lg',
      subtitle: 'text-sm',
      skeleton: 'space-y-3 mt-8'
    },
    lg: {
      container: 'p-8 max-w-md',
      spinner: 'w-20 h-20 mb-8',
      innerSpinner: 'top-3 left-3 w-14 h-14',
      title: 'text-xl',
      subtitle: 'text-base',
      skeleton: 'space-y-4 mt-10'
    }
  };

  const currentSize = sizeClasses[size];

  // 배경 스타일 선택
  const backgroundClass = bgGradient 
    ? 'bg-gradient-to-b from-blue-50 to-white' 
    : 'bg-white';

  return (
    <div className={`min-h-screen flex items-center justify-center ${backgroundClass} ${className}`}>
      <div className={`flex flex-col items-center justify-center ${currentSize.container} mx-auto`}>
        {/* 로딩 표시 (타입에 따라 다름) */}
        {type === 'spinner' && (
          <div className={`${currentSize.spinner} relative`}>
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-t-blue-500 border-r-blue-300 border-b-blue-200 border-l-blue-400 animate-spin"></div>
            <div className={`absolute ${currentSize.innerSpinner} rounded-full border-4 border-t-purple-500 border-r-transparent border-b-transparent border-l-transparent animate-spin`} 
              style={{animationDirection: 'reverse', animationDuration: '1s'}}></div>
          </div>
        )}

        {type === 'pulse' && (
          <div className={`${currentSize.spinner} relative flex items-center justify-center`}>
            <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-75"></div>
            <div className="relative w-4/5 h-4/5 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"></div>
          </div>
        )}
        
        {/* 로딩 텍스트 */}
        <div className="text-center">
          <div className={`h-6 bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent ${currentSize.title} font-bold animate-pulse`}>
            {message}
          </div>
          {subMessage && (
            <div className={`mt-2 text-gray-500 ${currentSize.subtitle}`}>
              {subMessage}
            </div>
          )}
        </div>
        
        {/* 스켈레톤 로딩 UI */}
        {type === 'skeleton' && (
          <div className={`w-full ${currentSize.skeleton}`}>
            <div className="h-4 bg-gray-200 rounded-full animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded-full animate-pulse w-4/6"></div>
          </div>
        )}
      </div>
    </div>
  );
} 