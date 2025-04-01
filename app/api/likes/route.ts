import { NextResponse } from 'next/server';
import { communityApi } from '@/lib/api';

// 좋아요 API 구현
export async function POST(request: Request) {
  try {
    const data = await request.json();
    const { postId, userId } = data;
    
    if (!postId || !userId) {
      return NextResponse.json({ 
        success: false, 
        error: "Post ID and User ID are required" 
      }, { status: 400 });
    }
    
    // 기존 API를 내부적으로 호출
    const result = await communityApi.toggleLike(postId, userId, false, 1);
    
    return NextResponse.json({
      success: result.success,
      isLiked: true, // 새로 추가된 좋아요는 항상 true
      message: result.message
    });
  } catch (error) {
    console.error('Error processing like:', error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to process like" 
    }, { status: 500 });
  }
} 