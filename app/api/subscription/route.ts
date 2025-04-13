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
          // 기본 정보
          tier: subscriptionData.plan,
          maxGenerations: maxGenerations,
          remaining: remaining,
          
          // 모든 테이블 컬럼 데이터 포함
          id: subscriptionData.id,
          user_id: subscriptionData.user_id,
          plan: subscriptionData.plan,
          billing_cycle: subscriptionData.billing_cycle,
          auto_renew: subscriptionData.auto_renew,
          next_renewal_date: subscriptionData.next_renewal_date,
          cancelled: subscriptionData.cancelled,
          created_at: subscriptionData.created_at,
          usage_count: subscriptionData.usage_count,
          last_reset_at: subscriptionData.last_reset_at,
          is_active: subscriptionData.is_active,
          refunded: subscriptionData.refunded
        }
      });
    }
    
    // 구독 정보가 없을 경우 구독 생성 시도
    const defaultPlan = {
      plan: 'starter',
      billing_cycle: 'monthly',
      auto_renew: true,
      next_renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      cancelled: false,
      created_at: new Date().toISOString(),
      usage_count: 0,
      last_reset_at: new Date().toISOString(),
      is_active: true,
      refunded: false
    };
    
    // 구독 레코드 생성
    const { data: newSubscription, error: insertError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userId,
        ...defaultPlan
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('새 구독 생성 실패:', insertError);
      
      // 현재 메모리에 저장된 구독 정보 반환
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
    }
    
    // 새로 생성된 구독 정보 반환
    return NextResponse.json({
      subscription: {
        tier: newSubscription.plan,
        maxGenerations: newSubscription.plan === 'premium' ? 50 : 2,
        remaining: newSubscription.plan === 'premium' ? 50 : 2,
        
        // 모든 테이블 컬럼 데이터 포함
        id: newSubscription.id,
        user_id: newSubscription.user_id,
        plan: newSubscription.plan,
        billing_cycle: newSubscription.billing_cycle,
        auto_renew: newSubscription.auto_renew,
        next_renewal_date: newSubscription.next_renewal_date,
        cancelled: newSubscription.cancelled,
        created_at: newSubscription.created_at,
        usage_count: newSubscription.usage_count,
        last_reset_at: newSubscription.last_reset_at,
        is_active: newSubscription.is_active,
        refunded: newSubscription.refunded
      }
    });
  } catch (error) {
    console.error("Error fetching subscription:", error);
    return NextResponse.json({
      error: "Failed to fetch subscription information"
    }, { status: 500 });
  }
} 