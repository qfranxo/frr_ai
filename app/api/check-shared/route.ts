import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { generations } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';

/**
 * 이미지가 이미 공유되었는지 확인하는 API
 * @param request 요청 객체 (body에 imageUrl이 포함됨)
 * @returns 이미 공유된 경우 exists: true, 그렇지 않으면 exists: false
 */
export async function POST(request: Request) {
  try {
    // 요청 본문 파싱
    const { imageUrl } = await request.json();
    
    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Image URL is required' },
        { status: 400 }
      );
    }
    
    // 데이터베이스에서 이미지 검색
    const existingImages = await db.select()
      .from(generations)
      .where(eq(generations.imageUrl, imageUrl))
      .limit(1);
    
    const existingImage = existingImages.length > 0 ? existingImages[0] : null;
    
    // 결과 반환
    return NextResponse.json({
      exists: !!existingImage,
      image: existingImage ? {
        id: existingImage.id,
        createdAt: existingImage.createdAt
      } : null
    });
  } catch (error) {
    console.error('Error checking shared image:', error);
    return NextResponse.json(
      { error: 'Failed to check image status' },
      { status: 500 }
    );
  }
} 