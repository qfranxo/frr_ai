import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';

export async function DELETE(
  req: Request,
  { params }: { params: { commentId: string } }
) {
  try {
    const commentId = params.commentId;

    if (!commentId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Comment ID is required' 
      }, { status: 400 });
    }

    // 댓글 존재 여부 확인
    const existingComment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (existingComment.length === 0) {
      return NextResponse.json({
        success: false, 
        error: 'Comment not found'
      }, { status: 404 });
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