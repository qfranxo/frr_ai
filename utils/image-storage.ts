import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // 클라이언트 측: anon 키 사용
);

/**
 * Replicate 이미지 URL을 Supabase Storage에 저장하고 공개 URL 반환
 */
export async function storeImageFromReplicate(
  imageUrl: string, 
  userId: string, 
  options?: { 
    filename?: string;
    folder?: string;
  }
): Promise<{ publicUrl: string; storagePath: string }> {
  try {
    // 1. Replicate URL에서 이미지 가져오기
    console.log('Replicate 이미지 가져오는 중:', imageUrl);
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`이미지 가져오기 실패: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // 2. 파일명 및 경로 설정 (타임스탬프 포함)
    const timestamp = Date.now();
    const folder = options?.folder || 'user-images';
    const filename = options?.filename || `image_${timestamp}.webp`;
    const storagePath = `${folder}/${filename}`;
    
    console.log('Supabase Storage에 업로드 준비, 경로:', storagePath);
    
    // 3. Supabase Storage에 webp 형식으로 업로드
    const { data, error } = await supabase.storage
      .from('image')  // 'image' 버킷 사용
      .upload(storagePath, blob, {
        contentType: 'image/webp',
        upsert: true // 덮어쓰기 허용
      });
    
    if (error) {
      console.error('스토리지 업로드 오류:', error);
      throw new Error(`이미지 업로드 실패: ${error.message}`);
    }
    
    // 4. 업로드된 이미지의 공개 URL 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다');
    }
    
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/image/${storagePath}`;
    
    console.log('이미지 업로드 성공, 공개 URL:', publicUrl);
    
    return {
      publicUrl,
      storagePath
    };
  } catch (error) {
    console.error('이미지 스토리지 오류:', error);
    throw error;
  }
}

/**
 * 이미지 스토리지에서 삭제
 */
export async function deleteStoredImage(path: string): Promise<boolean> {
  try {
    const { error } = await supabase.storage
      .from('image')
      .remove([path]);
    
    if (error) {
      console.error('Storage delete error:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Image deletion error:', error);
    return false;
  }
}

// utils/image-utils.ts 새로 생성
export function processImageUrl(imageUrl: string, fallbackUrl = '/fallback-image.png') {
  if (!imageUrl) return fallbackUrl;
  if (imageUrl.includes('replicate.delivery')) return fallbackUrl;
  return imageUrl;
} 