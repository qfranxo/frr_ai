import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface Comment {
  id: string
  imageId: string
  userId: string
  userName?: string
  content: string
  createdAt: string
}

interface CommentResponse {
  success: boolean
  data: Record<string, Comment[]>
  error?: string
}

/**
 * 여러 이미지의 댓글을 한 번에 가져오는 React Query 훅
 * @param imageIds 댓글을 가져올 이미지 ID 배열
 * @param options 추가 옵션 (enabled 등)
 */
export function useCommentsBatch(imageIds: string[], options: { enabled?: boolean } = {}) {
  const queryKey = ['comments', 'batch', ...imageIds.sort()];
  const { enabled = true } = options;

  return useQuery({
    queryKey,
    queryFn: async (): Promise<Record<string, Comment[]>> => {
      // 이미지 ID가 없으면 빈 객체 반환
      if (!imageIds.length) return {};

      // 최대 50개 이미지로 제한 (필요한 경우 청크로 나눌 수 있음)
      const limitedIds = imageIds.slice(0, 50);
      
      const response = await fetch('/api/comments/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ imageIds: limitedIds }),
        cache: 'no-store'
      });

      if (!response.ok) {
        throw new Error(`댓글 가져오기 실패: ${response.status}`);
      }

      const result: CommentResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '댓글 가져오기 실패');
      }
      
      // localStorage에 저장
      if (typeof localStorage !== 'undefined') {
        for (const [imageId, comments] of Object.entries(result.data)) {
          localStorage.setItem(`comments_${imageId}`, JSON.stringify(comments));
          localStorage.setItem(`comments_timestamp_${imageId}`, Date.now().toString());
        }
      }
      
      return result.data;
    },
    enabled,
    staleTime: 0, // 이전 30초에서 0으로 변경 - 항상 새로운 데이터 요청
    refetchOnMount: true, // 컴포넌트 마운트 시 항상 다시 가져오기 
    refetchOnWindowFocus: true, // 윈도우에 포커스가 돌아올 때 다시 가져오기
    gcTime: 5 * 60 * 1000, // 5분 동안 가비지 컬렉션 방지
  });
}

/**
 * 댓글 추가 Mutation 훅
 */
export function useAddComment() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      imageId, 
      text, 
      userId, 
      userName 
    }: { 
      imageId: string; 
      text: string; 
      userId: string; 
      userName?: string 
    }) => {
      const formData = new FormData();
      formData.append("imageId", imageId);
      formData.append("userId", userId);
      formData.append("text", text);
      if (userName) formData.append("userName", userName);
      
      const response = await fetch("/api/comments", {
        method: "POST",
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`댓글 추가 실패: ${response.status}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables) => {
      // 새 댓글 데이터
      const newComment = data.data && data.data.length ? data.data[0] : 
                        (data.data || { 
                          id: `${Date.now()}`, 
                          imageId: variables.imageId,
                          userId: variables.userId,
                          userName: variables.userName || 'User',
                          content: variables.text,
                          createdAt: new Date().toISOString()
                        });
      
      // 로컬 스토리지에 즉시 저장
      if (typeof localStorage !== 'undefined') {
        try {
          const cacheKey = `comments_${variables.imageId}`;
          const existingComments = JSON.parse(localStorage.getItem(cacheKey) || '[]');
          localStorage.setItem(cacheKey, JSON.stringify([newComment, ...existingComments]));
          localStorage.setItem(`comments_timestamp_${variables.imageId}`, Date.now().toString());
        } catch (e) {
          console.error('캐시 저장 실패:', e);
        }
      }
      
      // 단일 이미지 댓글 쿼리도 함께 업데이트
      queryClient.setQueryData(
        ['comments', 'single', variables.imageId],
        (oldData: any) => {
          const comments = oldData || [];
          if (Array.isArray(comments)) {
            return [newComment, ...comments];
          }
          return [newComment];
        }
      );
      
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments', 'batch'],
        // 특정 이미지 ID가 포함된 모든 쿼리 무효화 
        predicate: (query) => 
          query.queryKey.includes(variables.imageId)
      });
      
      // 다른 모든 쿼리도 무효화하지만 낙관적 업데이트가 반영될 수 있도록 미세한 지연 추가
      setTimeout(() => {
        queryClient.invalidateQueries({ 
          queryKey: ['comments']
        });
      }, 50);
      
      // 낙관적 업데이트를 위해 캐시된 데이터 직접 갱신
      queryClient.setQueriesData(
        { queryKey: ['comments', 'batch'] },
        (oldData: any) => {
          if (!oldData) return oldData;
          
          // 이미지 ID별 댓글 데이터 찾기
          const imageIdKey = Object.keys(oldData).find(
            key => key === variables.imageId
          );
          
          if (imageIdKey) {
            return {
              ...oldData,
              [imageIdKey]: [
                newComment,
                ...oldData[imageIdKey]
              ]
            };
          }
          
          return oldData;
        }
      );
    },
  });
} 