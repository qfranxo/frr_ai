import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';
import { useAuth, useUser } from '@clerk/nextjs';

// 전역 상태로 관리 (페이지 새로고침 사이에는 초기화됨)
let globalLikes: { [postId: string]: number } = {};
let globalLikedPosts: { [postId: string]: boolean } = {};
let pendingLikes: { [postId: string]: boolean } = {};
// 마지막 API 요청 시간 저장
let lastFetchTimes: { [postId: string]: number } = {};
// 전역 요청 타임스탬프 - 중복 요청 방지용
let globalLastFetchTime = 0;

// 프로덕션 환경에서 로그 최소화를 위한 로거
const logger = {
  log: (message: string, ...args: any[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(message, ...args);
    }
  },
  error: (message: string, ...args: any[]) => {
    console.error(message, ...args);
  }
};

export const useLikes = (initialPosts: CommunityPost[] = [], currentUserId: string = 'guest-user') => {
  const [likes, setLikes] = useState<{ [postId: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const postsRef = useRef<CommunityPost[]>([]);
  const isInitializedRef = useRef(false);
  const { getToken } = useAuth();
  const { user } = useUser();
  const isLoggedIn = currentUserId !== 'guest-user' && currentUserId !== '';
  
  // 마지막 전체 요청 시간 참조
  const lastFetchTimeRef = useRef<number>(0);

  // 로그인된 사용자에 대한 좋아요 상태 조회
  const fetchUserLikeStatus = useCallback(async () => {
    if (!isLoggedIn || !initialPosts || initialPosts.length === 0) return;
    
    // 30초 이내에 이미 전체 요청을 했으면 스킵
    const now = Date.now();
    if (now - globalLastFetchTime < 30000) {
      logger.log('[좋아요] 최근에 이미 조회했으므로 스킵 (30초 제한)');
      return;
    }
    
    // 전역 및 로컬 타임스탬프 업데이트
    globalLastFetchTime = now;
    lastFetchTimeRef.current = now;
    
    logger.log('[좋아요] 사용자 좋아요 상태 조회 시작');
    
    const newLikedPosts: { [postId: string]: boolean } = {};
    const newLikes: { [postId: string]: number } = {};
    
    // 병렬 처리를 위한 요청 배열
    const fetchPromises = initialPosts.map(async (post) => {
      const postId = String(post.id);
      
      // 개별 포스트에 대해 30초 이내에 요청했으면 캐시된 값 사용
      if (postId in lastFetchTimes && now - lastFetchTimes[postId] < 30000) {
        return {
          postId,
          likeCount: globalLikes[postId] || 0,
          isLiked: globalLikedPosts[postId] || false
        };
      }
      
      try {
        const url = `/api/likes?imageId=${postId}&userId=${currentUserId}`;
        const response = await fetch(url);
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            // 타임스탬프 업데이트
            lastFetchTimes[postId] = now;
            
            return {
              postId,
              likeCount: data.count,
              isLiked: data.isLiked
            };
          }
        }
      } catch (error) {
        logger.error(`[좋아요] 게시물 ${postId} 상태 조회 오류:`, error);
      }
      
      // 요청 실패시 캐시된 값 반환
      return {
        postId,
        likeCount: globalLikes[postId] || 0, 
        isLiked: globalLikedPosts[postId] || false
      };
    });
    
    try {
      // 모든 요청을 병렬로 처리
      const results = await Promise.all(fetchPromises);
      
      // 결과 처리
      results.forEach(({ postId, likeCount, isLiked }) => {
        newLikes[postId] = likeCount;
        newLikedPosts[postId] = isLiked;
        
        // 전역 상태 업데이트
        globalLikes[postId] = likeCount;
        globalLikedPosts[postId] = isLiked;
      });
      
      setLikes(newLikes);
      setLikedPosts(newLikedPosts);
      logger.log('[좋아요] 사용자 좋아요 상태 조회 완료:', Object.keys(newLikedPosts).length);
    } catch (error) {
      logger.error('[좋아요] 상태 조회 오류:', error);
    }
  }, [currentUserId, initialPosts, isLoggedIn]);

  // 초기화
  useEffect(() => {
    if (initialPosts !== postsRef.current) {
      postsRef.current = initialPosts;
      
      const newLikes: { [postId: string]: number } = {};
      const newLikedPosts: { [postId: string]: boolean } = {};

      for (const post of initialPosts) {
        const id = String(post.id);
        newLikes[id] = id in globalLikes ? globalLikes[id] : (post.likes === undefined ? 0 : post.likes);
        newLikedPosts[id] = id in globalLikedPosts ? globalLikedPosts[id] : false;
        
        globalLikes[id] = newLikes[id];
        globalLikedPosts[id] = newLikedPosts[id];
      }

      setLikes(newLikes);
      setLikedPosts(newLikedPosts);
      isInitializedRef.current = true;
      
      // 초기 데이터를 설정한 후, 
      // 마지막 요청으로부터 30초 이상 지났을 때만 새로 요청 
      if (isLoggedIn && Date.now() - lastFetchTimeRef.current > 30000) {
        fetchUserLikeStatus();
      }
    }
  }, [initialPosts, isLoggedIn, fetchUserLikeStatus]);
  
  // 사용자 ID가 변경되면 좋아요 상태 다시 조회
  // 단, 중복 요청 방지를 위해 60초 제한 적용
  useEffect(() => {
    if (isLoggedIn && isInitializedRef.current) {
      const now = Date.now();
      if (now - lastFetchTimeRef.current > 60000) { // 1분 제한
        fetchUserLikeStatus();
      } else {
        logger.log('[좋아요] 최근에 이미 조회했으므로 스킵 (60초 제한)');
      }
    }
  }, [currentUserId, fetchUserLikeStatus, isLoggedIn]);

  const handleLike = useCallback(async (postId: string | number) => {
    const id = String(postId);
    
    if (!currentUserId || currentUserId === 'guest-user' || currentUserId === '') {
      return;
    }
    
    // 이미 처리 중인 좋아요인 경우 무시
    if (pendingLikes[id]) {
      return;
    }
    
    const isCurrentlyLiked = globalLikedPosts[id] || false;
    const newLikedState = !isCurrentlyLiked;
    
    // 처리 중임을 표시
    pendingLikes[id] = true;
    
    // 낙관적 UI 업데이트
    globalLikedPosts[id] = newLikedState;
    globalLikes[id] = (globalLikes[id] || 0) + (newLikedState ? 1 : -1);

    setLikedPosts(prev => ({...prev, [id]: newLikedState}));
    setLikes(prev => ({...prev, [id]: globalLikes[id]}));
    
    try {
      // Clerk에서 JWT 토큰 가져오기 (더 이상 서버에 전송하지 않음)
      const token = await getToken({ template: "frrai" });
      logger.log(`[좋아요] Clerk JWT 토큰 취득:`, token ? "성공" : "실패");
      
      // 사용자 이름 정보 가져오기
      let userName = "익명 사용자";
      if (user) {
        userName = user.fullName || 
                   (user.firstName && (user.firstName + (user.lastName ? ` ${user.lastName}` : ''))) || 
                   user.username || 
                   `사용자_${currentUserId.substring(0, 8)}`;
      }
      
      // API 호출 시 userId와 userName을 함께 전달
      const result = await communityApi.toggleLike(
        id,
        currentUserId,
        isCurrentlyLiked,
        1, // 증가량 (default)
        userName // 사용자 이름 추가
      );
      
      if (!result.success) {
        // 실패 시 UI 원복
        globalLikedPosts[id] = isCurrentlyLiked;
        globalLikes[id] = (globalLikes[id] || 0) + (isCurrentlyLiked ? 1 : -1);
        
        setLikedPosts(prev => ({...prev, [id]: isCurrentlyLiked}));
        setLikes(prev => ({...prev, [id]: globalLikes[id]}));
      }
    } catch (error) {
      logger.error('좋아요 처리 오류:', error);
      
      // 에러 시 UI 원복
      globalLikedPosts[id] = isCurrentlyLiked;
      globalLikes[id] = (globalLikes[id] || 0) + (isCurrentlyLiked ? 1 : -1);
      
      setLikedPosts(prev => ({...prev, [id]: isCurrentlyLiked}));
      setLikes(prev => ({...prev, [id]: globalLikes[id]}));
    } finally {
      // 처리 완료 표시
      pendingLikes[id] = false;
    }
  }, [currentUserId, getToken, user]);

  return { likes, likedPosts, handleLike };
}; 