import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';

// 전역 상태로 관리
let globalLikes: { [postId: string]: number } = {};
let globalLikedPosts: { [postId: string]: boolean } = {};
let pendingLikes: { [postId: string]: boolean } = {};

export const useLikes = (initialPosts: CommunityPost[] = [], currentUserId: string = 'guest-user') => {
  const [likes, setLikes] = useState<{ [postId: string]: number }>({});
  const [likedPosts, setLikedPosts] = useState<{ [postId: string]: boolean }>({});
  const postsRef = useRef<CommunityPost[]>([]);
  const isInitializedRef = useRef(false);

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

      if (!isInitializedRef.current || Object.keys(newLikes).length > 0) {
        setLikes(newLikes);
        setLikedPosts(newLikedPosts);
        isInitializedRef.current = true;
      }
    }
  }, [initialPosts]);

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
      // API 호출
      const result = await communityApi.toggleLike(id, currentUserId, isCurrentlyLiked, 1);
      
      if (!result.success) {
        // 실패 시 UI 원복
        globalLikedPosts[id] = isCurrentlyLiked;
        globalLikes[id] = (globalLikes[id] || 0) + (isCurrentlyLiked ? 1 : -1);
        
        setLikedPosts(prev => ({...prev, [id]: isCurrentlyLiked}));
        setLikes(prev => ({...prev, [id]: globalLikes[id]}));
      }
    } catch (error) {
      console.error('좋아요 처리 오류:', error);
      
      // 에러 시 UI 원복
      globalLikedPosts[id] = isCurrentlyLiked;
      globalLikes[id] = (globalLikes[id] || 0) + (isCurrentlyLiked ? 1 : -1);
      
      setLikedPosts(prev => ({...prev, [id]: isCurrentlyLiked}));
      setLikes(prev => ({...prev, [id]: globalLikes[id]}));
    } finally {
      // 처리 완료 표시
      pendingLikes[id] = false;
    }
  }, [currentUserId]);

  return { likes, likedPosts, handleLike };
}; 