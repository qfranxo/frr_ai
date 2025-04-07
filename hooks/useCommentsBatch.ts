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
        },
        body: JSON.stringify({ imageIds: limitedIds }),
      });

      if (!response.ok) {
        throw new Error(`댓글 가져오기 실패: ${response.status}`);
      }

      const result: CommentResponse = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || '댓글 가져오기 실패');
      }
      
      return result.data;
    },
    enabled,
    staleTime: 30000, // 30초
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
      // 성공 시 관련 쿼리 무효화
      queryClient.invalidateQueries({ 
        queryKey: ['comments', 'batch'],
        // 특정 이미지 ID가 포함된 모든 쿼리 무효화 
        predicate: (query) => 
          query.queryKey.includes(variables.imageId)
      });
      
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
                ...oldData[imageIdKey],
                data.data // 새 댓글 데이터
              ]
            };
          }
          
          return oldData;
        }
      );
    },
  });
} 