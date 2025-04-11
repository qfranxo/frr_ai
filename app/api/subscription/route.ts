import { NextResponse } from "next/server";
import { getUserSubscription, canUserGenerate } from "@/lib/db";
import { currentUser } from '@clerk/nextjs/server';
import { supabase } from "@/lib/supabase";

// 하드코딩된 함수 제거
// function auth() {
//   const headersList = headers();
//   // In a real app, we would validate a session token from the headers
//   // For this demo, we'll use a fixed user ID
//   return { userId: "user_1234567890" };
// }

export async function GET() {
  try {
    // Clerk에서 현재 사용자 정보 가져오기
    const user = await currentUser();
    
    // 로그인하지 않은 경우 기본 구독 정보 반환 (스타터 플랜)
    if (!user) {
      console.log('User not authenticated, returning default starter plan');
      return NextResponse.json({
        subscription: {
          tier: "starter", // 기본 스타터 플랜
          maxGenerations: 2,
          remaining: 2,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 현재 날짜 + 30일
        }
      });
    }

    const userId = user.id;
    
    // Supabase에서 구독 정보 가져오기 시도
    const { data: subscriptionData, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    // Supabase에 구독 정보가 있는 경우
    if (!error && subscriptionData) {
      // 각 티어별 최대 생성 가능 횟수
      const maxGenerations = 
        subscriptionData.plan === 'premium' ? 50 : 
        subscriptionData.plan === 'starter' ? 2 : 0;
      
      const usageCount = subscriptionData.usage_count || 0;
      const remaining = Math.max(0, maxGenerations - usageCount);
      
      return NextResponse.json({
        subscription: {
          tier: subscriptionData.plan,
          maxGenerations: maxGenerations,
          remaining: remaining,
          renewalDate: subscriptionData.next_renewal_date,
          // 추가 정보
          startDate: subscriptionData.created_at,
          nextBillingDate: subscriptionData.next_renewal_date,
          autoRenew: subscriptionData.auto_renew
        }
      });
    }
    
    // Supabase에 정보가 없거나 조회 실패한 경우 기존 로직으로 폴백
    // 사용자 구독 정보 가져오기 (getUserSubscription은 기본적으로 스타터 플랜 반환)
    const subscription = await getUserSubscription(userId);
    const { canGenerate, remaining } = await canUserGenerate(userId);

    return NextResponse.json({
      subscription: {
        tier: subscription.tier,
        maxGenerations: subscription.maxGenerations,
        remaining: remaining,
        renewalDate: subscription.renewalDate
      }
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({
      error: "Failed to fetch subscription information"
    }, { status: 500 });
  }
} 