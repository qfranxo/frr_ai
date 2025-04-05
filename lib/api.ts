import { toast } from 'sonner';
import { logManager } from '@/lib/logger/LogManager';

// API 상대 경로
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api';

// API 메소드 타입
type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

// 요청 시 추가할 수 있는 옵션
interface ApiOptions {
  method?: ApiMethod;
  body?: any;
  headers?: Record<string, string>;
  silentLog?: boolean; // 로그 출력을 원치 않을 경우
  showToast?: boolean; // 토스트 메시지 표시 여부
}

// HTTP 메소드에 따라 자동으로 옵션 구성
function createOptions(options: ApiOptions = {}): RequestInit {
  const { method = 'GET', body, headers = {} } = options;
  
  const defaultHeaders = {
    'Content-Type': 'application/json',
  };
  
  const requestOptions: RequestInit = {
    method,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: 'include',
  };
  
  if (body && method !== 'GET') {
    requestOptions.body = JSON.stringify(body);
  }
  
  return requestOptions;
}

// API 요청 함수
async function apiRequest<T = any>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const startTime = Date.now();
  const url = `${API_BASE}${endpoint}`;
  const requestOptions = createOptions(options);
  const { showToast = true } = options;
  
  // 요청 시작 로깅
  if (!options.silentLog) {
    logManager.info(`API 요청: ${options.method || 'GET'} ${endpoint}`, {
      module: 'api',
      data: options.body ? { body: options.body } : undefined
    });
  }
  
  try {
    const response = await fetch(url, requestOptions);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 응답 처리 로깅 (성능 포함)
    if (!options.silentLog) {
      logManager.info(`API 응답: ${response.status} ${endpoint} (${duration}ms)`, {
        module: 'api',
        data: { status: response.status, duration }
      });
    }
    
    // 응답이 JSON이 아닐 경우
    if (!response.headers.get('content-type')?.includes('application/json')) {
      if (!response.ok) {
        const errorMessage = `HTTP 오류: ${response.status}`;
        if (showToast) {
          toast.error(errorMessage);
        }
        throw new Error(errorMessage);
      }
      return (await response.text()) as any as T;
    }
    
    // 일반적인 JSON 응답 처리
    const data = await response.json();
    
    if (!response.ok) {
      const errorMessage = data.message || 'API 요청 실패';
      if (showToast) {
        toast.error(errorMessage);
      }
      
      if (!options.silentLog) {
        logManager.error(`API 에러: ${options.method || 'GET'} ${endpoint}`, {
          module: 'api',
          data: data
        });
      }
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!options.silentLog) {
      logManager.error(`API 예외: ${options.method || 'GET'} ${endpoint} (${duration}ms)`, {
        module: 'api',
        data: { error: error instanceof Error ? error.message : String(error), duration }
      });
    }
    
    throw error;
  }
}

// API 인터페이스
export const communityApi = {
  // 게시물 관련 API
  getPost: async (id: string) => {
    return apiRequest<any>(`/community?id=${id}`);
  },
  
  getPosts: async () => {
    return apiRequest<any[]>('/community');
  },
  
  deletePost: async (postId: string, userId: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}`, {
        method: 'DELETE',
        body: { userId }
      });
      const endTime = Date.now();
      
      logManager.info(`게시물 삭제 완료: ${postId}`, {
        module: 'core',
        data: { duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`게시물 삭제 실패: ${postId}`, {
        module: 'core',
        data: error
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
  
  // 댓글 관련 API
  getComments: async (postId: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}/comments`);
      const endTime = Date.now();
      
      logManager.info(`댓글 로드 완료: 게시물 ${postId}`, {
        module: 'comments',
        data: { count: result?.comments?.length || 0, duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`댓글 로드 실패: 게시물 ${postId}`, {
        module: 'comments',
        data: error
      });
      throw error;
    }
  },
  
  addComment: async (postId: string, text: string, author: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}/comments`, {
        method: 'POST',
        body: {
          text,
          content: text, // 백엔드가 content 필드를 기대
          author,
          userId: author,
        },
      });
      const endTime = Date.now();
      
      logManager.info(`댓글 추가 완료: 게시물 ${postId}`, {
        module: 'comments',
        data: { commentId: result?.commentId, duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`댓글 추가 실패: 게시물 ${postId}`, {
        module: 'comments',
        data: error
      });
      throw error;
    }
  },
  
  deleteComment: async (postId: string, commentId: string, userId: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
        body: { userId }
      });
      const endTime = Date.now();
      
      logManager.info(`댓글 삭제 완료: 게시물 ${postId}, 댓글 ${commentId}`, {
        module: 'comments',
        data: { duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`댓글 삭제 실패: 게시물 ${postId}, 댓글 ${commentId}`, {
        module: 'comments',
        data: error
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
  
  // 좋아요 관련 API
  likePost: async (postId: string, userId: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}/like`, {
        method: 'POST',
        body: { userId }
      });
      const endTime = Date.now();
      
      logManager.info(`좋아요 추가 완료: 게시물 ${postId}`, {
        module: 'likes',
        data: { duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`좋아요 추가 실패: 게시물 ${postId}`, {
        module: 'likes',
        data: error
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  },
  
  unlikePost: async (postId: string, userId: string) => {
    try {
      const startTime = Date.now();
      const result = await apiRequest<any>(`/community/posts/${postId}/unlike`, {
        method: 'POST',
        body: { userId }
      });
      const endTime = Date.now();
      
      logManager.info(`좋아요 취소 완료: 게시물 ${postId}`, {
        module: 'likes',
        data: { duration: endTime - startTime }
      });
      
      return result;
    } catch (error) {
      logManager.error(`좋아요 취소 실패: 게시물 ${postId}`, {
        module: 'likes',
        data: error
      });
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
};

// FormData를 사용한 API 함수들
export const formDataApi = {
  // 이미지 좋아요
  likeImage: async (imageId: string, userId: string) => {
    const formData = new FormData();
    formData.append("image_id", imageId);
    formData.append("user_id", userId);
    
    const response = await fetch("/api/likes", {
      method: "POST",
      body: formData
    });
    
    return response.json();
  },
  
  // 댓글 추가
  addComment: async (imageId: string, userId: string, userName: string, text: string) => {
    const formData = new FormData();
    formData.append("image_id", imageId);
    formData.append("user_id", userId);
    formData.append("user_name", userName);
    formData.append("text", text);
    
    const response = await fetch("/api/comments", {
      method: "POST",
      body: formData
    });
    
    return response.json();
  },
  
  // 댓글 삭제
  deleteComment: async (imageId: string, commentId: string, userId: string) => {
    const formData = new FormData();
    formData.append("image_id", imageId);
    formData.append("comment_id", commentId);
    formData.append("user_id", userId);
    
    const response = await fetch("/api/comments/delete", {
      method: "POST",
      body: formData
    });
    
    return response.json();
  },
  
  // 이미지 공유
  shareImage: async (imageData: Record<string, any>) => {
    const formData = new FormData();
    
    // 이미지 데이터의 각 필드를 FormData에 추가
    Object.entries(imageData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    const response = await fetch("/api/share", {
      method: "POST",
      body: formData
    });
    
    return response.json();
  }
}; 