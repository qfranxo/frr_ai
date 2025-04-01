## 광고 모델 AI 생성 기능명세서

---

### 프론트엔드 기능명세서

#### 1. 화면 레이아웃 및 디자인 명세

- **파일 위치**: `app/generate/page.tsx`

1. **모델 설명 섹션**
   - **파일 위치**: `components/generate/PromptInput.tsx`
   - **UI 구성**: 화면 상단에 배치된 프롬프트 입력 필드
   - **프롬프트 입력 필드**:
     - ShadcN의 `Textarea` 컴포넌트 사용 (`npx shadcn@latest add textarea`)
     - 여러 줄 입력이 가능한 텍스트 영역으로 구현
     - 최대 500자 제한
     - placeholder: "광고 모델의 특징을 자세히 설명해주세요 (예: 20대 후반 여성, 밝은 미소, 전문가적 분위기...)"
     - URL 파라미터로 전달된 프롬프트 자동 입력 기능
   - **오류 처리**: 
     - ShadcN의 `toast` 컴포넌트 사용
     - 빈 프롬프트 입력 시 "모델 특징을 입력해 주세요" 메시지 표시
     - 글자 수 초과 시 "500자 이내로 입력해 주세요" 메시지 표시

2. **모델 스타일 옵션 섹션**
   - **파일 위치**: `components/generate/StyleOptions.tsx`
   - **UI 구성**:
     - ShadcN의 `Select` 컴포넌트 사용
   - **타입 정의 위치**: `types/index.ts`
   ```typescript
   export interface IModelOptions {
     pose: '정면' | '측면' | '전신' | '상반신' | '자연스러운 포즈';
     style: '비즈니스' | '캐주얼' | '스포티' | '고급스러운' | '친근한';
     background: '스튜디오' | '사무실' | '야외' | '추상적' | '단색';
     lighting: '자연광' | '스튜디오 조명' | '드라마틱' | '소프트' | '하이키';
   }
   ```

3. **이미지 생성 섹션**
   - **파일 위치**: `components/generate/ImageGeneration.tsx`
   - **UI 구성**:
     - ShadcN의 `Button` 컴포넌트 사용
     - ShadcN의 `Skeleton` 컴포넌트로 로딩 상태 표시

4. **생성된 모델 이미지 관리 섹션**
   - **파일 위치**: `components/generate/GeneratedImageActions.tsx`
   - **타입 정의**:
   ```typescript
   export interface IGeneratedModel {
     imageUrl: string;
     prompt: string;
     modelOptions: IModelOptions;
   }
   ```

---

### 백엔드 기능명세서

#### 1. 모델 생성 API

- **파일 위치**: `app/api/generate/route.ts`
- **HTTP 메서드**: `POST`
- **타입 정의 위치**: `types/index.ts`
```typescript
export interface IGenerateRequest {
  prompt: string;
  modelOptions: IModelOptions;
}

export interface IGenerateResponse {
  success: true;
  imageUrl: string;
}

export interface IErrorResponse {
  success: false;
  error: {
    code: 'INVALID_PROMPT' | 'GENERATION_FAILED' | 'SERVER_ERROR';
    message: string;
  }
}
```

#### 2. 스타일 매핑 시스템

- **파일 위치**: `app/api/generate/route.ts`
- **스타일 매핑 시스템**:
  ```typescript
  const modelStyleMapping = {
    pose: {
      '정면': 'front facing, direct eye contact',
      '측면': 'side profile, elegant pose',
      '전신': 'full body shot, standing pose',
      '상반신': 'upper body shot, professional',
      '자연스러운 포즈': 'natural pose, candid shot'
    },
    style: {
      '비즈니스': 'business attire, professional look',
      '캐주얼': 'casual wear, relaxed style',
      '스포티': 'athletic wear, dynamic pose',
      '고급스러운': 'luxury fashion, elegant style',
      '친근한': 'approachable, warm expression'
    },
    background: {
      '스튜디오': 'studio background, professional lighting',
      '사무실': 'modern office setting',
      '야외': 'outdoor natural environment',
      '추상적': 'abstract background, blurred',
      '단색': 'solid color background, clean'
    },
    lighting: {
      '자연광': 'natural daylight, soft shadows',
      '스튜디오 조명': 'professional studio lighting',
      '드라마틱': 'dramatic lighting, high contrast',
      '소프트': 'soft diffused lighting',
      '하이키': 'high-key lighting, bright and airy'
    }
  }
  ```

#### 3. Replicate API 설정

- **파일 위치**: `app/api/generate/route.ts`
- **Replicate API 설정**:
  ```typescript
  {
    model: "stability-ai/sdxl",
    input: {
      prompt: enhancedPrompt,
      negative_prompt: "deformed, distorted, disfigured, poor quality, bad anatomy, watermark, signature, blurry",
      num_outputs: 1,
      scheduler: "K_EULER",
      num_inference_steps: 50,
      guidance_scale: 7.5,
      width: 1024,
      height: 1024
    }
  }
  ```

#### 4. 품질 관리 시스템

- **파일 위치**: `utils/quality.ts`
- **기능**:
  - 얼굴 품질 검증
  - 포즈 적절성 검증
  - 전문성 수준 체크
  - 부적절한 콘텐츠 필터링

#### 5. 응답 형식

- **성공 응답**:
  ```typescript
  interface IGenerateResponse {
    success: true;
    imageUrl: string;
    quality: {
      faceQuality: number;
      poseAccuracy: number;
      professionalismScore: number;
    }
  }
  ``` 