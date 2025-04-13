"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Heart, MessageCircle, Share2, Trash2, Download, Wand2 } from "lucide-react";
import { CommentModal } from '@/components/shared/CommentModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatDate } from '@/utils/format';
import { Comment } from '@/types/post';
import { AuthLikeButton, AuthCommentButton } from '@/components/shared/AuthButtons';
import { SignUpButton } from '@clerk/nextjs';
import { processImageUrl, isReplicateUrl, isSupabaseUrl } from '@/utils/image-utils';

// 전역 변수로 이미지 로드 오류 상태 관리 (컴포넌트 외부에 선언)
const failedImageIds = new Set<string>();

// 카테고리 관련 함수들
const getCategoryFromStyle = (style: string): string => {
  if (!style) return 'portrait';

  const styleToCategory: Record<string, string> = {
    'portrait': 'portrait',
    'anime': 'anime', 
    'realistic': 'portrait',
    'digital art': 'fantasy',
    'painting': 'landscape',
    'landscape': 'landscape',
    'urban': 'urban',
    'fantasy': 'fantasy',
    'sci-fi': 'sci-fi',
    'vintage': 'vintage',
    'abstract': 'abstract',
    'animals': 'animals',
    'highfashion': 'fashion',
    'fashion': 'fashion',
  };

  // 정확한 매치 확인
  if (styleToCategory[style.toLowerCase()]) {
    return styleToCategory[style.toLowerCase()];
  }
  
  // 부분 매치 확인
  for (const [key, value] of Object.entries(styleToCategory)) {
    if (style.toLowerCase().includes(key.toLowerCase())) {
      return value;
    }
  }

  return 'portrait'; // 기본값
};

const getCategoryColor = (category?: string): string => {
  if (!category) return 'bg-gray-100 text-gray-700';
  
  const colorMap: { [key: string]: string } = {
    'portrait': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
    'anime': 'bg-gradient-to-r from-purple-500 to-violet-600 text-white',
    'landscape': 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
    'urban': 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
    'fantasy': 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
    'sci-fi': 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white',
    'vintage': 'bg-gradient-to-r from-rose-500 to-pink-600 text-white',
    'abstract': 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white',
    'animals': 'bg-gradient-to-r from-lime-500 to-green-600 text-white',
    'fashion': 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
  };
  
  return colorMap[category.toLowerCase()] || 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
};

// 댓글 작성자 이름 표시 함수
function getCommentAuthorName(userName: string | undefined | null = '', currentUser?: any): string {
  // 현재 사용자인 경우 (로그인 정보 우선 사용)
  if (currentUser && userName) {
    // 완전 일치하는 경우
    if (userName === currentUser.name || userName === currentUser.username) {
      return currentUser.name || currentUser.username || '사용자';
    }
    
    // 기본값인 경우 현재 사용자 정보 사용
    if (userName === 'User' || userName === 'Anonymous User' || userName === 'Guest' || userName === '게스트') {
      return currentUser.name || currentUser.username || '사용자';
    }
  }
  
  // userName이 없거나 빈 문자열인 경우
  if (!userName || userName === '') {
    return currentUser ? (currentUser.name || currentUser.username || '사용자') : '사용자';
  }
  
  // Clerk ID 형식인 경우
  if (userName && userName.startsWith && userName.startsWith('user_')) {
    return currentUser ? (currentUser.name || currentUser.username || '사용자') : '사용자';
  }
  
  // 이메일 형식인 경우 @ 앞부분만 사용
  if (userName && userName.includes && userName.includes('@')) {
    return userName.split('@')[0];
  }
  
  // 그 외 case - userName을 그대로 사용
  return userName;
}

