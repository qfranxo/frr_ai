'use client'

import { useEffect, useState, useCallback, Suspense, useRef } from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { CommentModal } from '@/components/shared/CommentModal'
import { AuthCommentButton, AuthLikeButton } from '@/components/shared/AuthButtons'
import { Share2, RefreshCw, Heart, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { IComment } from '@/types'
import { formatDate } from '@/utils/format'
import { communityApi } from '@/lib/api'

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

  const { user, isSignedIn } = useUser()
  
  // 토스트 중복 방지용 ref
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  
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
      setLikesMap(initialLikesMap);
    } catch (error) {
      console.error('Failed to load recent images:', error)
      setData([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

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

  // 좋아요 처리 함수
  const handleLike = async (postId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 현재 포스트 찾기
      const currentPost = data.find(post => post.id === postId) || { likes: 0 };
      
      // 현재 좋아요 상태 확인
      const isCurrentlyLiked = likedPostsMap[postId] || false
      const newLikedState = !isCurrentlyLiked
      
      // 즉시 UI 상태 업데이트 (낙관적 업데이트)
      setLikedPostsMap(prev => ({
        ...prev,
        [postId]: newLikedState
      }))
      
      setLikesMap(prev => ({
        ...prev,
        [postId]: (prev[postId] !== undefined ? prev[postId] : (currentPost.likes === undefined ? 0 : currentPost.likes)) + (newLikedState ? 1 : -1)
      }))
      
      // 로컬 상태만 변경
      showToast('success', newLikedState ? 'Liked!' : 'Like removed')
    } catch (error) {
      console.error('Error processing like:', error)
      showToast('error', 'An error occurred during processing.')
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }

  // 댓글 추가 함수
  const handleComment = async (postId: string, text: string) => {
    if (!text.trim() || isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 가상의 댓글 추가
      const newComment = {
        id: `comment-${Date.now()}`,
        postId,
        userId: currentUser.id,
        userName: currentUser.name,
        text,
        createdAt: new Date().toISOString()
      };
      
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }))
      
      setCommentModalState({ isOpen: false, postId: '' })
    } catch (error) {
      console.error('Error adding comment:', error)
      showToast('error', 'Failed to add comment.')
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }

  // 댓글 삭제 함수
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 로컬 상태만 변경
      setCommentsMap(prev => ({
        ...prev,
        [postId]: prev[postId].filter(comment => comment.id !== commentId)
      }))
    } catch (error) {
      console.error('Error deleting comment:', error)
      showToast('error', 'Failed to delete comment.')
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  }

  // 공유하기 함수
  const handleShare = async (postId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/post/${postId}`)
      showToast('success', 'Link copied to clipboard.')
    } catch (error) {
      console.error('Error sharing:', error)
      showToast('error', 'Failed to copy link.')
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
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
                  priority={false}
                />
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
                      onClick={() => handleLike(item.id)}
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
                    <button
                      onClick={() => handleShare(item.id)}
                      className="p-1 text-gray-500 hover:text-blue-500 transition-colors rounded-full group"
                    >
                      <Share2 size={14} className="transition-colors" />
                    </button>
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