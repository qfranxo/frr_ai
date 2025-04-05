import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { comments } from "@/db/migrations/schema";
import { eq } from "drizzle-orm";

// 댓글 조회 - 간소화
export async function GET(req: Request) {
  try {
    console.log('[댓글 GET] 요청 시작');
    
    const url = new URL(req.url);
    const imageId = url.searchParams.get('imageId');

    if (!imageId) {
      console.log('[댓글 GET] imageId 누락');
      return new Response(
        JSON.stringify({ success: false, message: '이미지 ID가 필요합니다' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('[댓글 GET] 이미지 ID:', imageId);
    
    // Drizzle ORM으로 댓글 조회
    const data = await db
      .select()
      .from(comments)
      .where(eq(comments.imageId, imageId));

    console.log(`[댓글 GET] 조회 결과: ${data.length}개 댓글 발견`);
    
    return new Response(
      JSON.stringify({ success: true, data }), 
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[댓글 GET] 오류 발생:', err);
    return new Response(
      JSON.stringify({ success: false, message: '댓글을 불러오는데 실패했습니다' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// 댓글 작성 - 인증 의존성 제거
export async function POST(req: Request) {
  try {
    console.log('[댓글 POST] 요청 시작');
    
    const contentType = req.headers.get('content-type') || '';
    let data;
    
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      data = {
        imageId: formData.get('imageId') || formData.get('image_id'),
        text: formData.get('text') || formData.get('content'),
        userName: formData.get('userName') || formData.get('user_name'),
        userId: formData.get('userId') || formData.get('user_id')
      };
    } else {
      return new Response(
        JSON.stringify({ success: false, message: '지원하지 않는 Content-Type입니다' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const { imageId, text, userName, userId } = data;
    console.log("[댓글 API] 요청 데이터:", { imageId, userId });
    
    if (!imageId || !text || !userId) {
      return new Response(
        JSON.stringify({ success: false, message: '이미지 ID, 댓글 내용, 사용자 ID는 필수입니다' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Drizzle ORM으로 댓글 추가
    const [newComment] = await db
      .insert(comments)
      .values({
        imageId: imageId,
        userId: userId,
        userName: userName || 'User',
        content: text
      })
      .returning();
      
    console.log('[댓글 POST] 댓글 추가 성공:', newComment.id);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        data: {
          id: newComment.id,
          imageId: imageId,
          userId: userId,
          userName: userName || 'User',
          text: text,
          createdAt: newComment.createdAt
        },
        message: '댓글이 추가되었습니다'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[댓글 POST] 오류 발생:', err);
    return new Response(
      JSON.stringify({ success: false, message: '댓글 추가에 실패했습니다' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 