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

  // 오프라인 상태 감지
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.error('Network is offline');
    
    if (showErrorToast) {
      toast.error('인터넷 연결이 끊어졌습니다. 네트워크 연결을 확인해주세요.', {
        position: 'top-center',
        duration: 4000,
      });
    }
    
    return { 
      success: false, 
      error: 'Network is offline',
      source: 'offline-error' 
    };
  }

  // 최대 재시도 횟수 설정
  const MAX_RETRIES = 2;
  let retries = 0;
  let lastError: any = null;

  while (retries <= MAX_RETRIES) {
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

      // 재시도 시 요청에 타임스탬프 추가
      const urlWithRetry = retries > 0 
        ? `${endpoint}${endpoint.includes('?') ? '&' : '?'}retry=${retries}&t=${Date.now()}` 
        : endpoint;

      // AbortController 생성 및 타임아웃 설정 (더 안전한 방식으로 구현)
      const controller = new AbortController();
      requestOptions.signal = controller.signal;
      
      // 타임아웃 설정 (댓글 관련 요청은 더 긴 타임아웃 적용)
      const isCommentsRequest = endpoint.includes('/api/comments');
      const timeoutSeconds = isCommentsRequest ? 30 : 15; // 댓글 요청은 30초, 다른 요청은 15초
      
      let timeoutHandler: ReturnType<typeof setTimeout> | undefined = setTimeout(() => {
        try {
          // 명시적인 reason 메시지 제공
          controller.abort('Request timed out after ' + timeoutSeconds + ' seconds');
        } catch (e) {
          console.error('Error aborting request:', e);
        }
      }, timeoutSeconds * 1000);

      try {
        const response = await fetch(urlWithRetry, requestOptions);
        
        // 요청 완료 후 타임아웃 핸들러 정리
        if (timeoutHandler) {
          clearTimeout(timeoutHandler);
          timeoutHandler = undefined;
        }

        // 응답이 OK가 아닌 경우
        if (!response.ok) {
          // HTTP 오류 상태 코드 처리
          console.error(`HTTP Error: ${response.status} ${response.statusText} from ${endpoint}`);
          
          // 응답 형식을 JSON으로 가정하지 말고 텍스트로 먼저 확인
          try {
            const errorText = await response.text();
            
            // JSON으로 파싱 시도
            try {
              const errorJson = JSON.parse(errorText);
              if (showErrorToast) {
                toast.error(errorJson.error || `Error: ${response.status}`, {
                  position: 'top-center',
                  duration: 3000,
                });
              }
              return { 
                success: false, 
                error: errorJson.error || `Server error: ${response.status}`,
                source: 'http-error' 
              };
            } catch (parseError) {
              // JSON 파싱 실패 - 텍스트 응답 반환
              if (showErrorToast) {
                toast.error(`Error: ${response.status}`, {
                  position: 'top-center',
                  duration: 3000,
                });
              }
              return { 
                success: false, 
                error: errorText || `Server error: ${response.status}`,
                source: 'http-error-text' 
              };
            }
          } catch (textError) {
            // 텍스트 읽기 실패
            if (showErrorToast) {
              toast.error(`Error: ${response.status}`, {
                position: 'top-center',
                duration: 3000,
              });
            }
            return { 
              success: false, 
              error: `Server error: ${response.status}`,
              source: 'http-error-unknown' 
            };
          }
        }
        
        // 성공 응답
        try {
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
        } catch (parseError) {
          console.error(`JSON parsing error for ${endpoint}:`, parseError);
          
          if (showErrorToast) {
            toast.error('Invalid response format', {
              position: 'top-center',
              duration: 3000,
            });
          }
          
          return { 
            success: false, 
            error: 'Invalid response format',
            source: 'json-parse-error' 
          };
        }
      } catch (fetchError) {
        // fetch 요청 실패 시 타임아웃 핸들러 정리
        if (timeoutHandler) {
          clearTimeout(timeoutHandler);
          timeoutHandler = undefined;
        }
        
        // 에러 처리
        lastError = fetchError;
        console.error(`Network error for ${endpoint} (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, fetchError);
        
        // AbortError는 타임아웃이나 사용자에 의한 중단으로 발생
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          if (showErrorToast) {
            toast.error('Request timed out, please try again', {
              position: 'top-center',
              duration: 3000,
            });
          }
          return { 
            success: false, 
            error: 'Request timed out',
            source: 'timeout-error' 
          };
        }
        
        // 모든 재시도 실패 또는 재시도 불가능한 오류
        if (showErrorToast) {
          toast.error('Network or server error, please check your connection', {
            position: 'top-center',
            duration: 3000,
          });
        }
        
        // 마지막 에러 반환
        return { 
          success: false, 
          error: lastError instanceof Error ? lastError.message : 'Network or server error',
          source: 'network-error' 
        };
      }
    } catch (error) {
      // 예상치 못한 오류 발생 시
      lastError = error;
      console.error(`Unexpected error for ${endpoint} (attempt ${retries + 1}/${MAX_RETRIES + 1}):`, error);
      
      // 실패 횟수 증가 후 재시도 가능한지 확인
      retries++;
      if (retries <= MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        continue;
      }
      
      // 더 이상 재시도 불가능
      break;
    }
  }
  
  // 모든 재시도 실패 시 마지막 에러 반환
  return { 
    success: false, 
    error: lastError instanceof Error ? lastError.message : 'All retries failed',
    source: 'retries-exhausted' 
  };
}

// 커뮤니티 API 래퍼 함수들
export const communityApi = {
  // 댓글 추가
  addComment: (imageId: string, userId: string, userName: string, text: string) => {
    return apiRequest('/api/comments', {
      method: 'POST',
      body: {
        imageId,
        userId,
        userName,
        text
      },
      showSuccessToast: false,
      cache: 'no-store'
    });
  },
  
  // 이미지별 댓글 조회 함수 추가
  loadCommentsForImage: (imageId: string) => {
    return apiRequest(`/api/comments?imageId=${encodeURIComponent(imageId)}`, {
      method: 'GET',
      showErrorToast: false,
      cache: 'no-store'
    });
  },
  
  // 여러 이미지의 댓글을 일괄 조회하는 함수 (배치 처리)
  loadCommentsForImageBatch: async (imageIds: string[]) => {
    if (!imageIds.length) return { success: true, data: {} };
    
    // URL 파라미터 구성 (최대 5개까지 허용)
    const batchSize = 5;
    const batches = [];
    
    // 배치 처리를 위해 5개씩 나누기
    for (let i = 0; i < imageIds.length; i += batchSize) {
      const batchIds = imageIds.slice(i, i + batchSize);
      batches.push(batchIds);
    }
    
    // 결과를 저장할 객체
    const results: Record<string, any[]> = {};
    
    // 각 배치를 순차적으로 처리
    for (const batch of batches) {
      try {
        // 쿼리 파라미터 구성
        const params = new URLSearchParams();
        batch.forEach(id => params.append('imageIds', id));
        
        // API 호출
        const response = await apiRequest(`/api/comments/batch?${params.toString()}`, {
          method: 'GET',
          showErrorToast: false,
          cache: 'no-store'
        });
        
        // 성공적인 응답 처리
        if (response.success && response.data) {
          // 결과 병합
          Object.assign(results, response.data);
        }
        
        // 배치 사이에 짧은 지연을 두어 서버 부하 조절
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error) {
        console.error('배치 댓글 로드 중 오류:', error);
        // 오류가 발생해도 계속 진행
      }
    }
    
    return { 
      success: true, 
      data: results,
      source: 'batch-api'
    };
  },
  
  // 댓글 삭제
  deleteComment: (imageId: string, commentId: string, userId: string) => {
    return apiRequest('/api/comments/delete', {
      method: 'POST',
      body: {
        imageId,
        commentId,
        userId
      },
      showSuccessToast: false,
      cache: 'no-store'
    });
  },
  
  // 게시물 삭제
  deletePost: (imageId: string, userId: string) => {
    return apiRequest(`/api/community/${imageId}`, {
      method: 'DELETE',
      body: {
        userId
      },
      showSuccessToast: true,
      cache: 'no-store'
    });
  },
  
  // 커뮤니티 데이터 로드
  loadCommunityData: async (forceRefresh: boolean = false) => {
    // 로컬 스토리지 키
    const CACHE_KEY = 'community_data_cache';
    const CACHE_TIMESTAMP_KEY = 'community_data_timestamp';
    const CACHE_MAX_AGE = 5 * 60 * 1000; // 5분 캐시
    
    // 오프라인 상태 확인
    if (typeof window !== 'undefined' && !window.navigator.onLine) {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          return { 
            success: true, 
            data: JSON.parse(cachedData),
            source: 'offline-cache'
          };
        }
      } catch (e) {
        return { 
          success: false, 
          error: '오프라인 상태입니다. 인터넷 연결을 확인해주세요.',
          source: 'offline-error' 
        };
      }
      
      return { 
        success: false, 
        error: '오프라인 상태입니다. 인터넷 연결을 확인해주세요.',
        source: 'offline-error' 
      };
    }
    
    // 캐시 확인 (강제 새로고침이 아닐 경우)
    if (!forceRefresh && typeof window !== 'undefined') {
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        const cachedTimestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
        
        if (cachedData && cachedTimestamp) {
          const timestamp = parseInt(cachedTimestamp, 10);
          const now = new Date().getTime();
          
          // 캐시가 유효한지 확인 (5분 이내)
          if (now - timestamp < CACHE_MAX_AGE) {
            // API 요청을 백그라운드에서 실행하여 캐시 업데이트
            setTimeout(() => {
              const timestamp = new Date().getTime();
              fetch(`/api/community?t=${timestamp}&background=true`)
                .then(res => res.json())
                .then(result => {
                  if (result.success && result.data) {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
                    localStorage.setItem(CACHE_TIMESTAMP_KEY, String(new Date().getTime()));
                  }
                })
                .catch(err => {});
            }, 100);
            
            return { 
              success: true, 
              data: JSON.parse(cachedData),
              source: 'cache'
            };
          }
        }
      } catch (e) {
        // 캐시 오류는 무시하고 API 요청 진행
      }
    }
    
    // API 요청 진행
    try {
      const timestamp = new Date().getTime();
      const result = await apiRequest(`/api/community?t=${timestamp}&force_refresh=${forceRefresh}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      // 성공적으로 데이터를 가져왔으면 캐시에 저장
      if (result.success && result.data && typeof window !== 'undefined') {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(result.data));
          localStorage.setItem(CACHE_TIMESTAMP_KEY, String(new Date().getTime()));
        } catch (e) {
          // 캐시 저장 오류는 무시
        }
      }
      
      return result;
    } catch (error) {
      // 오류 발생 시 로컬 캐시 사용 시도
      if (typeof window !== 'undefined') {
        try {
          const cachedData = localStorage.getItem(CACHE_KEY);
          if (cachedData) {
            return { 
              success: true, 
              data: JSON.parse(cachedData),
              source: 'error-fallback-cache'
            };
          }
        } catch (cacheError) {
          // 캐시 읽기 오류, 무시
        }
      }
      
      // 캐시도 없는 경우 빈 배열 반환
      return { 
        success: false, 
        error: '데이터를 불러오는데 실패했습니다.',
        data: [], // 최소한 빈 배열이라도 반환
        source: 'error-no-cache'
      };
    }
  }
};

// FormData를 사용한 API 함수들
export const formDataApi = {
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