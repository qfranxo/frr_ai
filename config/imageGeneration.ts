export const IMAGE_GENERATION_CONFIG = {
  model: "recraft-ai/recraft-v3",
  version: null,
  defaultParams: {
    prompt: "",
    size: "1365x1024",
    style: "any",
  },
  aspectRatios: [
    { id: "1:1", name: "Square", size: "1024x1024", icon: "🔲", description: "Perfect for Instagram posts and profile pictures" },
    { id: "16:9", name: "Landscape", size: "1820x1024", icon: "🖥️", description: "Great for YouTube thumbnails and content covers" },
    { id: "9:16", name: "Portrait", size: "1024x1820", icon: "📱", description: "Ideal for Instagram stories, shorts, and TikTok" }
  ],
  supportedSizes: [
    "1024x1024",
    "1365x1024",
    "1024x1365",
    "1536x1024",
    "1024x1536",
    "1820x1024",
    "1024x1820",
    "1024x2048",
    "2048x1024",
    "1434x1024",
    "1024x1434",
    "1024x1280",
    "1280x1024",
    "1024x1707",
    "1707x1024"
  ],
  supportedStyles: [
    { id: "any", name: "자유 스타일", description: "AI가 알아서 선택합니다" },
    { id: "realistic_image", name: "사실적인 이미지", description: "실제 사진과 같은 사실적인 이미지" },
    { id: "digital_illustration", name: "디지털 일러스트", description: "디지털 그래픽 스타일의 일러스트" },
    { id: "digital_illustration/pixel_art", name: "픽셀 아트", description: "레트로 게임 스타일의 픽셀 아트" },
    { id: "digital_illustration/hand_drawn", name: "손으로 그린 듯한", description: "손으로 그린 듯한 일러스트 스타일" },
    { id: "digital_illustration/grain", name: "그레인 텍스처", description: "필름 그레인이 있는 일러스트" },
    { id: "digital_illustration/infantile_sketch", name: "어린이 스케치", description: "어린이가 그린듯한 스케치 스타일" },
    { id: "digital_illustration/2d_art_poster", name: "2D 아트 포스터", description: "2D 포스터 스타일" },
    { id: "digital_illustration/handmade_3d", name: "수제작 3D", description: "손으로 만든 듯한 3D 스타일" },
    { id: "digital_illustration/hand_drawn_outline", name: "손으로 그린 외곽선", description: "손으로 그린듯한 외곽선이 있는 스타일" },
    { id: "digital_illustration/engraving_color", name: "컬러 인그레이빙", description: "색상이 있는 인그레이빙 스타일" },
    { id: "digital_illustration/2d_art_poster_2", name: "2D 아트 포스터 (대체)", description: "대체 2D 포스터 스타일" },
    { id: "realistic_image/b_and_w", name: "흑백 사진", description: "흑백 사진 스타일" },
    { id: "realistic_image/hard_flash", name: "하드 플래시", description: "강한 플래시를 사용한 사진 스타일" },
    { id: "realistic_image/hdr", name: "HDR", description: "고다이나믹 레인지 사진 스타일" },
    { id: "realistic_image/natural_light", name: "자연광", description: "자연광으로 촬영한 사진 스타일" },
    { id: "realistic_image/studio_portrait", name: "스튜디오 포트레이트", description: "스튜디오에서 촬영한 인물 사진 스타일" },
    { id: "realistic_image/enterprise", name: "기업 이미지", description: "기업 홍보용 사진 스타일" },
    { id: "realistic_image/motion_blur", name: "모션 블러", description: "움직임이 있는 블러 효과가 있는 사진" }
  ]
} as const; 