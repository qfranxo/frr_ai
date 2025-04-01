// 공통 상수 정의
export const APP_CONFIG = {
  name: 'Artify',
  description: 'AI 이미지 생성 커뮤니티',
  maxImageSize: 5 * 1024 * 1024, // 5MB
};

export const ROUTES = {
  home: '/',
  login: '/auth/login',
  register: '/auth/register',
  generate: '/generate',
  pricing: '/pricing',
}; 