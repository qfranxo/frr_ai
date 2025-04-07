import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

/**
 * 이미지 카테고리 업데이트 API
 * 프롬프트에 'vintage'가 들어있는 이미지를 찾아 카테고리를 'vintage'로 업데이트
 */
export async function GET() {
  try {
    // 'vintage' 키워드를 포함하는 이미지 검색 (프롬프트 기반)
    const { data: images, error: searchError } = await supabase
      .from('shared_images')
      .select('id, prompt, rendering_style, category')
      .or('prompt.ilike.%vintage%,prompt.ilike.%sepia%,prompt.ilike.%toned%,prompt.ilike.%photograph style%,prompt.ilike.%retro%')
      .eq('category', 'fashion') // fashion으로 잘못 분류된 것만 검색
      .limit(100);
      
    if (searchError) {
      console.error('이미지 검색 오류:', searchError);
      return NextResponse.json({
        success: false,
        error: '이미지 검색 중 오류가 발생했습니다: ' + searchError.message
      }, { status: 500 });
    }
    
    if (!images || images.length === 0) {
      return NextResponse.json({
        success: true,
        message: '업데이트할 이미지가 없습니다.',
        count: 0
      });
    }
    
    // 각 이미지의 카테고리를 'vintage'로 업데이트
    const updateResults = [];
    
    for (const image of images) {
      // vintage 관련 키워드가 있으면 무조건 vintage로 설정
      let newCategory = 'vintage'; // 기본값으로 vintage 설정
      
      // 업데이트 수행
      const { data, error } = await supabase
        .from('shared_images')
        .update({ category: newCategory })
        .eq('id', image.id)
        .select('id, category');
        
      if (error) {
        updateResults.push({
          id: image.id,
          success: false,
          error: error.message
        });
      } else {
        updateResults.push({
          id: image.id,
          success: true,
          oldCategory: image.category,
          newCategory
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: '이미지 카테고리가 업데이트되었습니다.',
      count: updateResults.length,
      results: updateResults
    });
    
  } catch (error) {
    console.error('카테고리 업데이트 오류:', error);
    return NextResponse.json({
      success: false,
      error: '카테고리 업데이트 중 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error))
    }, { status: 500 });
  }
} 