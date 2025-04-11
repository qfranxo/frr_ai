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

// 네거티브 프롬프트 생성 함수 추가
export function generateNegativePrompt(renderStyle: string = 'realistic'): string {
  // 기본 네거티브 프롬프트
  let negativePrompt = "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation, blurry, blurred, watermark, text, poorly drawn face, poorly drawn hands";
  
  // 항상 포함될 눈 관련 네거티브 프롬프트
  negativePrompt += ", solid black eyes, pure black eyes, completely black eyes, unnaturally dark eyes";
  
  // 렌더링 스타일에 따라 네거티브 프롬프트 조정
  if (renderStyle === "anime") {
    negativePrompt += ", realistic face, realistic skin, 3D rendering, photorealistic, realistic lighting, realism, photorealism, realistic texture, too realistic";
  } else {
    // 사실적 스타일에서는 눈 관련 네거티브 프롬프트 강화
    negativePrompt += ", asymmetric eyes, unaligned eyes, crossed eyes, unrealistic eyes, cartoon eyes, anime eyes, weird eyes, disproportionate eyes, fake looking eyes, unnatural pupils, inconsistent eye color, different sized eyes, mismatched eye colors, uneven eyes, droopy eyes, googly eyes, wall-eyed, cross-eyed, strabismus, lazy eye, unfocused eyes, unrealistic iris, unrealistic pupil, artificial looking eyes";
    
    // 얼굴 집중 완화를 위한 네거티브 프롬프트
    negativePrompt += ", extreme close-up, too close face shot, cropped body, partial body, disembodied";
  }
  
  return negativePrompt;
} 