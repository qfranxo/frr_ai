'use client';

import { useState, useEffect } from 'react';
import { CommunityPost } from '@/types/post';
import HeroSection from '@/components/home/HeroSection';
import { SearchSection } from '@/components/home/SearchSection';
import { CommunitySection } from '@/components/home/CommunitySection';
import { BlobAnimation } from '@/components/ui/blob-animation';
import { useLikes } from '@/hooks/useLikes';
import { useComments } from '@/hooks/useComments';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

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
  
  const { likes: likesMap, likedPosts: likedPostsMap, handleLike } = useLikes(posts, currentUser.id);
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
  
  // 공유하기 기능 추가
  const handleShare = (post: any) => {
    // 현재 URL 기준으로 공유 URL 생성
    const shareUrl = `${window.location.origin}/shared/${post.id}`;
    
    // 클립보드에 복사
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success('Link copied to clipboard!', {
          position: 'top-center'
        });
      })
      .catch(() => {
        toast.error('Failed to copy link to clipboard.', {
          position: 'top-center'
        });
      });
  };
  
  // 다운로드 기능 추가
  const handleDownload = async (post: any) => {
    // 다운로드 권한 확인 (게시물 소유자만 가능)
    if (!isSignedIn || !currentUser || post.userId !== currentUser.id) {
      toast.error("Only the owner can download this image", {
        position: 'top-center'
      });
      return;
    }
    
    try {
      // 이미지 URL에서 파일명 추출
      const fileName = post.imageUrl.split('/').pop() || 'image.png';
      
      // 이미지 다운로드
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // 다운로드 링크 생성 및 클릭
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Image downloaded successfully.', {
        position: 'top-center'
      });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Error occurred while downloading.', {
        position: 'top-center'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      <main>
        <HeroSection />
        <SearchSection />
        {posts.length > 0 && (
          <CommunitySection
            posts={posts.map(post => {
              // 포스트에 userId 필드 설정 - 작성자를 식별하는 용도
              const userId = post.userId || post.author;
              
              return {
                ...post,
                author: getUserDisplayName(post.author),
                userId: userId // 원래 작성자 정보를 userId에 저장
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