interface ImageCardProps {
  post: any; // 다양한 포스트 타입 지원
  variant: 'main' | 'community';  // 메인 페이지 또는 커뮤니티 페이지
  layout?: 'grid' | 'masonry';    // 레이아웃 타입
  currentUser?: {
    id: string;
    name: string;
    username?: string;
    imageUrl?: string;
  };
  isSignedIn: boolean;
  onLike?: (postId: string) => void;
  onComment: (postId: string, text?: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onShare?: (post: any) => void;
  onDownload: (post: any) => void;
  onDeletePost?: (postId: string) => void;
  isLiked?: boolean;
  likesCount?: number;
  commentsCount?: number;
  comments?: Comment[];
}

export function ImageCard({
  post,
  variant,
  layout = 'grid',
  currentUser,
  isSignedIn,
  onLike,
  onComment,
  onDeleteComment,
  onShare,
  onDownload,
  onDeletePost,
  isLiked,
  likesCount = 0,
  commentsCount = 0,
  comments = []
}: ImageCardProps) {
  const router = useRouter();
  const [commentModalState, setCommentModalState] = useState({
    isOpen: false
  });
  
  // 삭제 확인 모달 상태
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: 'post' as 'post' | 'comment',
    commentId: '' as string | number
  });
  
  // 이미지 로드 상태를 ref로 변경하여 리렌더링 방지
  const imageStatusRef = useRef({
    loaded: false,
    error: false
  });
  
  // 이미지 URL 처리 - 이미 실패한 이미지는 바로 fallback 사용
  const imageUrl = useMemo(() => {
    if (!post.imageUrl) return '/fallback-image.png';
    if (failedImageIds.has(post.id)) return '/fallback-image.png';
    
    try {
      // URL 유효성 검사
      if (post.imageUrl.trim() === '') return '/fallback-image.png';
      
      // 상대 경로인 경우 그대로 반환
      if (post.imageUrl.startsWith('/')) return post.imageUrl;
      
      // URL 객체로 생성 시도하여 유효성 검사
      try {
        new URL(post.imageUrl);
        return post.imageUrl; // 유효한 URL 반환
      } catch (e) {
        // console.error(`[심각] ID: ${post.id} 유효하지 않은 URL 형식:`, post.imageUrl);
        return '/fallback-image.png';
      }
    } catch (error) {
      // console.error(`[심각] ID: ${post.id} URL 처리 오류:`, error);
      return '/fallback-image.png';
    }
  }, [post.id, post.imageUrl]);
  
  // 이미지 컴포넌트의 src 속성 설정
  const imageSrc = useMemo(() => {
    // 빈 문자열이나 유효하지 않은 URL이 전달되는 것을 방지
    if (!imageUrl || imageUrl.trim() === '') {
      return '/fallback-image.png';
    }
    return imageUrl;
  }, [imageUrl]);
  
  // 이미지 URL 타입 디버깅 - 마운트 시 한 번만 실행
  useEffect(() => {
    if (!post.imageUrl) return;
    
    // 이미 실패한 이미지는 패스
    if (failedImageIds.has(post.id)) return;
    
    // URL 유형 감지 (디버깅 로그 제거)
    const isReplicate = isReplicateUrl(post.imageUrl);
    const isSupabase = isSupabaseUrl(post.imageUrl);
    
    // Replicate URL인 경우 저장 로직을 한 번만 트리거 (오류 무시)
    if (isReplicate && typeof window !== 'undefined') {
      // 단, 이미지 접근성 먼저 테스트하여 Replicate URL이 유효한지 확인
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      fetch(post.imageUrl, { 
        method: 'HEAD', 
        signal: controller.signal
      })
        .then(response => {
          clearTimeout(timeoutId);
          if (response.ok) {
            // 저장 로직은 이미지가 실제로 로드된 후 트리거되도록 타임아웃 설정
            const img = new window.Image();
            img.onload = () => {
              // Replicate URL이 유효하므로 저장 시도
              // 저장할 이미지 타입 결정 - 컴포넌트의 variant나 post의 타입 정보를 기반으로 결정
              const storageType = determineStorageType(post, variant);
              
              import('@/utils/image-utils').then(utils => {
                utils.saveReplicateUrlToStorage(post.imageUrl, post.id, currentUser?.id, storageType);
              }).catch(e => {
                // console.error(`[오류] 저장 모듈 로드 실패:`, e);
              });
            };
            img.src = post.imageUrl;
          } else {
            failedImageIds.add(post.id);
          }
        })
        .catch(err => {
          clearTimeout(timeoutId);
          failedImageIds.add(post.id);
        });
    }
  }, [post.id, post.imageUrl, currentUser?.id, variant]);
  
  // 저장할 이미지 타입 결정 함수
  function determineStorageType(post: any, variant: string): 'shared' | 'user-images' | 'generations' {
    // 게시물 타입이 명시적으로 있으면 사용
    if (post.type === 'shared' || post.type === 'user-images' || post.type === 'generations') {
      return post.type;
    }
    
    // variant에 따라 타입 추론
    if (variant === 'main') {
      return 'generations'; // 메인 페이지의 이미지는 생성된 이미지로 간주
    } else if (variant === 'community') {
      return 'shared'; // 커뮤니티 페이지의 이미지는 공유된 이미지로 간주
    }
    
    // 게시물의 다른 속성으로 추론
    if (post.isShared || post.shared) {
      return 'shared';
    } else if (post.userId === currentUser?.id) {
      return 'user-images'; // 현재 사용자의 이미지
    }
    
    // 기본값
    return 'shared';
  }
  
  // 컴포넌트 마운트 시 한 번만 실행
  useEffect(() => {
    // 이미지 로드 상태 초기화 (불필요한 preload 제거)
    imageStatusRef.current = {
      loaded: false,
      error: false
    };
  }, []);
  
  // 현재 사용자가 게시물 작성자인지 확인
  const isCurrentUserPostOwner = currentUser && post.userId === currentUser.id;

  const handleCommentSubmit = (text: string) => {
    onComment(post.id, text);
    setCommentModalState({ isOpen: false });
  };

  const handleCommentClick = () => {
    if (isSignedIn) {
      setCommentModalState({ isOpen: true });
    } else {
      // 로그인 필요 알림
      onComment(post.id);
    }
  };

  const handleSaveClick = () => {
    if (onLike) {
      onLike(post.id);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteModalState({
      isOpen: true,
      type: 'post',
      commentId: ''
    });
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.type === 'post' && onDeletePost) {
      onDeletePost(post.id);
    } else if (deleteModalState.type === 'comment' && onDeleteComment) {
      onDeleteComment(post.id, deleteModalState.commentId.toString());
    }
    setDeleteModalState({...deleteModalState, isOpen: false});
  };

  const confirmDeleteComment = (commentId: string | number) => {
    setDeleteModalState({
      isOpen: true,
      type: 'comment',
      commentId
    });
  };

  // 프롬프트로 이동하는 함수 추가
  const handleRegenerateClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (post.prompt) {
      router.push(`/generate?prompt=${encodeURIComponent(post.prompt)}`);
    } else {
      router.push('/generate');
    }
  };

  // 스타일 값과 카테고리 정보 가져오기
  const styleValue = typeof post.renderingStyle === 'string' 
    ? post.renderingStyle 
    : (typeof post.style === 'string' 
        ? post.style 
        : (post.style?.id || post.renderingStyle?.id || ''));
  
  const category = post.category || getCategoryFromStyle(styleValue);
  const categoryColor = getCategoryColor(category);
  
  // 카테고리 이모지 결정
  const categoryEmoji = 
    category === 'portrait' ? '👩‍🎨' :
    category === 'anime' ? '🦸‍♀️' :
    category === 'landscape' ? '🌄' :
    category === 'urban' ? '🏢' :
    category === 'fantasy' ? '🐉' :
    category === 'sci-fi' ? '👾' :
    category === 'vintage' ? '🕰️' :
    category === 'fashion' ? '👕' :
    category === 'animals' ? '🐱' :
    category === 'abstract' ? '🔮' :
    '🎨';
  
  return (
    <div className={`relative ${variant === 'main' ? 'rounded-2xl overflow-hidden shadow-md hover:shadow-xl bg-white group mb-4' : 'rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-300 ease-in-out hover:shadow-md group mb-5 sm:mb-6'}`}>
      <div className={`relative ${variant === 'community' ? 'p-3 sm:p-4 bg-gray-50' : ''}`}>
        <div 
          className={`relative overflow-hidden ${variant === 'community' ? 'rounded-lg' : ''}`}
          style={{
            paddingBottom: post.aspectRatio === '9:16' 
              ? '177.78%' 
              : post.aspectRatio === '16:9' 
                ? '56.25%' 
                : post.aspectRatio === '4:3'
                  ? '75%'
                  : post.aspectRatio === '3:4'
                    ? '133.33%'
                    : '100%',
          }}
        >
          <Image
            src={imageSrc}
            alt={post.description || post.prompt || "Image"}
            fill
            priority={true}
            loading="eager"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className={`${post.aspectRatio === '9:16' ? 'object-contain' : 'object-cover'} transition-all duration-300 group-hover:scale-105`}
            onLoad={(e) => {
              imageStatusRef.current.loaded = true;
              imageStatusRef.current.error = false;
            }}
            onError={() => {
              imageStatusRef.current.error = true;
              failedImageIds.add(post.id);
            }}
          />
          
          {/* 삭제 버튼 - 소유자만 볼 수 있음 (커뮤니티 페이지에서만 표시) */}
          {variant === 'community' && isCurrentUserPostOwner && onDeletePost && (
            <button 
              onClick={handleDeleteClick}
              className="absolute top-3 left-3 p-2.5 rounded-full bg-white text-red-500 hover:bg-red-50 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
              title="Delete post"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          
          {/* 비로그인 시 오버레이 */}
          {!isSignedIn && (
            <div className="absolute inset-0 backdrop-blur-[0px] flex items-center justify-center transition-all duration-300 cursor-pointer hover:bg-black/40">
              <SignUpButton mode="modal" fallbackRedirectUrl="/dashboard">
                <div className="px-4 py-2 bg-white shadow-lg rounded-full border border-blue-200 flex items-center gap-2 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span className="text-blue-600 text-sm font-bold tracking-wide">SIGN UP</span>
                </div>
              </SignUpButton>
            </div>
          )}
          
          {/* 다운로드 버튼 - 이미지 우상단 (커뮤니티 페이지에서만 표시) */}
          {variant === 'community' && isSignedIn && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDownload(post);
              }}
              className={`absolute top-3 right-3 p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors ${variant === 'community' ? 'opacity-0 group-hover:opacity-100' : ''}
                ${post.userId === currentUser?.id ? "text-white" : "text-gray-300 cursor-not-allowed"}`}
              title={post.userId === currentUser?.id ? "Download image" : "Only the owner can download"}
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          
          {/* 이미지 비율 정보 표시 */}
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 rounded text-[10px] text-white font-medium backdrop-blur-sm">
            {post.aspectRatio || '1:1'}
          </div>
        </div>
      </div>
      
      {/* 카테고리 표시 섹션 - 원래 위치로 복원 */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center ${categoryColor}`}>
            <span className="mr-1.5">{categoryEmoji}</span> {category}
          </span>
          
          {/* 원본/공유 이미지 배지 추가 (커뮤니티 페이지에서만 표시) */}
          {variant === 'community' && post.original_generation_id && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200 shadow-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                <polyline points="16 6 12 2 8 6"></polyline>
                <line x1="12" y1="2" x2="12" y2="15"></line>
              </svg>
              Original
            </span>
          )}
          
          {variant === 'community' && post.isShared && !post.original_generation_id && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200 shadow-sm flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              Shared
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs font-medium tracking-wide uppercase">{formatDate(post.createdAt)}</span>
      </div>
      
      {/* 메인 페이지에서는 프롬프트를 먼저 보여주고 버튼은 아래에 배치 */}
      {variant === 'main' ? (
        <>
          {/* 프롬프트 섹션 - 메인 페이지용 */}
          <div className="px-5 py-4 border-t border-gray-100 bg-white">
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold shadow-sm mb-2">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v16l8-8-8-8z" />
              </svg>
              Prompt
            </div>
            {(post.prompt || (post.title && post.title !== "Generated image")) && (
              <div className="relative">
                <div className="px-3 py-2.5 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-l-4 border-cyan-500 rounded-r-md shadow-sm">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    "<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 tracking-wide">
                      {post.prompt || (post.title && post.title !== "Generated image" ? post.title : "No prompt available")}
                    </span>"
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* 메인 페이지 버튼 영역 - 수직 배치 및 색상 변경 */}
          <div className="px-5 py-3 border-t border-gray-100 bg-white flex justify-end">
            <button
              onClick={handleRegenerateClick}
              className="flex items-center gap-1.5 py-1.5 px-3 bg-white text-blue-500 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all duration-200 group shadow-sm"
              title="Recreate with prompt"
            >
              <span className="font-medium text-sm">Recreate</span>
              <Wand2 className="h-3.5 w-3.5 transform group-hover:rotate-12 transition-transform duration-300" />
            </button>
          </div>
        </>
      ) : (
        <>
          {/* 커뮤니티 페이지에서는 기존 버튼 레이아웃 유지 */}
          <div className="px-5 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-t border-gray-100">
            <div className="flex items-center gap-5">
              <AuthLikeButton
                isSignedIn={!!isSignedIn}
                onLike={handleSaveClick}
                isLiked={!!isLiked}
                likesCount={likesCount}
              />
              
              <AuthCommentButton
                isSignedIn={!!isSignedIn}
                onComment={handleCommentClick}
                commentsCount={commentsCount || comments.length}
                label={undefined}
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleRegenerateClick}
                className="flex items-center gap-2 py-2 px-4 bg-white text-indigo-600 border border-indigo-300 rounded-lg shadow-sm hover:border-transparent hover:bg-gradient-to-r hover:from-indigo-500 hover:to-purple-500 hover:text-white transition-all duration-300 group relative overflow-hidden"
                title="Regenerate with prompt"
              >
                {/* Hover overlay animation */}
                <span className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                
                <span className="relative flex items-center justify-center">
                  <Wand2 className="h-3.5 w-3.5 group-hover:rotate-12 transition-transform duration-300 animate-pulse" style={{ animationDuration: '3s' }} />
                  <span className="absolute inset-0 bg-indigo-400/10 rounded-full opacity-0 group-hover:opacity-100 scale-0 group-hover:scale-150 transition-all duration-500"></span>
                </span>
                <span className="text-xs font-medium tracking-wide">Recreate</span>
              </button>
              
              {post.userId === currentUser?.id && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(post);
                  }}
                  className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-gray-50"
                  title="Download image"
                >
                  <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>
          
          {/* 프롬프트 섹션 - 커뮤니티 페이지용 */}
          <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50 rounded-b-2xl">
            <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold shadow-sm mb-2">
              <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v16l8-8-8-8z" />
              </svg>
              Prompt
            </div>
            {(post.prompt || (post.title && post.title !== "Generated image")) && (
              <div className="relative">
                <div className="px-3 py-2.5 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-l-4 border-cyan-500 rounded-r-md shadow-sm">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed">
                    "<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 tracking-wide">
                      {post.prompt || (post.title && post.title !== "Generated image" ? post.title : "No prompt available")}
                    </span>"
                  </p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      
      {/* 댓글 모달 */}
      {commentModalState.isOpen && (
        <CommentModal
          isOpen={commentModalState.isOpen}
          onClose={() => setCommentModalState({ isOpen: false })}
          onSubmit={handleCommentSubmit}
          onDelete={onDeleteComment ? (commentId: string | number) => confirmDeleteComment(commentId) : undefined}
          comments={comments || []}
          currentUser={currentUser}
        />
      )}
      
      {deleteModalState.isOpen && (
        <ConfirmModal
          isOpen={deleteModalState.isOpen}
          onClose={() => setDeleteModalState({...deleteModalState, isOpen: false})}
          onConfirm={handleDeleteConfirm}
          title={deleteModalState.type === 'post' ? "Delete Post" : "Delete Comment"}
          message={deleteModalState.type === 'post' 
            ? "Are you sure you want to delete this post? This action cannot be undone."
            : "Are you sure you want to delete this comment? This action cannot be undone."
          }
          confirmText="Delete"
          cancelText="Cancel"
          type="danger"
        />
      )}

      {/* 이미지 아래에 댓글 영역 */}
      {variant === 'community' && (
        <div className="px-4 sm:px-5 pb-3 sm:pb-4 mt-1">
          {Array.isArray(comments) && comments.length > 0 ? (
            <div className="max-h-24 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-200">
              <div className="space-y-2 py-2">
                {comments.slice(0, 2).map((comment, index) => (
                  <div key={comment.id || `temp-${Date.now()}-${index}`} className="flex flex-col w-full">
                    <div className="flex items-start gap-1.5 w-full">
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {getCommentAuthorName(comment.userName || comment.author, currentUser)}:
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 break-words line-clamp-2 flex-1 overflow-hidden">
                        {comment.text}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {(() => {
                        try {
                          const date = new Date(comment.createdAt);
                          const options: Intl.DateTimeFormatOptions = { 
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          };
                          return !isNaN(date.getTime()) 
                            ? date.toLocaleDateString(undefined, options)
                            : '';
                        } catch (e) {
                          return '';
                        }
                      })()}
                    </span>
                  </div>
                ))}
              </div>
              
              {comments.length > 2 && (
                <div className="text-center mt-2 border-t border-gray-100 pt-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isSignedIn) {
                        setCommentModalState({ isOpen: true });
                      } else {
                        onComment(post.id);
                      }
                    }}
                    className="text-[10px] sm:text-xs text-gray-500 hover:text-blue-600 font-medium py-1.5 px-3 w-full"
                  >
                    View all {comments.length} comments
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-2 text-center">
              <span className="text-xs text-gray-400">No comments yet</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 기본 내보내기 추가
export default ImageCard;
