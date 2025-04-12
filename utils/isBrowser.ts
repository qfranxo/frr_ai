/**
 * 현재 코드가 브라우저 환경에서 실행 중인지 확인하는 유틸리티 함수
 * 
 * @returns {boolean} 브라우저 환경이면 true, 서버 환경이면 false
 */
export const isBrowser = (): boolean => typeof window !== 'undefined';

// 기본 export
export default isBrowser; 