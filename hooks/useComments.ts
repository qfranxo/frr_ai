import { useState, useCallback, useEffect, useRef } from 'react';
import { CommunityPost, Comment } from '@/types/post';
import { toast } from 'sonner';
import { communityApi } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { logManager } from '@/lib/logger/LogManager';

// 전역 상태로 관리 (페이지 새로고침 사이에는 초기화됨)
let globalComments: { [postId: string]: Comment[] } = {};
// 토스트 중복 방지를 위한 전역 플래그
let isToastInProgress = false;
// 마지막 API 요청 시간 저장
let lastFetchTimes: { [postId: string]: number } = {};
// 전역 요청 타임스탬프 - 중복 요청 방지용
let globalLastFetchTime = 0;

// 로컬 스토리지 헬퍼 함수들
const localStorageHelpers = {
  getComments: (): { [postId: string]: Comment[] } => {
    if (typeof window === 'undefined') return {};
    try {
      const saved = localStorage.getItem('frr_comments_cache');
      return saved ? JSON.parse(saved) : {};
    } catch (error) {
      logManager.error('로컬 스토리지에서 댓글 로드 오류', { 
        module: 'comments',
        data: error 
      });
      return {};
    }
  },
  
  saveComments: (comments: { [postId: string]: Comment[] }) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('frr_comments_cache', JSON.stringify(comments));
    } catch (error) {
      logManager.error('로컬 스토리지에 댓글 저장 오류', { 
        module: 'comments',
        data: error 
      });
    }
  },
  
  savePostComments: (postId: string, comments: Comment[]) => {
    if (typeof window === 'undefined') return;
    try {
      const allComments = localStorageHelpers.getComments();
      allComments[postId] = comments;
      localStorage.setItem('frr_comments_cache', JSON.stringify(allComments));
    } catch (error) {
      logManager.error(`로컬 스토리지에 게시물 댓글 저장 오류: ${postId}`, { 
        module: 'comments',
        data: error 
      });
    }
  }
};

