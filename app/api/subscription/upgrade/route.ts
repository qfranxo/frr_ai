import { NextResponse } from "next/server";
import { getUserSubscription, upgradeSubscription, canUserGenerate } from "@/lib/db";
import { currentUser } from '@clerk/nextjs/server';

// TODO: Properly integrate Clerk authentication
// This is a temporary function until Clerk integration issues are resolved
// function getAuthUserId() {
//   // In production, this would extract the user ID from Clerk auth
//   // For now, using a fixed user ID for testing
//   return "user_1234567890";
// }

export async function POST() {
  try {
    // Clerk에서 현재 사용자 정보 가져오기
    const user = await currentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in." },
        { status: 401 }
      );
    }
    
    const userId = user.id;
    console.log("Processing subscription upgrade for user:", userId);

    // Check current subscription
    const currentSubscription = await getUserSubscription(userId);
    
    // Check if already premium
    if (currentSubscription.tier === 'premium') {
      return NextResponse.json(
        { error: "You are already a premium member" },
        { status: 400 }
      );
    }

    // Handle subscription upgrade
    // In production, payment processing logic would be added here
    try {
      const updatedSubscription = await upgradeSubscription(userId);
      const { remaining } = await canUserGenerate(userId);

      // Return updated subscription info
      return NextResponse.json({
        success: true,
        subscription: {
          tier: updatedSubscription.tier,
          maxGenerations: updatedSubscription.maxGenerations,
          remaining,
          renewalDate: updatedSubscription.renewalDate
        }
      });
    } catch (upgradeError) {
      console.error("Error during upgrade process:", upgradeError);
      return NextResponse.json(
        { error: "Failed to process subscription upgrade. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error upgrading subscription:", error);
    return NextResponse.json(
      { error: "An error occurred while upgrading your subscription" },
      { status: 500 }
    );
  }
} 