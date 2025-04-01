import { NextResponse } from "next/server";
import { getUserSubscription, canUserGenerate } from "@/lib/db";
import { currentUser } from '@clerk/nextjs/server';

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
          maxGenerations: 3,
          remaining: 3,
          renewalDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 현재 날짜 + 30일
        }
      });
    }

    const userId = user.id;
    
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