import { NextResponse } from 'next/server';
// import { categorizeImage, addSharedImage } from '../community/route'; // 이 import 제거
import { v4 as uuidv4 } from 'uuid';
import { currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generations } from '@/db/migrations/schema';
import { eq } from 'drizzle-orm';
import { supabase } from '@/lib/supabase';

// 이미지 카테고리 분류 함수 (community/route.ts에서 복사)
function categorizeImage(prompt: string, renderingStyle: string): string {
  // 대소문자 구분 없이 검색할 수 있도록 소문자로 변환
  const normalizedPrompt = prompt.toLowerCase();
  const normalizedStyle = renderingStyle.toLowerCase();
  
  // 프롬프트 텍스트 분석을 통한 카테고리 분류
  if (
    normalizedPrompt.includes('portrait') || 
    normalizedPrompt.includes('face') || 
    normalizedPrompt.includes('selfie') ||
    normalizedPrompt.includes('headshot') ||
    normalizedPrompt.includes('profile') ||
    normalizedPrompt.includes('person') ||
    normalizedPrompt.includes('인물') ||
    normalizedPrompt.includes('얼굴') ||
    normalizedPrompt.includes('셀카') ||
    normalizedPrompt.includes('프로필')
  ) {
    return 'portrait';
  }
  
  // 풍경 및 자연 관련 키워드
  if (
    normalizedPrompt.includes('landscape') || 
    normalizedPrompt.includes('scenery') || 
    normalizedPrompt.includes('nature') ||
    normalizedPrompt.includes('mountain') ||
    normalizedPrompt.includes('forest') ||
    normalizedPrompt.includes('beach') ||
    normalizedPrompt.includes('sea') ||
    normalizedPrompt.includes('ocean') ||
    normalizedPrompt.includes('자연') ||
    normalizedPrompt.includes('풍경') ||
    normalizedPrompt.includes('산') ||
    normalizedPrompt.includes('바다')
  ) {
    return 'landscape';
  }
  
  // 스타일 기반 분류
  if (
    normalizedStyle.includes('anime') || 
    normalizedStyle.includes('cartoon') ||
    normalizedPrompt.includes('anime') || 
    normalizedPrompt.includes('cartoon') ||
    normalizedPrompt.includes('manga') ||
    normalizedPrompt.includes('comic') ||
    normalizedPrompt.includes('애니메이션') ||
    normalizedPrompt.includes('만화') ||
    normalizedPrompt.includes('애니')
  ) {
    return 'anime';
  }
  
  // 기타 분류 로직...
  
  // 기본 카테고리
  return 'other';
}

// addSharedImage 함수 간소화 버전 (share API에서만 사용)
async function addSharedImage(newImage: any): Promise<any> {
  try {
    // 간단하게 Supabase에 직접 저장
    const { data, error } = await supabase
      .from('shared_images')
      .insert({
        id: newImage.id,
        user_id: newImage.userId,
        user_name: newImage.userName,
        image_url: newImage.imageUrl,
        prompt: newImage.prompt,
        aspect_ratio: newImage.aspectRatio,
        rendering_style: newImage.renderingStyle,
        gender: newImage.gender,
        age: newImage.age,
        category: newImage.category,
        created_at: newImage.createdAt,
        like_count: 0,
        comments_count: 0
      })
      .select();
      
    if (error) {
      console.error("Error in addSharedImage:", error);
      throw error;
    }
    
    return newImage; // 원본 이미지 객체 반환
  } catch (error) {
    console.error("Error in addSharedImage:", error);
    throw error;
  }
}

