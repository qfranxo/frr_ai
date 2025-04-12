import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { comments } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';

/**
 * 댓글 삭제 API
 */
export async function DELETE(
  req: Request,
  { params }: { params: { commentId: string } }
) {
  console.log(`[DELETE API] 댓글 삭제 요청: commentId=${params.commentId}`);
  
  if (!params.commentId) {
    console.error('[DELETE API] 댓글 ID가 없음');
    return new Response(JSON.stringify({ error: '댓글 ID가 필요합니다.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 댓글 존재 여부 확인
    const existingComments = await db
      .select()
      .from(comments)
      .where(eq(comments.id, params.commentId))
      .limit(1);
    
    if (!existingComments || existingComments.length === 0) {
      console.error(`[DELETE API] 존재하지 않는 댓글: commentId=${params.commentId}`);
      return new Response(JSON.stringify({ error: '존재하지 않는 댓글입니다.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log(`[DELETE API] 댓글 삭제 실행: commentId=${params.commentId}`);
    await db
      .delete(comments)
      .where(eq(comments.id, params.commentId));
    
    console.log(`[DELETE API] 댓글 삭제 성공: commentId=${params.commentId}`);
    return new Response(JSON.stringify({ 
      success: true,
      message: '댓글이 성공적으로 삭제되었습니다.', 
      deletedCommentId: params.commentId 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[DELETE API] 댓글 삭제 중 오류 발생: commentId=${params.commentId}`, errorMessage, error);
    
    return new Response(JSON.stringify({ 
      success: false,
      error: '댓글 삭제 중 오류가 발생했습니다.', 
      details: errorMessage 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 