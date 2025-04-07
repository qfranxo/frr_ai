'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { CommunityPost } from '@/types/post';
import HeroSection from '@/components/home/HeroSection';
import { SearchSection } from '@/components/home/SearchSection';
import { CommunitySection } from '@/components/home/CommunitySection';
import { useComments } from '@/hooks/useComments';
import { useUser } from '@clerk/nextjs';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { processImageUrl, isReplicateUrl, downloadImage } from '@/utils/image-utils';
import { communityApi } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

interface MainPageClientProps {
  posts: CommunityPost[];
}

const MainPageClient = ({ posts = [] }: MainPageClientProps) => {
  const { user, isSignedIn } = useUser();
  const router = useRouter();
  
  // 현재 페이지 데이터 상태 관리
  const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(posts);
  const [isLoading, setIsLoading] = useState(false);
  const [isBackgroundLoading, setIsBackgroundLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastLoadedTime, setLastLoadedTime] = useState<Date | null>(null);
  
  // 초기 로드 시 한 번만 데이터 가져오기
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const result = await communityApi.loadCommunityData(false); // 캐시 우선 사용
        
        if (result.success && result.data) {
          setCommunityPosts(result.data);
          setLastLoadedTime(new Date());
          
          // 캐시 데이터인 경우 백그라운드에서 최신 데이터 가져오기
          if (result.source === 'cache' || result.source === 'offline-cache') {
            backgroundRefresh();
          }
        } else if (!result.success) {
          // 에러 메시지 표시
          if (result.source === 'offline-error') {
            setLoadError('인터넷 연결이 끊어졌습니다. 네트워크 연결을 확인해주세요.');
          } else if (result.source === 'timeout-error') {
            setLoadError('서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.');
          } else {
            setLoadError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.');
          }
          
          toast.error('커뮤니티 데이터를 불러오는데 실패했습니다.');
          
          // 로컬 데이터 사용 (posts가 초기 props로 전달됨)
          if (posts.length > 0) {
            setCommunityPosts(posts);
          }
        }
      } catch (error) {
        setLoadError('서버 연결에 문제가 있습니다. 네트워크 상태를 확인해 주세요.');
        toast.error('서버 연결에 문제가 있습니다. 네트워크 상태를 확인해 주세요.');
        
        // 로컬 데이터 사용
        if (posts.length > 0) {
          setCommunityPosts(posts);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // 다른 페이지에서 돌아올 때만 데이터 새로고침 (불필요한 주기적 새로고침 제거)
    const handleRouteChange = () => {
      if (document.visibilityState === 'visible') {
        // 탭이 다시 활성화되면 백그라운드 새로고침
        backgroundRefresh();
      }
    };
    
    window.addEventListener('visibilitychange', handleRouteChange);
    return () => window.removeEventListener('visibilitychange', handleRouteChange);
  }, [posts]);  // posts를 의존성에 추가
  
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
  
  // 댓글 상태 관리 훅 사용
  const { commentsMap, handleComment, deleteComment } = useComments(communityPosts, currentUser);
  
  // commentsMap이 변경될 때마다 communityPosts 업데이트
  useEffect(() => {
    // commentsMap이 비어있다면 업데이트할 필요가 없음
    if (Object.keys(commentsMap).length === 0) return;
    
    // 변경이 필요한 게시물만 찾아서 업데이트하여 불필요한 리렌더링 방지
    let needsUpdate = false;
    const updatedPosts = [...communityPosts]; // 얕은 복사로 시작
    
    for (let i = 0; i < updatedPosts.length; i++) {
      const post = updatedPosts[i];
      const postId = String(post.id);
      const currentComments = commentsMap[postId];
      
      // 댓글이 없으면 건너뛰기
      if (!currentComments) continue;
      
      // 최적화된 비교: 댓글 수가 다르거나, ID 세트가 다른 경우에만 업데이트
      const shouldUpdate = 
        !post.comments || 
        post.comments.length !== currentComments.length ||
        // Set을 사용한 ID 비교 (정렬 필요 없음)
        !areSameCommentIds(post.comments, currentComments);
      
      if (shouldUpdate) {
        needsUpdate = true;
        // 개별 객체만 새로 생성하여 메모리 사용 최적화
        updatedPosts[i] = {
          ...post,
          comments: currentComments
        };
      }
    }
    
    // 변경된 게시물이 있을 경우에만 상태 업데이트
    if (needsUpdate) {
      setCommunityPosts(updatedPosts);
    }
  // commentsMap만 의존성으로 추가하고 communityPosts는 제외
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [commentsMap]);
  
  // 댓글 ID 세트 비교 함수 - 성능 최적화
  const areSameCommentIds = (comments1: any[], comments2: any[]): boolean => {
    if (comments1.length !== comments2.length) return false;
    
    // ID 집합을 생성
    const idSet1 = new Set(comments1.map(c => c.id));
    
    // 모든 ID가 첫 번째 세트에 포함되어 있는지 확인
    return comments2.every(c => idSet1.has(c.id));
  };
  
  // 사용자 이름 표시 함수
  const getUserDisplayName = (userId: string) => {
    // userId가 없는 경우 기본값 반환
    if (!userId) {
      return '사용자';
    }

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
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link.');
    }
  };
  
  // 다운로드 기능 - 유틸리티 함수 사용
  const handleDownload = async (post: any) => {
    return downloadImage({
      imageUrl: post.imageUrl,
      fileName: `AI_image_${post.id}_${Date.now()}`
    });
  };

  // 방법 1: 컴포넌트 제대로 구현
  // 타입을 추가해서 lint 에러 수정
  interface PostItemProps {
    post: {
      id: string | number;
      title: string;
    };
  }
  
  const PostItem = React.memo(({ post }: PostItemProps) => {
    return (
      <div>
        <h3>{post.title}</h3>
      </div>
    );
  });

  // 무거운 계산은 useMemo 사용
  const filteredPosts = useMemo(() => {
    return communityPosts.filter(post => {
      // 필터링 로직
    }).map(post => {
      // 데이터 변환 로직
    });
  }, [communityPosts, currentUser.id]);

  // 댓글 추가 함수 수정 - TypeScript 타입 호환성 개선
  const handlePostComment = async (postId: string | number, text: string) => {
    if (!text.trim()) return;
    
    const stringId = String(postId);
    
    try {
      // 훅의 handleComment 함수 호출 - 이를 통해 전역 댓글 상태 관리
      await handleComment(stringId, text);
      
      // 이미 useComments 훅에서 commentsMap을 업데이트했으므로
      // 여기서는 추가 작업이 필요하지 않음
    } catch (error) {
      toast.error('Failed to add comment');
    }
  };

  // 게시물 삭제 함수
  const handleDeletePost = async (postId: string) => {
    try {
      // 로그인 여부 확인
      if (!isSignedIn || currentUser.id === 'guest-user') {
        toast.error('Login required to delete posts');
        return;
      }
      
      const postIndex = communityPosts.findIndex(p => String(p.id) === postId);
      if (postIndex === -1) return;
      
      const post = communityPosts[postIndex];
      
      // 사용자가 게시물 소유자인지 확인
      if (post.userId && post.userId !== currentUser.id) {
        toast.error('You can only delete your own posts');
        return;
      }
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        // 성공적으로 삭제된 경우 목록에서도 제거
        setCommunityPosts(prev => prev.filter(p => String(p.id) !== postId));
        toast.success('Post deleted successfully');
      } else {
        toast.error('Failed to delete post');
      }
    } catch (error) {
      toast.error('Error deleting post');
    }
  };

  // 백그라운드에서 데이터 새로고침
  const backgroundRefresh = async () => {
    if (isBackgroundLoading) return; // 중복 요청 방지
    
    try {
      setIsBackgroundLoading(true);
      
      const result = await communityApi.loadCommunityData(true);
      if (result.success && result.data) {
        setCommunityPosts(result.data);
        setLastLoadedTime(new Date());
      }
    } catch (error) {
      // 백그라운드 오류는 사용자에게 표시하지 않음
    } finally {
      setIsBackgroundLoading(false);
    }
  };

  // 데이터 로드 재시도 함수
  const handleRetry = async () => {
    try {
      setIsLoading(true);
      setLoadError(null);
      toast.info('데이터를 다시 불러오는 중...');
      
      const result = await communityApi.loadCommunityData(true);
      if (result.success && result.data) {
        setCommunityPosts(result.data);
        setLastLoadedTime(new Date());
        toast.success('데이터를 성공적으로 불러왔습니다.');
      } else {
        setLoadError('데이터를 불러오는데 실패했습니다. 잠시 후 다시 시도해 주세요.');
        toast.error('데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setLoadError('서버 연결에 문제가 있습니다. 네트워크 상태를 확인해 주세요.');
      toast.error('서버 연결에 문제가 있습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 overflow-y-auto">
      <main>
        <HeroSection />
        <SearchSection />
        
        {isLoading ? (
          <div className="flex justify-center items-center my-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : loadError ? (
          <div className="flex flex-col justify-center items-center my-8 p-6 bg-white rounded-lg shadow-sm max-w-2xl mx-auto">
            <div className="text-red-500 text-lg mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 inline-block mr-2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              연결 오류
            </div>
            <p className="text-gray-700 mb-4 text-center">{loadError}</p>
            <button 
              onClick={handleRetry} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              disabled={isLoading}
            >
              {isLoading ? '로딩 중...' : '다시 시도하기'}
            </button>
            
            {posts.length > 0 && (
              <div className="mt-6 text-sm text-gray-500">
                <p>이전에 로드된 데이터를 표시합니다.</p>
              </div>
            )}
          </div>
        ) : communityPosts.length > 0 ? (
          <>
            <CommunitySection
              posts={communityPosts}
              onComment={handlePostComment}
              onDeleteComment={deleteComment}
              onDeletePost={(postId) => {
                // 현재 사용자가 게시물 소유자일 경우에만 삭제 가능
                const post = communityPosts.find(p => String(p.id) === postId);
                if (post && post.userId === currentUser.id) {
                  handleDeletePost(postId);
                }
              }}
              comments={communityPosts.map(post => commentsMap[String(post.id)] || post.comments || [])}
              currentUser={currentUser}
              isSignedIn={!!isSignedIn}
              handleShare={handleShare}
              handleDownload={handleDownload}
            />
            
            {/* 로딩 상태 표시 */}
            {isBackgroundLoading && (
              <div className="text-center py-2 text-xs text-gray-500">
                <span className="inline-block animate-pulse">Updating data...</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex justify-center items-center my-12 p-6 text-gray-500">
            No posts available.
          </div>
        )}
      </main>
    </div>
  );
};

export default MainPageClient; 