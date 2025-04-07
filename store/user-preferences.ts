import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화 (공개 접근용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
);

// 사용자 상태 타입 정의
interface UserState {
  likedPosts: string[];
  commentedPosts: string[];
  viewedPosts: string[];
  preferences: {
    theme: 'light' | 'dark' | 'system';
    fontSize: 'small' | 'medium' | 'large';
    reduceMotion: boolean;
  };
  lastSyncTime: string | null;
  
  // 좋아요 관련 액션
  toggleLike: (postId: string, userId: string | null) => Promise<boolean>;
  isLiked: (postId: string) => boolean;
  
  // 기타 액션
  markAsViewed: (postId: string) => void;
  updatePreference: <K extends keyof UserState['preferences']>(
    key: K, 
    value: UserState['preferences'][K]
  ) => void;
  syncWithServer: (userId: string | null) => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      likedPosts: [],
      commentedPosts: [],
      viewedPosts: [],
      preferences: {
        theme: 'system',
        fontSize: 'medium',
        reduceMotion: false,
      },
      lastSyncTime: null,
      
      // 좋아요 토글 (로컬 상태 + 서버 동기화)
      toggleLike: async (postId: string, userId: string | null) => {
        const state = get();
        const isCurrentlyLiked = state.isLiked(postId);
        
        // 로컬 상태 업데이트
        if (isCurrentlyLiked) {
          set({ likedPosts: state.likedPosts.filter(id => id !== postId) });
        } else {
          set({ likedPosts: [...state.likedPosts, postId] });
        }
        
        // 로그인한 사용자인 경우 서버에도 상태 저장
        if (userId) {
          try {
            await fetch('/api/user/preferences', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                action: isCurrentlyLiked ? 'unlike' : 'like',
                postId,
                userId
              }),
            });
            
            // 서버에 직접 좋아요 정보 업데이트
            if (isCurrentlyLiked) {
              await supabase
                .from('likes')
                .delete()
                .match({ user_id: userId, post_id: postId });
            } else {
              await supabase
                .from('likes')
                .insert({ user_id: userId, post_id: postId });
            }
          } catch (error) {
            console.error('좋아요 상태 동기화 오류:', error);
            // 실패 시 로컬 상태 롤백 (옵션)
            if (isCurrentlyLiked) {
              set({ likedPosts: [...state.likedPosts, postId] });
            } else {
              set({ likedPosts: state.likedPosts.filter(id => id !== postId) });
            }
            return false;
          }
        }
        
        return true;
      },
      
      // 좋아요 상태 확인
      isLiked: (postId: string) => {
        return get().likedPosts.includes(postId);
      },
      
      // 게시물 조회 기록
      markAsViewed: (postId: string) => {
        const state = get();
        if (!state.viewedPosts.includes(postId)) {
          set({ viewedPosts: [...state.viewedPosts, postId] });
        }
      },
      
      // 사용자 환경설정 업데이트
      updatePreference: (key, value) => {
        set(state => ({
          preferences: {
            ...state.preferences,
            [key]: value
          }
        }));
      },
      
      // 서버 데이터와 동기화
      syncWithServer: async (userId: string | null) => {
        if (!userId) return;
        
        try {
          // 서버에서 좋아요 정보 가져오기
          const { data: likedData } = await supabase
            .from('likes')
            .select('post_id')
            .eq('user_id', userId);
            
          if (likedData) {
            const serverLikedPosts = likedData.map(item => item.post_id);
            
            // 로컬 상태 업데이트
            set({ 
              likedPosts: serverLikedPosts,
              lastSyncTime: new Date().toISOString()
            });
          }
          
          // 사용자 환경설정 가져오기 (선택사항)
          const { data: prefsData } = await supabase
            .from('user_preferences')
            .select('*')
            .eq('user_id', userId)
            .single();
            
          if (prefsData) {
            set({
              preferences: {
                theme: prefsData.theme || 'system',
                fontSize: prefsData.font_size || 'medium',
                reduceMotion: prefsData.reduce_motion || false,
              }
            });
          }
        } catch (error) {
          console.error('서버 동기화 오류:', error);
        }
      }
    }),
    {
      name: 'user-preferences',
      partialize: (state) => ({
        likedPosts: state.likedPosts,
        commentedPosts: state.commentedPosts,
        viewedPosts: state.viewedPosts,
        preferences: state.preferences,
        lastSyncTime: state.lastSyncTime
      })
    }
  )
); 