'use client';

import { useState, useEffect } from 'react';
import { CommunityPost } from '@/types/post';
import HeroSection from '@/components/home/HeroSection';
import { SearchSection } from '@/components/home/SearchSection';
import { CommunitySection } from '@/components/home/CommunitySection';
import { useLikes } from '@/hooks/useLikes';
import { useComments } from '@/hooks/useComments';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { processImageUrl, isReplicateUrl, downloadImage } from '@/utils/image-utils';

interface MainPageClientProps {
  posts: CommunityPost[];
}

const MainPageClient = ({ posts = [] }: MainPageClientProps) => {
  const { user, isSignedIn } = useUser();
  
  // 현재 사용자 정보 - 로그인하지 않았을 때는 정보 비우기
  const currentUser = isSignedIn && user ? {
    id: user.id,
    name: user.firstName || user.username || '사용자',
    username: user.username || user.firstName || '사용자',
    imageUrl: user.imageUrl
  } : {
    id: 'guest-user',
    name: 'Guest',
    username: 'guest',
    imageUrl: undefined
  };
  
  // 좋아요 상태 관리 훅 사용
  const { likes: likesMap, likedPosts: likedPostsMap, handleLike } = useLikes(posts, currentUser.id);
  
  // 댓글 상태 관리 훅 사용
  const { commentsMap, handleComment, deleteComment } = useComments(posts, currentUser);
  
  // ID 불일치 문제를 해결하기 위해 배열 변환 방식 수정
  const likes = posts.map(post => {
    const id = String(post.id);
    return likesMap[id] !== undefined ? likesMap[id] : post.likes;
  });
  
  const likedPosts = posts.map(post => {
    const id = String(post.id);
    return likedPostsMap[id] || false;
  });
  
  const comments = posts.map(post => {
    const id = String(post.id);
    return commentsMap[id] || post.comments || [];
  });
  
  // 사용자 이름 표시 함수
  const getUserDisplayName = (userId: string) => {
    // 현재 사용자인 경우
    if (isSignedIn && userId === currentUser.id) {
      return currentUser.name;
    }
    
    // 기존 데이터인 경우 (사용자 아이디가 @ 포함되지 않은 경우 사용자 친화적으로 표시)
    if (!userId.includes('@') && !userId.includes('user_')) {
      return userId;
    }
    
    // Clerk ID 형식인 경우 간략화
    return userId.startsWith('user_') ? '사용자' : userId;
  };
  
  // 공유하기 기능
  const handleShare = async (post: any) => {
    try {
      // 현재 URL 기준으로 공유 URL 생성
      const shareUrl = `${window.location.origin}/shared/${post.id}`;
      
      // 클립보드에 복사
      await navigator.clipboard.writeText(shareUrl);
      toast.success('링크가 클립보드에 복사되었습니다!');
    } catch (error) {
      console.error('링크 복사 오류:', error);
      toast.error('링크 복사에 실패했습니다.');
    }
  };
  
  // 다운로드 기능 - 유틸리티 함수 사용
  const handleDownload = async (post: any) => {
    return downloadImage({
      imageUrl: post.imageUrl,
      fileName: `AI_image_${post.id}_${Date.now()}`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      <main>
        <HeroSection />
        <SearchSection />
        {posts.length > 0 && (
          <CommunitySection
            posts={posts.map(post => {
              return {
                ...post,
                imageUrl: post.imageUrl,
                userId: post.userId || post.author,
                author: getUserDisplayName(post.author)
              };
            })}
            onLike={handleLike}
            onComment={handleComment}
            onDeleteComment={deleteComment}
            likes={likes}
            likedPosts={likedPosts}
            comments={comments}
            currentUser={currentUser}
            isSignedIn={!!isSignedIn}
            handleShare={handleShare}
            handleDownload={handleDownload}
          />
        )}
      </main>
    </div>
  );
};

export default MainPageClient; 