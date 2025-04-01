import { IModelOptions } from "@/types";

export function generateEnhancedPrompt(prompt: string, options: IModelOptions): string {
  // recraft-v3 모델은 단순히 프롬프트를 그대로 사용합니다.
  // 향후 추가적인 프롬프트 개선이 필요하다면 여기에 구현할 수 있습니다.
  return prompt;
} 