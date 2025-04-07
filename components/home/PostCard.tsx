"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Heart, MessageCircle, Share2, Trash2, Camera, Palette, Mountain, Building, Wand2, Rocket, Clock, Dribbble, PawPrint, Sparkles, Box, Lock, Download } from "lucide-react";
import { CommentModal } from '@/components/shared/CommentModal';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { MODEL_STYLES } from '@/constants/modelOptions';
import { formatDate } from '@/utils/format';
import { IPostCard, IComment, IUser } from '@/types';
import { toast } from 'sonner';
import { AuthLikeButton, AuthCommentButton } from '@/components/shared/AuthButtons';

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
    // 새 스타일-카테고리 매핑 추가
    'highfashion': 'fashion',
    '하이패션': 'fashion',
    'high fashion': 'fashion',
    'fashion': 'fashion',
    'luxury': 'fashion',
    'photofashion': 'fashion',
    'vogue': 'fashion',
    'runway': 'fashion',
    'modeling': 'fashion',
    'editorial': 'fashion'
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

const getCategoryIcon = (category?: string) => {
  if (!category) return <Camera className="w-4 h-4 mr-1" />;
  
  // 이모지 매핑
  const emojiMap: Record<string, string> = {
    'portrait': '👩‍🎨',
    'anime': '🦸‍♀️',
    'landscape': '🌄',
    'urban': '🏢',
    'fantasy': '🐉',
    'sci-fi': '👾',
    'vintage': '🕰️',
    'animals': '🦁',
    'fashion': '👕',
    'all': '✨',
    'my-cards': '🖼️'
  };
  
  // 이모지 반환 (가능한 경우)
  const emoji = emojiMap[category.toLowerCase()];
  if (emoji) {
    return <span className="mr-1">{emoji}</span>;
  }
  
  // 폴백 SVG 아이콘 매핑
  const iconMap: Record<string, JSX.Element> = {
    'portrait': <Camera className="w-4 h-4 mr-1" />,
    'anime': <Palette className="w-4 h-4 mr-1" />,
    'landscape': <Mountain className="w-4 h-4 mr-1" />,
    'urban': <Building className="w-4 h-4 mr-1" />,
    'fantasy': <Wand2 className="w-4 h-4 mr-1" />,
    'sci-fi': <Rocket className="w-4 h-4 mr-1" />,
    'vintage': <Clock className="w-4 h-4 mr-1" />,
    'animals': <PawPrint className="w-4 h-4 mr-1" />,
    'fashion': <Sparkles className="w-4 h-4 mr-1" />
  };
  
  return iconMap[category.toLowerCase()] || <Camera className="w-4 h-4 mr-1" />;
};

