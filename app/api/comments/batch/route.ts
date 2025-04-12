import { db } from '@/lib/db'
import { comments } from '@/db/migrations/schema'
import { eq, desc, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'

// 일관된 빈 응답을 위한 헬퍼 함수
function emptyBatchResponse() {
  return NextResponse.json({ 
    success: true, 
    data: {} 
  }, {
    headers: {
      'Cache-Control': 'public, max-age=300, s-maxage=600',
      'Expires': new Date(Date.now() + 300000).toUTCString() // 5분
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const imageIds = searchParams.getAll('imageIds')

    if (!imageIds || imageIds.length === 0) {
      return NextResponse.json({ success: false, error: 'imageIds parameter is required' }, { status: 400 })
    }

    // 최대 10개 이미지로 제한 (성능 보장)
    const limitedImageIds = imageIds.slice(0, 10);
    console.log(`[BATCH_COMMENTS] 요청: ${limitedImageIds.length}개 이미지 댓글 로드`);

    try {
      // 하나의 쿼리로 모든 이미지에 대한 댓글 조회
      const data = await db
        .select({
          id: comments.id,
          imageId: comments.imageId,
          userId: comments.userId,
          userName: comments.userName,
          content: comments.content,
          createdAt: comments.createdAt,
        })
        .from(comments)
        .where(inArray(comments.imageId, limitedImageIds.map(id => String(id))))
        .orderBy(desc(comments.createdAt))
        .limit(200) // 전체 최대 200개로 제한

      // 이미지 ID별로 댓글 그룹화
      const groupedComments: Record<string, any[]> = {};
      
      // 초기화 (빈 배열 보장)
      limitedImageIds.forEach(id => {
        if (id) {
          groupedComments[id] = [];
        }
      });
      
      // 각 댓글을 올바른 이미지 그룹에 추가
      data.forEach(comment => {
        const imageId = comment.imageId;
        
        if (imageId && typeof imageId === 'string') {
          if (!groupedComments[imageId]) {
            groupedComments[imageId] = [];
          }
          
          // 필드 매핑
          groupedComments[imageId].push({
            ...comment,
            image_id: comment.imageId,
            user_id: comment.userId,
            user_name: comment.userName,
            text: comment.content,
          });
        }
      });
      
      console.log(`[BATCH_COMMENTS] ${data.length}개 댓글 로드 완료`);
      
      // 캐싱 헤더를 포함하여 응답
      return NextResponse.json({ 
        success: true, 
        data: groupedComments 
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600',
          'Expires': new Date(Date.now() + 300000).toUTCString() // 5분
        }
      });
    } catch (queryError) {
      console.error('[BATCH_COMMENTS] 데이터베이스 오류:', queryError);
      return emptyBatchResponse();
    }
  } catch (err) {
    console.error('[BATCH_COMMENTS_ERROR]', err);
    return emptyBatchResponse();
  }
}

export async function POST(req: NextRequest) {
  try {
    // 요청 본문 파싱
    const body = await req.json()
    
    // 스키마 검증
    const validation = batchRequestSchema.safeParse(body)
    if (!validation.success) {
      return NextResponse.json({ 
        success: false, 
        error: '유효하지 않은 요청 형식',
        details: validation.error.format()
      }, { status: 400 })
    }
    
    const { imageIds } = validation.data
    
    console.log(`[BATCH_COMMENTS] Fetching comments for ${imageIds.length} images`)
    
    // 성능 최적화를 위한 단일 쿼리 수행
    const startTime = performance.now()
    const data = await db
      .select()
      .from(comments)
      .where(inArray(comments.imageId, imageIds))
      .orderBy(comments.createdAt)
    
    console.log(`[BATCH_COMMENTS] Query executed in ${(performance.now() - startTime).toFixed(2)}ms, found ${data.length} comments`)
    console.log('[BATCH_COMMENTS] 첫 번째 댓글 데이터 샘플:', data.length > 0 ? data[0] : '데이터 없음')
    
    // O(n) 복잡도로 데이터 그룹화 - 더 효율적인 알고리즘
    const commentsByImage: Record<string, any[]> = {}
    
    // 모든 이미지 ID에 대해 빈 배열 초기화
    imageIds.forEach((id: string) => {
      commentsByImage[id] = []
    })
    
    // 한 번의 순회로 데이터 채우기 (필드 매핑 추가)
    data.forEach(comment => {
      const imageId = comment.imageId
      if (imageId && commentsByImage[imageId]) {
        // text 필드 추가 (content 값을 사용)
        commentsByImage[imageId].push({
          ...comment,
          text: comment.content, // content 값을 text 필드로 복제
        })
      }
    })
    
    // 캐싱 및 CORS 헤더 추가
    return NextResponse.json(
      { success: true, data: commentsByImage },
      { 
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'Access-Control-Allow-Origin': '*',
        }
      }
    )
  } catch (err) {
    console.error('[BATCH_COMMENTS_ERROR]', err)
    
    return NextResponse.json({ 
      success: false, 
      error: '서버 오류가 발생했습니다',
      message: err instanceof Error ? err.message : '알 수 없는 오류'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate'
      }
    })
  }
} 