// Simplified Share API (with persistent storage)
export async function POST(request: Request) {
  try {
    const data = await request.json();
    console.log("Share request received:", data);
    
    // 인증 정보 가져오기 - Clerk의 currentUser 함수 사용
    const user = await currentUser();
    console.log("Current user:", user ? `ID: ${user.id}, Name: ${user.username || user.firstName}` : "No user authenticated");
    
    // 이미지 데이터 추출
    const { 
      imageUrl, 
      prompt, 
      style,
      renderingStyle, 
      gender, 
      age, 
      aspectRatio,
      username = user?.username || user?.firstName || '사용자', // 사용자 이름은 옵션
      selectedCategory // 사용자가 선택한 카테고리
    } = data;
    
    console.log("Image data extracted:", { 
      imageUrl: imageUrl ? "URL exists" : "Missing URL", 
      prompt, 
      style,
      renderingStyle, 
      gender, 
      age, 
      aspectRatio,
      username,
      selectedCategory
    });
    
    if (!imageUrl) {
      console.error("Error: Image URL is missing");
      return NextResponse.json({ 
        success: false, 
        error: "Image URL is required" 
      }, { status: 400 });
    }
    
    // 사용자가 선택한 카테고리가 있으면 그것을 사용하고, 없으면 자동 분류
    // style 정보와 renderingStyle 정보를 모두 전달하여 더 정확한 분류 가능하게 함
    const category = selectedCategory || categorizeImage(prompt || '', renderingStyle || style || '');
    console.log("Categorized as:", category);
    
    // 새 공유 이미지 객체 생성
    const imageId = uuidv4(); // ID 생성: UUID 형식으로 변경 (shared- 접두어 제거)
    const newSharedImage = {
      id: imageId,
      userId: user?.id || `guest-${Date.now()}`, // 로그인된 사용자 ID 또는 게스트 ID
      userName: username, // 사용자 이름 저장
      imageUrl,
      prompt: prompt || '',
      aspectRatio: aspectRatio || '1:1',
      renderingStyle: renderingStyle || '',
      gender: gender || '',
      age: age || '',
      category, // 사용자 지정 또는 자동 분류된 카테고리
      createdAt: new Date().toISOString()
    };
    
    console.log("Attempting to save shared image:", newSharedImage.id);
    
    // 직접 Supabase로 저장 시도 (중요: 오류 정보 상세 로깅)
    try {
      console.log("Directly inserting to Supabase shared_images table...");
      
      // Supabase 직접 삽입 시도
      const { data: insertData, error: insertError } = await supabase
        .from('shared_images')
        .insert({
          id: imageId,
          user_id: newSharedImage.userId,
          user_name: newSharedImage.userName,
          image_url: newSharedImage.imageUrl,
          prompt: newSharedImage.prompt,
          aspect_ratio: newSharedImage.aspectRatio,
          rendering_style: newSharedImage.renderingStyle,
          gender: newSharedImage.gender,
          age: newSharedImage.age,
          category: newSharedImage.category,
          created_at: newSharedImage.createdAt,
          like_count: 0,
          comments_count: 0
        })
        .select();
      
      if (insertError) {
        console.error("Supabase direct insert failed:", {
          code: insertError.code,
          message: insertError.message,
          details: insertError.details,
          hint: insertError.hint
        });
        throw new Error(`Supabase insert error: ${insertError.message}`);
      }
      
      console.log("Supabase direct insert successful:", insertData);
      
      // 1. addSharedImage 함수도 백업으로 시도
      try {
        console.log("Also trying via addSharedImage function...");
        await addSharedImage(newSharedImage);
      } catch (backupError) {
        console.warn("Backup addSharedImage failed (but direct insert worked):", backupError);
      }
      
      // 2. generations 테이블 업데이트 (isShared 플래그)
      try {
        console.log("Updating or inserting in generations table...");
        
        // generationId가 있는 경우 (기존 생성 이미지를 공유하는 경우)
        if (data.generationId) {
          // generations 테이블의 isShared 플래그 업데이트
          const updated = await db.update(generations)
            .set({ isShared: true })
            .where(eq(generations.id, data.generationId))
            .returning();
            
          console.log("Updated existing generation:", updated);
        } else {
          // 새로운 이미지인 경우 generations 테이블에 새 레코드 삽입
          const insertedImage = await db.insert(generations).values({
            id: imageId,
            userId: user?.id || null,
            imageUrl: imageUrl,
            prompt: prompt || '',
            aspectRatio: aspectRatio || '1:1',
            renderingStyle: renderingStyle || '',
            gender: gender || '',
            age: age || '',
            isShared: true,
            createdAt: new Date()
          }).returning();
          
          console.log("Inserted new generation:", insertedImage);
        }
      } catch (dbError) {
        // generations 테이블 업데이트/삽입 실패시에도 공유는 성공으로 간주
        console.error("Warning: Failed to update generations table:", dbError);
      }
      
      // 성공 응답 반환
      return NextResponse.json({ 
        success: true, 
        message: "Image shared successfully and saved to Supabase",
        id: imageId,
        category: category,
        source: "supabase_direct"
      });
    } catch (directInsertError) {
      console.error("Direct Supabase insert failed:", directInsertError);
      
      // 원래 방식으로 폴백 - addSharedImage 함수 사용
      try {
        console.log("Falling back to addSharedImage function...");
        const savedImage = await addSharedImage(newSharedImage);
        console.log("Image shared successfully via addSharedImage:", savedImage.id);
        
        // 성공 응답 반환
        return NextResponse.json({ 
          success: true, 
          message: "Image shared successfully via fallback method",
          id: savedImage.id,
          category: savedImage.category,
          source: "addSharedImage"
        });
      } catch (fallbackError) {
        console.error("Fallback addSharedImage failed too:", fallbackError);
        
        // 로컬 DB에 직접 저장 시도
        try {
          console.log("Attempting to save directly to generations table...");
          
          // generations 테이블에 직접 저장
          const insertedImage = await db.insert(generations).values({
            id: imageId,
            userId: user?.id || null,
            imageUrl: imageUrl,
            prompt: prompt || '',
            aspectRatio: aspectRatio || '1:1',
            renderingStyle: renderingStyle || '',
            gender: gender || '',
            age: age || '',
            isShared: true,
            createdAt: new Date()
          }).returning();
          
          console.log("Successfully saved to generations table:", insertedImage);
          
          return NextResponse.json({ 
            success: true, 
            message: "Image shared successfully (saved to local DB only)",
            id: imageId,
            category: category,
            source: "local_db"
          });
        } catch (dbError) {
          console.error("Error saving to local DB:", dbError);
          
          // 모든 저장 시도 실패
          return NextResponse.json({ 
            success: false, 
            error: "Failed to save image to any storage",
            details: {
              directError: directInsertError instanceof Error ? directInsertError.message : String(directInsertError),
              fallbackError: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
              dbError: dbError instanceof Error ? dbError.message : String(dbError)
            }
          }, { status: 500 });
        }
      }
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "An error occurred while processing the request",
      details: error instanceof Error ? error.message : String(error)
    }, { status: 400 });
  }
} 