const getCategoryColor = (category?: string): string => {
  if (!category) return 'bg-gray-100 text-gray-700';
  
  const colorMap: { [key: string]: string } = {
    'portrait': 'bg-blue-100 text-blue-800 border border-blue-200',
    'anime': 'bg-violet-100 text-violet-800 border border-violet-200',
    'landscape': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'urban': 'bg-amber-100 text-amber-800 border border-amber-200',
    'fantasy': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'sci-fi': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    'vintage': 'bg-rose-100 text-rose-800 border border-rose-200',
    'abstract': 'bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-200',
    'animals': 'bg-lime-100 text-lime-800 border border-lime-200',
    'fashion': 'bg-pink-100 text-pink-800 border border-pink-200'
  };
  
  return colorMap[category.toLowerCase()] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

export const PostCard = ({ 
  post,
  onLike, 
  onComment,
  onDeleteComment,
  isLiked,
  likesCount,
  currentComments,
  currentUser,
  handleShare
}: IPostCard) => {
  const [commentModalState, setCommentModalState] = useState({
    isOpen: false
  });
  
  // 삭제 확인 모달 상태 추가
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
  
  // 로그인 상태 확인은 handleLikeClick, handleCommentClick에서 함

  const handleCommentSubmit = (text: string) => {
    onComment(text);
    setCommentModalState({ isOpen: false });
  };

  // post.style 객체를 바로 사용
  const style = typeof post.style === 'string' 
    ? { id: post.style, name: post.style, icon: '🖼️' } 
    : (post.style || MODEL_STYLES[0]);
  
  const aspectRatio = post.aspectRatio || '3:4';

  // 사용자 이름 첫 글자 가져오기 (프로필 이미지에 사용)
  const getInitial = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  // 표시할 사용자 이름 결정
  const displayName = post.author;
  
  // 스타일 값과 카테고리 정보 가져오기
  const styleValue = typeof post.style === 'string' ? post.style : post.style?.id || '';
  const category = post.category || getCategoryFromStyle(styleValue);

  // 표시할 카테고리/스타일 이름과 아이콘
  const categoryName = style.name;
  const categoryIcon = style.icon;

  // 댓글 작성자 이름 표시 함수
  function getCommentAuthorName(userName: string | undefined | null = ''): string {
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

  // 포스트 삭제 핸들러 추가
  const handleDeletePost = async () => {
    if (!currentUser || !isCurrentUserPostOwner) {
      toast.error('You do not have permission to delete this post.', {
        position: 'top-center'
      });
      return;
    }
    
    try {
      // 서버에 삭제 요청
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'delete',
          imageId: post.id,
          userId: currentUser.id
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Post deleted successfully.', {
          position: 'top-center'
        });
        
        // 삭제 후 페이지 새로고침 (또는 상태 업데이트)
        window.location.reload();
      } else {
        toast.error(data.error || 'Failed to delete post.', {
          position: 'top-center'
        });
      }
    } catch (error) {
      toast.error('An error occurred while deleting the post.', {
        position: 'top-center'
      });
    }
  };

  // 다운로드 핸들러 추가
  const handleDownload = async () => {
    // 소유자가 아닌 경우 다운로드 제한
    if (!isCurrentUserPostOwner) {
      toast.error("Only the owner can download this image", {
        position: 'top-center'
      });
      return;
    }
    
    try {
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frr-ai-image-${post.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully.', {
        position: 'top-center'
      });
    } catch (error) {
      toast.error('Error occurred while downloading.', {
        position: 'top-center'
      });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
      {/* 이미지 컨테이너 */}
      <div className={`relative ${post.aspectRatio === '9:16' ? 'aspect-[9/16]' : post.aspectRatio === '16:9' ? 'aspect-[16/9]' : 'aspect-[3/4]'} w-full`}>
        <Image
          src={post.imageUrl}
          alt={post.prompt || 'Generated image'}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
      </div>

      {/* 카드 내용 */}
      <div className="p-3 sm:p-4">
        {/* 사용자 정보 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="relative w-8 h-8">
              <Image
                src={post.userImage || '/default-avatar.png'}
                alt={post.userName || post.author}
                fill
                className="rounded-full object-cover"
              />
            </div>
            <div>
              <div className="font-medium text-sm">{post.userName || post.author}</div>
              <div className="text-xs text-gray-500">{post.timestamp || formatDate(post.createdAt)}</div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
              {post.selectedCategory || post.category || 'other'}
            </span>
          </div>
        </div>

        {/* 프롬프트 뱃지와 카테고리 뱃지 */}
        <div className="flex flex-col gap-2 mb-3">
          {post.prompt && (
            <div className="inline-flex items-center px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-medium shadow-sm border border-purple-200">
              <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="truncate">{post.prompt}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(category)}`}>
              {getCategoryIcon(category)}
              {categoryName}
            </span>
          </div>
        </div>

        {/* 컨텐츠 섹션 */}
        <p className="text-xs sm:text-sm text-gray-700 line-clamp-2 mb-2">{post.description}</p>

        {Array.isArray(currentComments) && currentComments.length > 0 && currentComments[0] && (
          <div className="mt-4 sm:mt-6">
            <div className="flex gap-2 bg-gray-50 rounded-xl p-3 sm:p-5">
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center justify-between mb-1 sm:mb-2">
                  <span className="text-xs sm:text-sm font-medium truncate">{getCommentAuthorName(currentComments[0]?.author)}</span>
                  <div className="flex items-center">
                    <span className="text-[9px] sm:text-xs text-gray-500 shrink-0">
                      {formatDate(currentComments[0]?.createdAt)}
                    </span>
                  </div>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 leading-relaxed break-words">
                  {currentComments[0]?.text || 'No comment content'}
                </p>
              </div>
            </div>

            {currentComments.length > 1 && (
              <button
                onClick={() => setCommentModalState({ isOpen: true })}
                className="text-[10px] sm:text-sm text-blue-500 hover:text-blue-600 font-medium mt-2 sm:mt-4 transition-colors"
              >
                View {currentComments.length - 1} more comments
              </button>
            )}
          </div>
        )}
      </div>

      {/* 하단 바 - 고정 높이 */}
      <div className="bg-white border-t border-gray-100 px-2 sm:px-6 py-2 sm:py-3 h-[50px] sm:h-[60px] flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <AuthLikeButton 
            isSignedIn={currentUser ? currentUser.id !== 'guest-user' && currentUser.id !== '' : false}
            onLike={() => onLike?.(post.id)}
            isLiked={!!isLiked}
            likesCount={likesCount !== undefined && likesCount !== null ? likesCount : 0}
            iconSize={18}
          />
          
          <AuthCommentButton
            isSignedIn={currentUser ? currentUser.id !== 'guest-user' && currentUser.id !== '' : false}
            onComment={() => setCommentModalState({ isOpen: true })}
            commentsCount={Array.isArray(currentComments) ? currentComments.length : 0}
            label="Comments"
            iconSize={18}
          />
        </div>
        
        <div className="flex items-center gap-1 sm:gap-2">
          {/* 다운로드 버튼 - 공유 버튼 옆에 추가 */}
          <button
            onClick={handleDownload}
            className={`p-1.5 sm:p-2 rounded-full transition-colors ${
              isCurrentUserPostOwner 
                ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50" 
                : "text-gray-500 hover:text-gray-600 hover:bg-gray-100"
            }`}
            title={isCurrentUserPostOwner ? "Download image" : "Only the owner can download"}
          >
            <Download size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          
          {/* 공유 버튼 */}
          <button 
            className="p-1.5 sm:p-2 rounded-full text-gray-500 hover:text-blue-500 hover:bg-blue-50 transition-all"
            onClick={() => {
              if (handleShare) handleShare();
              toast.success('Link copied to clipboard');
            }}
          >
            <Share2 size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* 댓글 모달 */}
      <CommentModal
        isOpen={commentModalState.isOpen}
        onClose={() => setCommentModalState({ isOpen: false })}
        onSubmit={handleCommentSubmit}
        onDelete={(commentId) => setDeleteModalState({
          isOpen: true,
          type: 'comment',
          commentId: commentId
        })}
        comments={Array.isArray(currentComments) ? currentComments : []}
        currentUser={currentUser}
      />
      
      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({...deleteModalState, isOpen: false})}
        onConfirm={() => {
          if (deleteModalState.type === 'post') {
            handleDeletePost();
          } else {
            onDeleteComment(post.id, deleteModalState.commentId);
          }
        }}
        title={deleteModalState.type === 'post' ? "Delete Post" : "Delete Comment"}
        message={deleteModalState.type === 'post' 
          ? "Are you sure you want to delete this post? This action cannot be undone."
          : "Are you sure you want to delete this comment? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
}; 