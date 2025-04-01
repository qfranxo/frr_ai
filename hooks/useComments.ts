import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost, Comment } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';

// 전역 상태로 관리
let globalComments: { [postId: string]: Comment[] } = {};
// 토스트 중복 방지를 위한 전역 플래그
let isToastInProgress = false;

interface CurrentUser {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
}

export const useComments = (initialPosts: CommunityPost[] = [], currentUser?: CurrentUser) => {
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: Comment[] }>({});
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const postsRef = useRef<CommunityPost[]>([]);
  const isInitializedRef = useRef(false);
  // 토스트 중복 방지 용도
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 사용자 로그인 여부 확인
  const isUserLoggedIn = !!currentUser?.id;

  // 구독 패턴 적용
  useEffect(() => {
    if (initialPosts !== postsRef.current) {
      postsRef.current = initialPosts;
      
      const newComments: { [postId: string]: Comment[] } = {};

      for (const post of initialPosts) {
        const id = String(post.id);
        
        if (id in globalComments) {
          newComments[id] = globalComments[id];
        } else {
          const sortedComments = [...(post.comments || [])].sort((a, b) => {
            try {
              const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
              
              const timeA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
              const timeB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
              
              return timeB - timeA;
            } catch (error) {
              console.error('댓글 정렬 오류:', error);
              return 0;
            }
          });
          
          newComments[id] = sortedComments;
          globalComments[id] = sortedComments;
        }
      }

      if (!isInitializedRef.current || Object.keys(newComments).length > 0) {
        setCommentsMap(newComments);
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
          id: 'comment-success'  // 고정 ID
        });
      } else {
        // 오류 토스트에는 고정된 ID 사용
        toast.error(message, { 
          position: 'top-center', 
          duration: 3000, 
          id: 'comment-error'  // 고정 ID
        });
      }
      toastTimerRef.current = null;
      
      // 토스트 표시 후 일정 시간 후에 플래그 비활성화
      setTimeout(() => {
        isToastInProgress = false;
      }, 1000);
    }, 100);
  }, []);

  const openCommentModal = useCallback((postId: string | number) => {
    const id = String(postId);
    
    if (!isUserLoggedIn) {
      showToast('error', 'Please sign in to continue.');
      return;
    }
    
    setSelectedPostId(id);
    setIsCommentModalOpen(true);
  }, [isUserLoggedIn, showToast]);

  const closeCommentModal = useCallback(() => {
    setIsCommentModalOpen(false);
    setSelectedPostId(null);
    setCommentText('');
  }, []);

  const handleCommentTextChange = useCallback((text: string) => {
    setCommentText(text);
  }, []);

  const handleComment = useCallback(async (postId: number | string, text: string) => {
    if (!isUserLoggedIn || !currentUser) {
      showToast('error', 'Please sign in to continue.');
      return;
    }
  
    if (!text.trim()) return;
    
    // 중복 호출 방지
    if (isSubmitting) return;
    
    const id = String(postId);
    const commentTextToSubmit = text.trim();
    
    const userDisplayName = currentUser.name || currentUser.username || 'User';
    
    const newComment: Comment = {
      id: `temp-${Date.now()}`,
      text: commentTextToSubmit,
      author: userDisplayName,
      userName: userDisplayName,
      userId: currentUser.id,
      imageId: id,
      createdAt: new Date().toISOString()
    };

    const updatedComments = [newComment, ...(globalComments[id] || [])];
    
    globalComments[id] = updatedComments;
    setCommentsMap(prev => ({...prev, [id]: updatedComments}));
    
    try {
      // 통합된 API 호출 사용
      const result = await communityApi.addComment(id, currentUser.id, userDisplayName, commentTextToSubmit);
      
      if (!result.success) {
        const revertedComments = globalComments[id].filter(c => c.id !== newComment.id);
        globalComments[id] = revertedComments;
        setCommentsMap(prev => ({...prev, [id]: revertedComments}));
        showToast('error', 'Failed to add comment');
      } else if (result.data) {
        // 서버에서 반환된 댓글 ID로 업데이트
        const updatedWithServerData = globalComments[id].map(c => 
          c.id === newComment.id ? {...c, id: result.data.id} : c
        );
        globalComments[id] = updatedWithServerData;
        setCommentsMap(prev => ({...prev, [id]: updatedWithServerData}));
        // 성공 메시지 - UI 노출을 개선하기 위해 짧은 메시지 사용
        showToast('success', 'Comment added');
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
      
      const revertedComments = globalComments[id].filter(c => c.id !== newComment.id);
      globalComments[id] = revertedComments;
      setCommentsMap(prev => ({...prev, [id]: revertedComments}));
      showToast('error', 'An error occurred while adding comment');
    }
  }, [currentUser, isUserLoggedIn, showToast, isSubmitting]);

  const submitComment = useCallback(() => {
    if (selectedPostId && commentText.trim() && !isSubmitting) {
      setIsSubmitting(true);
      handleComment(selectedPostId, commentText)
        .finally(() => {
          setIsSubmitting(false);
          setCommentText('');
        });
    }
  }, [selectedPostId, commentText, isSubmitting, handleComment]);

  const deleteComment = useCallback(async (postId: number | string, commentId: number | string) => {
    if (!isUserLoggedIn || !currentUser) {
      showToast('error', 'Please sign in to continue.');
      return;
    }
    
    const id = String(postId);
    const cId = String(commentId);
    
    console.log(`[DELETE] Starting comment deletion process`);
    console.log(`[DELETE] Post ID: ${id}, Comment ID: ${cId}`);
    
    // First update UI immediately for better user experience
    const previousComments = [...(globalComments[id] || [])];
    const updatedComments = previousComments.filter(comment => 
      String(comment.id) !== String(cId)
    );
    
    // Update UI immediately
    globalComments[id] = updatedComments;
    setCommentsMap(prev => ({...prev, [id]: updatedComments}));
    
    try {
      console.log(`[DELETE] Calling API`);
      
      const result = await communityApi.deleteComment(id, cId, currentUser.id);
      console.log(`[DELETE] API response:`, result);
      
      if (result.success) {
        showToast('success', 'Comment deleted successfully');
      } else {
        // If API fails, revert UI changes
        console.error(`[DELETE] Failed:`, result.error);
        globalComments[id] = previousComments;
        setCommentsMap(prev => ({...prev, [id]: previousComments}));
        showToast('error', `Failed to delete comment: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      // If error occurs, revert UI changes
      console.error(`[DELETE] Error:`, error);
      globalComments[id] = previousComments;
      setCommentsMap(prev => ({...prev, [id]: previousComments}));
      showToast('error', 'An error occurred while deleting comment');
    }
  }, [currentUser, isUserLoggedIn, showToast]);

  return {
    commentsMap,
    handleComment,
    deleteComment,
    isCommentModalOpen,
    openCommentModal,
    closeCommentModal,
    commentText,
    handleCommentTextChange,
    submitComment,
    selectedPostId
  };
}; 