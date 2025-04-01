import { supabase } from './supabase';

/**
 * 관리자 권한으로 테이블 데이터에 접근하기 위한 유틸리티 함수들
 */

// 관리자 권한 활성화
export async function enableAdminAccess(): Promise<boolean> {
  try {
    await supabase.rpc('set_admin_role', { is_admin: true });
    return true;
  } catch (error) {
    console.error('관리자 권한 활성화 오류:', error);
    return false;
  }
}

// 관리자 권한 비활성화
export async function disableAdminAccess(): Promise<boolean> {
  try {
    await supabase.rpc('set_admin_role', { is_admin: false });
    return true;
  } catch (error) {
    console.error('관리자 권한 비활성화 오류:', error);
    return false;
  }
}

// 관리자 권한으로 함수 실행 (자동으로 권한 활성화/비활성화)
export async function withAdminAccess<T>(callback: () => Promise<T>): Promise<T> {
  try {
    // 관리자 권한 활성화
    await enableAdminAccess();
    
    // 콜백 함수 실행
    const result = await callback();
    
    return result;
  } finally {
    // 항상 관리자 권한 비활성화 (오류가 발생해도)
    try {
      await disableAdminAccess();
    } catch (error) {
      console.error('관리자 권한 비활성화 실패:', error);
    }
  }
}

// 사용량 로그 조회 (관리자용)
export async function getAllUsageLogs(limit = 100, offset = 0): Promise<any[]> {
  return withAdminAccess(async () => {
    const { data, error } = await supabase
      .from('image_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('사용량 로그 조회 오류:', error);
      return [];
    }
    
    return data || [];
  });
}

// 특정 사용자의 사용량 로그 조회 (관리자용)
export async function getUserLogs(userId: string): Promise<any[]> {
  return withAdminAccess(async () => {
    const { data, error } = await supabase
      .from('image_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('사용자 로그 조회 오류:', error);
      return [];
    }
    
    return data || [];
  });
}

// 모든 댓글 조회 (관리자용)
export async function getAllComments(limit = 100, offset = 0): Promise<any[]> {
  return withAdminAccess(async () => {
    const { data, error } = await supabase
      .from('comments')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('댓글 조회 오류:', error);
      return [];
    }
    
    return data || [];
  });
}

// 모든 좋아요 조회 (관리자용)
export async function getAllLikes(limit = 100, offset = 0): Promise<any[]> {
  return withAdminAccess(async () => {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('좋아요 조회 오류:', error);
      return [];
    }
    
    return data || [];
  });
}

// 모든 이미지 조회 (관리자용)
export async function getAllImages(limit = 100, offset = 0): Promise<any[]> {
  return withAdminAccess(async () => {
    const { data, error } = await supabase
      .from('shared_images')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) {
      console.error('이미지 조회 오류:', error);
      return [];
    }
    
    return data || [];
  });
} 