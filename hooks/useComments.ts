import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost, Comment } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';

// 전역 상태로 관리하되, 페이지 별로 독립적인 댓글 데이터를 유지하기 위한 맵
// 첫번째 키: 페이지 식별자, 두번째 키: postId
const globalCommentsMap: Record<string, Record<string, Comment[]>> = {
  'community': {},
  'main': {},
  'post': {}
};

// 토스트 중복 방지를 위한 전역 플래그
let isToastInProgress = false;

interface CurrentUser {
  id: string;
  name: string;
  username?: string;
  imageUrl?: string;
}

/**
 * 댓글 관리 훅
 * @param initialPosts 초기 포스트 데이터
 * @param currentUser 현재 사용자 정보
 * @param pageType 페이지 유형 (각 페이지별로 독립적인 댓글 상태 유지)
 */
export const useComments = (
  initialPosts: CommunityPost[] = [], 
  currentUser?: CurrentUser,
  pageType: 'community' | 'main' | 'post' = 'community' // 기본값은 community
) => {
  const [commentsMap, setCommentsMap] = useState<{ [postId: string]: Comment[] }>({});
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const postsRef = useRef<CommunityPost[]>([]);
  const isInitializedRef = useRef(false);
  // 토스트 중복 방지 용도
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  // 디버그 모드 완전 비활성화
  const debugRef = useRef<boolean>(false);
  // 현재 페이지 타입 참조 (언마운트 시에도 사용)
  const pageTypeRef = useRef(pageType);

  // 사용자 로그인 여부 확인
  const isUserLoggedIn = !!currentUser?.id;
  
  // 페이지 타입이 변경되면 참조 업데이트
  useEffect(() => {
    pageTypeRef.current = pageType;
  }, [pageType]);

  // 현재 페이지 타입에 해당하는 글로벌 댓글 맵 getter/setter
  const getGlobalComments = useCallback(() => {
    return globalCommentsMap[pageTypeRef.current] || {};
  }, []);
  
  const setGlobalComment = useCallback((postId: string, comments: Comment[]) => {
    // 현재 페이지 타입에 해당하는 맵이 없으면 생성
    if (!globalCommentsMap[pageTypeRef.current]) {
      globalCommentsMap[pageTypeRef.current] = {};
    }
    globalCommentsMap[pageTypeRef.current][postId] = comments;
  }, []);

  // 초기 마운트 시에만 실행되는 useEffect
  useEffect(() => {
    // 이전 포스트와 현재 포스트가 다른지 확인
    const hasNewPosts = initialPosts.length > 0 && postsRef.current !== initialPosts;
    
    if (hasNewPosts) {
      // 참조 업데이트만 하고 실제 데이터 처리는 다른 useEffect에서
      postsRef.current = initialPosts;
    }
    
    // 초기화되지 않은 경우에만 댓글 맵 최초 설정
    if (!isInitializedRef.current && initialPosts.length > 0) {
      const newComments: { [postId: string]: Comment[] } = {};
      
      // 메모리 최적화를 위해 initialPosts 한 번만 순회
      initialPosts.forEach(post => {
        const id = String(post.id);
        const globalComments = getGlobalComments();
        
        // 이미 댓글 데이터가 있는 경우 (메모리 재사용)
        if (id in globalComments) {
          newComments[id] = globalComments[id];
        } 
        // 초기 데이터에서 댓글 정보 로드
        else if (post.comments && Array.isArray(post.comments)) {
          // 댓글 데이터 유효성 확인
          const validComments = post.comments.filter(c => c && typeof c === 'object');
          
          // 댓글이 많은 경우만 정렬 (성능 최적화)
          const sortedComments = validComments.length > 0 ? 
            [...validComments].sort((a, b) => {
              try {
                const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                
                return (dateB.getTime() || 0) - (dateA.getTime() || 0);
              } catch {
                return 0;
              }
            }).map(comment => {
              // content와 text 필드 간 호환성 처리
              const result = { ...comment };
              if (result.content && !result.text) {
                result.text = result.content;
              } else if (result.text && !result.content) {
                result.content = result.text;
              }
              return result;
            }) : 
            validComments;
          
          // 정렬된 댓글 저장 및 전역 상태 업데이트
          newComments[id] = sortedComments;
          setGlobalComment(id, sortedComments);
        }
        // 댓글 정보가 없는 경우 빈 배열로 초기화
        else {
          newComments[id] = [];
          setGlobalComment(id, []);
        }
      });

      // 한 번만 상태 업데이트
      setCommentsMap(newComments);
      isInitializedRef.current = true;
    }
    
    // 댓글 동기화 이벤트 리스너 추가
    const handleCommentSync = (event: Event) => {
      const customEvent = event as CustomEvent<{ postId: string; comments: Comment[]; pageType?: string }>;
      const { postId, comments, pageType: eventPageType } = customEvent.detail;
      
      // 페이지 타입이 지정되었고 현재 페이지와 다른 경우 무시
      if (eventPageType && eventPageType !== pageTypeRef.current) {
        return;
      }
      
      if (postId && Array.isArray(comments)) {
        // 전역 상태 업데이트
        setGlobalComment(postId, comments);
        // 로컬 상태 업데이트
        setCommentsMap(prev => ({...prev, [postId]: comments}));
      }
    };
    
    document.addEventListener('sync-comments', handleCommentSync);
    
    // 컴포넌트 언마운트 시 토스트 타이머 정리
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      document.removeEventListener('sync-comments', handleCommentSync);
    };
  }, [getGlobalComments, setGlobalComment]);

  // 추가: 새로운 posts가 들어왔을 때 댓글 초기화를 별도 useEffect로 분리
  useEffect(() => {
    // initialPosts가 비어있으면 아무 작업도 수행하지 않음
    if (!initialPosts.length) return;
    
    // 초기화가 완료된 경우에만 실행 (첫 실행은 첫 번째 useEffect에서 처리)
    if (isInitializedRef.current) {
      // 새 포스트만 처리하도록 최적화
      let hasNewPostsToUpdate = false;
      const globalComments = getGlobalComments();
      const postsToProcess = initialPosts.filter(post => {
        const id = String(post.id);
        return !(id in globalComments) && post.comments && Array.isArray(post.comments);
      });
      
      if (!postsToProcess.length) return;
      
      // 상태 업데이트를 위한 객체 준비
      const newCommentUpdates: { [postId: string]: Comment[] } = {};
      
      postsToProcess.forEach(post => {
        const id = String(post.id);
        
        // 댓글 정보가 있는 경우만 처리
        if (post.comments && Array.isArray(post.comments)) {
          const validComments = post.comments.filter(c => c && typeof c === 'object');
          
          // 댓글 정렬 및 필드 정규화
          const processedComments = validComments.map(comment => {
            const result = { ...comment };
            // content와 text 필드 간 호환성 처리
            if (result.content && !result.text) {
              result.text = result.content;
            } else if (result.text && !result.content) {
              result.content = result.text;
            }
            return result;
          });
          
          // 전역 상태에 추가
          setGlobalComment(id, processedComments);
          newCommentUpdates[id] = processedComments;
          hasNewPostsToUpdate = true;
        }
      });
      
      // 업데이트할 내용이 있을 때만 상태 업데이트 수행
      if (hasNewPostsToUpdate) {
        setCommentsMap(prev => ({...prev, ...newCommentUpdates}));
      }
    }
  }, [initialPosts, getGlobalComments, setGlobalComment]);

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
      showToast('error', 'Login required to add a comment');
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
      showToast('error', 'Login required to add a comment');
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
      content: commentTextToSubmit,
      author: userDisplayName,
      userName: userDisplayName,
      userId: currentUser.id,
      imageId: id,
      createdAt: new Date().toISOString()
    };

    // 현재 글로벌 댓글 목록 가져오기
    const globalComments = getGlobalComments();
    
    // 기존 댓글 배열이 없을 수 있으므로 빈 배열로 초기화
    if (!globalComments[id]) {
      setGlobalComment(id, []);
    }

    const updatedComments = [newComment, ...(globalComments[id] || [])];
    
    // 전역 상태 및 로컬 상태 모두 업데이트 (낙관적 UI 업데이트)
    setGlobalComment(id, updatedComments);
    setCommentsMap(prev => ({...prev, [id]: updatedComments}));
    
    // 토스트 표시 - 추가 중 상태 표시
    showToast('success', 'Adding comment...');
    
    try {
      setIsSubmitting(true);
      
      // FormData 생성 및 설정
      const formData = new FormData();
      formData.append('imageId', id);
      formData.append('userId', currentUser.id);
      formData.append('userName', userDisplayName);
      formData.append('text', commentTextToSubmit);
      
      // 디버그 모드에서만 로그 출력
      if (debugRef.current) {
        console.log('댓글 요청 데이터:', {
          imageId: id,
          userId: currentUser.id,
          userName: userDisplayName,
          text: commentTextToSubmit.length > 20 ? commentTextToSubmit.substring(0, 20) + '...' : commentTextToSubmit
        });
      }
      
      // 직접 fetch 호출로 formData 전송
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          // FormData는 자동으로 Content-Type: multipart/form-data로 설정됩니다
          // 명시적인 헤더 설정이 필요하지 않습니다
        },
        body: formData
      });
      
      const result = await response.json();
      
      // 디버그 모드에서만 로그 출력
      if (debugRef.current) {
        console.log('댓글 응답 데이터:', result);
      }
      
      if (!response.ok || !result.success) {
        // 요청이 실패하면 상태 롤백
        const globalComments = getGlobalComments();
        const revertedComments = globalComments[id].filter(c => c.id !== newComment.id);
        setGlobalComment(id, revertedComments);
        setCommentsMap(prev => ({...prev, [id]: revertedComments}));
        
        throw new Error(result.error || 'Failed to add comment');
      }
      
      // 응답 데이터 확인 및 처리
      const commentData = result.data && result.data.length > 0 ? result.data[0] : {};
      
      // 임시 댓글을 서버에서 반환한 실제 댓글로 업데이트
      const globalComments = getGlobalComments();
      const updatedWithServerData = globalComments[id].map(c => 
        c.id === newComment.id ? {
          ...c,
          id: commentData.id || result.id || c.id,
          text: commentData.text || commentData.content || c.text,
          content: commentData.text || commentData.content || c.content,
          author: commentData.author || commentData.userName || c.author,
          userName: commentData.userName || commentData.author || c.userName,
          createdAt: commentData.createdAt || commentData.created_at || c.createdAt
        } : c
      );
      
      // 전역 상태 및 로컬 상태 모두 업데이트
      setGlobalComment(id, updatedWithServerData);
      
      // 한번에 업데이트해서 불필요한 리렌더링 방지
      setCommentsMap(prev => {
        // 이미 다른 코드에서 업데이트했다면 중복 업데이트 방지
        if (JSON.stringify(prev[id]) === JSON.stringify(updatedWithServerData)) {
          return prev;
        }
        return {...prev, [id]: updatedWithServerData};
      });
      
      // 성공 메시지
      showToast('success', 'Comment added successfully');
      
      return commentData; // 성공 시 댓글 데이터 반환
    } catch (error) {
      if (debugRef.current) {
        console.error('Error adding comment:', error);
      }
      showToast('error', error instanceof Error ? error.message : 'Failed to add comment');
      
      // 에러 발생 시 롤백 (이미 위에서 처리했으므로 여기서는 추가 처리 불필요)
      throw error; // 에러를 다시 throw하여 호출자가 처리할 수 있게 함
    } finally {
      setIsSubmitting(false);
    }
  }, [currentUser, isUserLoggedIn, showToast, isSubmitting, getGlobalComments, setGlobalComment]);

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
      showToast('error', 'Login required to delete a comment');
      return;
    }
    
    const id = String(postId);
    const cid = String(commentId);
    
    const globalComments = getGlobalComments();
    if (!globalComments[id]) return;
    
    try {
      // 낙관적 UI 업데이트를 위해 댓글 미리 제거
      const previousComments = [...globalComments[id]];
      const updatedComments = globalComments[id].filter(c => String(c.id) !== cid);
      
      // 전역 상태 및 로컬 상태 모두 업데이트
      setGlobalComment(id, updatedComments);
      setCommentsMap(prev => ({...prev, [id]: updatedComments}));
      
      // 삭제 중 토스트 메시지
      showToast('success', 'Deleting comment...');
      
      // FormData 생성 및 설정
      const formData = new FormData();
      formData.append('commentId', cid);
      
      // API 호출
      const response = await fetch(`/api/comments/${cid}`, {
        method: 'DELETE',
      });
      
      let result;
      try {
        result = await response.json();
        if (debugRef.current) {
          console.log('댓글 삭제 응답:', result);
        }
      } catch (e) {
        // JSON 파싱 오류 처리
        if (response.ok) {
          // 응답은 성공이지만 JSON이 아닌 경우
          result = { success: true };
        } else {
          throw new Error('Failed to parse response');
        }
      }
      
      if (!response.ok || (result && !result.success)) {
        // 삭제 실패 시 원래 상태로 복원
        setGlobalComment(id, previousComments);
        setCommentsMap(prev => ({...prev, [id]: previousComments}));
        
        throw new Error((result && result.error) || 'Failed to delete comment');
      }
      
      // 상태는 이미 업데이트되었으므로 추가 업데이트 필요 없음
      showToast('success', 'Comment deleted successfully');
      
      return true;
    } catch (error) {
      if (debugRef.current) {
        console.error('Error deleting comment:', error);
      }
      showToast('error', error instanceof Error ? error.message : 'Failed to delete comment');
      
      // 에러 발생 시 추가 처리는 이미 try 블록에서 함
      return false;
    }
  }, [currentUser, isUserLoggedIn, showToast, getGlobalComments, setGlobalComment]);

  // 댓글 목록 강제 새로고침 (필요한 경우 외부에서 호출)
  const refreshComments = useCallback(async (postId: string) => {
    try {
      const response = await communityApi.loadCommentsForImage(postId);
      if (response.success && response.data) {
        const comments = response.data;
        setGlobalComment(postId, comments);
        setCommentsMap(prev => ({...prev, [postId]: comments}));
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }, [setGlobalComment]);

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
    selectedPostId,
    refreshComments
  };
}; 