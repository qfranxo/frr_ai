"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Trash2, Download } from "lucide-react";
import { CommentModal } from '@/components/shared/CommentModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { formatDate } from '@/utils/format';
import { Comment } from '@/types/post';
import { AuthLikeButton, AuthCommentButton } from '@/components/shared/AuthButtons';
import { SignInButton } from '@clerk/nextjs';

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
  if (userName.startsWith('user_')) {
    return currentUser ? (currentUser.name || currentUser.username || '사용자') : '사용자';
  }
  
  // 이메일 형식인 경우 @ 앞부분만 사용
  if (userName.includes('@')) {
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
  onLike: (postId: string) => void;
  onComment: (postId: string, text?: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onShare: (post: any) => void;
  onDownload: (post: any) => void;
  onDeletePost?: (postId: string) => void;
  isLiked: boolean;
  likesCount: number;
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
  likesCount,
  commentsCount = 0,
  comments = []
}: ImageCardProps) {
  const [commentModalState, setCommentModalState] = useState({
    isOpen: false
  });
  
  // 삭제 확인 모달 상태
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: 'post' as 'post' | 'comment',
    commentId: '' as string | number
  });
  
  // 현재 사용자가 게시물 작성자인지 확인
  const isCurrentUserPostOwner = currentUser && (
    (post.userId && currentUser.id === post.userId) || 
    (post.author && currentUser.name === post.author) ||
    (post.author && currentUser.id === post.author)
  );

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

  const handleLikeClick = () => {
    onLike(post.id);
  };

  const handleDeleteClick = () => {
    if (onDeletePost && isCurrentUserPostOwner) {
      setDeleteModalState({
        isOpen: true,
        type: 'post',
        commentId: ''
      });
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteModalState.type === 'post' && onDeletePost) {
      onDeletePost(post.id);
    } else if (deleteModalState.type === 'comment' && onDeleteComment) {
      onDeleteComment(post.id, deleteModalState.commentId.toString());
    }
    
    setDeleteModalState({
      ...deleteModalState,
      isOpen: false
    });
  };

  const confirmDeleteComment = (commentId: string | number) => {
    setDeleteModalState({
      isOpen: true,
      type: 'comment',
      commentId
    });
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
    <div className={`relative rounded-2xl overflow-hidden shadow-md hover:shadow-xl bg-white group
      ${variant === 'main' ? 'w-full mb-6 transition-all duration-300' : ''} 
      ${layout === 'masonry' && variant === 'community' ? 'mb-4 transition-all duration-300' : ''}`}>
      
      {/* 이미지 섹션 */}
      <div className={`relative ${variant === 'community' ? 'p-3 sm:p-4' : 'p-0'}`}>
        <div className={`relative overflow-hidden ${variant === 'community' ? 'rounded-xl' : 'rounded-t-2xl'}`}>
          <img 
            src={post.imageUrl} 
            alt={post.prompt || post.title || 'Generated image'} 
            className={`w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105 ${variant === 'community' ? 'rounded-xl' : 'rounded-t-2xl'} ${!isSignedIn ? 'blur-[2px]' : ''}`}
            style={{ aspectRatio: post.aspectRatio || '1/1' }}
          />
          
          {/* 비로그인 시 오버레이 */}
          {!isSignedIn && (
            <SignInButton mode="modal">
              <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300 cursor-pointer">
                <div className="absolute bottom-4 right-4">
                  <div className="px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full shadow-lg border border-white/20 flex items-center gap-1.5 group hover:bg-black/60 transition-all duration-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <span className="text-white text-xs font-medium tracking-wide">SIGN IN</span>
                  </div>
                </div>
              </div>
            </SignInButton>
          )}
          
          {/* 다운로드 버튼 - 이미지 우상단 */}
          {isSignedIn && (
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onDownload(post);
              }}
              className={`absolute top-3 right-3 p-2.5 rounded-full bg-black/40 hover:bg-black/60 transition-colors
                ${post.userId === currentUser?.id ? "text-white" : "text-gray-300 cursor-not-allowed"}
                ${variant === 'main' ? "" : ""}`}
              title={post.userId === currentUser?.id ? "Download image" : "Only the owner can download"}
            >
              <Download className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
          
          {/* 삭제 버튼 - 이미지 좌상단 (소유자만 볼 수 있음) */}
          {isCurrentUserPostOwner && onDeletePost && (
            <button 
              onClick={handleDeleteClick}
              className="absolute top-3 left-3 p-2.5 rounded-full bg-white text-red-500 transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
              title="Delete post"
            >
              <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          )}
        </div>
      </div>
      
      {/* 카테고리 표시 섹션 - 원래 위치로 복원 */}
      <div className="px-5 py-3 bg-gradient-to-r from-gray-50 to-white flex items-center justify-between border-b border-gray-100">
        <span className={`px-3 py-1.5 rounded-full text-xs font-bold shadow-md flex items-center ${categoryColor}`}>
          <span className="mr-1.5">{categoryEmoji}</span> {category}
        </span>
        <span className="text-gray-400 text-xs font-medium tracking-wide uppercase">{formatDate(post.createdAt)}</span>
      </div>
      
      {/* 좋아요 및 공유 버튼 */}
      <div className="bg-white px-5 py-4 flex items-center justify-between border-t border-gray-100">
        <div className="flex items-center gap-5">
          <AuthLikeButton
            isSignedIn={!!isSignedIn}
            onLike={handleLikeClick}
            isLiked={isLiked}
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
            onClick={() => onShare(post)}
            className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors p-2 rounded-full hover:bg-gray-50"
            title="Share image"
          >
            <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
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
      
      {/* 프롬프트 섹션 - 개선됨 */}
      <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-b from-white to-gray-50 rounded-b-2xl">
        <div className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold shadow-sm mb-3">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 4v16l8-8-8-8z" />
          </svg>
          Prompt
        </div>
        {(post.prompt || (post.title && post.title !== "Generated image")) && (
          <div className="relative">
            <div className="px-3 py-2 bg-gradient-to-r from-cyan-50 via-blue-50 to-indigo-50 border-l-4 border-cyan-500 rounded-r-md shadow-sm">
              <p className="text-xs sm:text-sm font-medium leading-relaxed">
                "<span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 tracking-wide">
                  {post.prompt || (post.title && post.title !== "Generated image" ? post.title : "No prompt available")}
                </span>"
              </p>
            </div>
          </div>
        )}
      </div>
      
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
    </div>
  );
} 