import { db } from '@/lib/db'
import { comments } from '@/db/migrations/schema'
import { eq } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId') || searchParams.get('image_id')

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 })
    }

    console.log(`[GET_COMMENTS] Fetching comments for imageId: ${imageId}`);

    try {
      // 데이터베이스 연결 및 오류 처리 개선
      console.log('[GET_COMMENTS] 데이터베이스 쿼리 시작...');
      const data = await db
        .select()
        .from(comments)
        .where(eq(comments.imageId, imageId))
        .orderBy(comments.createdAt)
      
      console.log(`[GET_COMMENTS] Found ${data.length} comments for imageId: ${imageId}`);
      console.log('[GET_COMMENTS] 댓글 데이터 샘플:', data.length > 0 ? data[0] : '데이터 없음');
      
      return NextResponse.json({ 
        success: true, 
        data 
      });
    } catch (queryError) {
      console.error('[GET_COMMENTS] 데이터베이스 쿼리 오류:', queryError);
      
      // 임시 대응책: 데이터베이스 연결 실패 시 빈 배열 반환 (프로덕션에서는 적절히 수정 필요)
      return NextResponse.json({ 
        success: true, 
        data: [],
        warning: '데이터베이스 연결에 문제가 있어 댓글을 가져올 수 없습니다.'
      });
    }
  } catch (err) {
    console.error('[GET_COMMENTS_ERROR]', err);
    
    // 더 자세한 오류 정보 로깅
    if (err instanceof Error) {
      console.error(`Error details: ${err.message}`);
      console.error(`Error stack: ${err.stack}`);
    }
    
    // 클라이언트에게 빈 응답 반환 (오류가 아닌 빈 데이터로 처리)
    return NextResponse.json({ 
      success: true, 
      data: [],
      warning: '시스템 오류로 댓글을 가져올 수 없습니다.'
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log('[댓글 API] 요청 시작');
    
    const contentType = req.headers.get('content-type') || ''
    console.log('[댓글 API] Content-Type:', contentType);
    
    let imageId: string | null = null
    let userId: string | null = null
    let text: string | null = null
    let userName: string | null = null

    // Clerk 인증 정보 가져오기
    const clerkUser = await currentUser();
    const clerkUserId = clerkUser?.id || '';
    
    // FormData 방식 처리 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData()
      imageId = formData.get('imageId') as string || formData.get('image_id') as string
      userId = formData.get('userId') as string || formData.get('user_id') as string || clerkUserId
      text = formData.get('text') as string
      userName = formData.get('userName') as string || formData.get('user_name') as string || ''
      
      console.log('[댓글 API] FormData 파라미터:', { imageId, userId, text: text?.substring(0, 20) + '...', userName });
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      try {
        const jsonData = await req.json()
        imageId = jsonData.imageId || jsonData.image_id
        userId = jsonData.userId || jsonData.user_id || clerkUserId
        text = jsonData.text
        userName = jsonData.userName || jsonData.user_name || ''
        
        console.log('[댓글 API] JSON 파라미터:', { imageId, userId, text: text?.substring(0, 20) + '...', userName });
      } catch (jsonError) {
        console.error('[댓글 API] JSON 파싱 오류:', jsonError);
        return NextResponse.json({ 
          success: false, 
          error: 'JSON 파싱 오류: ' + (jsonError instanceof Error ? jsonError.message : String(jsonError))
        }, { status: 400 });
      }
    }
    // 지원하지 않는 Content-Type
    else {
      console.error('[댓글 API] 지원하지 않는 Content-Type:', contentType);
      return NextResponse.json({ 
        success: false, 
        error: `지원하지 않는 Content-Type: ${contentType}. "multipart/form-data" 또는 "application/json"을 사용하세요.`
      }, { status: 400 })
    }

    // 필수 입력값 검증
    if (!imageId || !userId || !text) {
      console.error('[댓글 API] 필수 필드 누락:', { imageId, userId, text });
      return NextResponse.json({ 
        success: false, 
        error: '필수 입력값이 누락되었습니다: image_id/imageId, user_id/userId, text/content' 
      }, { status: 400 })
    }

    // 사용자 이름이 없는 경우 기본값 설정
    if (!userName && clerkUser) {
      userName = clerkUser.firstName || 
                clerkUser.username || 
                (clerkUser.emailAddresses && clerkUser.emailAddresses.length > 0 
                  ? clerkUser.emailAddresses[0].emailAddress 
                  : '사용자');
    } else if (!userName) {
      userName = userId.includes('@') 
        ? userId.split('@')[0] 
        : (userId.startsWith('user_') ? '사용자' : userId);
    }

    console.log('[댓글 API] DB 저장 시도:', { imageId, userId });
    
    try {
      // 데이터베이스에 댓글 추가
      const [newComment] = await db
        .insert(comments)
        .values({
          imageId: imageId,
          userId: userId,
          content: text,
          userName: userName,
        })
        .returning()

      console.log('[댓글 API] DB 저장 성공:', newComment.id);
      
      return NextResponse.json({ 
        success: true, 
        data: {
          id: newComment.id,
          imageId: imageId,
          userId: userId,
          userName: userName,
          text: text,
          content: text,
          author: userName,
          createdAt: newComment.createdAt
        },
        message: '댓글이 추가되었습니다.'
      })
    } catch (dbError) {
      console.error('[댓글 API] DB 저장 오류:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'DB 저장 중 오류 발생: ' + (dbError instanceof Error ? dbError.message : String(dbError)) 
      }, { status: 500 });
    }
  } catch (err) {
    console.error('[댓글 API] 처리 중 오류:', err);
    return NextResponse.json({ 
      success: false, 
      error: '댓글 추가 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err))
    }, { status: 500 })
  }
} 