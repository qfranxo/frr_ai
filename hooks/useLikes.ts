import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';

// 전역 상태로 관리
let globalLikes: { [postId: string]: number } = {};
let globalLikedPosts: { [postId: string]: boolean } = {};
// 토스트 중복 방지를 위한 전역 플래그
let isToastInProgress = false;

interface CurrentUser {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
}

export const useLikes = (initialPosts: CommunityPost[] = [], currentUser?: CurrentUser) => {
  const [likes, setLikes] = useState<{ [postId: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const postsRef = useRef<CommunityPost[]>([]);
  const isInitializedRef = useRef(false);
  // 토스트 중복 방지 용도
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 디버그 모드 완전 비활성화
  const debugRef = useRef<boolean>(false);

  // 사용자 로그인 여부 확인
  const isUserLoggedIn = !!currentUser?.id;

  // 구독 패턴 적용
  useEffect(() => {
    // 이전 포스트와 현재 포스트가 다른지 확인
    const isPreviousPosts = postsRef.current.length > 0;
    const hasNewPosts = initialPosts !== postsRef.current;
    
    if (hasNewPosts) {
      postsRef.current = initialPosts;
      
      const newLikes: { [postId: string]: number } = {};
      const newLikedPosts: { [postId: string]: boolean } = {};

      // 메모리 최적화를 위해 initialPosts 한 번만 순회
      initialPosts.forEach(post => {
        const id = String(post.id);
        
        // 이미 좋아요 데이터가 있는 경우 (메모리 재사용)
        if (id in globalLikes) {
          newLikes[id] = globalLikes[id];
        } 
        // 초기 데이터에서 좋아요 정보 로드
        else if (post.likes !== undefined) {
          newLikes[id] = post.likes;
          globalLikes[id] = post.likes;
        }
        // 좋아요 정보가 없는 경우 0으로 초기화
        else {
          newLikes[id] = 0;
          globalLikes[id] = 0;
        }

        // 사용자가 좋아요 눌렀는지 여부 상태 복구
        if (id in globalLikedPosts) {
          newLikedPosts[id] = globalLikedPosts[id];
        } else {
          newLikedPosts[id] = false;
          globalLikedPosts[id] = false;
        }
      });

      // 초기화되지 않았거나 데이터가 있는 경우 상태 업데이트
      if (!isInitializedRef.current || Object.keys(newLikes).length > 0) {
        setLikes(newLikes);
        setLikedPosts(newLikedPosts);
        isInitializedRef.current = true;
      }
    }
    
    // 컴포넌트 언마운트 시 토스트 타이머 정리
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [initialPosts]);

  // 토스트 표시 함수
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    // 전역 플래그가 활성화되어 있으면 토스트를 표시하지 않음
    if (isToastInProgress) return;
    
    // 전역 플래그 활성화
    isToastInProgress = true;
    
    // 기존 타이머가 있다면 취소
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    // 약간의 지연 후 토스트 표시 (중복 호출 방지)
    toastTimerRef.current = setTimeout(() => {
      if (type === 'success') {
        // 성공 토스트에는 고정된 ID 사용
        toast.success(message, { 
          position: 'top-center', 
          duration: 3000, 
          id: 'like-success'  // 고정 ID
        });
      } else {
        // 오류 토스트에는 고정된 ID 사용
        toast.error(message, { 
          position: 'top-center', 
          duration: 3000, 
          id: 'like-error'  // 고정 ID
        });
      }
      toastTimerRef.current = null;
      
      // 토스트 표시 후 일정 시간 후에 플래그 비활성화
      setTimeout(() => {
        isToastInProgress = false;
      }, 1000);
    }, 100);
  }, []);

  const handleLike = useCallback(async (postId: number | string) => {
    if (!isUserLoggedIn && currentUser === undefined) {
      showToast('error', '좋아요를 누르려면 로그인이 필요합니다');
      return;
    }
  
    // 중복 호출 방지
    if (isSubmitting) return;
    
    const id = String(postId);
    
    // 로컬 상태 업데이트 (낙관적 UI 업데이트)
    setLikedPosts(prev => {
      const isCurrentlyLiked = prev[id] || false;
      const newLikedPosts = { ...prev, [id]: !isCurrentlyLiked };
      globalLikedPosts = newLikedPosts;
      return newLikedPosts;
    });
    
    setLikes(prev => {
      const currentLikes = prev[id] || 0;
      const isCurrentlyLiked = likedPosts[id] || false;
      const newLikesCount = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
      const newLikes = { ...prev, [id]: newLikesCount };
      globalLikes = newLikes;
      return newLikes;
    });

    // 로그인한 경우에만 API 호출 시도
    if (isUserLoggedIn && currentUser?.id) {
      setIsSubmitting(true);
      try {
        // API 호출 (로그인된 경우)
        // const response = await communityApi.toggleLike(id, currentUser.id);
        // API 응답에 따라 상태 업데이트 (선택적)
        
        // API 호출 성공 시 토스트 메시지 (선택적)
        // const message = likedPosts[id] ? '좋아요가 취소되었습니다' : '좋아요를 눌렀습니다';
        // showToast('success', message);
      } catch (error) {
        console.error('Error toggling like:', error);
        
        // 에러 발생 시 상태 롤백
        setLikedPosts(prev => {
          const newLikedPosts = { ...prev, [id]: !prev[id] };
          globalLikedPosts = newLikedPosts;
          return newLikedPosts;
        });
        
        setLikes(prev => {
          const currentLikes = prev[id] || 0;
          const isCurrentlyLiked = !likedPosts[id];
          const newLikesCount = isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
          const newLikes = { ...prev, [id]: newLikesCount };
          globalLikes = newLikes; 
          return newLikes;
        });
        
        showToast('error', '좋아요 처리 중 오류가 발생했습니다');
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [isUserLoggedIn, currentUser, likedPosts, showToast, isSubmitting]);

  return {
    likes,
    likedPosts,
    handleLike
  };
}; 