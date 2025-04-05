import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import useSWR from 'swr';

// 최근 생성된 이미지 가져오기 (Generate 페이지용)
export function useRecentImages(userId?: string, limit = 2) {
  const fetcher = useCallback(async () => {
    let query = supabase
      .from("image_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    
    if (userId) {
      query = query.eq("user_id", userId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, [userId, limit]);
  
  const { data, error, mutate } = useSWR(
    userId ? `recent-images-${userId}-${limit}` : `recent-images-${limit}`, 
    fetcher
  );
  
  return {
    images: data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
}

// 공유된 이미지 가져오기 (커뮤니티 페이지용)
export function useSharedImages(limit?: number) {
  const fetcher = useCallback(async () => {
    let query = supabase
      .from("image_posts")
      .select("*")
      .eq("shared", true)
      .order("created_at", { ascending: false });
    
    if (limit) {
      query = query.limit(limit);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  }, [limit]);
  
  const { data, error, mutate } = useSWR(
    limit ? `shared-images-${limit}` : 'shared-images', 
    fetcher
  );
  
  return {
    images: data || [],
    isLoading: !error && !data,
    isError: error,
    refresh: mutate
  };
} 