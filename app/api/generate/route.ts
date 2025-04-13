import { NextResponse } from "next/server";
import Replicate from "replicate";
import { headers } from "next/headers";
import { getUserSubscription, canUserGenerate, incrementUserGenerations } from "@/lib/db";
import { IMAGE_GENERATION_CONFIG } from "@/config/imageGeneration";
import { modelStyleMapping } from "@/config/styleMapping";
// app/api/generate/route.ts
import { db, isDatabaseConnected } from '@/lib/db'
import { generations } from '@/db/migrations/schema'
import { auth } from '@clerk/nextjs/server';
import { v4 as uuidv4 } from "uuid";
import { storeImageFromReplicate } from "@/utils/image-storage";
import { formDataApi } from '@/lib/api';
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import { isReplicateUrl, isValidImageUrl } from "@/utils/image-utils";
import { generateEnhancedPrompt, generateNegativePrompt } from "@/utils/prompt";


// Vercel 서버리스 함수의 실행 시간 제한 설정 (60초)
export const maxDuration = 60;
// 실제 Clerk의 auth 헬퍼 사용
// function auth() {
//   const headersList = headers();
//   // In a real app, we would validate a session token from the headers
//   // For this demo, we'll use a fixed user ID
//   return { userId: "user_1234567890" };
// }

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// UUID 유효성 검사 함수
function isValidUUID(str: string | null | undefined) {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// 개발 테스트용 ID 생성
const testImageId = uuidv4(); // "550e8400-e29b-41d4-a716-446655440000" 형식

// 스타일에 따른 카테고리 매핑 함수 추가
function getCategoryFromStyle(style?: string, prompt?: string): string {
  if (!style && !prompt) return 'portrait';
  
  const styleLower = style?.toLowerCase() || '';
  const promptLower = prompt?.toLowerCase() || '';
  
  // 스타일에 따른 카테고리 매핑 테이블
  const styleToCategory: { [key: string]: string } = {
    // 애니메이션 스타일
    'anime': 'anime',
    'digital_illustration': 'anime',
    'digital_illustration/pixel_art': 'anime',
    'digital_illustration/hand_drawn': 'anime',
    'digital_illustration/infantile_sketch': 'anime',
    'cartoon': 'anime',
    
    // 포트레이트 스타일
    'realistic': 'portrait',
    'realistic_image': 'portrait',
    'realistic_image/studio_portrait': 'portrait',
    'realistic_image/natural_light': 'portrait',
    'portrait': 'portrait',
    'photo': 'portrait',
    
    // 풍경 스타일
    'landscape': 'landscape',
    'nature': 'landscape',
    'scenery': 'landscape',
    
    // 도시 스타일
    'city': 'urban',
    'urban': 'urban',
    'architecture': 'urban',
    
    // 판타지 스타일
    'fantasy': 'fantasy',
    'magical': 'fantasy',
    'dragon': 'fantasy',
    
    // 미래적 스타일
    'sci-fi': 'sci-fi',
    'future': 'sci-fi',
    'space': 'sci-fi',
    'futuristic': 'sci-fi',
    'cyber': 'sci-fi',
    
    // 빈티지 스타일
    'vintage': 'vintage',
    'retro': 'vintage',
    'old style': 'vintage',
    'classic': 'vintage',
    'sepia': 'vintage',
    'toned portrait': 'vintage',
    'old fashioned': 'vintage',
    'photograph style': 'vintage',
    'vintage photograph': 'vintage',
    'vintage photo': 'vintage',
    'vintage style': 'vintage',
    'retro style': 'vintage'
  };
  
  // 정확한 매칭 먼저 시도
  if (styleToCategory[styleLower]) {
    return styleToCategory[styleLower];
  }
  
  // 부분 매칭으로 카테고리 찾기
  for (const [styleKey, category] of Object.entries(styleToCategory)) {
    if (styleLower.includes(styleKey)) {
      return category;
    }
  }
  
  // 프롬프트에서 카테고리 관련 키워드 찾기
  const promptCategoryKeywords: { [key: string]: string } = {
    // 애니메이션 키워드
    'anime': 'anime',
    '애니메이션': 'anime',
    '만화': 'anime',
    'cartoon': 'anime',
    
    // 풍경 키워드
    '풍경': 'landscape',
    '산': 'landscape',
    '바다': 'landscape',
    '자연': 'landscape',
    'landscape': 'landscape',
    'mountain': 'landscape',
    'nature': 'landscape',
    'ocean': 'landscape',
    
    // 도시 키워드
    '도시': 'urban',
    '건물': 'urban',
    '거리': 'urban',
    'city': 'urban',
    'building': 'urban',
    'street': 'urban',
    
    // 판타지 키워드
    '판타지': 'fantasy',
    '마법': 'fantasy',
    '용': 'fantasy',
    'fantasy': 'fantasy',
    'magical': 'fantasy',
    'dragon': 'fantasy',
    
    // 미래 키워드
    '미래': 'sci-fi',
    '우주': 'sci-fi',
    '로봇': 'sci-fi',
    'futuristic': 'sci-fi',
    'space': 'sci-fi',
    'robot': 'sci-fi',
    
    // 빈티지 키워드
    '빈티지': 'vintage',
    '복고': 'vintage',
    '옛날': 'vintage',
    'vintage': 'vintage',
    'retro': 'vintage'
  };
  
  // 프롬프트에서 키워드 찾기
  for (const [keyword, category] of Object.entries(promptCategoryKeywords)) {
    if (promptLower.includes(keyword)) {
      return category;
    }
  }
  
  return 'other'; // 기본값을 'portrait'에서 'other'로 변경
}

// 요청에서 비율 정보 추출하는 함수
function getAspectRatioFromRequest(ratio: string | undefined, finalSize: string | undefined): string {
  // ratio가 명시적으로 제공된 경우 사용
  if (ratio) {
    return ratio;
  }
  
  // 크기 정보에서 비율 추출
  if (finalSize) {
    if (finalSize === "1024x1024") return "1:1";
    if (finalSize === "1024x1820") return "9:16";
    if (finalSize === "1820x1024") return "16:9";
  }
  
  // 기본값으로 9:16 사용 (1:1 대신)
  return "9:16";
}

export async function POST(request: Request) {
  console.log("[/api/generate] Processing request...");

  // Check if connected to Supabase database
  const isConnected = (await supabase.from('users').select('id', { count: 'exact', head: true })).data !== null;
  console.log(`[/api/generate] Connected to Supabase: ${isConnected}`);

  try {
    // Get auth data - 비동기 함수로 처리
    const session = await auth();
    if (!session.userId) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }
    
    const userId = session.userId;
    
    // Check if user can generate more images based on their subscription
    const { canGenerate, remaining } = await canUserGenerate(userId);
    
    if (!canGenerate) {
      // 구독 정보 확인하여 더 구체적인 에러 메시지 제공
      const subscriptionInfo = await getUserSubscription(userId);
      const tier = subscriptionInfo.tier;
      
      // 무료 사용 횟수 소진 시 명확한 업그레이드 안내 메시지
      return NextResponse.json(
        { 
          error: "사용 가능한 이미지 생성 횟수를 모두 소진했습니다.", 
          details: {
            message: "더 많은 이미지를 생성하려면 구독을 업그레이드하세요.",
            tier: tier,
            limit: subscriptionInfo.maxGenerations,
            usedAll: true,
            remainingGenerations: 0
          }
        },
        { status: 402 } // 402 Payment Required
      );
    }

    // Parse the request body
    const bodyText = await request.text();
    const body = JSON.parse(bodyText);
    
    const { prompt, style, size, gender, age, ratio, renderStyle, ethnicity, cameraDistance, clothing, hair, eyes, background, skinType, eyeColor, hairStyle } = body;
    console.log("요청 데이터:", { prompt, style, size, gender, age, ratio, renderStyle, ethnicity, cameraDistance, clothing, hair, eyes });
    
    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required." },
        { status: 400 }
      );
    }
    
    console.log("recraft-ai/recraft-v3 모델로 이미지 생성 시작...");
    
    // 비율에 따른 사이즈 결정 로직 추가
    let finalSize = size;
    if (ratio === "9:16") {
      // 세로형 비율을 명확히 지정 - API 지원 크기 사용
      finalSize = "1024x1820"; // API에서 지원하는 세로형 크기
    } else if (ratio === "16:9") {
      // 가로형 비율 명확히 지정
      finalSize = "1820x1024"; // API에서 지원하는 가로형 크기
    } else if (ratio === "1:1") {
      // 정사각형 비율
      finalSize = "1024x1024"; // 정사각형 크기
    }
    
    console.log("적용된 이미지 크기:", finalSize);
    
    // 프롬프트 강화 (기존 로직)
    let enhancedPrompt = prompt;
    
    // 의상 스타일 추가
    if (clothing) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.clothing[clothing as keyof typeof modelStyleMapping.clothing]}`;
    }
    
    // 헤어스타일 추가
    if (hair) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.hair[hair as keyof typeof modelStyleMapping.hair]}`;
    }
    
    // 눈 색상 및 품질 향상 추가
    if (eyes) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.eyes[eyes as keyof typeof modelStyleMapping.eyes]}`;
    }
    
    // 카메라 거리 옵션 추가
    if (cameraDistance) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.cameraDistance[cameraDistance as keyof typeof modelStyleMapping.cameraDistance]}`;
    }
    
    // 새로운 프롬프트 향상 함수 사용
    enhancedPrompt = generateEnhancedPrompt(enhancedPrompt, {
      style: style || 'realistic',
      renderStyle: renderStyle || 'realistic'
    });
    
    // 네거티브 프롬프트 생성
    const negativePrompt = generateNegativePrompt(renderStyle);
    
    // Request image generation using recraft-ai/recraft-v3 model
    const modelInfo: any = {
      model: "recraft-ai/recraft-v3",
      input: {
        prompt: enhancedPrompt, // 강화된 프롬프트 사용
        size: finalSize, // 비율에 맞는 사이즈 사용
        style: style,
        negative_prompt: negativePrompt
      },
    };
    
    // 버전이 지정된 경우에만 추가
    if (IMAGE_GENERATION_CONFIG.version) {
      modelInfo.version = IMAGE_GENERATION_CONFIG.version;
    }
    
    console.log("API 요청 정보:", modelInfo);
    
    const prediction = await replicate.predictions.create(modelInfo);
    
    console.log("초기 예측 결과:", prediction);

    let result = prediction;
    let attempts = 0;
    const maxAttempts = 30; // 최대 30초 대기
    
    while (result.status !== "succeeded" && result.status !== "failed" && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      result = await replicate.predictions.get(prediction.id);
      attempts++;
      console.log(`예측 상태 확인 (${attempts}/${maxAttempts}):`, result.status);
    }
    
    console.log("최종 예측 결과:", result);

    // 실패한 경우 오류 반환
    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.error || "Failed to generate image." },
        { status: 500 }
      );
    }
    
    // 타임아웃된 경우
    if (attempts >= maxAttempts && result.status !== "succeeded") {
      return NextResponse.json(
        { error: "Image generation timed out." },
        { status: 504 }
      );
    }

    // DB에 생성 기록 저장 (DB 연결이 있을 때만)
    if (result.status === "succeeded") {
      // 콘솔 로그 제거
      
      // 고유 ID 생성
      const generationId = uuidv4();
      
      // 이미지 URL (Replicate의 출력)
      const imageUrl = Array.isArray(result.output) && result.output.length > 0 
        ? result.output[0] 
        : (result.output || null); // null을 명시적으로 설정
      
      // 이미지 URL이 없으면 오류 반환
      if (!isValidImageUrl(imageUrl)) {
        return NextResponse.json(
          { error: "이미지 생성 결과가 없습니다." },
          { status: 500 }
        );
      }
      
      // Supabase Storage에 이미지 저장 (모든 경우 저장)
      let storageUrl = imageUrl;
      let storagePath = '';
      
      // 이미지 스토리지 저장 부분 제거 - 공유할 때만 저장하도록 수정
      // 이미지 URL은 그대로 Replicate에서 제공한 URL 사용
      
      // DB 저장 대신 생성 결과 반환 (클라이언트에서 로컬 스토리지에 저장)
      const generatedImage = {
        id: generationId,
        imageUrl: imageUrl, // 원본 Replicate URL 사용
        prompt: prompt,
        aspectRatio: getAspectRatioFromRequest(ratio, finalSize),
        renderingStyle: renderStyle || style || 'standard',
        gender: gender || 'none',
        age: age || 'none',
        category: getCategoryFromStyle(renderStyle || style, prompt) || 'portrait', // 카테고리 필드 추가
        createdAt: new Date().toISOString(),
        storagePath: '', // 저장 경로 없음
        original_generation_id: isValidUUID(generationId) ? generationId : null,
      };
      
      // 사용량 증가 처리 - DB 연결 여부와 관계없이 항상 실행
      try {
        // 항상 사용량 증가 실행 (DB 연결 여부와 무관하게)
        await incrementUserGenerations(userId);
        console.log("사용량 증가 완료.");
        
        // 사용량 증가 후 다시 한번 사용 가능 여부 확인
        const { remaining } = await canUserGenerate(userId);
        
        // DB 연결 여부와 상관없이 이미지 생성 결과 반환
        return NextResponse.json({
          ...result,
          generatedImage,
          userUsage: {
            remaining: remaining
          }
        });
      } catch (usageError) {
        console.error("사용량 업데이트 중 오류 발생:", usageError);
        // 사용량 업데이트 실패해도 계속 진행
        
        // DB 연결 여부와 상관없이 이미지 생성 결과 반환
        return NextResponse.json({
          ...result,
          generatedImage
        });
      }
    }

    // 기본 응답
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Replicate API 월별 지출 한도 오류 처리
    const errorDetails = {
      type: typeof error,
      isError: error instanceof Error,
      name: error instanceof Error ? error.name : 'UnknownError',
      message: error instanceof Error ? error.message : String(error || 'Unknown error'),
      stack: error instanceof Error ? error.stack : undefined,
      stringValue: typeof error?.toString === 'function' ? error.toString() : 'Cannot convert to string',
      rawValue: error
    };
    
    console.error('🔴 이미지 생성 중 오류:', errorDetails);
    
    if (
      errorDetails.message.includes("Monthly spend limit reached") || 
      errorDetails.message.includes("Payment Required") ||
      errorDetails.message.includes("402")
    ) {
      return NextResponse.json(
        { 
          error: "서비스 사용량 한도에 도달했습니다. 관리자에게 문의하시거나 잠시 후 다시 시도해주세요." 
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: errorDetails.message },
      { status: 500 }
    );
  }
}
