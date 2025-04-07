/**
 * 이미지 URL 처리를 위한 유틸리티 함수
 */

import { toast } from 'sonner';

// 이미 처리 중인 URL 추적을 위한 Set (백그라운드 저장용)
const processingUrls = new Set<string>();

/**
 * 이미지 URL이 유효한지 확인하고 빈 URL인 경우 fallback을 반환
 * ReactDOM.preload() 오류 방지를 위한 함수
 *
 * @param url 확인할 URL
 * @param fallbackUrl fallback URL
 * @returns 유효한 URL 또는 fallback URL
 */
export function validateImageUrl(url: string | null | undefined, fallbackUrl = '/fallback-image.png'): string {
  // URL이 null, undefined, 빈 문자열인 경우 fallback 반환
  if (!url || url.trim() === '') {
    console.warn('[심각] 빈 이미지 URL 감지, fallback 사용');
    return fallbackUrl;
  }
  
  // URL 유효성 검사 시도
  try {
    if (url.startsWith('/')) {
      // 상대 경로는 유효하다고 간주
      return url;
    }
    
    // URL 객체로 생성 시도하여 유효성 검사
    new URL(url);
    return url;
  } catch (e) {
    console.error('[심각] 유효하지 않은 URL 형식:', url);
    return fallbackUrl;
  }
}

/**
 * 이미지 URL을 처리하여 임시 URL인 경우 fallback을 반환
 * - 로드된 이미지를 표시할 때 사용
 * - API 응답으로 영구 URL이 반환된 경우 사용하지 않아도 됨
 * 
 * @param imageUrl 처리할 이미지 URL
 * @param fallbackUrl fallback 이미지 URL (기본값: '/fallback-image.png')
 * @returns 처리된 이미지 URL
 */
export function processImageUrl(imageUrl: string, fallbackUrl = '/fallback-image.png'): string {
  // URL이 없거나 빈 문자열인 경우
  if (!imageUrl || imageUrl.trim() === '') {
    return fallbackUrl;
  }
  
  try {
    // Replicate URL 확인
    if (imageUrl.includes('replicate.delivery')) {
      return imageUrl; // Replicate URL도 그대로 반환 (Next.js Image 컴포넌트가 처리)
    }
    
    // 상대 경로인 경우 그대로 반환
    if (imageUrl.startsWith('/')) {
      return imageUrl;
    }
    
    // URL 유효성 검증
    try {
      new URL(imageUrl);
      return imageUrl; // 유효한 URL은 그대로 반환
    } catch (e) {
      console.warn('[URL 오류] 유효하지 않은 URL 형식:', imageUrl);
      return fallbackUrl; // 유효하지 않은 URL은 fallback 반환
    }
  } catch (error) {
    console.error('[URL 처리 오류]', error);
    return fallbackUrl;
  }
}

/**
 * 이미지 URL이 Replicate 임시 URL인지 확인
 * 
 * @param imageUrl 확인할 이미지 URL
 * @returns Replicate URL 여부
 */
export function isReplicateUrl(imageUrl: string): boolean {
  if (!imageUrl) return false;
  return imageUrl.includes('replicate.delivery');
}

/**
 * 이미지 URL이 Supabase Storage URL인지 확인
 * 
 * @param imageUrl 확인할 이미지 URL
 * @returns Supabase URL 여부
 */
export function isSupabaseUrl(imageUrl: string): boolean {
  if (!imageUrl) return false;
  // Supabase URL 패턴 확인 (더 정확한 패턴 사용)
  return (imageUrl.includes('supabase') && imageUrl.includes('storage/v1/object/public')) ||
         imageUrl.includes('storage.googleapis.com'); // Firebase Storage도 지원
}

/**
 * 이미지 URL이 유효한지 확인 (null, undefined, 빈 문자열 등 검사)
 * 
 * @param imageUrl 확인할 이미지 URL
 * @returns 유효한 이미지 URL 여부
 */
export function isValidImageUrl(imageUrl: string | null | undefined): boolean {
  if (!imageUrl) return false;
  return imageUrl.startsWith('http') && imageUrl.length > 10;
}

/**
 * 이미지 URL이 영구적인 URL인지 확인 (Replicate URL이 아닌 경우)
 * 
 * @param imageUrl 확인할 이미지 URL
 * @returns 영구 이미지 URL 여부
 */
export function isPermanentImageUrl(imageUrl: string): boolean {
  if (!isValidImageUrl(imageUrl)) return false;
  return !isReplicateUrl(imageUrl);
}

/**
 * 이미지 다운로드 유틸리티 함수
 * 
 * @param options 다운로드 옵션
 * @returns Promise<boolean> 다운로드 성공 여부
 */
