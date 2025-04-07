import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentUser, auth } from '@clerk/nextjs/server';

// Supabase 클라이언트 초기화
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// 사용자 설정 데이터 동기화
export async function GET() {
  try {
    // Clerk에서 현재 사용자 정보 가져오기
    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
    }

    const userId = user.id;

    // 1. 사용자 좋아요 정보 가져오기
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', userId);

    if (likesError) {
      console.error('좋아요 정보 조회 오류:', likesError);
      return NextResponse.json({ error: likesError.message }, { status: 500 });
    }

    // 2. 사용자 환경설정 가져오기
    const { data: preferences, error: prefsError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (prefsError) {
      console.error('환경설정 조회 오류:', prefsError);
      // 환경설정 오류는 심각하지 않으므로 계속 진행
    }

    // 3. 사용자가 작성한 댓글이 있는 게시물 ID 가져오기
    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select('post_id')
      .eq('user_id', userId);

    if (commentsError) {
      console.error('댓글 정보 조회 오류:', commentsError);
      // 댓글 오류는 심각하지 않으므로 계속 진행
    }

    // 4. 사용자 정보 응답
    return NextResponse.json({
      userId: userId,
      email: user.emailAddresses[0]?.emailAddress,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      avatarUrl: user.imageUrl,
      likedPosts: likes?.map(item => item.post_id) || [],
      commentedPosts: comments?.map(item => item.post_id) || [],
      preferences: preferences || {
        theme: 'system',
        fontSize: 'medium',
        reduceMotion: false
      },
      lastSyncTime: new Date().toISOString()
    });
  } catch (error) {
    console.error('사용자 정보 조회 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 사용자 설정 업데이트
export async function POST(request: Request) {
  try {
    // Clerk에서 현재 인증 상태 가져오기
    const authResult = auth();
    const clerkUser = await currentUser();
    
    if (!clerkUser) {
      return NextResponse.json({ error: '인증되지 않은 사용자' }, { status: 401 });
    }

    const userId = clerkUser.id;

    const data = await request.json();
    const { action, postId, preference, value } = data;

    // 1. 좋아요 토글 처리
    if (action === 'like' || action === 'unlike') {
      const isLiking = action === 'like';

      if (!postId) {
        return NextResponse.json({ error: '게시물 ID가 필요합니다' }, { status: 400 });
      }

      if (isLiking) {
        // 좋아요 추가
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            post_id: postId,
            created_at: new Date().toISOString()
          });

        if (error) {
          // 이미 좋아요한 경우는 무시 (충돌 발생)
          if (error.code === '23505') {
            return NextResponse.json({ success: true, message: '이미 좋아요한 게시물입니다' });
          }
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 게시물 좋아요 수 업데이트
        await updatePostLikeCount(postId);
      } else {
        // 좋아요 취소
        const { error } = await supabase
          .from('likes')
          .delete()
          .match({ user_id: userId, post_id: postId });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // 게시물 좋아요 수 업데이트
        await updatePostLikeCount(postId);
      }

      return NextResponse.json({
        success: true,
        action: isLiking ? 'liked' : 'unliked',
        postId
      });
    }

    // 2. 사용자 환경설정 업데이트
    if (action === 'updatePreference') {
      if (!preference || value === undefined) {
        return NextResponse.json({ error: '환경설정 정보가 필요합니다' }, { status: 400 });
      }

      // 기존 설정 조회
      const { data: existingPrefs } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      // 설정 업데이트 또는 생성
      const prefsData = {
        user_id: userId,
        [preference]: value,
        updated_at: new Date().toISOString()
      };

      let error;
      if (existingPrefs) {
        // 설정 업데이트
        const response = await supabase
          .from('user_preferences')
          .update(prefsData)
          .eq('user_id', userId);
        error = response.error;
      } else {
        // 설정 생성
        const response = await supabase
          .from('user_preferences')
          .insert({
            ...prefsData,
            created_at: new Date().toISOString()
          });
        error = response.error;
      }

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        action: 'preferenceUpdated',
        preference,
        value
      });
    }

    return NextResponse.json({ error: '지원되지 않는 액션' }, { status: 400 });
  } catch (error) {
    console.error('API 오류:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// 게시물 좋아요 수 업데이트 유틸리티 함수
async function updatePostLikeCount(postId: string) {
  // 현재 좋아요 수 계산
  const { count, error: countError } = await supabase
    .from('likes')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (countError) {
    console.error('좋아요 수 조회 오류:', countError);
    return;
  }

  // 게시물 좋아요 수 업데이트
  const { error: updateError } = await supabase
    .from('shared_images')
    .update({ likes_count: count || 0 })
    .eq('id', postId);

  if (updateError) {
    console.error('게시물 좋아요 수 업데이트 오류:', updateError);
  }
} 