// 초기에 로컬 스토리지에서 댓글 불러오기
if (typeof window !== 'undefined') {
  try {
    const savedComments = localStorageHelpers.getComments();
    if (savedComments && Object.keys(savedComments).length > 0) {
      globalComments = savedComments;
      logManager.info(`로컬 스토리지에서 ${Object.keys(savedComments).length}개의 댓글 데이터 로드됨`, { 
        module: 'comments' 
      });
    }
  } catch (e) {
    logManager.error('로컬 스토리지 초기화 오류', { 
      module: 'comments',
      data: e 
    });
  }
}

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
  // 마지막 요청 시간 참조
  const lastFetchTimeRef = useRef<number>(0);

  // 사용자 로그인 여부 확인
  const isUserLoggedIn = !!currentUser?.id;
  
  // 모든 게시물의 댓글 정보를 한 번에 가져오는 함수
  const fetchCommentsData = useCallback(async (forceRefresh = false) => {
    if (!initialPosts || initialPosts.length === 0) return;
    
    // 30초 이내에 이미 전체 요청을 했으면 스킵 (강제 갱신 제외)
    const now = Date.now();
    if (!forceRefresh && now - globalLastFetchTime < 30000) {
      logManager.info('[댓글] 최근에 이미 조회했으므로 스킵 (30초 제한)', { 
        module: 'comments' 
      });
      return;
    }
    
    // 전역 및 로컬 타임스탬프 업데이트
    globalLastFetchTime = now;
    lastFetchTimeRef.current = now;
    
    logManager.info('[댓글] 모든 게시물 댓글 로딩 시작', { 
      module: 'comments' 
    });
    const newCommentsMap: { [postId: string]: Comment[] } = {};
    
    try {
      // 병렬 처리를 위한 요청 배열
      const fetchPromises = initialPosts.map(async (post) => {
        const postId = String(post.id);
        
        // 개별 포스트에 대해 30초 이내에 요청했으면 캐시된 값 사용 (강제 갱신 제외)
        if (!forceRefresh && postId in lastFetchTimes && now - lastFetchTimes[postId] < 30000) {
          return {
            postId,
            comments: globalComments[postId] || []
          };
        }
        
        try {
          const response = await fetch(`/api/comments?imageId=${postId}`);
          if (response.ok) {
            const data = await response.json();
            if (data.success && data.data) {
              // 타임스탬프 업데이트
              lastFetchTimes[postId] = now;
              
              // 유효한 댓글만 필터링 및 필드 매핑
              const validComments = Array.isArray(data.data) 
                ? data.data.filter((comment: any) => comment && typeof comment === 'object')
                    .map((comment: any) => ({
                      id: comment.id,
                      text: comment.content || comment.text || '', // content 필드를 text로 매핑
                      author: comment.userName || comment.author || 'Anonymous',
                      userName: comment.userName || comment.author || 'Anonymous',
                      userId: comment.userId || '',
                      imageId: comment.imageId || postId,
                      createdAt: comment.createdAt || new Date().toISOString()
                    }))
                : [];
              
              return {
                postId,
                comments: validComments
              };
            }
          }
        } catch (error) {
          logManager.error(`[댓글] 게시물 ${postId} 댓글 로드 오류:`, { 
            module: 'comments',
            data: error 
          });
        }
        
        // 요청 실패시 캐시된 값 반환
        return {
          postId,
          comments: globalComments[postId] || []
        };
      });
      
      // 모든 요청을 병렬로 처리
      const results = await Promise.all(fetchPromises);
      
      // 결과 처리
      results.forEach(({ postId, comments }) => {
        if (comments && Array.isArray(comments)) {
          newCommentsMap[postId] = comments;
          globalComments[postId] = comments;
          
          // 로컬 스토리지에 저장
          localStorageHelpers.savePostComments(postId, comments);
        }
      });
      
      setCommentsMap(prevMap => ({...prevMap, ...newCommentsMap}));
      logManager.info('[댓글] 모든 게시물 댓글 로딩 완료:', { 
        module: 'comments',
        data: Object.keys(newCommentsMap).length 
      });
    } catch (error) {
      logManager.error('[댓글] 댓글 데이터 로드 오류:', { 
        module: 'comments',
        data: error 
      });
    }
  }, [initialPosts]);

  // 구독 패턴 적용 - 초기 로드만 담당하도록 최적화
  useEffect(() => {
    if (initialPosts !== postsRef.current) {
      postsRef.current = initialPosts;
      
      const newComments: { [postId: string]: Comment[] } = {};
      
      // 로컬 스토리지에서 캐시된 댓글 먼저 확인
      const localStorageComments = localStorageHelpers.getComments();

      for (const post of initialPosts) {
        const id = String(post.id);
        
        // 우선순위: 1) 전역 변수 캐시, 2) 로컬 스토리지 캐시, 3) 초기 props
        if (id in globalComments) {
          newComments[id] = globalComments[id];
        } else if (id in localStorageComments) {
          newComments[id] = localStorageComments[id];
          globalComments[id] = localStorageComments[id];
        } else {
          const sortedComments = [...(post.comments || [])].sort((a, b) => {
            try {
              const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
              const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
              
              const timeA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
              const timeB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
              
              return timeB - timeA;
            } catch (error) {
              logManager.error('댓글 정렬 오류:', { 
                module: 'comments',
                data: error 
              });
              return 0;
            }
          });
          
          newComments[id] = sortedComments;
          globalComments[id] = sortedComments;
          
          // 로컬 스토리지에 저장
          if (sortedComments.length > 0) {
            localStorageHelpers.savePostComments(id, sortedComments);
          }
        }
      }

      setCommentsMap(newComments);
      isInitializedRef.current = true;
      
      // 새로고침 후의 첫 로드인 경우를 감지해서 항상 서버에서 최신 데이터 가져오기
      const isFirstLoadAfterRefresh = typeof window !== 'undefined' && 
                                     !sessionStorage.getItem('comments_initialized');
      
      if (isFirstLoadAfterRefresh) {
        // 첫 로드 플래그 설정
        sessionStorage.setItem('comments_initialized', 'true');
        // 강제로 서버에서 최신 댓글 가져오기
        fetchCommentsData(true);
      } else {
        // 일반적인 경우 (페이지 이동 등) - 캐시된 데이터가 많으면 새로 요청하지 않음
        const cachedCount = Object.keys(newComments).length;
        const totalCount = initialPosts.length;
        
        if (cachedCount < totalCount * 0.5) { // 50% 미만일 때만 요청
          fetchCommentsData(false);
        }
      }
    }
    
    // 컴포넌트 언마운트 시 토스트 타이머 정리
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [initialPosts, fetchCommentsData]);
  
  // 사용자 정보가 변경되는 경우 불필요한 요청 방지
  // 초기화되고 currentUser가 있는 경우만 실행
  useEffect(() => {
    if (isInitializedRef.current && currentUser?.id) {
      const now = Date.now();
      // 마지막 요청으로부터 1분 이상 지난 경우에만 실행
      if (now - lastFetchTimeRef.current > 60000) { // 1분 제한
        lastFetchTimeRef.current = now;
        fetchCommentsData(false);
      } else {
        logManager.info('[댓글] 최근에 이미 조회했으므로 스킵 (60초 제한)', { 
          module: 'comments' 
        });
      }
    }
  }, [currentUser?.id, fetchCommentsData]);

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
    
    // 로컬 스토리지에 저장
    localStorageHelpers.savePostComments(id, updatedComments);
    
    try {
      // API 호출 - 토큰 관련 코드 제거
      const result = await communityApi.addComment(id, commentTextToSubmit, userDisplayName);
      
      if (!result.success) {
        const revertedComments = globalComments[id].filter(c => c.id !== newComment.id);
        globalComments[id] = revertedComments;
        setCommentsMap(prev => ({...prev, [id]: revertedComments}));
        
        // 로컬 스토리지에 저장
        localStorageHelpers.savePostComments(id, revertedComments);
        
        showToast('error', 'Failed to add comment');
      } else if (result.data) {
        // 서버에서 반환된 댓글 ID로 업데이트
        // content 필드를 text 필드로 매핑
        const serverData = {
          ...result.data,
          text: result.data.text || result.data.content || commentTextToSubmit // text 필드 보장
        };
        
        const updatedWithServerData = globalComments[id].map(c => 
          c.id === newComment.id ? {...c, id: serverData.id, text: serverData.text} : c
        );
        globalComments[id] = updatedWithServerData;
        setCommentsMap(prev => ({...prev, [id]: updatedWithServerData}));
        
        // 로컬 스토리지에 저장
        localStorageHelpers.savePostComments(id, updatedWithServerData);
        
        // 성공 메시지 - UI 노출을 개선하기 위해 짧은 메시지 사용
        showToast('success', 'Comment added');
      }
    } catch (error) {
      logManager.error('Error submitting comment:', { 
        module: 'comments',
        data: error 
      });
      
      const revertedComments = globalComments[id].filter(c => c.id !== newComment.id);
      globalComments[id] = revertedComments;
      setCommentsMap(prev => ({...prev, [id]: revertedComments}));
      
      // 로컬 스토리지에 저장
      localStorageHelpers.savePostComments(id, revertedComments);
      
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
    
    logManager.info(`[DELETE] Starting comment deletion process`, { 
      module: 'comments' 
    });
    logManager.info(`[DELETE] Post ID: ${id}, Comment ID: ${cId}`, { 
      module: 'comments' 
    });
    
    // First update UI immediately for better user experience
    const previousComments = [...(globalComments[id] || [])];
    const updatedComments = previousComments.filter(comment => 
      String(comment.id) !== String(cId)
    );
    
    // Update UI immediately
    globalComments[id] = updatedComments;
    setCommentsMap(prev => ({...prev, [id]: updatedComments}));
    
    // 로컬 스토리지에 저장
    localStorageHelpers.savePostComments(id, updatedComments);
    
    try {
      logManager.info(`[DELETE] Calling API`, { 
        module: 'comments' 
      });
      
      // 토큰 없이 API 호출
      const result = await communityApi.deleteComment(id, cId, currentUser.id);
      logManager.info(`[DELETE] API response:`, { 
        module: 'comments',
        data: result 
      });
      
      if (result.success) {
        showToast('success', 'Comment deleted successfully');
      } else {
        // If API fails, revert UI changes
        logManager.error(`[DELETE] Failed:`, { 
          module: 'comments',
          data: result.error 
        });
        globalComments[id] = previousComments;
        setCommentsMap(prev => ({...prev, [id]: previousComments}));
        
        // 로컬 스토리지에 저장
        localStorageHelpers.savePostComments(id, previousComments);
        
        showToast('error', `Failed to delete comment: ${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      // If error occurs, revert UI changes
      logManager.error(`[DELETE] Error:`, { 
        module: 'comments',
        data: error 
      });
      globalComments[id] = previousComments;
      setCommentsMap(prev => ({...prev, [id]: previousComments}));
      
      // 로컬 스토리지에 저장
      localStorageHelpers.savePostComments(id, previousComments);
      
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