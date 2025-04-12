import { db } from '@/lib/db'
import { comments } from '@/db/migrations/schema'
import { eq, desc } from 'drizzle-orm'
import { NextRequest, NextResponse } from 'next/server'
import { currentUser } from '@clerk/nextjs/server'

// 일관된 빈 배열 응답을 위한 헬퍼 함수
function emptyCommentsResponse(warning: string = '') {
  return NextResponse.json({ 
    success: true, 
    data: [], 
    warning
  }, {
    headers: {
      'Cache-Control': 'no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId') || searchParams.get('image_id')

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 })
    }

    // 최소한의 로깅만 유지
    console.log(`[GET_COMMENTS] 요청: imageId=${imageId}`);

    try {
      // 응답 성능 최적화: 필요한 필드만 선택적으로 가져오기
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
        .where(eq(comments.imageId, String(imageId)))
        .orderBy(desc(comments.createdAt))
        .limit(100) // 최대 100개 댓글로 제한하여 성능 향상
      
      // 최소 로깅만 유지
      console.log(`[GET_COMMENTS] ${imageId}에 대해 ${data.length}개 댓글 조회 완료`);
      
      // 응답 데이터에 일관된 필드명 추가 (필드 매핑 최소화)
      const normalizedData = data.map(comment => ({
        ...comment,
        image_id: comment.imageId,
        user_id: comment.userId,
        user_name: comment.userName,
        text: comment.content,
      }));
      
      // 결과가 없는 경우 빈 배열 응답
      if (!normalizedData || normalizedData.length === 0) {
        return emptyCommentsResponse();
      }
      
      // 캐싱 헤더 개선: 5분 동안 캐싱 허용 (댓글은 항상 최신일 필요는 없음)
      return NextResponse.json({ 
        success: true, 
        data: normalizedData 
      }, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=600',
          'Expires': new Date(Date.now() + 300000).toUTCString() // 5분
        }
      });
    } catch (queryError) {
      console.error('[GET_COMMENTS] 데이터베이스 오류:', queryError);
      return emptyCommentsResponse();
    }
  } catch (err) {
    console.error('[GET_COMMENTS_ERROR]', err);
    return emptyCommentsResponse();
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
      
      console.log('[댓글 API] FormData 파라미터:', { 
        imageId, 
        userId: userId ? '***마스킹됨***' : 'null', 
        text: text?.substring(0, 20) + '...', 
        userName: userName ? '***마스킹됨***' : 'null' 
      });
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      try {
        const jsonData = await req.json()
        imageId = jsonData.imageId || jsonData.image_id
        userId = jsonData.userId || jsonData.user_id || clerkUserId
        text = jsonData.text
        userName = jsonData.userName || jsonData.user_name || ''
        
        console.log('[댓글 API] JSON 파라미터:', { 
          imageId, 
          userId: userId ? '***마스킹됨***' : 'null', 
          text: text?.substring(0, 20) + '...', 
          userName: userName ? '***마스킹됨***' : 'null' 
        });
      } catch (jsonError) {
        console.error('[댓글 API] JSON 파싱 오류:', jsonError);
        return NextResponse.json({ 
          success: false, 
          error: 'JSON 파싱 오류: ' + (jsonError instanceof Error ? jsonError.message : String(jsonError))
        }, { 
          status: 400,
          headers: {
            'Cache-Control': 'no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
      }
    }
    // 지원하지 않는 Content-Type
    else {
      console.error('[댓글 API] 지원하지 않는 Content-Type:', contentType);
      return NextResponse.json({ 
        success: false, 
        error: `지원하지 않는 Content-Type: ${contentType}. "multipart/form-data" 또는 "application/json"을 사용하세요.`
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // 필수 입력값 검증
    if (!imageId || !userId || !text) {
      console.error('[댓글 API] 필수 필드 누락:', { imageId, userId, text });
      return NextResponse.json({ 
        success: false, 
        error: '필수 입력값이 누락되었습니다: image_id/imageId, user_id/userId, text/content' 
      }, { 
        status: 400,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    }

    // UUID 형식인지 확인 (모든 DB는 아니지만 많은 경우 imageId가 UUID 형식이어야 함)
    // 정규식을 사용하여 대략적인 UUID 형식인지 확인 (완벽한 검증은 아님)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    // imageId가 UUID가 아닌 경우 경고 로그 (오류는 아님)
    if (!uuidRegex.test(imageId)) {
      console.warn('[댓글 API] imageId가 표준 UUID 형식이 아닙니다:', imageId);
      console.warn('[댓글 API] 이로 인해 DB 쿼리 시 불일치가 발생할 수 있습니다');
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

    console.log('[댓글 API] DB 저장 시도:', { 
      imageId, 
      hasUserId: !!userId 
    });
    console.log('[댓글 API] DB 저장 시 imageId 타입:', typeof imageId);
    
    try {
      // INSERT 쿼리문 로깅
      console.log(`[댓글 API] 실행할 SQL 문: INSERT INTO comments (imageId, userId, content, userName) VALUES ('${imageId}', '***마스킹됨***', '${text?.substring(0, 20)}...', '***마스킹됨***')`);
      
      // 데이터베이스에 댓글 추가
      const [newComment] = await db
        .insert(comments)
        .values({
          imageId: String(imageId),
          userId: String(userId),
          content: text,
          userName: userName,
        })
        .returning()

      console.log('[댓글 API] DB 저장 성공:', newComment.id);
      console.log('[댓글 API] 저장된 댓글 데이터:', newComment);
      console.log('[댓글 API] imageId 저장값 확인:', newComment.imageId);
      console.log('[댓글 API] imageId 타입 확인:', typeof newComment.imageId);
      
      // 임시 댓글 생성 시 서버 응답과 동일한 구조 사용
      const tempComment = {
        id: newComment.id,
        imageId: newComment.imageId,
        image_id: newComment.imageId,
        userId: newComment.userId,
        user_id: newComment.userId,
        userName: newComment.userName,
        user_name: newComment.userName,
        text: newComment.content,
        content: newComment.content,
        createdAt: newComment.createdAt,
        created_at: newComment.createdAt
      };
      
      return NextResponse.json({ 
        success: true, 
        data: [tempComment], // 단일 객체를 배열로 감싸서 GET과 일관성 유지
        message: '댓글이 추가되었습니다.'
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
    } catch (dbError) {
      console.error('[댓글 API] DB 저장 오류:', dbError);
      return NextResponse.json({ 
        success: false, 
        error: 'DB 저장 중 오류 발생: ' + (dbError instanceof Error ? dbError.message : String(dbError)) 
      }, { 
        status: 500,
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    }
  } catch (err) {
    console.error('[댓글 API] 처리 중 오류:', err);
    return NextResponse.json({ 
      success: false, 
      error: '댓글 추가 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err))
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })
  }
} 