import { db } from '@/lib/db'
import { comments } from '@/db/migrations/schema'
import { eq, inArray } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod' // 입력 검증을 위한 Zod

// 입력값 스키마 정의
const batchRequestSchema = z.object({
  imageIds: z.array(z.string()).min(1).max(100) // 최대 100개 이미지 ID로 제한
})

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
    
    // O(n) 복잡도로 데이터 그룹화 - 더 효율적인 알고리즘
    const commentsByImage: Record<string, any[]> = {}
    
    // 모든 이미지 ID에 대해 빈 배열 초기화
    imageIds.forEach((id: string) => {
      commentsByImage[id] = []
    })
    
    // 한 번의 순회로 데이터 채우기
    data.forEach(comment => {
      const imageId = comment.imageId
      if (imageId && commentsByImage[imageId]) {
        commentsByImage[imageId].push(comment)
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