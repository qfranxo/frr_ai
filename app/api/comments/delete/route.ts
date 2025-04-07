import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments } from '@/db/migrations/schema';
import { and, eq } from 'drizzle-orm';

export async function POST(req: Request) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let imageId: string | null = null;
    let commentId: string | null = null;
    let userId: string | null = null;

    // FormData 방식 처리 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      imageId = formData.get('image_id') as string;
      commentId = formData.get('comment_id') as string;
      userId = formData.get('user_id') as string;
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      imageId = jsonData.imageId || jsonData.image_id || jsonData.postId;
      commentId = jsonData.commentId || jsonData.comment_id;
      userId = jsonData.userId || jsonData.user_id;
    }
    // 지원하지 않는 Content-Type
    else {
      return NextResponse.json({ 
        success: false, 
        error: 'Unsupported Content-Type. Use "multipart/form-data" or "application/json"' 
      }, { status: 400 });
    }

    // 필수 입력값 검증
    if (!imageId || !commentId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: image_id/imageId, comment_id/commentId, user_id/userId' 
      }, { status: 400 });
    }

    // 댓글 존재 여부 확인
    const existingComment = await db
      .select()
      .from(comments)
      .where(
        and(
          eq(comments.id, commentId),
          eq(comments.imageId, imageId)
        )
      )
      .limit(1);

    if (existingComment.length === 0) {
      return NextResponse.json({
        success: false, 
        error: 'Comment not found'
      }, { status: 404 });
    }

    // 사용자 권한 확인 (댓글 작성자만 삭제 가능)
    if (existingComment[0].userId !== userId) {
      // 예외: 게시물 소유자는 모든 댓글 삭제 가능 (구현시 게시물 검사 추가 필요)
      return NextResponse.json({
        success: false, 
        error: 'Not authorized to delete this comment'
      }, { status: 403 });
    }

    // 댓글 삭제
    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    return NextResponse.json({
      success: true,
      message: '댓글이 삭제되었습니다.'
    });
  } catch (err) {
    console.error('[DELETE_COMMENT_ERROR]', err);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to delete comment' 
    }, { status: 500 });
  }
} 