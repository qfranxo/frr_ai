import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { currentUser } from '@clerk/nextjs/server';

// Supabase 클라이언트 생성
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// 특정 게시물 삭제를 위한 DELETE 핸들러
export async function DELETE(
  request: NextRequest,
  context: { params: { postId: string } }
) {
  try {
    const user = await currentUser();
    const userId = user?.id;
    const { postId } = context.params;
    
    if (!postId) {
      return NextResponse.json(
        { success: false, error: '게시물 ID가 필요합니다' },
        { status: 400 }
      );
    }
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: '인증이 필요합니다' },
        { status: 401 }
      );
    }

    // Supabase에서 해당 게시물 확인
    const { data: post, error: fetchError } = await supabaseClient
      .from('shared_images')
      .select('*')
      .eq('id', postId)
      .single();
    
    if (fetchError) {
      console.error('게시물 조회 오류:', fetchError);
      return NextResponse.json(
        { success: false, error: '게시물을 찾을 수 없습니다' },
        { status: 404 }
      );
    }
    
    // 본인 게시물인지 확인 (관리자는 예외)
    if (post.user_id !== userId && !process.env.ADMIN_USER_IDS?.includes(userId)) {
      return NextResponse.json(
        { success: false, error: '본인 게시물만 삭제할 수 있습니다' },
        { status: 403 }
      );
    }
    
    // Supabase에서 게시물 삭제
    const { error: deleteError } = await supabaseClient
      .from('shared_images')
      .delete()
      .eq('id', postId);
    
    if (deleteError) {
      console.error('게시물 삭제 오류:', deleteError);
      return NextResponse.json(
        { success: false, error: '게시물 삭제 실패: ' + deleteError.message },
        { status: 500 }
      );
    }
    
    // 페이지 재검증
    revalidatePath('/community');
    revalidatePath('/');
    
    return NextResponse.json({
      success: true,
      message: '게시물이 성공적으로 삭제되었습니다'
    });
    
  } catch (error: any) {
    console.error('게시물 삭제 처리 오류:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || '서버 오류가 발생했습니다'
      },
      { status: 500 }
    );
  }
} 