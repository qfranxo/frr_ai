import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // URL 파라미터 가져오기
    const url = new URL(req.url);
    const postId = url.searchParams.get('postId');
    const userId = url.searchParams.get('userId');

    // 필수 입력값 검증
    if (!postId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 쿼리 파라미터가 누락되었습니다: postId, userId' 
      }, { status: 400 });
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 좋아요 상태 확인
    const { data, error, count } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('좋아요 상태 확인 오류:', error);
      return NextResponse.json({ 
        success: false, 
        error: '좋아요 상태를 확인하는 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    // 총 좋아요 개수 가져오기
    const { data: totalLikes, error: countError } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', postId);

    if (countError) {
      console.error('좋아요 개수 확인 오류:', countError);
      return NextResponse.json({ 
        success: false, 
        error: '좋아요 개수를 확인하는 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      isLiked: data && data.length > 0,
      likesCount: totalLikes ? totalLikes.length : 0
    });
  } catch (error) {
    console.error('좋아요 상태 확인 API 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '요청을 처리하는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 