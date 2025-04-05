import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabase } from '@/lib/supabase';
import { isReplicateUrl, isValidImageUrl } from '@/utils/image-utils';
import { v4 as uuidv4 } from 'uuid';
import { createClient } from '@supabase/supabase-js';

// RLS 정책을 우회하는 서비스 롤 클라이언트 생성 (서버 측에서만 사용)
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = serviceRoleKey 
  ? createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceRoleKey
    )
  : supabase; // 서비스 키가 없으면 일반 클라이언트 사용

// 이미지 저장 타입 정의
type StorageType = 'shared' | 'user-images' | 'generations';

// 이미지를 Replicate에서 Supabase Storage로 저장하는 함수
async function storeImageFromReplicate(
  imageUrl: string,
  userId: string,
  type: StorageType = 'shared'
): Promise<{ publicUrl: string; storagePath: string } | null> {
  try {
    console.log(`[API] 이미지 다운로드 시작: ${imageUrl.substring(0, 40)}...`);
    
    // 1. 이미지 다운로드 - Node.js 환경에서는 CORS 문제 없음
    const response = await fetch(imageUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FRRAIBotUploader/1.0)',
        'Cache-Control': 'no-cache',
        'Accept': 'image/webp,image/*,*/*;q=0.8',
        'Connection': 'keep-alive'
      },
      next: { revalidate: 0 } // Next.js 13 캐시 방지
    }).catch(err => {
      console.error(`[API] 이미지 다운로드 네트워크 오류:`, err);
      return null;
    });
    
    if (!response) {
      console.error('[API] 이미지 다운로드 응답 없음');
      return null;
    }
    
    if (!response.ok) {
      console.error(`[API] 이미지 다운로드 실패 (${response.status}): ${response.statusText}`);
      return null;
    }
    
    // 2. 이미지 Blob으로 변환 (에러 처리 추가)
    let blob;
    try {
      blob = await response.blob();
    } catch (blobError) {
      console.error('[API] 응답을 Blob으로 변환 중 오류:', blobError);
      return null;
    }
    
    if (!blob || blob.size === 0) {
      console.error('[API] 다운로드된 이미지 크기가 0 또는 Blob이 없음');
      return null;
    }
    
    // Blob 타입 확인 
    console.log(`[API] 이미지 다운로드 성공: ${blob.size} bytes, 타입: ${blob.type}`);
    
    // 3. 타입에 따른 저장 경로 설정
    // 안전한 문자열만 사용하기 위한 처리
    const safeUserId = userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 8);
    const uuid = uuidv4().replace(/-/g, '');
    const timestamp = Date.now();
    
    // 파일 이름 생성
    const safeFilename = `${timestamp}_${safeUserId}_${uuid.substring(0, 8)}.webp`;
    
    // 타입에 따른 스토리지 경로 설정
    let storagePath: string;
    switch(type) {
      case 'generations':
        storagePath = `image/generations/${safeFilename}`;
        break;
      case 'shared':
        storagePath = `shared/${safeFilename}`;
        break;
      case 'user-images':
        storagePath = `user-images/${safeFilename}`;
        break;
      default:
        storagePath = `${type}/${safeFilename}`;
    }
    
    console.log(`[API] 업로드 경로: ${storagePath}`);
    
    // 5. 관리자 클라이언트로 이미지 업로드 시도 (RLS 우회)
    console.log(`[API] 서비스 롤로 image 버킷에 업로드 시도`);
    try {
      // 서비스 롤 키 사용 시 RLS 정책 우회
      const { data, error } = await supabaseAdmin.storage
        .from('image')
        .upload(storagePath, blob, {
          contentType: 'image/webp',
          upsert: true
        });
      
      if (!error) {
        // 업로드 성공
        const { data: urlData } = supabaseAdmin.storage
          .from('image')
          .getPublicUrl(storagePath);
        
        if (urlData?.publicUrl) {
          console.log(`[API] 업로드 성공: ${urlData.publicUrl}`);
          return {
            publicUrl: urlData.publicUrl,
            storagePath: `image/${storagePath}` // 버킷 이름을 포함한 전체 경로 반환
          };
        } else {
          console.error('[API] 업로드 성공했으나 URL을 가져올 수 없음');
        }
      } else {
        console.error(`[API] 업로드 실패: ${error.message}, 세부 정보: ${JSON.stringify(error)}`);
      }
    } catch (uploadError) {
      console.error(`[API] 업로드 중 예외:`, uploadError);
    }
    
    // 6. RLS 우회가 안 되는 경우 일반 클라이언트로 시도
    console.log('[API] 일반 클라이언트로 대체 업로드 시도');
    try {
      const { data, error } = await supabase.storage
        .from('image')
        .upload(storagePath, blob, {
          contentType: 'image/webp',
          upsert: true
        });
      
      if (!error) {
        // 업로드 성공
        const { data: urlData } = supabase.storage
          .from('image')
          .getPublicUrl(storagePath);
        
        if (urlData?.publicUrl) {
          console.log(`[API] 대체 방법으로 업로드 성공: ${urlData.publicUrl}`);
          return {
            publicUrl: urlData.publicUrl,
            storagePath: `image/${storagePath}` // 버킷 이름을 포함한 전체 경로 반환
          };
        }
      } else {
        console.error(`[API] 대체 업로드 실패: ${error.message}, 세부 정보: ${JSON.stringify(error)}`);
      }
    } catch (uploadError) {
      console.error('[API] 대체 업로드 중 예외:', uploadError);
    }
    
    // 7. 모든 업로드 시도 실패
    console.error('[API] 모든 업로드 시도 실패');
    return null;
  } catch (error) {
    console.error('[API] 이미지 저장 과정 중 예외 발생:', error);
    return null;
  }
}