export async function downloadImage(options: {
  imageUrl: string;
  fileName?: string;
  fileType?: string;
  isOwnerCheck?: {
    isOwner: boolean;
    ownerErrorMessage?: string;
  };
}): Promise<boolean> {
  const {
    imageUrl,
    fileName = `AI_image_${Date.now()}`,
    fileType = 'webp',
    isOwnerCheck
  } = options;

  // 소유자 확인이 필요한 경우
  if (isOwnerCheck && !isOwnerCheck.isOwner) {
    toast.error(isOwnerCheck.ownerErrorMessage || '이 이미지를 다운로드할 권한이 없습니다.');
    return false;
  }

  // 유효한 이미지 URL 확인
  if (!imageUrl) {
    toast.error('유효한 이미지 URL이 없습니다.');
    return false;
  }
  
  // Replicate URL 경고 (개발 환경에서만)
  if (process.env.NODE_ENV === 'development' && isReplicateUrl(imageUrl)) {
    console.warn('Replicate URL은 일시적이며 곧 만료됩니다. 다운로드가 실패할 수 있습니다.');
  }
  
  try {
    // 로딩 상태 표시
    const loadingToast = toast.loading('이미지를 다운로드하는 중...');
    
    // 이미지 다운로드
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    
    // 다운로드 링크 생성 및 클릭
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${fileType}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // 임시 URL 해제
    window.URL.revokeObjectURL(url);
    
    toast.dismiss(loadingToast);
    toast.success('이미지가 다운로드되었습니다.');
    return true;
  } catch (error) {
    console.error('다운로드 오류:', error instanceof Error ? error.message : String(error));
    toast.error('다운로드 중 오류가 발생했습니다.');
    return false;
  }
}

/**
 * Replicate URL을 백그라운드에서 Supabase Storage에 저장하는 함수
 * - 이미지가 로드될 때 호출됨
 * - 이미 처리 중인 URL은 중복 처리하지 않음
 * 
 * @param imageUrl Replicate 이미지 URL
 * @param postId 게시물 ID
 * @param userId 사용자 ID (옵션)
 * @param type 저장할 이미지 타입 (shared, user-images, generations)
 */
export function saveReplicateUrlToStorage(
  imageUrl: string,
  postId: string,
  userId?: string,
  type: 'shared' | 'user-images' | 'generations' = 'shared'
): void {
  // 유효성 검사
  if (!imageUrl) {
    console.error('[심각] saveReplicateUrlToStorage - imageUrl이 없음');
    return;
  }
  
  if (!postId) {
    console.error('[심각] saveReplicateUrlToStorage - postId가 없음, imageUrl:', imageUrl);
    return;
  }
  
  // 이미 처리 중이거나 Replicate URL이 아니면 처리하지 않음
  if (processingUrls.has(imageUrl) || !isReplicateUrl(imageUrl)) {
    return;
  }
  
  // 처리 중으로 표시 (1시간 동안 동일 URL 재처리 방지)
  processingUrls.add(imageUrl);
  
  // 실행을 지연시켜 초기 렌더링 성능 영향 최소화
  setTimeout(() => {
    // API 요청
    fetch('/api/image-storage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageUrl,
        postId,
        userId,
        type,
        source: 'auto-save',
        timestamp: Date.now() // 캐시 방지용 타임스탬프
      })
    })
      .then(async response => {
        if (!response.ok) {
          throw new Error(`API 응답 오류: ${response.status} ${response.statusText}`);
        }
        
        // 응답이 JSON이 아닐 경우 대비
        try {
          return await response.json();
        } catch (e) {
          throw new Error('응답 파싱 오류');
        }
      })
      .then(data => {
        // 성공 또는 실패 로그 제거
      })
      .catch(error => {
        // 오류 로그 제거
        
        // 1시간 후에 URL 처리 잠금 해제 (서버 오류 시에도 재시도 기회 제공)
        setTimeout(() => {
          processingUrls.delete(imageUrl);
        }, 3600000); // 1시간
      });
  }, 3000); // 3초 지연
}

// 이미지 경로 보정 유틸리티 함수
export function getCorrectImagePath(imageUrl: string): string {
  if (!imageUrl) return '/fallback-image.png';
  
  // 이미 올바른 경로 형식인 경우
  if (imageUrl.includes('/image/shared/') || 
      imageUrl.includes('/image/image/generations/')) {
    return imageUrl;
  }
  
  // 잘못된 형식 수정 (shared_guestuse_...)
  if (imageUrl.includes('shared_')) {
    const fileName = imageUrl.split('/').pop();
    return imageUrl.replace(fileName!, `shared/${fileName}`);
  }
  
  // 잘못된 형식 수정 (generations_guestuse_...)
  if (imageUrl.includes('generations_')) {
    const fileName = imageUrl.split('/').pop();
    return imageUrl.replace(fileName!, `image/generations/${fileName}`);
  }
  
  return imageUrl;
} 