import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';

export async function POST(req: NextRequest) {
  try {
    // Supabase 클라이언트 초기화
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const contentType = req.headers.get('content-type') || '';
    let postId: string | null = null;
    let userId: string | null = null;
    let isLiked: boolean | null = null;

    // FormData 방식 처리 (multipart/form-data)
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      postId = formData.get('postId') as string;
      userId = formData.get('userId') as string;
      isLiked = formData.get('isLiked') === 'true';
    } 
    // JSON 방식 처리 (application/json)
    else if (contentType.includes('application/json')) {
      const jsonData = await req.json();
      postId = jsonData.postId || jsonData.post_id;
      userId = jsonData.userId || jsonData.user_id;
      isLiked = jsonData.isLiked;
    }
    // 지원하지 않는 Content-Type
    else {
      return NextResponse.json({ 
        success: false, 
        error: '지원하지 않는 Content-Type입니다. "multipart/form-data" 또는 "application/json"을 사용하세요.' 
      }, { status: 400 });
    }

    // 필수 입력값 검증
    if (!postId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: '필수 필드가 누락되었습니다: postId/post_id, userId/user_id' 
      }, { status: 400 });
    }

    // 좋아요 상태 확인 (toggle을 위해)
    const { data: existingLikes } = await supabase
      .from('likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', userId);

    // 좋아요 토글 로직
    if (existingLikes && existingLikes.length > 0) {
      // 좋아요가 이미 있는 경우 - 삭제
      const { error: deleteError } = await supabase
        .from('likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('좋아요 삭제 오류:', deleteError);
        return NextResponse.json({ 
          success: false, 
          error: '좋아요를 삭제하는 중 오류가 발생했습니다.'
        }, { status: 500 });
      }
    } else {
      // 좋아요가 없는 경우 - 추가
      const { error: insertError } = await supabase
        .from('likes')
        .insert([
          { post_id: postId, user_id: userId }
        ]);

      if (insertError) {
        console.error('좋아요 추가 오류:', insertError);
        return NextResponse.json({ 
          success: false, 
          error: '좋아요를 추가하는 중 오류가 발생했습니다.'
        }, { status: 500 });
      }
    }

    // 좋아요 개수 업데이트
    const { data: updatedLikesCount } = await supabase
      .from('likes')
      .select('*', { count: 'exact' })
      .eq('post_id', postId);

    // 캐시 무효화
    revalidatePath('/community');
    revalidatePath('/');

    return NextResponse.json({ 
      success: true, 
      likesCount: updatedLikesCount ? updatedLikesCount.length : 0,
      isLiked: !existingLikes || existingLikes.length === 0 // 새로운 상태
    });
  } catch (error) {
    console.error('좋아요 API 오류:', error);
    return NextResponse.json({ 
      success: false, 
      error: '요청을 처리하는 중 오류가 발생했습니다.'
    }, { status: 500 });
  }
} 