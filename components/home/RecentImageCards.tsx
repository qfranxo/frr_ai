'use client'

import { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import Image from 'next/image'
import { useUser, useAuth } from '@clerk/nextjs'
import { CommentModal } from '@/components/shared/CommentModal'
import { AuthCommentButton, AuthLikeButton } from '@/components/shared/AuthButtons'
import { Share2, RefreshCw, Heart, MessageCircle, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { IComment } from '@/types'
import { formatDate } from '@/utils/format'
import { communityApi } from '@/lib/api'
import { auth } from '@clerk/nextjs/server'
import { supabase } from '@/lib/supabase'

// 토스트 중복 방지를 위한 전역 플래그
let isToastInProgress = false;

// 로컬에서 Generation 타입 정의
interface Generation {
  id: string
  imageUrl: string
  prompt: string
  renderingStyle: string
  gender: string
  age: string
  aspectRatio: string
  createdAt: string
  likes?: number
  comments?: any[]
  author?: string
  isShared?: boolean
  storagePath?: string
  original_generation_id?: string
  cameraDistance?: string
  eyeColor?: string
  skinType?: string
  hairStyle?: string
  modelVersion?: string
  background?: string
  lighting?: string
  facial_expression?: string
  accessories?: string
  makeup?: string
  framing?: string
  category?: string
}

export default function RecentImageCardsSuspenseWrapper() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <RecentImageCardsContent />
    </Suspense>
  )
}

