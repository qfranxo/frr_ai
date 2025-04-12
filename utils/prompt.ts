import { IModelOptions } from "@/types";

export function generateEnhancedPrompt(prompt: string, options: IModelOptions): string {
  // 기본 프롬프트 향상
  let enhancedPrompt = prompt;
  
  // 이제 눈 향상 기능은 사용하지 않고, 품질 향상만 적용
  // enhancedPrompt = addNaturalEyesEnhancement(enhancedPrompt);
  
  // 기본 품질 향상 키워드 추가
  enhancedPrompt = addQualityEnhancements(enhancedPrompt);
  
  return enhancedPrompt;
}

// 자연스러운 눈을 위한 프롬프트 향상 - 비활성화
export function addNaturalEyesEnhancement(prompt: string): string {
  // 기능 비활성화 - 눈 관련 프롬프트 추가하지 않음
  return prompt;
  
  // 아래 코드는 비활성화됨
  /*
  const eyeEnhancements = [
    "symmetrical eyes",
    "natural looking eyes", 
    "detailed eye texture", 
    "realistic eye reflections", 
    "detailed irises",
    "realistic eyebrows", 
    "natural eyelashes",
    "both eyes looking in same direction",
    "symmetric eye shape",
    "lifelike eyes",
    "consistent eye color",
    "accurate eye placement",
    "proper eye spacing",
    "balanced eye size",
    "clear eyes"
  ];
  
  // 눈 관련 키워드가 있는지 확인
  const hasEyeKeywords = ['eye', 'eyes', 'eyeball', 'iris', 'pupil', 'eyelash'].some(
    keyword => prompt.toLowerCase().includes(keyword)
  );
  
  // 이미 눈 관련 키워드가 있다면 눈 향상을 추가하지 않음 (합성 이미지 문제 방지)
  if (hasEyeKeywords) {
    return prompt;
  }
  
  // 눈 향상 키워드를 최소화하여 추가 (문제 최소화)
  return `${prompt}, symmetrical eyes, natural looking eyes`;
  */
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
  
  // 콜라주 이미지 방지 네거티브 프롬프트 추가
  negativePrompt += ", collage, multiple images, eye grid, multiple panels, dual images, two images in one frame, composite image, split image, stacked images, image grid, combining images, two separate photos, side by side images, double exposure";
  
  // 렌더링 스타일에 따라 네거티브 프롬프트 조정
  if (renderStyle === "anime") {
    negativePrompt += ", realistic face, realistic skin, 3D rendering, photorealistic, realistic lighting, realism, photorealism, realistic texture, too realistic";
  } else {
    // 사실적 스타일에서는 눈 관련 네거티브 프롬프트 강화
    negativePrompt += ", asymmetric eyes, unaligned eyes, crossed eyes, unrealistic eyes, cartoon eyes, anime eyes, weird eyes, disproportionate eyes, fake looking eyes, unnatural pupils, inconsistent eye color, different sized eyes, mismatched eye colors, uneven eyes, droopy eyes, googly eyes, wall-eyed, cross-eyed, strabismus, lazy eye, unfocused eyes, unrealistic iris, unrealistic pupil, artificial looking eyes, closeup of eyes, eye detail shot, extreme closeup of eye, macro shot of eyes";
  }
  
  return negativePrompt;
} 