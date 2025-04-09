import Replicate from "replicate";
import type { Prediction } from "replicate";
import { IGenerateRequest, IGenerateResponse } from "@/types";
import { IMAGE_GENERATION_CONFIG } from "@/config/imageGeneration";
import { checkImageQuality } from "@/utils/quality";
import { generateEnhancedPrompt } from "@/utils/prompt";

export class ImageGenerationService {
  private replicate: Replicate;

  constructor(apiToken: string) {
    if (!apiToken) {
      throw new Error("API 토큰이 필요합니다.");
    }
    this.replicate = new Replicate({ auth: apiToken });
  }

  async generateImage(request: IGenerateRequest): Promise<IGenerateResponse> {
    if (!request.prompt || !request.modelOptions) {
      throw new Error("프롬프트와 모델 옵션이 필요합니다.");
    }

    let enhancedPrompt = request.prompt;
    const isTryOn = !!request.productImage;
    
    // 트라이온 모드: 제품 이미지를 사용해 착용 이미지 생성
    if (isTryOn) {
      enhancedPrompt = `A photorealistic image of a person wearing the following item: ${request.prompt}. The item should look exactly like the reference product image. Make it look natural and professional, like a real e-commerce photo. Medium shot showing upper body properly, natural pose, balanced composition.`;
    } else {
      // 얼굴 집중 현상 개선을 위한 프롬프트 추가
      const hasPortraitKeywords = ['portrait', 'face', 'headshot', 'close-up', 'closeup'].some(
        keyword => request.prompt.toLowerCase().includes(keyword)
      );
      
      // 얼굴 관련 키워드가 없다면 균형 잡힌 구도 추가
      if (!hasPortraitKeywords) {
        enhancedPrompt = `${request.prompt}, balanced composition, properly framed, professional distance`;
      }
      
      // 눈 색상 관련 키워드 추가 (검은색 눈 방지)
      const hasEyeColorKeywords = ['blue eyes', 'brown eyes', 'green eyes', 'hazel eyes', 'gray eyes'].some(
        keyword => request.prompt.toLowerCase().includes(keyword)
      );
      
      // 눈 색상이 지정되지 않았다면 자연스러운 눈 색상 추가
      if (!hasEyeColorKeywords) {
        const naturalEyeColors = [
          "natural warm brown eyes",
          "natural hazel eyes"
        ];
        const randomEyeColor = naturalEyeColors[Math.floor(Math.random() * naturalEyeColors.length)];
        enhancedPrompt = `${enhancedPrompt}, ${randomEyeColor}`;
      }
      
      enhancedPrompt = generateEnhancedPrompt(enhancedPrompt, request.modelOptions);
    }
    
    try {
      // 네거티브 프롬프트에 검은색 눈과 얼굴 확대 방지 추가
      let negativePrompt = "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, solid black eyes, pure black eyes, completely black eyes, unnaturally dark eyes, extreme close-up, too close face shot";
      
      if (request.modelOptions.negativePrompt) {
        negativePrompt = `${request.modelOptions.negativePrompt}, ${negativePrompt}`;
      }
      
      const predictionParams: any = {
        model: IMAGE_GENERATION_CONFIG.model,
        input: {
          prompt: enhancedPrompt,
          size: IMAGE_GENERATION_CONFIG.defaultParams.size,
          style: request.modelOptions.style || IMAGE_GENERATION_CONFIG.defaultParams.style,
          negative_prompt: negativePrompt
        },
      };
      
      if (IMAGE_GENERATION_CONFIG.version) {
        predictionParams.version = IMAGE_GENERATION_CONFIG.version;
      }
      
      let prediction = await this.replicate.predictions.create(predictionParams);

      prediction = await this.waitForPrediction(prediction);
      const imageUrl = prediction.output;
      
      if (!imageUrl) {
        throw new Error("이미지 생성에 실패했습니다.");
      }

      const qualityScores = await checkImageQuality(imageUrl);

      return {
        success: true,
        imageUrl,
        quality: qualityScores
      };
    } catch (error) {
      throw new Error("이미지 생성에 실패했습니다.");
    }
  }

  private async waitForPrediction(prediction: Prediction): Promise<Prediction> {
    while (prediction.status !== "succeeded" && prediction.status !== "failed") {
      await new Promise(resolve => setTimeout(resolve, 1000));
      prediction = await this.replicate.predictions.get(prediction.id);
    }

    if (prediction.status === "failed") {
      throw new Error("이미지 생성에 실패했습니다.");
    }

    return prediction;
  }
} 