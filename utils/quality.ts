export async function checkImageQuality(imageUrl: string): Promise<{
  faceQuality: number;
  poseAccuracy: number;
  professionalismScore: number;
}> {
  // 실제 이미지 품질 평가 로직은 별도 API를 사용하거나 구현해야 합니다.
  // 현재는 기본값을 반환합니다.
  return {
    faceQuality: 0.95,
    poseAccuracy: 0.9,
    professionalismScore: 0.92
  };
} 