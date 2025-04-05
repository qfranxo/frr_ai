import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";

// 좋아요 API 구현 - 클라이언트에서 사용자 이름 직접 전달받기
export async function POST(req: Request) {
  try {
    // 요청 데이터 파싱
    const { imageId, userId, userName: clientUserName } = await req.json();
    
    if (!imageId || !userId) {
      return NextResponse.json({ 
        success: false, 
        message: "이미지 ID와 사용자 ID가 필요합니다" 
      }, { status: 400 });
    }
    
    console.log("[API] 요청 처리:", userId, imageId);
    
    // 사용자 이름 결정 (클라이언트에서 제공한 이름 우선 사용)
    let userName = clientUserName || "익명 사용자";
    
    // 클라이언트에서 이름을 제공하지 않은 경우에만 서버에서 시도
    if (!clientUserName) {
      try {
        // Clerk의 auth 함수를 사용하여 현재 인증된 사용자 정보 가져오기
        const { sessionClaims } = await auth();
        
        // 세션 클레임에서 사용자 이름 추출 (있는 경우)
        if (sessionClaims && typeof sessionClaims === 'object') {
          const name = sessionClaims.name as string;
          const firstName = sessionClaims.firstName as string;
          const lastName = sessionClaims.lastName as string;
          
          // 이름 정보가 있는 경우에만 사용
          if (name && name.trim() !== '') {
            userName = name;
          } else if (firstName && firstName.trim() !== '') {
            userName = firstName + (lastName && lastName.trim() !== '' ? ` ${lastName}` : '');
          } else if (userId) {
            // 이름이 없으면 사용자 ID의 일부 사용
            userName = `사용자_${userId.substring(0, 8)}`;
          }
        }
      } catch (error) {
        console.error("[API] 사용자 정보 가져오기 실패:", error);
        // 오류가 발생해도 계속 진행 (기본값으로 처리)
      }
    }
    
    console.log("[API] 최종 사용자 이름:", userName);
    
    // Supabase 대신 직접 fetch 사용
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?image_id=eq.${imageId}&user_id=eq.${userId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    const existingLikes = await response.json();
    
    if (existingLikes && existingLikes.length > 0) {
      // 좋아요 삭제
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?id=eq.${existingLikes[0].id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      return NextResponse.json({ success: true, action: 'removed' });
    } else {
      // 좋아요 추가 (사용자 이름 포함)
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        },
        body: JSON.stringify({
          image_id: imageId,
          user_id: userId,
          user_name: userName // 사용자 이름 추가
        })
      });
      
      return NextResponse.json({ success: true, action: 'added' });
    }
  } catch (error) {
    console.error("[API] 오류:", error);
    return NextResponse.json({ success: false, message: String(error) }, { status: 500 });
  }
}

// 좋아요 상태 및 개수 조회 - 단순화
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const imageId = url.searchParams.get('imageId');
    const userId = url.searchParams.get('userId');
    
    if (!imageId) {
      return new Response(
        JSON.stringify({ success: false, message: '이미지 ID가 필요합니다' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 직접 Supabase API 호출
    const countResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?image_id=eq.${imageId}&select=id`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    
    const likesData = await countResponse.json();
    const count = likesData.length;
    
    // 사용자 ID가 제공된 경우 좋아요 상태 확인
    let isLiked = false;
    
    if (userId) {
      const userLikeResponse = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/likes?image_id=eq.${imageId}&user_id=eq.${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      });
      
      const userLikes = await userLikeResponse.json();
      isLiked = userLikes.length > 0;
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        count: count,
        isLiked
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[좋아요 GET] 오류:', error);
    return new Response(
      JSON.stringify({ success: false, message: '서버 오류가 발생했습니다' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 