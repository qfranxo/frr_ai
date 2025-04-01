import { NextResponse } from "next/server";
import Replicate from "replicate";
import { headers } from "next/headers";
import { getUserSubscription, canUserGenerate, incrementUserGenerations } from "@/lib/db";
import { IMAGE_GENERATION_CONFIG } from "@/config/imageGeneration";
import { modelStyleMapping } from "@/config/styleMapping";
// app/api/generate/route.ts
import { db, isDatabaseConnected } from '@/lib/db'
import { generations } from '@/db/migrations/schema'
import { currentUser } from '@clerk/nextjs/server';

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
  const user = await currentUser();
  if (user) {
    userId = user.id;
    userName = user.firstName || user.username || '사용자';
  }

  // DB 연결 상태 확인
  const dbConnected = isDatabaseConnected();
  console.log("DB 연결 상태:", dbConnected ? "연결됨" : "연결 안됨");

  // 사용자 사용량 제한 확인 (DB 연결이 있을 때만)
  let canGenerate = true;
  let remaining = 999; // 기본값으로 높은 값 설정
  let subscription = null;

  // 로그인한 사용자인 경우에만 사용량 제한 확인
  if (dbConnected && user) {
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

      // DB 저장 대신 생성 결과 반환 (클라이언트에서 로컬 스토리지에 저장)
      const generatedImage = {
        id: `img_${Date.now()}`,
        imageUrl: result.output,
        prompt: prompt,
        aspectRatio: ratio,
        renderingStyle: renderStyle || style || 'standard',
        gender: gender || 'none',
        age: age || 'none',
        createdAt: new Date().toISOString()
      };
      
      // DB 연결 여부와 상관없이 이미지 생성 결과 반환
      return NextResponse.json({
        ...result,
        generatedImage
      });

      // 아래 DB 관련 코드는 주석 처리
      /* 
      if (dbConnected) {
        try {
          // 사용량 증가 (DB 연결이 있을 때만)
          await incrementUserGenerations(userId);
          console.log("사용량 증가 완료.");
          
          // DB에 생성 기록 저장
          try {
            await db.insert(generations).values({
              userId: userId,
              userName: userName,
              imageUrl: result.output,
              prompt: prompt,
              aspectRatio: ratio,
              renderingStyle: renderStyle,
              gender: gender,
              age: age,
              background: background,
              skinType: skinType,
              eyeColor: eyeColor,
              hairStyle: hairStyle,
              isShared: false,
            });
            console.log("DB에 생성 기록 저장 완료.");
          } catch (dbError) {
            console.error("DB에 생성 기록 저장 중 오류 발생:", dbError);
            // DB 저장 실패해도 결과는 반환
          }
          
          // 업데이트된 사용량 정보 가져오기
          const updatedRemaining = remaining - 1;
          subscription = await getUserSubscription(userId);
          
          return NextResponse.json({
            ...result,
            subscription: {
              tier: subscription.tier,
              maxGenerations: subscription.maxGenerations,
              remaining: updatedRemaining,
              renewalDate: subscription.renewalDate
            }
          });
        } catch (usageError) {
          console.error("사용량 업데이트 중 오류 발생:", usageError);
          // 사용량 업데이트 실패해도 결과는 반환
          return NextResponse.json(result);
        }
      } else {
        // DB 연결이 없으면 결과만 반환
        console.log("DB 연결이 없어 사용량 및 생성 기록 저장을 건너뜁니다.");
        return NextResponse.json(result);
      }
      */
    }

    // 기본 응답
    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating image:", error);
    
    // Replicate API 월별 지출 한도 오류 처리
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    if (
      errorMessage.includes("Monthly spend limit reached") || 
      errorMessage.includes("Payment Required") ||
      errorMessage.includes("402")
    ) {
      return NextResponse.json(
        { 
          error: "서비스 사용량 한도에 도달했습니다. 관리자에게 문의하시거나 잠시 후 다시 시도해주세요." 
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: `이미지 생성 중 오류 발생: ${errorMessage}` },
      { status: 500 }
    );
  }
}
