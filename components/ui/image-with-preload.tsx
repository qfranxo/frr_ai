"use client";

import { useState, useEffect, useRef } from 'react';
import Image, { ImageProps } from 'next/image';

// 이미지 캐시 상태를 저장하는 전역 객체
const IMAGE_CACHE: Record<string, boolean> = {};

// 로컬 스토리지에서 캐시 복원 (클라이언트 사이드에서만 실행)
if (typeof window !== 'undefined') {
  try {
    const cachedImages = localStorage.getItem('cachedImageUrls');
    if (cachedImages) {
      const cache = JSON.parse(cachedImages);
      Object.entries(cache).forEach(([key, value]) => {
        IMAGE_CACHE[key] = value as boolean;
      });
    }
  } catch (e) {
    console.error('캐시 복원 오류:', e);
  }
}

// 이미지 URL을 캐시에 추가하는 함수
const addImageToCache = (url: string) => {
  if (typeof window !== 'undefined' && url) {
    IMAGE_CACHE[url] = true;
    try {
      localStorage.setItem('cachedImageUrls', JSON.stringify(IMAGE_CACHE));
    } catch (e) {
      console.error('캐시 저장 오류:', e);
    }
  }
};

interface ImageWithPreloadProps extends Omit<ImageProps, 'onLoad' | 'onError'> {
  onImageLoad?: () => void;
  onImageError?: () => void;
  showLoadingIndicator?: boolean; // 로딩 인디케이터 표시 여부
}

export default function ImageWithPreload({
  src,
  alt,
  onImageLoad,
  onImageError,
  className = '',
  showLoadingIndicator = true,
  ...props
}: ImageWithPreloadProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // 이미지 미리 로드 및 캐싱 처리
  useEffect(() => {
    // 이미지 URL이 유효한 경우에만 처리
    if (typeof src === 'string') {
      // 이미 캐시에 있는지 확인
      if (IMAGE_CACHE[src]) {
        setLoaded(true);
        onImageLoad?.();
        return;
      }
      
      // 이미지 미리 로드
      if (typeof window !== 'undefined') {
        const preloadImg = new window.Image();
        preloadImg.src = src;
        preloadImg.onload = () => {
          setLoaded(true);
          onImageLoad?.();
          // 캐시에 추가
          addImageToCache(src);
        };
        preloadImg.onerror = () => {
          setError(true);
          onImageError?.();
        };
      }
    }
  }, [src, onImageLoad, onImageError]);

  // 로딩 처리 함수
  const handleLoad = () => {
    setLoaded(true);
    onImageLoad?.();
    
    // src가 string인 경우에만 캐시에 추가
    if (typeof src === 'string') {
      addImageToCache(src);
    }
  };

  // 에러 처리 함수 
  const handleError = () => {
    setError(true);
    onImageError?.();
  };

  return (
    <div className="relative w-full h-full">
      {/* 로딩 인디케이터 - 이미지가 로드되기 전에만 표시 */}
      {showLoadingIndicator && !loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 animate-pulse z-10">
          <div className="text-center">
            <div className="w-10 h-10 mx-auto mb-2 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="text-xs text-gray-500">이미지 로드 중...</div>
          </div>
        </div>
      )}
      
      {/* 이미지 컴포넌트 */}
      <Image
        src={src}
        alt={alt}
        className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
        onLoad={handleLoad}
        onError={handleError}
        ref={imageRef as any}
        loading="eager"
        priority={true}
        {...props}
      />
    </div>
  );
} 