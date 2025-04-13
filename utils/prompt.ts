import { IModelOptions } from "@/types";

export function generateEnhancedPrompt(prompt: string, options: IModelOptions): string {
  // 기본 프롬프트 향상
  let enhancedPrompt = prompt;

  // 자연스러운 눈을 위한 향상
  enhancedPrompt = addNaturalEyesEnhancement(enhancedPrompt);
  
  // 전신 균형을 위한 향상
  enhancedPrompt = addBalancedBodyFocus(enhancedPrompt);
  
  // 기본 품질 향상 키워드 추가
  enhancedPrompt = addQualityEnhancements(enhancedPrompt);
  
  // 얼굴 품질 향상 접미사 추가
  const facialQualitySuffix = ", perfect face, detailed face, realistic facial features, symmetrical facial features, clear eyes, natural-looking face, high-definition facial details, flawless facial proportions, sharp facial features";
  
  // 추가 품질 향상 접미사
  let qualitySuffix = ", best quality, highly detailed, ultra sharp, 4k, hd, masterpiece, professional, award winning";
  
  // 렌더링 스타일에 따른 추가 접미사
  if (options.renderStyle?.toLowerCase() === 'anime' || options.style?.toLowerCase() === 'anime') {
    qualitySuffix += ", best anime art, anime masterpiece, detailed anime style, anime key visual, anime cg";
  } else if (options.renderStyle?.toLowerCase() === 'realistic' || options.style?.toLowerCase() === 'realistic' || !options.renderStyle) {
    qualitySuffix += ", photorealistic, hyperrealistic, photographic, 8k photography, ultra-detailed" + facialQualitySuffix;
  }
  
  // 최종 품질 향상 접미사 추가
  enhancedPrompt += qualitySuffix;
  
  return enhancedPrompt;
}

// 자연스러운 눈을 위한 프롬프트 향상
export function addNaturalEyesEnhancement(prompt: string): string {
  // 이미 눈 색상이 지정되어 있는지 확인
  const hasEyeColorKeywords = ['blue eyes', 'brown eyes', 'green eyes', 'hazel eyes', 'gray eyes'].some(
    keyword => prompt.toLowerCase().includes(keyword)
  );
  
  // 눈 색상이 지정되지 않았다면 자연스러운 눈 색상 추가 (과도한 검은색 방지)
  if (!hasEyeColorKeywords) {
    // 다양한 자연스러운 눈 색상 옵션
    const naturalEyeColors = [
      "natural brown eyes",
      "warm brown eyes",
      "light brown eyes", 
      "natural hazel eyes",
      "warm hazel eyes"
    ];
    
    // 무작위로 자연스러운 눈 색상 선택
    const randomEyeColor = naturalEyeColors[Math.floor(Math.random() * naturalEyeColors.length)];
    prompt = `${prompt}, ${randomEyeColor}`;
  }
  
  // 눈 관련 키워드가 있는지 확인
  const hasEyeKeywords = ['eye', 'eyes', 'eyeball', 'iris', 'pupil', 'eyelash'].some(
    keyword => prompt.toLowerCase().includes(keyword)
  );
  
  // 이미 눈 관련 키워드가 있다면 최소한의 향상만 추가
  if (hasEyeKeywords) {
    return `${prompt}, symmetrical eyes, natural looking eyes`;
  }
  
  // 없다면 자연스러운 눈 프롬프트 추가 (최소화)
  return `${prompt}, symmetrical eyes, natural looking eyes`;
}

// 전신 균형을 위한 프롬프트 향상 (얼굴 집중 완화)
export function addBalancedBodyFocus(prompt: string): string {
  // 전신 사진이나 인물 촬영 관련 표현이 있는지 확인
  const hasFullBodyKeywords = ['full body', 'whole body', 'head to toe', 'full shot'].some(
    keyword => prompt.toLowerCase().includes(keyword)
  );
  
  // 얼굴 관련 키워드가 있는지 확인
  const hasFaceKeywords = ['face', 'portrait', 'headshot', 'close-up', 'closeup'].some(
    keyword => prompt.toLowerCase().includes(keyword)
  );
  
  // 얼굴 키워드가 있다면 그대로 두고, 아니면서 전신 키워드도 없다면 균형있는 구도 추가
  if (!hasFaceKeywords && !hasFullBodyKeywords) {
    return `${prompt}, balanced composition, medium shot, showing upper body to lower body`;
  }
  
  return prompt;
}

// 이미지 품질 향상을 위한 프롬프트 추가
export function addQualityEnhancements(prompt: string): string {
  // 기본 품질 키워드
  const qualityKeywords = [
    "high quality", 
    "detailed", 
    "realistic", 
    "photorealistic", 
    "professional photography",
    "85mm lens",
    "sharp focus",
    "studio lighting"
  ];
  
  // 이미 품질 관련 키워드가 있는지 확인
  const hasQualityKeywords = qualityKeywords.some(
    keyword => prompt.toLowerCase().includes(keyword.toLowerCase())
  );
  
  // 이미 있다면 추가 품질 향상 키워드를 추가하지 않음
  if (hasQualityKeywords) {
    return prompt;
  }
  
  // 없다면 품질 향상 키워드 추가
  return `${prompt}, high quality, photorealistic, professional photography`;
}

// 네거티브 프롬프트 생성 함수 - 얼굴 관련 부분 강화
export function generateNegativePrompt(renderStyle?: string): string {
  // 기본 네거티브 프롬프트 (모든 스타일에 공통 적용)
  const baseNegativePrompt = "poorly drawn face, mutation, deformed, ugly, blurry, bad anatomy, bad proportions, extra limbs, cloned face, skinny, glitchy, double face, two heads, disfigured, malformed limbs, missing arms, missing legs, extra arms, extra legs, mutated hands, mutated feet, distorted face, asymmetric face, deformed eyes, crossed eyes, face blemishes, bad teeth, crooked teeth, misshapen jawline";

  // 애니메이션 스타일인 경우 추가 네거티브 프롬프트
  if (renderStyle?.toLowerCase() === 'anime' || renderStyle?.toLowerCase() === 'cartoon') {
    return `${baseNegativePrompt}, bad-artist-anime, bad-image-v2-39000, bad_prompt_version2, worst quality, low quality, normal quality, lowres, low details, oversaturated, undersaturated, overexposed, underexposed, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, jpeg artifacts, signature, watermark, username, blurry, bad feet, multiple views, reference sheet, long body, multiple breasts, (mutated hands and fingers:1.5), (mutation, poorly drawn:1.2), (long body:1.3), poorly drawn, mutilated, tracing, traced, ugly, transition, mutated`;
  }

  // 리얼리스틱 스타일인 경우 추가 네거티브 프롬프트 (얼굴 품질 강화)
  if (renderStyle?.toLowerCase() === 'realistic' || !renderStyle) {
    return `${baseNegativePrompt}, deformed iris, deformed pupils, semi-realistic, cgi, 3d, render, sketch, cartoon, drawing, anime, mutated hands and fingers, floating limbs, disconnected limbs, malformed hands, blurry, badly drawn face, distorted face, poorly drawn face, extra limb, poorly drawn hands, missing limb, floating limbs, disconnected limbs, malformed hands, out of focus, long neck, long body, asymmetrical eyes, weird eyes, crooked eyes, closed eyes, inaccurate eyes, bad eyes, mutated lips, bad lips, weird lips, bad teeth, poor teeth, poor facial structure, distorted facial features, poor jawline`;
  }

  // 기본 네거티브 프롬프트 반환
  return baseNegativePrompt;
} 