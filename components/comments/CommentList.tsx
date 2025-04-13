import { useState } from 'react'
import CommentInput from '../CommentInput'
import { useQuery } from '@tanstack/react-query'
import { useAddComment } from '@/hooks/useCommentsBatch'
import { useQueryClient } from '@tanstack/react-query'

interface Comment {
  id: string
  content: string
  createdAt: Date
  userId: string
  postId: string
  userName?: string
}

interface CommentListProps {
  imageId: string
  comments?: Comment[] // 외부에서 이미 받아온 댓글이 있는 경우 사용
  onCommentPosted?: () => void // 댓글 추가 후 호출될 콜백
}

export function CommentList({ imageId, comments: initialComments, onCommentPosted }: CommentListProps) {
  // React Query 클라이언트 인스턴스 가져오기
  const queryClient = useQueryClient();
  
  // React Query로 댓글 가져오기 (initialComments가 없는 경우에만)
  const { 
    data: commentsData, 
    isLoading, 
    error: queryError,
    refetch
  } = useQuery({
    queryKey: ['comments', 'single', imageId],
    queryFn: async () => {
      const res = await fetch(`/api/comments?imageId=${imageId}`);
      if (!res.ok) {
        throw new Error(`에러 ${res.status}: ${res.statusText}`);
      }
      const json = await res.json();
      
      if (!json.success) {
        throw new Error(json.error || '댓글을 불러오지 못했습니다.');
      }
      
      return json.data || [];
    },
    enabled: !initialComments && !!imageId, // initialComments가 없고 imageId가 유효한 경우에만 실행
    staleTime: 0, // 이전 30초에서 0으로 변경하여 항상 새로운 데이터 요청
    refetchOnMount: true, // 컴포넌트 마운트 시 항상 다시 가져오기
    refetchOnWindowFocus: true, // 윈도우에 포커스가 돌아올 때 다시 가져오기
    gcTime: 5 * 60 * 1000, // 5분 동안 가비지 컬렉션 방지
  });
  
  // 댓글 추가 mutation
  const addComment = useAddComment();

  // 표시할 댓글 - 초기 댓글이 있으면 그것을 사용, 없으면 쿼리 결과 사용
  const comments = initialComments || commentsData || [];
  
  // 댓글 추가 함수
  const handleAddComment = async (text: string) => {
    if (!text.trim() || !imageId) return;
    
    try {
      const user = {
        id: 'current-user', // 실제 사용자 ID로 대체
        name: '사용자', // 실제 사용자 이름으로 대체
      };
      
      // 낙관적 UI 업데이트를 위한 임시 댓글 생성
      const tempComment = {
        id: `temp-${Date.now()}`,
        content: text,
        createdAt: new Date(),
        userId: user.id,
        postId: imageId,
        userName: user.name
      };

      // 먼저 UI를 낙관적으로 업데이트 (기존 캐시된 데이터에 직접 추가)
      const queryKey = ['comments', 'single', imageId];
      const previousData = queryClient.getQueryData<Comment[]>(queryKey) || [];
      queryClient.setQueryData(queryKey, [tempComment, ...previousData]);
      
      // API 호출
      await addComment.mutateAsync({
        imageId,
        userId: user.id,
        userName: user.name,
        text
      });
      
      // 로컬 스토리지에도 댓글 즉시 저장 (다른 탭이나 새로고침에도 유지)
      if (typeof localStorage !== 'undefined') {
        try {
          const cacheKey = `comments_${imageId}`;
          const existingComments = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          localStorage.setItem(cacheKey, JSON.stringify([tempComment, ...existingComments]));
          localStorage.setItem(`comments_timestamp_${imageId}`, Date.now().toString());
        } catch (e) {
          console.error('캐시 저장 실패:', e);
        }
      }
      
      // 댓글 다시 불러오기 (백그라운드에서)
      setTimeout(() => {
        refetch();
      }, 100);
      
      // 콜백 실행
      if (onCommentPosted) {
        onCommentPosted();
      }
    } catch (err) {
      console.error('댓글 추가 오류:', err);
      // 오류 발생 시 낙관적 업데이트 롤백
      refetch();
    }
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 mt-2">
        댓글을 불러오는 중...
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="text-sm text-red-500 mt-2">
        {queryError instanceof Error ? queryError.message : '댓글을 불러오지 못했습니다.'}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <ul className="space-y-2">
        {comments.length > 0 ? (
          comments.map((comment: Comment) => (
            <li 
              key={comment.id}
              className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <span className="text-gray-400">💬</span>
              <div className="flex flex-col">
                {comment.userName && (
                  <span className="text-xs font-medium text-gray-500">{comment.userName}</span>
                )}
                <span className="text-sm text-gray-700">{comment.content}</span>
              </div>
            </li>
          ))
        ) : (
          <li className="text-sm text-gray-500">아직 댓글이 없습니다</li>
        )}
      </ul>
      <CommentInput imageId={imageId} onCommentPosted={() => refetch()} />
    </div>
  )
} 