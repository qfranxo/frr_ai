import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { comments } from "@/db/migrations/schema";
import { and, eq } from "drizzle-orm";

// 댓글 삭제 API - 인증 의존성 제거
export async function POST(req: Request) {
  try {
    console.log('[댓글 삭제] 요청 시작');
    
    // 요청 데이터 추출
    const { commentId, imageId, userId } = await req.json();
    console.log('[댓글 삭제] 요청 데이터:', { commentId, userId });
    
    if (!commentId || !userId) {
      return new Response(
        JSON.stringify({ success: false, message: '댓글 ID와 사용자 ID가 필요합니다' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 댓글 소유자 확인
    const commentToDelete = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);
    
    if (commentToDelete.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: '댓글을 찾을 수 없습니다' }), 
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 본인의 댓글만 삭제 가능 (관리자는 예외)
    if (commentToDelete[0].userId !== userId) {
      return new Response(
        JSON.stringify({ success: false, message: '본인의 댓글만 삭제할 수 있습니다' }), 
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 댓글 삭제
    const deletedComments = await db
      .delete(comments)
      .where(and(
        eq(comments.id, commentId),
        eq(comments.userId, userId)
      ))
      .returning();
    
    if (deletedComments.length === 0) {
      return new Response(
        JSON.stringify({ success: false, message: '댓글 삭제에 실패했습니다' }), 
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('[댓글 삭제] 삭제 성공:', commentId);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: '댓글이 삭제되었습니다'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[댓글 삭제] 오류 발생:', err);
    return new Response(
      JSON.stringify({ success: false, message: '댓글 삭제에 실패했습니다' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 