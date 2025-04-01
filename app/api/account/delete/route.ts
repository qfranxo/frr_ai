import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 생성
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nipdzyfwjqpgojccoqgm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey!);

export async function DELETE() {
  try {
    // Clerk에서 현재 인증된 사용자 ID 가져오기
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: '인증되지 않은 요청입니다.' }, { status: 401 });
    }

    // 1. 사용자 좋아요 삭제
    const { error: likesError } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', userId);

    if (likesError) {
      console.error('좋아요 데이터 삭제 오류:', likesError);
    }

    // 2. 사용자 댓글 삭제
    const { error: commentsError } = await supabase
      .from('comments')
      .delete()
      .eq('user_id', userId);

    if (commentsError) {
      console.error('댓글 데이터 삭제 오류:', commentsError);
    }

    // 3. 사용자 이미지 삭제
    const { error: imagesError } = await supabase
      .from('shared_images')
      .delete()
      .eq('user_id', userId);

    if (imagesError) {
      console.error('이미지 데이터 삭제 오류:', imagesError);
    }

    // 4. 사용자 generations 삭제
    const { error: generationsError } = await supabase
      .from('generations')
      .delete()
      .eq('user_id', userId);

    if (generationsError) {
      console.error('생성 데이터 삭제 오류:', generationsError);
    }

    // 5. 기타 사용자 관련 데이터 삭제
    // 필요한 경우 추가 테이블에서 사용자 데이터 삭제

    // 성공 응답 반환
    return NextResponse.json({ 
      success: true,
      message: '사용자 데이터가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('사용자 데이터 삭제 오류:', error);
    return NextResponse.json(
      { error: '사용자 데이터 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 