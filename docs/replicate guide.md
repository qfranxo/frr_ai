# Next.js에서 Replicate 이미지 생성 모델 사용 가이드

## 목차
1. [프로젝트 설정](#1-프로젝트-설정)
2. [Replicate 설정](#2-replicate-설정)
3. [API 구현](#3-api-구현)
4. [프론트엔드 구현](#4-프론트엔드-구현)
5. [타입 설정](#5-타입-설정)

## 1. 프로젝트 설정

### Next.js 프로젝트 생성
```bash
npx create-next-app@latest
```

### 필요한 패키지 설치
```bash
npm install replicate
```

### next.config.js 설정
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "replicate.com",
      },
      {
        protocol: "https",
        hostname: "replicate.delivery",
      },
    ],
  },
};

module.exports = nextConfig;
```

## 2. Replicate 설정

### .env.local 파일 생성
```bash
REPLICATE_API_TOKEN=your_token_here
```

### 타입 정의
```typescript
// types/replicate.ts
export interface Prediction {
  id: string;
  version: string;
  input: FluxInput;
  output: string[];
  status: "starting" | "processing" | "succeeded" | "failed";
  error?: string;
}

// types/flux.ts
export interface FluxInput {
  prompt: string;
  num_inference_steps?: number;
  guidance_scale?: number;
  width?: number;
  height?: number;
  negative_prompt?: string;
}
```

## 3. API 구현

### 이미지 생성 API
```typescript
// app/api/predictions/route.ts
import { NextResponse } from "next/server";
import Replicate from "replicate";
import { Prediction } from "@/types/replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request) {
  if (!process.env.REPLICATE_API_TOKEN) {
    throw new Error("REPLICATE_API_TOKEN이 설정되지 않았습니다.");
  }

  const { prompt } = await request.json();

  try {
    const prediction = await replicate.predictions.create({
      model: "stability-ai/sdxl",
      version: "a00d0b7dcbb9c3fbb34ba87d2d5b46c56969c84a628bf778a7fdaec30b1b99c5",
      input: {
        prompt: `ultra realistic photograph, korean female idol, beautiful asian woman, natural makeup, clear skin, fashion photoshoot, professional portrait, ${prompt}`,
        negative_prompt: "painting, illustration, drawing, cartoon, anime, 3d, low quality, bad anatomy, deformed",
        num_inference_steps: 30,
        guidance_scale: 7.5,
        width: 768,
        height: 1024,
      },
    });
    return NextResponse.json(prediction, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "이미지 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

### 상태 확인 API
```typescript
// app/api/predictions/[id]/route.ts
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const prediction = await replicate.predictions.get(params.id);
    return NextResponse.json(prediction);
  } catch (error) {
    return NextResponse.json(
      { error: "상태 확인 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
```

## 4. 프론트엔드 구현

### 페이지 컴포넌트
```typescript
// app/page.tsx
'use client';

import { useState } from "react";
import Image from "next/image";
import { Prediction } from "@/types/replicate";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function Home() {
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const prompt = (form.prompt as HTMLInputElement).value;

    try {
      const response = await fetch("/api/predictions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      let prediction = await response.json();
      setPrediction(prediction);

      while (
        prediction.status !== "succeeded" &&
        prediction.status !== "failed"
      ) {
        await sleep(1000);
        const response = await fetch("/api/predictions/" + prediction.id);
        prediction = await response.json();
        setPrediction(prediction);
      }
    } catch (error) {
      setError("이미지 생성 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="container max-w-2xl mx-auto p-5">
      <h1 className="py-6 text-center font-bold text-2xl">
        AI 이미지 생성
      </h1>

      <form className="w-full flex" onSubmit={handleSubmit}>
        <input
          type="text"
          name="prompt"
          placeholder="이미지를 생성할 프롬프트를 입력하세요"
          className="flex-grow"
        />
        <button type="submit" className="button">
          생성
        </button>
      </form>

      {error && <div className="text-red-500">{error}</div>}

      {prediction?.output && (
        <div className="image-wrapper mt-5">
          <Image
            src={prediction.output[prediction.output.length - 1]}
            alt="생성된 이미지"
            width={768}
            height={1024}
            priority
            className="rounded-lg shadow-lg"
          />
        </div>
      )}
    </div>
  );
}
```

## 5. 주요 기능 설명

### 이미지 생성 프로세스
1. 사용자가 프롬프트 입력
2. POST 요청으로 이미지 생성 시작
3. 주기적으로 상태 확인
4. 이미지 생성 완료 시 화면에 표시

### 프롬프트 최적화
- 기본 프롬프트에 품질 향상을 위한 키워드 추가
- 네거티브 프롬프트로 품질 저하 요소 제거

### 이미지 생성 파라미터
- num_inference_steps: 30 (품질과 속도의 균형)
- guidance_scale: 7.5 (프롬프트 준수도)
- width: 768, height: 1024 (세로형 이미지)

## 참고 사항
- REPLICATE_API_TOKEN은 절대 공개되지 않도록 주의
- 이미지 생성에는 시간이 소요되므로 적절한 로딩 상태 처리 필요
- 에러 처리는 사용자 친화적으로 구현
    