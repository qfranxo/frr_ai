import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// 간소화된 이미지 공유 확인 API
export async function POST(request: Request) {
  try {
    // 요청 데이터 파싱
    const data = await request.json();
    const imageUrl = data.imageUrl || data.image_url;
    
    if (!imageUrl) {
      return NextResponse.json({ 
        success: false, 
        error: 'Image URL is required' 
      }, { status: 400 });
    }
    
    // DB에서 이미지 URL로 검색
    const { data: existingImages, error } = await supabase
      .from('shared_images')
      .select('id')
      .eq('image_url', imageUrl)
      .limit(1);
    
    if (error) {
      console.error('Database query error:', error);
      return NextResponse.json({ 
        success: false, 
        error: 'Database error' 
      }, { status: 500 });
    }
    
    // 결과 반환
    return NextResponse.json({
      success: true,
      exists: existingImages && existingImages.length > 0,
      imageId: existingImages && existingImages.length > 0 ? existingImages[0].id : null
    });
    
  } catch (error) {
    console.error('Check shared API error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Server error' 
    }, { status: 500 });
  }
} 