// 요청 데이터 인터페이스 정의
interface StorageRequestData {
  imageUrl: string;
  postId: string;
  userId?: string;
  source?: string;
  type?: string;
}

// POST 핸들러 - 이미지 URL과 관련 데이터를 받아 처리
export async function POST(request: Request) {
  try {
    console.log('[API] 이미지 저장 요청 시작');
    
    // 1. 요청 데이터 파싱
    let data: StorageRequestData;
    try {
      data = await request.json();
    } catch (e) {
      console.error('[API] JSON 파싱 오류:', e);
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 요청 데이터', 
        details: e instanceof Error ? e.message : String(e)
      }, { status: 400 });
    }
    
    if (!data) {
      console.error('[API] 요청 데이터 없음');
      return NextResponse.json({ 
        success: false, 
        error: '요청 데이터 없음' 
      }, { status: 400 });
    }
    
    const { imageUrl, postId, userId: requestUserId, source = 'background', type = 'shared' } = data;
    
    // 이미지 저장 타입 결정 (default: shared)
    const storageType = (type === 'user-images' || type === 'generations') ? type as StorageType : 'shared';
    
    console.log(`[API] 요청 파라미터: postId=${postId}, source=${source}, type=${storageType}`);
    
    // 2. 이미지 URL 유효성 검사
    if (!isValidImageUrl(imageUrl)) {
      console.error('[API] 유효하지 않은 이미지 URL');
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 이미지 URL',
        url: imageUrl
      }, { status: 400 });
    }
    
    // 3. Replicate URL인지 확인 (선택적으로 다른 URL도 처리 가능)
    if (!isReplicateUrl(imageUrl) && source !== 'force-save') {
      console.error('[API] Replicate URL이 아님');
      return NextResponse.json({ 
        success: false, 
        error: 'Replicate URL이 아닙니다',
        url: imageUrl
      }, { status: 400 });
    }
    
    // 4. postId 확인
    if (!postId) {
      console.error('[API] postId 누락');
      return NextResponse.json({ 
        success: false, 
        error: 'postId가 필요합니다' 
      }, { status: 400 });
    }
    
    // 5. 사용자 ID 확인 - 1) 요청에서 제공된 ID 사용 2) 인증에서 ID 가져오기
    let userId = requestUserId || '';
    if (!userId) {
      try {
        const { userId: authUserId } = await auth();
        userId = authUserId || '';
      } catch (authError) {
        console.error('[API] 인증 확인 중 오류:', authError);
      }
    }
    
    // 6. 사용자 ID가 없는 경우 Guest ID 사용
    if (!userId) {
      console.warn('[API] 사용자 ID 없음, 게스트 ID 사용');
      userId = 'guest-user';
    }
    
    // 7. Supabase 연결 확인 (버킷 확인 로직 대신 직접 접근 시도)
    try {
      // 테이블 연결 테스트
      const { data: testData, error: testError } = await supabase.from('shared_images').select('count').limit(1);
      
      if (testError) {
        console.error('[API] Supabase 연결 테스트 실패:', testError);
      } else {
        console.log('[API] Supabase 연결 테스트 성공');
      }
    } catch (connectionError) {
      console.error('[API] Supabase 연결 시도 중 예외:', connectionError);
      // 연결 오류가 있어도 계속 진행 (이미지 저장은 시도)
    }
    
    // 8. 이미 저장된 이미지인지 확인
    try {
      // 이미 Supabase에 저장된 이미지인지 확인
      const { data: existingData, error: queryError } = await supabase
        .from('shared_images')
        .select('id, image_url, storage_path')
        .eq('id', postId)
        .single();
      
      if (queryError) {
        if (queryError.code !== 'PGRST116') {  // PGRST116: 결과 없음
          console.error(`[API] DB 쿼리 오류: ${queryError.message}`);
        } else {
          console.log(`[API] 이미지(ID: ${postId})를 찾을 수 없음, 새로 저장합니다`);
        }
      }
      
      // 이미 스토리지 경로가 있는 경우 (이미 저장됨)
      if (existingData && existingData.storage_path) {
        console.log(`[API] 이미 저장된 이미지: ${postId}, 경로: ${existingData.storage_path}`);
        return NextResponse.json({ 
          success: true, 
          message: '이미 저장된 이미지입니다',
          data: existingData
        });
      }
    } catch (dbError) {
      console.error('[API] DB 조회 오류:', dbError);
      // DB 오류가 있어도 계속 진행 (이미지 저장은 시도)
    }
    
    // 9. 이미지 저장
    console.log(`[API] 이미지 저장 시도 중... 타입: ${storageType}`);
    const saveResult = await storeImageFromReplicate(imageUrl, userId, storageType);
    
    if (!saveResult) {
      console.error('[API] 이미지 저장 실패');
      return NextResponse.json({ 
        success: false, 
        error: '이미지 저장 실패',
        details: '모든 업로드 방법 시도 실패'
      }, { status: 500 });
    }
    
    console.log(`[API] 이미지 저장 성공: ${saveResult.publicUrl}`);
    
    // 10. DB 업데이트
    try {
      console.log(`[API] DB 업데이트 시도 중...`);
      
      // RLS 우회를 위해 서비스 롤 클라이언트 사용 시도
      let error;
      
      if (serviceRoleKey) {
        const { error: adminUpdateError } = await supabaseAdmin
          .from('shared_images')
          .update({
            image_url: saveResult.publicUrl,
            storage_path: saveResult.storagePath
          })
          .eq('id', postId);
        
        error = adminUpdateError;
        
        if (adminUpdateError) {
          console.error(`[API] 관리자 DB 업데이트 오류: ${adminUpdateError.message}`);
        } else {
          console.log(`[API] 관리자 DB 업데이트 성공`);
        }
      } else {
        // 일반 클라이언트로 시도
        const { error: updateError } = await supabase
          .from('shared_images')
          .update({
            image_url: saveResult.publicUrl,
            storage_path: saveResult.storagePath
          })
          .eq('id', postId);
        
        error = updateError;
        
        if (updateError) {
          console.error(`[API] DB 업데이트 오류: ${updateError.message}`);
        } else {
          console.log(`[API] DB 업데이트 성공`);
        }
      }
      
      if (error) {
        // 업데이트 실패해도 이미지는 저장되었으므로 성공 응답 반환
        return NextResponse.json({ 
          success: true, 
          message: '이미지는 저장되었으나 DB 업데이트 실패',
          warning: error.message,
          data: {
            id: postId,
            image_url: saveResult.publicUrl,
            storage_path: saveResult.storagePath
          }
        });
      }
    } catch (updateError) {
      console.error('[API] DB 업데이트 중 예외:', updateError);
      // 업데이트 실패해도 이미지는 저장되었으므로 성공 응답 반환
      return NextResponse.json({ 
        success: true, 
        message: '이미지는 저장되었으나 DB 업데이트 중 오류 발생',
        warning: updateError instanceof Error ? updateError.message : String(updateError),
        data: {
          id: postId,
          image_url: saveResult.publicUrl,
          storage_path: saveResult.storagePath
        }
      });
    }
    
    // 11. 성공 응답
    console.log('[API] 처리 완료, 성공 응답 반환');
    return NextResponse.json({ 
      success: true, 
      message: '이미지가 Supabase Storage에 저장되었습니다',
      data: {
        id: postId,
        image_url: saveResult.publicUrl,
        storage_path: saveResult.storagePath
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    console.error('[API] 처리 중 오류:', errorMessage, error);
    
    // 더 자세한 오류 정보 반환
    return NextResponse.json({ 
      success: false, 
      error: '서버 처리 중 오류가 발생했습니다',
      details: errorMessage,
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

// 댓글 조회 API
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');
    
    if (!imageId) {
      return NextResponse.json({ 
        success: false, 
        message: '이미지 ID가 필요합니다' 
      }, { status: 400 });
    }
    
    console.log(`[댓글 조회] 이미지 ID: ${imageId} 댓글 조회 시도`);
    
    // 1. 원본 이미지 정보 확인
    const { data: imageData, error: imageError } = await supabase
      .from('shared_images')
      .select('id, original_generation_id')
      .eq('id', imageId)
      .single();
    
    if (imageError && imageError.code !== 'PGRST116') {
      console.error(`[댓글 조회] 이미지 조회 오류:`, imageError);
    }
    
    // 조회할 ID 결정 (원본 ID 또는 현재 ID)
    const queryId = imageData?.original_generation_id || imageId;
    console.log(`[댓글 조회] 실제 조회 ID: ${queryId}`);
    
    // 2. 댓글 조회 - 원본 ID와 현재 ID 모두 포함
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        user:user_id (*)
      `)
      .or(`image_id.eq.${queryId},image_id.eq.${imageId}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(`[댓글 조회] 오류:`, error);
      return NextResponse.json({ 
        success: false, 
        message: '댓글 조회 실패' 
      }, { status: 500 });
    }
    
    console.log(`[댓글 조회] 성공: ${data?.length || 0}개 댓글 조회됨`);
    return NextResponse.json({ 
      success: true, 
      data: data || []
    });
  } catch (error) {
    console.error(`[댓글 조회] 예외 발생:`, error);
    return NextResponse.json({ 
      success: false, 
      message: '서버 처리 중 오류가 발생했습니다' 
    }, { status: 500 });
  }
} 