function RecentImageCardsContent() {
  const [data, setData] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [commentModalState, setCommentModalState] = useState({
    isOpen: false,
    postId: ''
  })
  const [likesMap, setLikesMap] = useState<Record<string, number>>({})
  const [likedPostsMap, setLikedPostsMap] = useState<Record<string, boolean>>({})
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({})
  const [refreshing, setRefreshing] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)

  const { user, isSignedIn } = useUser()
  const { getToken } = useAuth()
  
  // 토스트 중복 방지용 ref
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // JWT 토큰 디버깅을 위한 useEffect
  useEffect(() => {
    const fetchToken = async () => {
      try {
        if (isSignedIn && user) {
          const token = await getToken({ template: "frrai" });
          setAuthToken(token);
          
          console.log("🧪 Clerk JWT Token:", token ? "토큰 취득 성공" : "토큰 없음");
          console.log("🧪 Clerk 인증 상태:", isSignedIn ? "로그인됨" : "로그인 안됨");
          if (user) {
            console.log("🧪 Clerk 사용자 정보:", {
              id: user.id,
              name: user.fullName,
              email: user.primaryEmailAddress?.emailAddress
            });
          }
        } else {
          setAuthToken(null);
          console.log("🧪 로그인되지 않음 - 토큰을 가져올 수 없음");
        }
      } catch (error) {
        console.error("🧪 Clerk JWT 토큰 취득 오류:", error);
        setAuthToken(null);
      }
    };
    
    fetchToken();
  }, [getToken, isSignedIn, user]);
  
  // 토스트 표시 함수
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    // 전역 플래그가 활성화되어 있으면 토스트를 표시하지 않음
    if (isToastInProgress) return;
    
    // 전역 플래그 활성화
    isToastInProgress = true;
    
    // 기존 타이머가 있다면 취소
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    // 약간의 지연 후 토스트 표시 (중복 호출 방지)
    toastTimerRef.current = setTimeout(() => {
      if (type === 'success') {
        toast.success(message, { 
          position: 'top-center', 
          duration: 3000, 
          id: 'recent-image-success' // 고정 ID
        });
      } else {
        toast.error(message, { 
          position: 'top-center', 
          duration: 3000, 
          id: 'recent-image-error' // 고정 ID
        });
      }
      toastTimerRef.current = null;
      
      // 토스트 표시 후 일정 시간 후에 플래그 비활성화
      setTimeout(() => {
        isToastInProgress = false;
      }, 1000);
    }, 100);
  }, []);
  
  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);
  
  // 현재 사용자 정보
  const currentUser = isSignedIn && user ? {
    id: user.id,
    name: user.firstName || user.username || 'User',
    username: user.username || user.firstName || 'User',
    imageUrl: user.imageUrl
  } : {
    id: 'guest-user',
    name: 'Guest',
    username: 'guest',
    imageUrl: undefined
  }

  // 데이터 가져오기 함수 (로컬 스토리지에서 최신 이미지 불러오기)
  const fetchData = useCallback(async () => {
    try {
      console.log('[RecentImages] 데이터 가져오기 시작');
      setRefreshing(true)
      
      // 로컬 스토리지에서 생성된 이미지 가져오기
      let localImages: Generation[] = []
      
      if (typeof window !== 'undefined') {
        const storedImages = localStorage.getItem('generatedImages')
        if (storedImages) {
          try {
            localImages = JSON.parse(storedImages)
            // 최신 항목이 먼저 오도록 정렬
            localImages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            // 최대 2개만 표시
            localImages = localImages.slice(0, 2)
            console.log('[RecentImages] 로컬 이미지 로드:', localImages.length, '개');
          } catch (e) {
            console.error('Failed to parse stored images:', e)
          }
        }
      }
      
      setData(localImages)
      
      // 좋아요 맵 초기화
      const initialLikesMap: Record<string, number> = {};
      localImages.forEach(item => {
        initialLikesMap[item.id] = item.likes || 0;
      });
      
      // 좋아요 정보 불러오기
      if (localImages.length > 0) {
        console.log('[RecentImages] 좋아요/댓글 정보 로드 시작');
        
        // 사용자 ID 확인
        const userId = isSignedIn && user ? user.id : null;
        console.log('[RecentImages] 현재 사용자 ID:', userId || '없음 (게스트)');
        
        try {
          for (const image of localImages) {
            console.log(`[RecentImages] 이미지 ID: ${image.id} 데이터 로드 중`);
            
            // 좋아요 정보 불러오기 - userId 파라미터 추가
            const likesUrl = userId 
              ? `/api/likes?imageId=${image.id}&userId=${userId}`
              : `/api/likes?imageId=${image.id}`;
            
            const likesResponse = await fetch(likesUrl);
            if (likesResponse.ok) {
              const likesData = await likesResponse.json();
              console.log(`[RecentImages] 좋아요 응답:`, likesData);
              
              if (likesData.success) {
                // 좋아요 맵 업데이트
                initialLikesMap[image.id] = likesData.count || 0;
                if (isSignedIn && user) {
                  setLikedPostsMap(prev => ({
                    ...prev,
                    [image.id]: likesData.isLiked || false
                  }));
                }
              }
            } else {
              console.error(`[RecentImages] 좋아요 API 오류:`, likesResponse.status);
            }
            
            // 댓글 정보도 불러오기
            const commentsResponse = await fetch(`/api/comments?imageId=${image.id}`);
            if (commentsResponse.ok) {
              const commentsData = await commentsResponse.json();
              console.log(`[RecentImages] 댓글 응답:`, commentsData.success, commentsData.data?.length || 0);
              
              if (commentsData.success) {
                setCommentsMap(prev => ({
                  ...prev,
                  [image.id]: commentsData.data || []
                }));
              }
            } else {
              console.error(`[RecentImages] 댓글 API 오류:`, commentsResponse.status);
            }
          }
        } catch (error) {
          console.error('[RecentImages] 좋아요/댓글 정보 로드 오류:', error);
        }
      }
      
      setLikesMap(initialLikesMap);
      console.log('[RecentImages] 데이터 로드 완료', initialLikesMap);
    } catch (error) {
      console.error('Failed to load recent images:', error)
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [isSignedIn, user])

  // 초기 데이터 로드
  useEffect(() => {
    fetchData()
    
    // 이미지가 생성될 때마다 자동으로 새로고침
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'generatedImages') {
        fetchData()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    // localStorage 변경 감지를 위한 커스텀 이벤트
    window.addEventListener('newImageGenerated', fetchData)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('newImageGenerated', fetchData)
    }
  }, [fetchData])

  // 좋아요 토글 함수
  const handleLike = async (post: { id: string }) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      const postId = post.id;
      
      // 사용자가 로그인했는지 확인
      if (!isSignedIn || !user) {
        showToast('error', '좋아요를 표시하려면 로그인하세요');
        setIsProcessing(false);
        return;
      }
      
      const userId = user.id;
      const isCurrentlyLiked = likedPostsMap[postId] || false;
      const currentLikes = likesMap[postId] || 0;
      
      // UI 상태 즉시 업데이트 (낙관적 업데이트)
      setLikedPostsMap(prev => ({
        ...prev,
        [postId]: !isCurrentlyLiked
      }));
      
      setLikesMap(prev => ({
        ...prev,
        [postId]: isCurrentlyLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1
      }));
      
      console.log(`[좋아요] 시작 - 포스트 ID: ${postId}, 사용자 ID: ${userId}, 현재 좋아요 상태: ${isCurrentlyLiked ? '좋아요 취소' : '좋아요 추가'}`);
      
      // API 호출 - 인증 토큰 대신 userId 직접 전달
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: postId,
          userId: userId,
          isLiked: !isCurrentlyLiked,
          increment: isCurrentlyLiked ? -1 : 1
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[좋아요] API 오류 (${response.status}):`, errorText);
        showToast('error', `좋아요 처리 중 오류가 발생했습니다 (${response.status})`);
        setIsProcessing(false);
        return;
      }
      
      const result = await response.json();
      console.log("✅ 좋아요 응답:", result);
      
      if (!result.success) {
        console.error('좋아요 API 오류:', result.message);
        showToast('error', result.message || '좋아요 처리 중 오류가 발생했습니다.');
        setIsProcessing(false);
      } else {
        console.log(`[좋아요] 성공 - 액션: ${result.action}`);
        showToast('success', result.action === 'added' ? '좋아요가 추가되었습니다!' : '좋아요가 취소되었습니다!');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('좋아요 처리 중 오류:', error)
      showToast('error', '처리 중 오류가 발생했습니다.')
      setIsProcessing(false);
    }
  }

  // 댓글 추가 함수
  const handleComment = async (postId: string, text: string) => {
    if (!text.trim() || isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // 사용자가 로그인했는지 확인
      if (!isSignedIn || !user) {
        showToast('error', '댓글을 작성하려면 로그인하세요');
        setIsProcessing(false);
        return;
      }
      
      const userId = user.id;
      const userName = user.fullName || user.username || 'User';
      const userAvatar = user.imageUrl;
      
      console.log(`[댓글] 시작 - 포스트 ID: ${postId}, 사용자 ID: ${userId}, 댓글: ${text}`);
      
      // 현재 댓글 목록
      const currentComments = commentsMap[postId] || [];
      
      // 임시 댓글 ID 생성 (실제 저장 후 업데이트)
      const tempCommentId = `temp-${Date.now()}`;
      
      // UI에 즉시 표시할 새 댓글 (낙관적 업데이트)
      const newComment = {
        id: tempCommentId,
        userId: userId,
        userName: userName,
        userAvatar: userAvatar,
        text: text,
        createdAt: new Date().toISOString(),
        isTemp: true // 임시 플래그
      };
      
      // 댓글 상태 업데이트
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...currentComments, newComment]
      }));
      
      // 저장된 JWT 토큰 사용
      if (!authToken) {
        console.error(`[댓글] JWT 토큰이 없습니다.`);
        showToast('error', '인증에 실패했습니다. 다시 로그인해보세요.');
        setIsProcessing(false);
        return;
      }
      
      console.log(`[댓글] JWT 토큰 사용:`, authToken ? '성공' : '실패');
      
      // API 호출
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          imageId: postId,
          userId: userId,
          userName: userName,
          userAvatar: userAvatar,
          text: text
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[댓글] API 오류 (${response.status}):`, errorText);
        showToast('error', `댓글 추가 중 오류가 발생했습니다 (${response.status})`);
        setIsProcessing(false);
        return;
      }
      
      const result = await response.json();
      console.log(`[댓글] API 응답:`, result);
      
      if (!result.success) {
        console.error('댓글 API 오류:', result.message);
        showToast('error', result.message || '댓글 추가 중 오류가 발생했습니다.');
        setIsProcessing(false);
      } else {
        console.log(`[댓글] 성공 - ID: ${result.data?.id}`);
        showToast('success', '댓글이 추가되었습니다!');
        
        // 실제 댓글 ID로 업데이트
        if (result.data?.id) {
          setCommentsMap(prev => ({
            ...prev,
            [postId]: prev[postId].map(comment => 
              comment.id === newComment.id 
                ? { ...comment, id: result.data.id } 
                : comment
            )
          }));
        }
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('댓글 추가 중 오류:', error)
      showToast('error', '댓글 추가에 실패했습니다.')
      setIsProcessing(false);
    }
  }

  // 댓글 삭제 함수
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      
      // 사용자가 로그인했는지 확인
      if (!isSignedIn || !user) {
        showToast('error', '작업을 수행하려면 로그인하세요');
        setIsProcessing(false);
        return;
      }
      
      const userId = user.id;
      
      console.log(`[댓글 삭제] 시작 - 포스트 ID: ${postId}, 댓글 ID: ${commentId}, 사용자 ID: ${userId}`);
      
      // 현재 댓글 목록
      const currentComments = commentsMap[postId] || [];
      
      // 삭제할 댓글 찾기
      const commentToDelete = currentComments.find(comment => comment.id === commentId);
      
      if (!commentToDelete) {
        console.error('댓글을 찾을 수 없습니다');
        showToast('error', '댓글을 찾을 수 없습니다');
        setIsProcessing(false);
        return;
      }
      
      // 자신의 댓글인지 확인
      if (commentToDelete.userId !== userId) {
        showToast('error', '자신의 댓글만 삭제할 수 있습니다');
        setIsProcessing(false);
        return;
      }
      
      // UI에서 댓글 즉시 제거 (낙관적 업데이트)
      setCommentsMap(prev => ({
        ...prev,
        [postId]: currentComments.filter(c => c.id !== commentId)
      }));
      
      // 저장된 JWT 토큰 사용
      if (!authToken) {
        console.error(`[댓글 삭제] JWT 토큰이 없습니다.`);
        showToast('error', '인증에 실패했습니다. 다시 로그인해보세요.');
        setIsProcessing(false);
        return;
      }
      
      console.log(`[댓글 삭제] JWT 토큰 사용:`, authToken ? '성공' : '실패');
      
      // API 호출
      const response = await fetch('/api/comments', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          commentId: commentId,
          imageId: postId,
          userId: userId
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[댓글 삭제] API 오류 (${response.status}):`, errorText);
        showToast('error', `댓글 삭제 중 오류가 발생했습니다 (${response.status})`);
        setIsProcessing(false);
        return;
      }
      
      const result = await response.json();
      console.log(`[댓글 삭제] API 응답:`, result);
      
      if (!result.success) {
        console.error('댓글 삭제 API 오류:', result.message);
        showToast('error', result.message || '댓글 삭제 중 오류가 발생했습니다.');
        setIsProcessing(false);
      } else {
        showToast('success', '댓글이 삭제되었습니다!');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('댓글 삭제 중 오류:', error)
      showToast('error', '처리 중 오류가 발생했습니다.')
      setIsProcessing(false);
    }
  }

  // 공유하기 함수
  const handleShare = async (postId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 공유할 포스트 찾기
      const postToShare = data.find(item => item.id === postId);
      if (!postToShare) {
        throw new Error('Post not found');
      }
      
      // localStorage에서 원본 데이터를 다시 한번 확인
      let originalData = null;
      if (typeof window !== 'undefined') {
        try {
          const storedImages = localStorage.getItem('generatedImages');
          if (storedImages) {
            const parsedImages = JSON.parse(storedImages);
            originalData = parsedImages.find((img: Generation) => img.id === postId);
            
            if (originalData) {
              console.log("📊 로컬 스토리지에서 찾은 원본 데이터:", {
                id: originalData.id,
                aspectRatio: originalData.aspectRatio,
                renderingStyle: originalData.renderingStyle,
                category: originalData.category,
                background: originalData.background
              });
            }
          }
        } catch (e) {
          console.error('localStorage 데이터 검증 오류:', e);
        }
      }
      
      // 원본 데이터와 현재 데이터 병합 (원본 데이터가 있으면 우선 사용)
      const mergedData = {
        ...postToShare,
        ...(originalData || {}),
        id: postId // ID는 항상 유지
      };
      
      // 상세 정보 로깅
      console.log("📊 공유할 이미지 병합 상세 정보:", {
        id: mergedData.id,
        aspectRatio: mergedData.aspectRatio,
        renderingStyle: mergedData.renderingStyle,
        category: mergedData.category, 
        background: mergedData.background,
        gender: mergedData.gender,
        age: mergedData.age
      });
      
      const shareToast = toast.loading('Sharing to community...');
      
      // FormData를 사용한 API로 이미지 공유
      const formData = new FormData();
      
      // 필수 필드는 항상 포함
      formData.append("image_url", mergedData.imageUrl);
      formData.append("prompt", mergedData.prompt);
      
      // 선택적 필드는 값이 있을 때만 포함
      if (mergedData.renderingStyle) {
        console.log("🔍 전송: rendering_style =", mergedData.renderingStyle);
        formData.append("rendering_style", mergedData.renderingStyle);
      }
      
      if (mergedData.gender) {
        console.log("🔍 전송: gender =", mergedData.gender);
        formData.append("gender", mergedData.gender);
      }
      
      if (mergedData.age) {
        console.log("🔍 전송: age =", mergedData.age);
        formData.append("age", mergedData.age);
      }
      
      // 중요: aspect_ratio 값 로깅 및 설정 (엄격하게 확인)
      if (mergedData.aspectRatio && mergedData.aspectRatio !== '1:1') {
        console.log("🔍 전송 (특별 확인): aspect_ratio =", mergedData.aspectRatio);
        formData.append("aspect_ratio", mergedData.aspectRatio);
      }
      
      // 카테고리 값 설정 (우선순위: 원본 category > 계산된 category)
      let finalCategory = '';
      if (mergedData.category && mergedData.category.trim() !== '') {
        finalCategory = mergedData.category;
      } else if (mergedData.renderingStyle) {
        finalCategory = getCategoryFromStyle(mergedData.renderingStyle);
      }
      
      if (finalCategory && finalCategory !== 'other') {
        console.log("🔍 전송 (특별 확인): category =", finalCategory);
        formData.append("category", finalCategory);
      }
      
      // 원본 이미지 ID
      formData.append("original_generation_id", mergedData.id);
      
      // 스토리지 경로
      if (mergedData.storagePath) {
        formData.append("storage_path", mergedData.storagePath);
      }
      
      // 추가 필드들도 엄격하게 확인하여 추가
      if (mergedData.background) {
        console.log("🔍 전송 (특별 확인): background =", mergedData.background);
        formData.append("background", mergedData.background);
      }
      
      if (mergedData.cameraDistance) {
        formData.append("camera_distance", mergedData.cameraDistance);
      }
      
      if (mergedData.eyeColor) {
        formData.append("eye_color", mergedData.eyeColor);
      }
      
      if (mergedData.skinType) {
        formData.append("skin_type", mergedData.skinType);
      }
      
      if (mergedData.hairStyle) {
        formData.append("hair_style", mergedData.hairStyle);
      }
      
      if (mergedData.modelVersion) {
        formData.append("model_version", mergedData.modelVersion);
      }
      
      if (mergedData.lighting) {
        formData.append("lighting", mergedData.lighting);
      }
      
      if (mergedData.facial_expression) {
        formData.append("facial_expression", mergedData.facial_expression);
      }
      
      // 고정 필드
      formData.append("source", "generated");
      
      // 사용자 이름 설정
      if (user && isSignedIn) {
        const userName = user.fullName || user.firstName || user.username || '';
        console.log("👤 전송할 user_name 값:", userName);
        formData.append("user_name", userName);
      }
      
      // 디버깅: formData 내용 확인
      console.log('🧾 formData entries 최종:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key} = ${value}`);
      }
      
      const response = await fetch('/api/share', {
        method: 'POST',
        body: formData // Content-Type 자동 설정
      });
      
      // 디버깅: 응답 상태 및 헤더 확인
      console.log('📡 응답 상태:', response.status, response.statusText);
      
      const responseData = await response.json();
      console.log('📡 응답 데이터:', responseData);
      
      toast.dismiss(shareToast);
      
      if (responseData.success) {
        // 성공 메시지 표시
        showToast('success', responseData.message || '이미지가 커뮤니티에 공유되었습니다.');
        // shared 플래그 업데이트
        updateSharedStatus(postId);
      } else {
        // 세부 오류 메시지 추출 및 표시
        let errorMsg = responseData.error || '공유에 실패했습니다.';
        
        // DB 오류 메시지에서 컬럼 관련 오류 추출하여 사용자 친화적 메시지로 변환
        if (errorMsg.includes('column') && errorMsg.includes('PGRST204')) {
          const match = errorMsg.match(/Could not find the '(\w+)' column/);
          if (match && match[1]) {
            const missingColumn = match[1];
            errorMsg = `데이터베이스에 '${missingColumn}' 필드가 없어 공유할 수 없습니다. 관리자에게 문의하세요.`;
          } else {
            errorMsg = '데이터베이스 스키마 문제로 공유할 수 없습니다. 관리자에게 문의하세요.';
          }
        }
        
        console.error("공유 실패:", responseData.error);
        showToast('error', errorMsg);
      }
    } catch (error) {
      console.error('Error sharing:', error);
      showToast('error', error instanceof Error ? error.message : '공유에 실패했습니다.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }
  
  // 이미지가 공유되었음을 로컬 스토리지에 표시
  const updateSharedStatus = (postId: string) => {
    if (typeof window !== 'undefined') {
      try {
        const storedImages = localStorage.getItem('generatedImages');
        if (storedImages) {
          const images = JSON.parse(storedImages);
          const updatedImages = images.map((img: Generation) => {
            if (img.id === postId) {
              return { ...img, isShared: true };
            }
            return img;
          });
          
          localStorage.setItem('generatedImages', JSON.stringify(updatedImages));
          
          // 현재 상태 업데이트
          setData(prevData => 
            prevData.map(item => 
              item.id === postId ? { ...item, isShared: true } : item
            )
          );
        }
      } catch (e) {
        console.error('Failed to update shared status:', e);
      }
    }
  }

  // 카테고리 관련 유틸리티 함수들
  // 스타일에서 카테고리 추출
  const getCategoryFromStyle = (style: string): string => {
    if (!style) return 'portrait';
  
    const styleToCategory: Record<string, string> = {
      'portrait': 'portrait',
      'anime': 'anime', 
      'realistic': 'portrait',
      'digital art': 'fantasy',
      'painting': 'landscape',
      'landscape': 'landscape',
      'urban': 'urban',
      'fantasy': 'fantasy',
      'sci-fi': 'sci-fi',
      'vintage': 'vintage',
      'abstract': 'abstract',
      'animals': 'animals',
      'highfashion': 'fashion',
      'fashion': 'fashion',
    };
  
    // 정확한 매치 확인
    if (styleToCategory[style.toLowerCase()]) {
      return styleToCategory[style.toLowerCase()];
    }
    
    // 부분 매치 확인
    for (const [key, value] of Object.entries(styleToCategory)) {
      if (style.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
  
    return 'portrait'; // 기본값
  };
  
  // 카테고리 색상 클래스 
  const getCategoryColor = (category?: string): string => {
    if (!category) return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    
    const colorMap: { [key: string]: string } = {
      'portrait': 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      'anime': 'bg-gradient-to-r from-purple-500 to-violet-600 text-white',
      'landscape': 'bg-gradient-to-r from-emerald-500 to-green-600 text-white',
      'urban': 'bg-gradient-to-r from-amber-500 to-orange-600 text-white',
      'fantasy': 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white',
      'sci-fi': 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white',
      'vintage': 'bg-gradient-to-r from-rose-500 to-pink-600 text-white',
      'abstract': 'bg-gradient-to-r from-fuchsia-500 to-pink-600 text-white',
      'animals': 'bg-gradient-to-r from-lime-500 to-green-600 text-white',
      'fashion': 'bg-gradient-to-r from-pink-500 to-rose-600 text-white'
    };
    
    return colorMap[category.toLowerCase()] || 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
  };
  
  // 카테고리 이모지 
  const getCategoryEmoji = (category?: string): string => {
    if (!category) return '🎨';
    
    const emojiMap: { [key: string]: string } = {
      'portrait': '👩‍🎨',
      'anime': '🦸‍♀️',
      'landscape': '🌄',
      'urban': '🏢',
      'fantasy': '🐉',
      'sci-fi': '👾',
      'vintage': '🕰️',
      'abstract': '🔮',
      'animals': '🐱',
      'fashion': '👕'
    };
    
    return emojiMap[category.toLowerCase()] || '🎨';
  };

  if (loading) return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

  if (data.length === 0) return (
    <div className="text-center py-8 text-gray-500">
      No images generated yet
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center px-3">
        <h2 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Recently Generated Images</h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">(Stored in local storage only)</span>
          <button 
            onClick={fetchData}
            disabled={refreshing}
            className="p-1.5 text-gray-500 hover:text-blue-500 transition-colors rounded-full hover:bg-gray-100"
            title="Refresh"
          >
            <RefreshCw size={14} className={`${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-3">
        {data.map((item) => {
          // 카테고리 정보 처리
          const categoryName = getCategoryFromStyle(item.renderingStyle);
          const categoryColor = getCategoryColor(categoryName);
          const categoryEmoji = getCategoryEmoji(categoryName);
          
          return (
            <div 
              key={item.id} 
              className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 p-2"
            >
              <div className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow-sm">
                <Image
                  src={item.imageUrl}
                  alt={item.prompt}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
                  loading="lazy"
                  placeholder="blur"
                  blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2YxZjFmMSIvPjwvc3ZnPg=="
                  unoptimized={true}
                  onError={() => {
                    console.log(`[오류] ID: ${item.id} 이미지 로드 실패`);
                  }}
                />
                
                {/* 공유 상태 배지 */}
                {item.isShared && (
                  <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-blue-500/80 text-white text-xs font-medium shadow-md backdrop-blur-sm border border-blue-300/50 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                      <polyline points="17 8 12 3 7 8"></polyline>
                      <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                    공유됨
                  </div>
                )}
              </div>
              
              {/* 카테고리와 날짜 정보 */}
              <div className="px-2 flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-md flex items-center ${categoryColor}`}>
                  <span className="mr-1">{categoryEmoji}</span> {categoryName}
                </span>
                <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
                  {formatDate(item.createdAt)}
                </div>
              </div>
              
              <div className="px-2">
                <div className="flex justify-end items-center mb-2">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleLike(item)}
                      className="p-1 text-gray-500 hover:text-red-500 transition-colors rounded-full group"
                    >
                      <Heart 
                        size={14} 
                        className={`transition-colors ${likedPostsMap[item.id] ? 'fill-red-500 text-red-500' : ''}`} 
                      />
                    </button>
                    <button
                      onClick={() => {
                        setCommentModalState({
                          isOpen: true,
                          postId: item.id
                        });
                      }}
                      className="p-1 text-gray-500 hover:text-blue-500 transition-colors rounded-full group"
                    >
                      <MessageCircle size={14} className="transition-colors" />
                    </button>
                    <div className="rounded-full relative group/icon overflow-hidden shadow-glow">
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-90 animate-gradient-xy rounded-full"></div>
                      <Sparkles size={14} className="text-white relative z-10 animate-spin-slow p-1" />
                      <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 bg-pink-500 rounded-full animate-ping opacity-75 z-20"></span>
                    </div>
                  </div>
                </div>
                
                <div className="text-xs text-gray-800 line-clamp-2 mb-2" style={{minHeight: '32px'}}>
                  {item.prompt}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* 댓글 모달 */}
      <CommentModal
        isOpen={commentModalState.isOpen}
        onClose={() => setCommentModalState({ isOpen: false, postId: '' })}
        onSubmit={(text: string) => {
          if (commentModalState.postId) {
            handleComment(commentModalState.postId, text);
          }
        }}
        onDelete={(commentId: string | number) => {
          if (commentModalState.postId) {
            handleDeleteComment(commentModalState.postId, String(commentId));
          }
        }}
        comments={commentModalState.postId ? commentsMap[commentModalState.postId] || [] : []}
        currentUser={currentUser}
      />
    </div>
  )
} 