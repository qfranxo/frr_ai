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

export async function POST(request: Request) {
  // 디버깅을 위한 API 토큰 확인
  const apiToken = process.env.REPLICATE_API_TOKEN;
  console.log("REPLICATE_API_TOKEN 존재 여부:", !!apiToken);
  
  if (!apiToken) {
    return NextResponse.json(
      { error: "REPLICATE_API_TOKEN is not configured." },
      { status: 500 }
    );
  }

  // 로그인 검사 제거
  let userId = "anonymous";
  let userName = "익명 사용자";
  
  // 로그인한 사용자인 경우에만 사용자 정보 가져오기
  const { userId: clerkUserId } = await auth();
  if (clerkUserId) {
    userId = clerkUserId;
    userName = '사용자';
  }

  // DB 연결 상태 확인
  const dbConnected = isDatabaseConnected();
  console.log("DB 연결 상태:", dbConnected ? "연결됨" : "연결 안됨");

  // 사용자 사용량 제한 확인 (DB 연결이 있을 때만)
  let canGenerate = true;
  let remaining = 999; // 기본값으로 높은 값 설정
  let subscription = null;

  // 로그인한 사용자인 경우에만 사용량 제한 확인
  if (dbConnected && clerkUserId) {
    try {
      const usageCheck = await canUserGenerate(userId);
      canGenerate = usageCheck.canGenerate;
      remaining = usageCheck.remaining;
      
      if (!canGenerate) {
        subscription = await getUserSubscription(userId);
        return NextResponse.json({
          error: "You've used all available generations for this month.",
          subscription: {
            tier: subscription.tier,
            maxGenerations: subscription.maxGenerations,
            remaining: 0,
            renewalDate: subscription.renewalDate
          }
        }, { status: 403 });
      }
    } catch (error) {
      console.error("사용량 확인 중 오류 발생:", error);
      // 사용량 확인에 실패하더라도 이미지 생성은 진행함
      console.log("사용량 확인에 실패했지만 이미지 생성은 계속 진행합니다.");
    }
  } else {
    console.log("로그인하지 않은 사용자이거나 DB 연결이 없어 사용량 제한 확인을 건너뜁니다.");
  }

  try {
    const { prompt, style, size, gender, age, ratio, renderStyle, ethnicity, cameraDistance, clothing, hair, eyes, background, skinType, eyeColor, hairStyle } = await request.json();
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
    
    // 프롬프트를 비율에 맞게 강화
    let enhancedPrompt = prompt;
    
    // 의상 스타일 추가
    if (clothing) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.clothing[clothing as keyof typeof modelStyleMapping.clothing]}`;
    }
    
    // 헤어스타일 추가
    if (hair) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.hair[hair as keyof typeof modelStyleMapping.hair]}`;
    }
    
    // 눈 색상 추가
    if (eyes) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.eyes[eyes as keyof typeof modelStyleMapping.eyes]}`;
    }
    
    // 카메라 거리 옵션 추가
    if (cameraDistance) {
      enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.cameraDistance[cameraDistance as keyof typeof modelStyleMapping.cameraDistance]}`;
    }
    
    // Request image generation using recraft-ai/recraft-v3 model
    const modelInfo: any = {
      model: "recraft-ai/recraft-v3",
      input: {
        prompt: enhancedPrompt, // 강화된 프롬프트 사용
        size: finalSize, // 비율에 맞는 사이즈 사용
        style: style,
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
      console.log("이미지가 성공적으로 생성되었습니다. 이미지 URL:", result.output);
      
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
      
      try {
        // Replicate URL일 경우에만 저장 시도
        if (isReplicateUrl(imageUrl)) {
          console.log("Replicate 이미지를 Supabase Storage에 저장합니다:", imageUrl);
          const storageResult = await storeImageFromReplicate(
            imageUrl,
            userId,
            {
              filename: `${generationId}.webp`,
              folder: 'generations'
            }
          );
          
          storageUrl = storageResult.publicUrl;
          storagePath = storageResult.storagePath;
          console.log("이미지가 Supabase Storage에 저장되었습니다:", storageUrl);
        } else {
          console.log("Replicate URL이 아니므로 Storage 저장을 건너뜁니다:", imageUrl);
        }
      } catch (storageError) {
        console.error("이미지 저장 중 오류 발생:", storageError);
        console.warn("Supabase 저장에 실패하여 원본 URL을 사용합니다. 이 URL은 일시적일 수 있습니다.");
        // 이미지 저장에 실패한 경우에만 원본 URL 사용
      }

      // DB 저장 대신 생성 결과 반환 (클라이언트에서 로컬 스토리지에 저장)
      const generatedImage = {
        id: generationId,
        imageUrl: storageUrl, // Supabase Storage URL 사용 (저장 실패 시에만 원본 URL)
        prompt: prompt,
        aspectRatio: ratio,
        renderingStyle: renderStyle || style || 'standard',
        gender: gender || 'none',
        age: age || 'none',
        createdAt: new Date().toISOString(),
        storagePath: storagePath, // 이미지 Storage 경로 저장
        original_generation_id: isValidUUID(generationId) ? generationId : null,
      };
      
      // 사용량 증가 처리 (DB 연결이 있을 때만)
      if (dbConnected && clerkUserId) {
        try {
          await incrementUserGenerations(userId);
          console.log("사용량 증가 완료.");
        } catch (usageError) {
          console.error("사용량 업데이트 중 오류 발생:", usageError);
          // 사용량 업데이트 실패해도 계속 진행
        }
      }
      
      // DB 연결 여부와 상관없이 이미지 생성 결과 반환
      return NextResponse.json({
        ...result,
        generatedImage
      });
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
