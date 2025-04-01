import { supabase } from './supabase';
import { useAuth } from '@clerk/nextjs';

// 액션 타입 정의
export type UsageActionType = 'generate' | 'share' | 'like' | 'comment' | 'delete';

// 클라이언트 사이드에서 사용량 로깅 (API 호출 대신 모의 호출)
export function useUsageLogger() {
  const { userId } = useAuth();
  
  // 사용량 기록 함수 (API 호출 대신 로컬 로깅)
  const logUsage = async (action: UsageActionType = 'generate') => {
    if (!userId) return { success: false, error: '인증되지 않은 사용자' };
    
    try {
      // API 호출 대신 콘솔에 기록만 남김
      console.log(`[로그 기록] 사용자 ${userId} - 액션: ${action}`);
      return { success: true, message: '로그가 기록되었습니다' };
    } catch (error) {
      console.error('사용량 로깅 오류:', error);
      return { success: false, error: '사용량 기록 중 오류 발생' };
    }
  };
  
  return { logUsage };
}

// 서버 사이드에서 직접 사용량 로깅 (모의 구현)
export async function logUsageServerSide(userId: string, action: UsageActionType = 'generate'): Promise<boolean> {
  try {
    // 실제 DB 호출 대신 로그만 남김
    console.log(`[서버 로그 기록] 사용자 ${userId} - 액션: ${action}`);
    return true;
  } catch (error) {
    console.error('서버 사이드 사용량 로깅 예외:', error);
    return false;
  }
}

// 사용량 조회 함수 (모의 구현)
export async function getUserUsage(userId: string): Promise<any[]> {
  try {
    // 더미 데이터 반환
    console.log(`[사용량 조회] 사용자 ${userId}의 사용량 조회`);
    return [];
  } catch (error) {
    console.error('사용량 조회 예외:', error);
    return [];
  }
} 