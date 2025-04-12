import { toast } from 'sonner';
import { isBrowser } from '@/utils/isBrowser';

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

// 로깅 레벨 설정 - 프로덕션에서는 비활성화
const DEBUG_LOGGING = process.env.NODE_ENV === 'development' && false; // 개발 환경에서도 기본적으로 비활성화

// 댓글 캐싱 관련 설정
export const COMMENTS_CACHE_DEBUG = false; // 개발 모드에서도 댓글 캐싱 로그를 보려면 true로 설정

// 타입 정의 추가
interface Comment {
  id: string;
  text: string;
  userId: string;
  userName: string;
  imageId: string;
  createdAt: string;
}

// 로깅 헬퍼 함수들
const localLogDebug = (...args: any[]): void => {
  if (process.env.NODE_ENV === 'development') {
    console.log(...args);
  }
};

const logCommentCache = (...args: any[]): void => {
  if (process.env.NODE_ENV === 'development' && COMMENTS_CACHE_DEBUG) {
    console.log('[COMMENT_CACHE]', ...args);
  }
};

const localLogError = (...args: any[]): void => {
  console.error(...args);
};

// 중요 로깅 - 항상 표시
const logInfo = (message: string, ...args: any[]) => {
  console.log(message, ...args);
};

// 에러 로깅 - 항상 표시
const logError = (message: string, ...args: any[]) => {
  console.error(message, ...args);
};

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
  addComment: async (imageId: string, userId: string, userName: string, text: string) => {
    // 댓글 추가 API 호출
    const result = await apiRequest('/api/comments', {
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
    
    // 추가가 성공하면 로컬 캐시 업데이트
    if (result.success && result.data && result.data.length > 0 && typeof window !== 'undefined') {
      try {
        const newComment = result.data[0]; // 서버에서 반환된 새 댓글
        
        // 캐시 키
        const COMMENTS_CACHE_KEY = `comments_cache_${imageId}`;
        const BATCH_COMMENTS_CACHE_KEY = `batch_comments_cache_${imageId}`;
        const COMMENTS_TIMESTAMP_KEY = `comments_timestamp_${imageId}`;
        const BATCH_COMMENTS_TIMESTAMP_KEY = `batch_comments_timestamp_${imageId}`;
        
        // 새 타임스탬프
        const timestamp = String(new Date().getTime());
        
        // 단일 이미지 댓글 캐시 업데이트
        const cachedCommentsJson = localStorage.getItem(COMMENTS_CACHE_KEY);
        if (cachedCommentsJson) {
          const cachedComments = JSON.parse(cachedCommentsJson);
          // 새 댓글을 맨 앞에 추가 (최신순 정렬 유지)
          const updatedComments = [newComment, ...cachedComments];
          // 업데이트된 캐시 저장
          localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(updatedComments));
          localStorage.setItem(COMMENTS_TIMESTAMP_KEY, timestamp);
          localLogDebug(`[ADD_COMMENT] 캐시 업데이트 완료: ${imageId}, 새 댓글 추가됨`);
        } else {
          // 캐시가 없는 경우 새로 생성
          localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify([newComment]));
          localStorage.setItem(COMMENTS_TIMESTAMP_KEY, timestamp);
          localLogDebug(`[ADD_COMMENT] 캐시 새로 생성: ${imageId}, 새 댓글 추가됨`);
        }
        
        // 배치 캐시 업데이트
        const batchCachedCommentsJson = localStorage.getItem(BATCH_COMMENTS_CACHE_KEY);
        if (batchCachedCommentsJson) {
          const batchCachedComments = JSON.parse(batchCachedCommentsJson);
          // 새 댓글을 맨 앞에 추가 (최신순 정렬 유지)
          const updatedBatchComments = [newComment, ...batchCachedComments];
          // 업데이트된 캐시 저장
          localStorage.setItem(BATCH_COMMENTS_CACHE_KEY, JSON.stringify(updatedBatchComments));
          localStorage.setItem(BATCH_COMMENTS_TIMESTAMP_KEY, timestamp);
          localLogDebug(`[ADD_COMMENT] 배치 캐시 업데이트 완료: ${imageId}, 새 댓글 추가됨`);
        }
      } catch (e) {
        localLogError(`[ADD_COMMENT] 캐시 업데이트 중 오류:`, e);
        // 캐시 업데이트 오류는 무시
      }
    }
    
    return result;
  },
  
  // 이미지별 댓글 조회 함수 추가
  async loadCommentsForImage(imageId: string): Promise<Comment[]> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logCommentCache('오프라인 상태, 캐시된 댓글 반환');
      // 오프라인 상태일 때 캐시에서 가져오기
      if (typeof sessionStorage !== 'undefined') {
        const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
        if (cachedComments) {
          return JSON.parse(cachedComments);
        }
      }
      return [];
    }

    try {
      // 먼저 캐시 확인
      if (typeof sessionStorage !== 'undefined') {
        const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
        
        if (cachedComments) {
          const parsed = JSON.parse(cachedComments);
          logCommentCache(`캐시에서 ${parsed.length}개의 댓글 로드`, imageId);
          
          // 백그라운드에서 캐시 갱신 (응답을 기다리지 않음)
          this._updateCommentsCache(imageId).catch((err: Error) => {
            localLogError('백그라운드 댓글 캐시 갱신 실패:', err);
          });
          
          return parsed;
        }
      }
      
      logCommentCache('캐시 없음, API에서 댓글 로드', imageId);
      const response: ApiResponse<Comment[]> = await apiRequest(`/api/comments?imageId=${imageId}`, {
        method: 'GET'
      });
      
      if (response.success && response.data) {
        // 캐시에 저장
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(`comments_${imageId}`, JSON.stringify(response.data));
          logCommentCache(`${response.data.length}개의 댓글 캐싱됨`, imageId);
        }
        return response.data;
      }
      
      return [];
    } catch (error) {
      logError('댓글 로드 중 오류:', error);
      
      // 오류 발생 시 캐시 확인
      if (typeof sessionStorage !== 'undefined') {
        const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
        if (cachedComments) {
          logCommentCache('API 요청 실패, 캐시된 댓글 사용', imageId);
          return JSON.parse(cachedComments);
        }
      }
      
      return [];
    }
  },
  
  // 캐시 업데이트를 위한 내부 메서드
  async _updateCommentsCache(imageId: string): Promise<void> {
    try {
      logCommentCache('백그라운드에서 댓글 캐시 갱신 중', imageId);
      const response: ApiResponse<Comment[]> = await apiRequest(`/api/comments?imageId=${imageId}`, {
        method: 'GET'
      });
      
      if (response.success && response.data && typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(`comments_${imageId}`, JSON.stringify(response.data));
        logCommentCache(`백그라운드에서 ${response.data.length}개의 댓글 캐시 갱신 완료`, imageId);
      }
    } catch (error) {
      localLogError('댓글 캐시 갱신 실패:', error);
    }
  },

  // 여러 이미지의 댓글을 일괄 조회하는 함수 (배치 처리)
  async loadCommentsForImageBatch(imageIds: string[]): Promise<Record<string, Comment[]>> {
    if (!imageIds || imageIds.length === 0) {
      return {};
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      logCommentCache('오프라인 상태, 캐시된 배치 댓글 반환');
      // 오프라인 상태일 때 캐시에서 가져오기
      const result: Record<string, Comment[]> = {};
      if (typeof sessionStorage !== 'undefined') {
        for (const imageId of imageIds) {
          const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
          if (cachedComments) {
            result[imageId] = JSON.parse(cachedComments);
          } else {
            result[imageId] = [];
          }
        }
      }
      return result;
    }

    try {
      // 먼저 모든 이미지에 대해 캐시 확인
      const result: Record<string, Comment[]> = {};
      const missingImageIds: string[] = [];

      if (typeof sessionStorage !== 'undefined') {
        for (const imageId of imageIds) {
          const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
          if (cachedComments) {
            result[imageId] = JSON.parse(cachedComments);
          } else {
            missingImageIds.push(imageId);
          }
        }
      } else {
        // sessionStorage를 사용할 수 없는 경우 모든 이미지가 누락된 것으로 처리
        imageIds.forEach(id => missingImageIds.push(id));
      }

      // 캐시에 없는 이미지에 대해서만 API 요청
      if (missingImageIds.length > 0) {
        logCommentCache(`${missingImageIds.length}개 이미지에 대한 댓글 배치 로드`);
        
        const queryString = missingImageIds.map(id => `imageIds=${encodeURIComponent(id)}`).join('&');
        const response: ApiResponse<Record<string, Comment[]>> = await apiRequest(`/api/comments/batch?${queryString}`, {
          method: 'GET'
        });
        
        if (response.success && response.data && typeof sessionStorage !== 'undefined') {
          // 각 이미지별로 결과 합치기 및 캐시 저장
          for (const [imageId, comments] of Object.entries(response.data)) {
            result[imageId] = comments as Comment[];
            sessionStorage.setItem(`comments_${imageId}`, JSON.stringify(comments));
            logCommentCache(`${(comments as Comment[]).length}개의 댓글 캐싱됨`, imageId);
          }
        }
      } else {
        logCommentCache('모든 이미지의 댓글이 캐시에서 로드됨');
        
        // 백그라운드에서 캐시 갱신 (최신 댓글 가져오기)
        this._updateCommentsBatchCache(imageIds).catch((err: Error) => {
          localLogError('백그라운드 배치 댓글 캐시 갱신 실패:', err);
        });
      }
      
      return result;
    } catch (error) {
      logError('배치 댓글 로드 중 오류:', error);
      
      // 오류 발생 시 캐시 확인
      const result: Record<string, Comment[]> = {};
      if (typeof sessionStorage !== 'undefined') {
        for (const imageId of imageIds) {
          const cachedComments = sessionStorage.getItem(`comments_${imageId}`);
          if (cachedComments) {
            result[imageId] = JSON.parse(cachedComments);
          } else {
            result[imageId] = [];
          }
        }
      }
      
      return result;
    }
  },
  
  // 배치 캐시 업데이트를 위한 내부 메서드
  async _updateCommentsBatchCache(imageIds: string[]): Promise<void> {
    try {
      logCommentCache('백그라운드에서 배치 댓글 캐시 갱신 중');
      const queryString = imageIds.map(id => `imageIds=${encodeURIComponent(id)}`).join('&');
      const response: ApiResponse<Record<string, Comment[]>> = await apiRequest(`/api/comments/batch?${queryString}`, {
        method: 'GET'
      });
      
      if (response.success && response.data && typeof sessionStorage !== 'undefined') {
        for (const [imageId, comments] of Object.entries(response.data)) {
          sessionStorage.setItem(`comments_${imageId}`, JSON.stringify(comments));
        }
        logCommentCache('백그라운드에서 배치 댓글 캐시 갱신 완료');
      }
    } catch (error) {
      localLogError('배치 댓글 캐시 갱신 실패:', error);
    }
  },
  
  // 댓글 삭제
  deleteComment: async (imageId: string, commentId: string, userId: string) => {
    // 댓글 삭제 API 호출
    const result = await apiRequest(`/api/comments/${encodeURIComponent(commentId)}`, {
      method: 'DELETE',
      body: {
        userId
      },
      showSuccessToast: false,
      cache: 'no-store'
    });
    
    // 삭제가 성공하면 로컬 캐시 업데이트
    if (result.success && typeof window !== 'undefined') {
      try {
        // 캐시 키
        const COMMENTS_CACHE_KEY = `comments_cache_${imageId}`;
        const BATCH_COMMENTS_CACHE_KEY = `batch_comments_cache_${imageId}`;
        
        // 단일 이미지 댓글 캐시 업데이트
        const cachedCommentsJson = localStorage.getItem(COMMENTS_CACHE_KEY);
        if (cachedCommentsJson) {
          const cachedComments = JSON.parse(cachedCommentsJson);
          // 삭제된 댓글 필터링
          const updatedComments = cachedComments.filter((comment: any) => comment.id !== commentId);
          // 업데이트된 캐시 저장
          localStorage.setItem(COMMENTS_CACHE_KEY, JSON.stringify(updatedComments));
          // 캐시 로깅 최적화
          logCommentCache(`캐시 업데이트: ${imageId}, 댓글 ID ${commentId} 삭제됨`);
        }
        
        // 배치 캐시 업데이트
        const batchCachedCommentsJson = localStorage.getItem(BATCH_COMMENTS_CACHE_KEY);
        if (batchCachedCommentsJson) {
          const batchCachedComments = JSON.parse(batchCachedCommentsJson);
          // 삭제된 댓글 필터링
          const updatedBatchComments = batchCachedComments.filter((comment: any) => comment.id !== commentId);
          // 업데이트된 캐시 저장
          localStorage.setItem(BATCH_COMMENTS_CACHE_KEY, JSON.stringify(updatedBatchComments));
          // 캐시 로깅 최적화
          logCommentCache(`배치 캐시 업데이트: ${imageId}, 댓글 ID ${commentId} 삭제됨`);
        }
      } catch (e) {
        localLogError(`[DELETE_COMMENT] 캐시 업데이트 중 오류:`, e);
        // 캐시 업데이트 오류는 무시
      }
    }
    
    return result;
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