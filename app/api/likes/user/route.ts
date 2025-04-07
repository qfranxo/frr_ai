import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  try {
    // URL 파라미터 가져오기
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');
    
    // 페이징 계산
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // 필수 입력값 검증
    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 쿼리 파라미터가 누락되었습니다: userId' 
      }, { status: 400 });
    }

    // Supabase 클라이언트 초기화
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    // 사용자의 좋아요 목록 가져오기
    const { data: likes, error, count } = await supabase
      .from('likes')
      .select('*, posts(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('사용자 좋아요 목록 가져오기 오류:', error);
      return NextResponse.json({ 
        success: false, 
        error: '좋아요 목록을 가져오는 중 오류가 발생했습니다.'
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data: likes,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: count ? Math.ceil(count / limit) : 0
      }
    });
  } catch (error) {
    console.error('사용자 좋아요 목록 API 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '요청을 처리하는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 