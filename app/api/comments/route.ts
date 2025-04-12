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
    console.log('[GET_COMMENTS] 전체 요청 URL:', req.url);
    const { searchParams } = new URL(req.url)
    const imageId = searchParams.get('imageId') || searchParams.get('image_id')

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'imageId is required' }, { status: 400 })
    }

    console.log(`[GET_COMMENTS] Fetching comments for imageId: ${imageId}`);

    try {
      // 데이터베이스 연결 및 오류 처리 개선
      console.log('[GET_COMMENTS] 데이터베이스 쿼리 시작...');
      console.log('[GET_COMMENTS] 쿼리 파라미터 imageId 타입:', typeof imageId);
      console.log('[GET_COMMENTS] 쿼리 파라미터 imageId 값:', imageId);
      
      // 정확한 비교를 위해 문자열로 변환하여 비교 (DB에서 타입이 다를 수 있음)
      const data = await db
        .select()
        .from(comments)
        .where(eq(comments.imageId, String(imageId)))
        .orderBy(desc(comments.createdAt))
      
      console.log(`[GET_COMMENTS] Found ${data.length} comments for imageId: ${imageId}`);
      if (data.length === 0) {
        console.log(`[GET_COMMENTS] 해당 이미지의 댓글이 없음. 이미지 ID 확인: ${imageId}`);
        console.log(`[GET_COMMENTS] DB에서 직접 확인을 위한 SQL: SELECT * FROM comments WHERE image_id = '${imageId}' ORDER BY created_at DESC`);
      } else {
        console.log(`[GET_COMMENTS] 첫 번째 댓글 ID: ${data[0].id}, 내용: ${data[0].content.substring(0, 20)}`);
        console.log(`[GET_COMMENTS] 마지막 댓글 ID: ${data[data.length-1].id}, 내용: ${data[data.length-1].content.substring(0, 20)}`);
      }
      console.log('[GET_COMMENTS] 댓글 데이터 샘플:', data.length > 0 ? data[0] : '데이터 없음');
      
      // 응답 데이터에 일관된 필드명 추가
      const normalizedData = data.map(comment => ({
        ...comment,
        image_id: comment.imageId,
        user_id: comment.userId,
        user_name: comment.userName,
        text: comment.content,
        created_at: comment.createdAt
      }));
      
      // 결과가 없는 경우 빈 배열 응답
      if (!normalizedData || normalizedData.length === 0) {
        console.log('[GET_COMMENTS] 정규화 후에도 데이터가 없음, 빈 배열 반환');
        return emptyCommentsResponse('댓글이 없습니다.');
      }
      
      return NextResponse.json({ 
        success: true, 
        data: normalizedData 
      }, {
        headers: {
          'Cache-Control': 'no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
    } catch (queryError) {
      console.error('[GET_COMMENTS] 데이터베이스 쿼리 오류:', queryError);
      
      // 임시 대응책: 데이터베이스 연결 실패 시 빈 배열 반환 (프로덕션에서는 적절히 수정 필요)
      return emptyCommentsResponse('데이터베이스 연결에 문제가 있어 댓글을 가져올 수 없습니다.');
    }
  } catch (err) {
    console.error('[GET_COMMENTS_ERROR]', err);
    
    // 더 자세한 오류 정보 로깅
    if (err instanceof Error) {
      console.error(`Error details: ${err.message}`);
      console.error(`Error stack: ${err.stack}`);
    }
    
    // 클라이언트에게 빈 응답 반환 (오류가 아닌 빈 데이터로 처리)
    return emptyCommentsResponse('시스템 오류로 댓글을 가져올 수 없습니다.');
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