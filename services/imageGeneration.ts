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

    const enhancedPrompt = generateEnhancedPrompt(request.prompt, request.modelOptions);
    
    const predictionParams: any = {
      model: IMAGE_GENERATION_CONFIG.model,
      input: {
        prompt: enhancedPrompt,
        size: IMAGE_GENERATION_CONFIG.defaultParams.size,
        style: request.modelOptions.style || IMAGE_GENERATION_CONFIG.defaultParams.style,
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