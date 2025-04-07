import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getUserSharedImages, deleteUserImage, unshareUserImage } from '@/lib/db';
import { processImageUrl } from '@/utils/image-utils';

/**
 * 사용자의 이미지 목록을 가져오는 API
 * GET /api/user/images
 */
export async function GET(request: Request) {
  try {
    // 로그인 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 });
    }

    // URL 파라미터 파싱 (필터링 등 옵션 처리)
    const url = new URL(request.url);
    const filter = url.searchParams.get('filter') || 'all'; // all, shared, unshared

    // 사용자의 이미지 가져오기
    const images = await getUserSharedImages(userId);
    
    // 필터링 적용
    let filteredImages = [...images];
    if (filter === 'shared') {
      filteredImages = images.filter(img => img.shared === true);
    } else if (filter === 'unshared') {
      filteredImages = images.filter(img => img.shared === false);
    }
    
    // 이미지 URL 처리
    const processedImages = filteredImages.map(img => ({
      ...img,
      image_url: processImageUrl(img.image_url)
    }));

    return NextResponse.json({ 
      success: true, 
      data: processedImages
    });
  } catch (error) {
    console.error('이미지 목록 조회 중 오류 발생:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

/**
 * 이미지 공유 상태를 변경하는 API
 * PATCH /api/user/images
 */
export async function PATCH(request: Request) {
  try {
    // 로그인 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 });
    }
    
    // 요청 데이터 파싱
    const data = await request.json();
    const { imageId, action } = data;
    
    if (!imageId) {
      return NextResponse.json({ 
        success: false, 
        error: '이미지 ID가 필요합니다.' 
      }, { status: 400 });
    }
    
    if (action === 'unshare') {
      // 공유 취소 처리
      const result = await unshareUserImage(userId, imageId);
      
      if (!result.success) {
        return NextResponse.json({ 
          success: false, 
          error: result.error || '공유 취소 실패' 
        }, { status: 400 });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: '이미지 공유가 취소되었습니다.' 
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: '지원하지 않는 작업입니다.' 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('이미지 공유 상태 변경 중 오류 발생:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
}

/**
 * 이미지를 삭제하는 API
 * DELETE /api/user/images
 */
export async function DELETE(request: Request) {
  try {
    // 로그인 확인
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '로그인이 필요합니다.' 
      }, { status: 401 });
    }
    
    // URL 파라미터에서 이미지 ID 가져오기
    const url = new URL(request.url);
    const imageId = url.searchParams.get('id');
    
    if (!imageId) {
      return NextResponse.json({ 
        success: false, 
        error: '이미지 ID가 필요합니다.' 
      }, { status: 400 });
    }
    
    // 이미지 삭제
    const result = await deleteUserImage(userId, imageId);
    
    if (!result.success) {
      return NextResponse.json({ 
        success: false, 
        error: result.error || '이미지 삭제 실패' 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: '이미지가 삭제되었습니다.' 
    });
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : '서버 오류가 발생했습니다.' 
    }, { status: 500 });
  }
} 