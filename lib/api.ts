import { toast } from 'sonner';

type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type RequestCacheType = 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';

interface ApiOptions {
  method?: ApiMethod;
  body?: any;
  headers?: Record<string, string>;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  cache?: RequestCacheType;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  source?: string;
  message?: string;
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    showSuccessToast = false,
    showErrorToast = true,
    cache = 'default',
  } = options;

  try {
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      cache,
    };

    if (body) {
      requestOptions.body = JSON.stringify(body);
    }

    const response = await fetch(endpoint, requestOptions);
    const result = await response.json();

    if (!result.success && showErrorToast) {
      toast.error(result.error || 'An error occurred', {
        position: 'top-center',
        duration: 3000,
      });
    }

    if (result.success && showSuccessToast) {
      toast.success(result.message || 'Operation successful', {
        position: 'top-center',
        duration: 3000,
      });
    }

    return result;
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error);
    
    if (showErrorToast) {
      toast.error('Network or server error', {
        position: 'top-center',
        duration: 3000,
      });
    }
    
    return { success: false, error: 'Network or server error' };
  }
}

// 커뮤니티 API 래퍼 함수들
export const communityApi = {
  // 좋아요 토글
  toggleLike: (imageId: string, userId: string, isLiked: boolean, increment: number = 1) => {
    return apiRequest('/api/community', {
      method: 'POST',
      body: {
        action: 'like',
        imageId,
        userId,
        isLiked,
        increment: 1
      },
      cache: 'no-store'
    });
  },
  
  // 댓글 추가
  addComment: (imageId: string, userId: string, userName: string, text: string) => {
    return apiRequest('/api/community', {
      method: 'POST',
      body: {
        action: 'comment',
        imageId,
        userId,
        userName,
        author: userName,
        text
      },
      showSuccessToast: false
    });
  },
  
  // 댓글 삭제
  deleteComment: (imageId: string, commentId: string, userId: string) => {
    return apiRequest('/api/community', {
      method: 'POST',
      body: {
        action: 'deleteComment',
        imageId,
        commentId,
        userId
      },
      showSuccessToast: false
    });
  },
  
  // 게시물 삭제
  deletePost: (imageId: string, userId: string) => {
    return apiRequest('/api/community', {
      method: 'POST',
      body: {
        action: 'delete',
        imageId,
        userId
      },
      showSuccessToast: true
    });
  },
  
  // 커뮤니티 데이터 로드
  loadCommunityData: (forceRefresh: boolean = false) => {
    const timestamp = new Date().getTime();
    return apiRequest(`/api/community?t=${timestamp}&force_refresh=${forceRefresh}`);
  }
}; 