'use client';

import { ReactNode, useState, useEffect } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { Heart, MessageCircle, Star, Sparkles, Zap, Palette, Bookmark, Lightbulb } from 'lucide-react';

interface AuthLikeButtonProps {
  isSignedIn: boolean;
  onLike?: () => void;
  isLiked: boolean;
  likesCount: number;
  iconSize?: number;
}

export function AuthLikeButton({ isSignedIn, onLike, isLiked, likesCount = 0, iconSize = 5 }: AuthLikeButtonProps) {
  const iconClassName = `h-5 w-5 transition-transform duration-300`;
  const [floatPos, setFloatPos] = useState(0);
  const [glowIntensity, setGlowIntensity] = useState(0);
  
  // 부유 효과와 빛 깜빡임 효과
  useEffect(() => {
    if (!isLiked) return;
    
    // 부유 효과
    const floatInterval = setInterval(() => {
      setFloatPos(prev => (prev === 0 ? 1 : 0));
    }, 1500);
    
    // 빛 깜빡임 효과
    const glowInterval = setInterval(() => {
      setGlowIntensity(prev => (prev === 0 ? 1 : prev === 1 ? 2 : 0));
    }, 800);
    
    return () => {
      clearInterval(floatInterval);
      clearInterval(glowInterval);
    };
  }, [isLiked]);
  
  // 부유 효과 스타일
  const floatStyle = {
    transform: floatPos === 0 
      ? 'translateY(0) scale(1) rotate(0deg)' 
      : 'translateY(-2px) scale(1.05) rotate(5deg)',
    transition: 'transform 1.5s ease-in-out'
  };
  
  // 빛 깜빡임 효과 스타일
  const getGlowStyle = () => {
    if (!isLiked) return {};
    
    const baseGlow = 'drop-shadow(0 0 8px rgba(252,211,77,0.8))';
    const intensityGlow = glowIntensity === 1 
      ? 'drop-shadow(0 0 12px rgba(252,211,77,0.9))' 
      : glowIntensity === 2 
        ? 'drop-shadow(0 0 16px rgba(252,211,77,1)) drop-shadow(0 0 4px rgba(255,255,255,0.8))' 
        : baseGlow;
        
    return {
      filter: intensityGlow,
      transition: 'filter 0.4s ease-in-out'
    };
  };
  
  if (isSignedIn) {
    return (
      <button
        onClick={onLike ? onLike : () => {}}
        className="flex items-center gap-1.5 transition-colors p-1.5 rounded-full group relative"
        title={isLiked ? "Remove reaction" : "Add reaction"}
      >
        {/* 3D shadow effect for button */}
        {isLiked && (
          <>
            <span className="absolute inset-0 bg-amber-300/20 rounded-full blur-[3px]"></span>
            <span className="absolute inset-0 bg-amber-200/10 rounded-full scale-150 blur-[8px]"></span>
          </>
        )}
        
        <div className="relative flex items-center justify-center">
          <div className="relative transform transition-all duration-300">
            {/* 3D Floating effect */}
            <div 
              className="relative" 
              style={isLiked ? floatStyle : undefined}
            >
              {/* 발광 효과 배경 (켜진 전구 효과) */}
              {isLiked && (
                <>
                  <span className="absolute inset-0 bg-yellow-300 rounded-full opacity-60 blur-[4px] scale-110"></span>
                  <span className="absolute inset-0 bg-yellow-200 rounded-full opacity-40 blur-[6px] scale-[1.3]"></span>
                  <span className="absolute inset-0 bg-white rounded-full opacity-30 blur-[2px] scale-95"></span>
                </>
              )}
              
              <Lightbulb 
                className={`${iconClassName} ${
                  isLiked 
                    ? "text-yellow-500 fill-yellow-300 group-hover:text-yellow-600" 
                    : "text-amber-400 group-hover:text-amber-500"
                } transform transition-all duration-300 ${isLiked ? 'scale-110' : 'scale-100'} group-hover:rotate-[15deg] relative z-10`}
                strokeWidth={isLiked ? 2 : 1.5}
                style={getGlowStyle()}
              />
              
              {/* 3D 효과와 발광 효과 */}
              {isLiked && (
                <>
                  {/* 전구 빛 번짐 효과 */}
                  <span className="absolute inset-0 bg-amber-200 rounded-full animate-pulse opacity-70 blur-[5px] scale-125"></span>
                  
                  {/* 주요 빛 광선 효과 */}
                  <span className="absolute inset-0 bg-white/60 rounded-full blur-sm scale-90 animate-pulse" style={{ animationDuration: '1.5s' }}></span>
                  
                  {/* 빛 입자 효과 */}
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-yellow-300 rounded-full opacity-75 animate-ping" style={{ animationDuration: '2s' }}></span>
                  <span className="absolute -bottom-0.5 -left-1 w-1 h-1 bg-amber-400 rounded-full opacity-75 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.3s' }}></span>
                  <span className="absolute top-1 left-0 w-1 h-1 bg-yellow-200 rounded-full opacity-75 animate-ping" style={{ animationDuration: '3s', animationDelay: '0.6s' }}></span>
                  <span className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full opacity-75 animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.2s' }}></span>
                  <span className="absolute bottom-0 right-0 w-0.5 h-0.5 bg-yellow-100 rounded-full opacity-75 animate-ping" style={{ animationDuration: '3.2s', animationDelay: '0.9s' }}></span>
                  
                  {/* 빛살 효과 */}
                  <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-300 via-transparent to-transparent opacity-50 scale-[2] blur-sm"></span>
                  
                  {/* 3D 입체감을 위한 그림자 */}
                  <span className="absolute -bottom-1 left-0 right-0 h-1 bg-gradient-to-r from-amber-900/0 via-amber-900/30 to-amber-900/0 rounded-full blur-[1px] transform rotate-12"></span>
                  
                  {/* 주변 빛 효과 */}
                  <span className="absolute -inset-2 bg-gradient-to-r from-yellow-200/0 via-yellow-200/40 to-yellow-200/0 rounded-full blur-xl"></span>
                  
                  {/* 다이나믹 빛 확산 효과 */}
                  <span className={`absolute -inset-3 bg-yellow-300/20 rounded-full blur-xl transition-opacity duration-500 ${glowIntensity > 0 ? 'opacity-100' : 'opacity-30'}`}></span>
                </>
              )}
            </div>
          </div>
          
          <span className={`text-xs sm:text-sm font-medium transition-colors ml-1 ${
            isLiked ? "text-amber-600 group-hover:text-amber-700" : "text-amber-500 group-hover:text-amber-600"
          }`}>
            {likesCount > 0 ? likesCount : ""}
          </span>
        </div>
      </button>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className="flex items-center gap-1.5 text-amber-400 hover:text-amber-500 transition-colors p-1.5 rounded-full group"
        title="Sign in to react"
      >
        <div className="relative">
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-yellow-100/30 rounded-full blur-sm scale-110 transition-opacity duration-300"></span>
          <Lightbulb 
            className={`${iconClassName} group-hover:scale-110 group-hover:rotate-[15deg] transform transition-all duration-300 relative z-10`} 
          />
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-amber-300/10 rounded-full blur-md transition-opacity duration-300"></span>
        </div>
        <span className="text-xs sm:text-sm font-medium ml-1">
          {likesCount > 0 ? likesCount : ""}
        </span>
      </button>
    </SignInButton>
  );
}

interface AuthCommentButtonProps {
  isSignedIn: boolean;
  onComment: () => void;
  commentsCount: number;
  label?: string;
  iconSize?: number;
}

export function AuthCommentButton({ isSignedIn, onComment, commentsCount = 0, label, iconSize = 6 }: AuthCommentButtonProps) {
  const iconClassName = `h-5 w-5 transition-colors`;
  
  if (isSignedIn) {
    return (
      <button
        onClick={onComment}
        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors p-1.5 rounded-full group"
        title="Comment"
      >
        <div className="relative">
          <MessageCircle className={iconClassName} />
          {commentsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-blue-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">
              {commentsCount > 99 ? '99+' : commentsCount}
            </span>
          )}
        </div>
        {label && <span className="text-xs sm:text-sm font-medium">{label}</span>}
      </button>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors p-1.5 rounded-full"
        title="Sign in to comment"
      >
        <div className="relative">
          <MessageCircle className={iconClassName} />
          {commentsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-blue-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">
              {commentsCount > 99 ? '99+' : commentsCount}
            </span>
          )}
        </div>
        {label && <span className="text-xs sm:text-sm font-medium">{label}</span>}
      </button>
    </SignInButton>
  );
} 