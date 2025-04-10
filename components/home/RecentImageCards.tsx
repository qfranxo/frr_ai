'use client'

import { useEffect, useState, useCallback, Suspense, useRef, useMemo, memo } from 'react'
import Image from 'next/image'
import { useUser } from '@clerk/nextjs'
import { CommentModal } from '@/components/shared/CommentModal'
import { AuthCommentButton, AuthLikeButton } from '@/components/shared/AuthButtons'
import { Share2, RefreshCw, Heart, MessageCircle, Download } from 'lucide-react'
import { toast } from 'sonner'
import { IComment } from '@/types'
import { formatDate } from '@/utils/format'
import { communityApi } from '@/lib/api'
import { useRouter } from 'next/navigation'
import { useCommentsBatch, useAddComment } from '@/hooks/useCommentsBatch'
import { SignUpButton } from '@clerk/nextjs'

// CSS 애니메이션을 정의하는 스타일 요소 추가
const cssAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.hourglass-icon:hover {
  transform: rotate(180deg);
}
`;

// 스타일 요소를 DOM에 삽입하는 함수
const injectStyles = () => {
  if (typeof window !== 'undefined') {
    const styleId = 'recent-image-cards-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = cssAnimation;
      document.head.appendChild(style);
    }
  }
};

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
  isSharing?: boolean
  selectedCategory?: string
  ratio?: string
}

// ImageCard 컴포넌트 props 타입 정의
interface ImageCardProps {
  item: Generation;
  handleShare: (postId: string) => void;
  handleImageLoaded: (postId: string) => void;
  handleImageError: (postId: string) => void;
  setCommentModalState: (state: { isOpen: boolean; postId: string }) => void;
  handleLike: (postId: string) => void;
  likedPostsMap: Record<string, boolean>;
  likesMap: Record<string, number>;
  commentsMap: Record<string, any[]>;
  isSignedIn: boolean;
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

// 카테고리 스타일 및 유틸리티 함수 정의
const getCategoryFromStyle = (style: string, prompt?: string): string => {
  // 프롬프트가 없거나 스타일이 없는 경우 기본값 반환
  if (!style && !prompt) return 'portrait';
  
  // 프롬프트 분석을 통한 카테고리 판단
  if (prompt) {
    // 카테고리 키워드 맵핑
    const categoryKeywords: Record<string, string[]> = {
      'landscape': ['landscape', 'mountain', 'nature', 'lake', 'forest', 'ocean', 'sea', 'sunset', 'sunrise', 'valley', 'canyon', 'waterfall', 'scenery', 'outdoor', 'natural', 'scenic', 'vista', 'panorama', 'horizon'],
      'portrait': ['portrait', 'person', 'face', 'woman', 'man', 'girl', 'boy', 'people', 'human', 'facial', 'self', 'headshot', 'selfie', 'close-up', 'closeup', 'head', 'profile', 'bust'],
      'urban': ['urban', 'city', 'street', 'building', 'architecture', 'downtown', 'skyscraper', 'metropolis', 'town', 'skyline'],
      'anime': ['anime', 'manga', 'cartoon', 'comic', 'animation', 'animated', 'toon', 'chibi'],
      'fantasy': ['fantasy', 'magical', 'dragon', 'fairy', 'elf', 'wizard', 'mythical', 'mystic', 'enchanted', 'creature'],
      'sci-fi': ['sci-fi', 'science fiction', 'futuristic', 'robot', 'space', 'alien', 'cyber', 'galaxy', 'neon', 'future', 'spacecraft', 'spaceship', 'technology', 'cyberpunk', 'cyborg', 
      'dystopian', 'planetary', 'universe', 'stars', 'tech', 'advanced', 'space station', 'space colony', 'futuristic city', 'hologram', 'laser', 'mech', 'ai'],
      'vintage': ['vintage', 'retro', 'old', 'classic', 'antique', 'history', 'nostalgic', 'ancient', 'sepia', 'aged', 'toned portrait', 'vintage photograph', 'vintage style', 'vintage photo', 'retro style'],
      'abstract': ['abstract', 'geometric', 'pattern', 'colorful', 'modern art', 'non-representational', 'contemporary', 'minimalist'],
      'animals': ['animal', 'cat', 'dog', 'bird', 'pet', 'wildlife', 'lion', 'tiger', 'elephant', 'zebra'],
      'fashion': ['fashion', 'clothing', 'outfit', 'dress', 'apparel', 'clothes', 'garment', 'accessory', 'jewelry', 'hat', 'shoes', 'bag', 'designer', 'runway', 'collection', 'trend', 'couture', 'fashion model', 'chic', 'stylish', 'trendy', 'vogue', 'fashionable', 'attire', 'wear', 'wardrobe']
    };
    
    // 카테고리 우선순위 (높은 번호가 더 높은 우선순위)
    const categoryPriority: Record<string, number> = {
      'vintage': 10,  // vintage에 가장 높은 우선순위 부여
      'fashion': 8,
      'sci-fi': 8,
      'fantasy': 7,
      'anime': 7,
      'abstract': 6,
      'animals': 6,
      'urban': 5,
      'landscape': 5,
      'portrait': 4
    };
    
    // 프롬프트 소문자 변환
    const lowerPrompt = prompt.toLowerCase();
    
    // 카테고리별 키워드 매칭 점수
    const scores: Record<string, number> = {};
    
    // 각 카테고리별 매칭 점수 계산
    Object.entries(categoryKeywords).forEach(([category, keywords]) => {
      scores[category] = 0;
      keywords.forEach(keyword => {
        // 정확한 단어 매칭 (앞뒤에 공백이나 구두점이 있는 경우)
        const regex = new RegExp(`(^|\\s|[.,!?;])${keyword}(\\s|[.,!?;]|$)`, 'i');
        if (regex.test(lowerPrompt)) {
          scores[category] += 2; // 정확한 매칭에는 더 높은 점수
        } 
        // 부분 문자열 매칭
        else if (lowerPrompt.includes(keyword)) {
          scores[category] += 1;
        }
      });
      
      // 가중치 적용
      scores[category] *= categoryPriority[category] || 1.0;
    });
    
    // 특수 케이스 처리: 'fashion photography'나 'fashion shoot' 같은 명확한 패션 관련 구문이 있으면 가중치 추가
    const fashionPhrases = ['fashion photography', 'fashion shoot', 'fashion model', 'fashion design', 
                          'fashion show', 'fashion editorial', 'high fashion', 'fashion week'];
    
    for (const phrase of fashionPhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['fashion'] += 5; // 명확한 패션 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // sci-fi 관련 구문에 특별 가중치 부여
    const scifiPhrases = ['science fiction', 'sci-fi scene', 'futuristic city', 'space station', 
                         'alien planet', 'cyberpunk', 'cyber city', 'futuristic technology',
                         'space colony', 'space exploration', 'dystopian future', 'futuristic world',
                         'advanced technology', 'space travel', 'space war', 'future society'];
                         
    for (const phrase of scifiPhrases) {
      if (lowerPrompt.includes(phrase)) {
        scores['sci-fi'] += 5; // 명확한 sci-fi 관련 구문에 높은 가중치 부여
        break;
      }
    }
    
    // 가장 높은 점수를 가진 카테고리 찾기
    let bestCategory = 'portrait';
    let highestScore = 0;
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score > highestScore) {
        highestScore = score;
        bestCategory = category;
      }
    });
    
    // 점수가 0보다 크면 프롬프트 기반 카테고리 반환
    if (highestScore > 0) {
      return bestCategory;
    }
  }
  
  // 프롬프트에서 카테고리를 찾지 못한 경우 스타일 기반으로 판단
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
    'scifi': 'sci-fi',
    'science fiction': 'sci-fi',
    'futuristic': 'sci-fi',
    'cyberpunk': 'sci-fi',
    'space': 'sci-fi',
    'neon': 'sci-fi',
    'vintage': 'vintage',
    'abstract': 'abstract',
    'animals': 'animals',
    'highfashion': 'fashion',
    'fashion': 'fashion',
    'studio': 'fashion',
    'editorial': 'fashion',
    'lookbook': 'fashion',
  };

  // 정확한 매치 확인
  if (style && styleToCategory[style.toLowerCase()]) {
    return styleToCategory[style.toLowerCase()];
  }
  
  // 부분 매치 확인
  if (style) {
    for (const [key, value] of Object.entries(styleToCategory)) {
      if (style.toLowerCase().includes(key.toLowerCase())) {
        return value;
      }
    }
  }

  return 'other'; // 모든 분석에서 카테고리를 찾지 못한 경우 'other'로 설정
}

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
}

const getCategoryEmoji = (category?: string): string => {
  if (!category) return '🎨';
  
  const emojiMap: { [key: string]: string } = {
    'portrait': '👩‍🎨',
    'anime': '🦸‍♀️',
    'landscape': '🌄',
    'urban': '��',
    'fantasy': '🐉',
    'sci-fi': '👾',
    'vintage': '🕰️',
    'abstract': '🔮',
    'animals': '🐱',
    'fashion': '👕'
  };
  
  return emojiMap[category.toLowerCase()] || '🎨';
}

// ImageCard 컴포넌트를 분리하여 최적화
const ImageCard = memo(({ 
  item, 
  handleShare, 
  handleImageLoaded, 
  handleImageError, 
  setCommentModalState, 
  handleLike, 
  likedPostsMap, 
  likesMap, 
  commentsMap,
  isSignedIn
}: ImageCardProps) => {
  // useMemo로 카테고리 정보 처리를 메모이제이션
  const categoryInfo = useMemo(() => {
    const name = getCategoryFromStyle(item.renderingStyle, item.prompt);
    return {
      name,
      color: getCategoryColor(name),
      emoji: getCategoryEmoji(name)
    };
  }, [item.renderingStyle, item.prompt]);
  
  // 공유 버튼 클릭 핸들러를 메모이제이션
  const shareClickHandler = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleShare(item.id);
  }, [item.id, handleShare]);
  
  // 댓글 버튼 클릭 핸들러를 메모이제이션
  const commentClickHandler = useCallback(() => {
    setCommentModalState({
      isOpen: true,
      postId: item.id
    });
  }, [item.id, setCommentModalState]);
  
  // 좋아요 버튼 클릭 핸들러를 메모이제이션
  const likeClickHandler = useCallback(() => {
    handleLike(item.id);
  }, [item.id, handleLike]);
  
  return (
    <div 
      className="group relative bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 p-3"
    >
      {/* 이미지 컨테이너 - will-change를 사용하여 하드웨어 가속 활성화 */}
      <div className="relative aspect-square rounded-lg overflow-hidden mb-3 shadow-sm">
        <Image
          src={item.imageUrl}
          alt={item.prompt}
          fill
          className="object-cover transition-transform duration-300 group-hover:scale-105 will-change-transform"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 33vw, 25vw"
          loading="lazy"
          placeholder="blur"
          blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iNTAwIiBoZWlnaHQ9IjUwMCIgZmlsbD0iI2YxZjFmMSIvPjwvc3ZnPg=="
          priority={false}
          quality={70}
          onLoad={() => handleImageLoaded(item.id)}
          onError={() => {
            console.log(`[오류] ID: ${item.id} 이미지 로드 실패`);
            handleImageError(item.id);
          }}
        />
        
        {/* 카테고리 뱃지 - 이미지 위에 위치 */}
        <div className="absolute top-2 left-2">
          <span className={`px-2 py-1 rounded-full text-[10px] font-bold shadow-md backdrop-blur-sm flex items-center ${categoryInfo.color}`}>
            <span className="mr-1">{categoryInfo.emoji}</span> {categoryInfo.name}
          </span>
        </div>
        
        {/* 비로그인 시 Sign Up 배지 중앙에 표시 */}
        {!isSignedIn && (
          <SignUpButton mode="modal">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center transition-all duration-300 cursor-pointer hover:bg-black/40">
              <div className="px-4 py-2 bg-white shadow-lg rounded-full border border-blue-200 flex items-center gap-2 transform transition-all duration-300 hover:scale-105 hover:shadow-xl">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-blue-600 text-sm font-bold tracking-wide">SIGN UP</span>
              </div>
            </div>
          </SignUpButton>
        )}
        
        {/* 상호작용 버튼들 - 호버 시 표시, CSS 애니메이션 최적화 */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2">
          <div className="flex justify-end space-x-2 mb-2">
            <button
              onClick={shareClickHandler}
              className={`py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-colors duration-200 text-xs font-medium ${
                item.isShared 
                  ? "bg-green-600 text-white shadow-sm" 
                  : item.isSharing
                  ? "bg-gray-50 text-gray-500 cursor-wait border border-gray-200"
                  : "bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 hover:border-gray-400"
              }`}
              disabled={item.isShared || item.isSharing}
            >
              {item.isShared 
                ? (
                  <div className="flex items-center">
                    <span className="inline-block mr-1.5 text-sm">⌛</span>
                    <span className="text-xs">Shared</span>
                  </div>
                )
                : item.isSharing
                ? (
                  <div className="flex items-center">
                    <div className="flex items-center mr-1.5">
                      {/* will-change-transform을 사용하여 GPU 가속 지정 */}
                      <span 
                        className="inline-block text-sm" 
                        style={{ 
                          animation: 'spin 1.5s linear infinite',
                          willChange: 'transform'
                        }}
                      >⏳</span>
                    </div>
                    <span className="text-xs">Sharing</span>
                  </div>
                )
                : (
                  <div className="flex items-center">
                    {/* transform과 transition을 CSS 변수로 분리 */}
                    <span 
                      className="inline-block mr-1.5 text-sm hourglass-icon" 
                      style={{ 
                        willChange: 'transform',
                        transition: 'transform 0.3s ease'
                      }}
                    >⏳</span>
                    <span className="text-xs">Share</span>
                  </div>
                )
              }
            </button>
          </div>
        </div>
      </div>
      
      {/* 정보 영역 */}
      <div className="space-y-2">
        {/* 날짜와 상호작용 카운터 */}
        <div className="flex items-center justify-between">
          <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">
            {formatDate(item.createdAt)}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Heart size={14} className={`${likedPostsMap[item.id] ? 'text-pink-500 fill-pink-500' : 'text-gray-400'}`} />
              <span className="text-xs text-gray-500">{likesMap[item.id] || 0}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle size={14} className="text-gray-400" />
              <span className="text-xs text-gray-500">{commentsMap[item.id]?.length || 0}</span>
            </div>
          </div>
        </div>
        
        {/* 프롬프트 텍스트 */}
        <div className="text-xs text-gray-800 line-clamp-2" style={{minHeight: '32px'}}>
          {item.prompt}
        </div>
        
        {/* 액션 버튼 영역 */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={commentClickHandler}
            className="text-xs py-1 px-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            View Comments
          </button>
          
          <button
            onClick={likeClickHandler}
            className={`text-xs py-1 px-2.5 rounded-lg transition-colors flex items-center gap-1
              ${likedPostsMap[item.id] 
                ? 'bg-pink-50 text-pink-600 hover:bg-pink-100' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
          >
            <Heart size={12} className={likedPostsMap[item.id] ? 'fill-pink-500' : ''} />
            {likedPostsMap[item.id] ? 'Unlike' : 'Like'}
          </button>
        </div>
      </div>
    </div>
  );
});

ImageCard.displayName = 'ImageCard';

function RecentImageCardsContent() {
  // CSS 스타일 주입
  useEffect(() => {
    injectStyles();
  }, []);

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
  // 이미지 로드 상태를 추적하는 상태 추가
  const [imageLoadStatus, setImageLoadStatus] = useState<Record<string, boolean>>({})
  const [imageLoadErrors, setImageLoadErrors] = useState<Record<string, boolean>>({})

  const { user, isSignedIn } = useUser()
  const router = useRouter()
  
  // 토스트 중복 방지용 ref
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // 토스트 표시 함수 - 성능 최적화
  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    // 전역 플래그가 활성화되어 있으면 토스트를 표시하지 않음
    if (isToastInProgress) return;
    
    // 전역 플래그 활성화
    isToastInProgress = true;
    
    // 기존 타이머가 있다면 취소
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    
    // requestAnimationFrame을 사용하여 렌더링 성능 최적화
    requestAnimationFrame(() => {
      if (type === 'success') {
        toast.success(message, { 
          position: 'top-center', 
          duration: 2000,  // 표시 시간 단축
          id: 'recent-image-success', // 고정 ID
          style: { zIndex: 1000 } // z-index 설정
        });
      } else {
        toast.error(message, { 
          position: 'top-center', 
          duration: 2000,  // 표시 시간 단축
          id: 'recent-image-error', // 고정 ID
          style: { zIndex: 1000 } // z-index 설정
        });
      }
      
      // 토스트 표시 후 플래그 비활성화 타이머 설정
      toastTimerRef.current = setTimeout(() => {
        toastTimerRef.current = null;
        isToastInProgress = false;
      }, 500); // 대기 시간 단축
    });
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

  // 이미지 ID들을 추출
  const imageIds = useMemo(() => data.map(item => item.id), [data])

  // 배치 API를 통해 모든 이미지의 댓글 가져오기
  const { data: batchComments, isLoading: isLoadingComments } = useCommentsBatch(
    imageIds,
    { enabled: imageIds.length > 0 }
  )

  // 댓글 mutation 훅
  const addCommentMutation = useAddComment()

  // 댓글 데이터 업데이트
  useEffect(() => {
    if (batchComments) {
      setCommentsMap(batchComments)
    }
  }, [batchComments])

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
            // 이 작업은 메인 스레드를 차단할 수 있는 무거운 연산이 될 수 있으므로
            // requestAnimationFrame을 사용하여 브라우저 렌더링에 영향을 최소화
            const processStoredImages = () => {
              const allImages = JSON.parse(storedImages)
              
              // 현재 시간
              const now = new Date().getTime()
              const ONE_DAY_MS = 86400000; // 24시간(밀리초)
              
              // 만료되지 않은 이미지만 필터링 (24시간 내의 이미지만 표시)
              // 한 번의 반복문에서 필터링과 정렬 정보를 준비
              const validImagesWithTimestamp: {image: Generation, timestamp: number}[] = [];
              
              for (let i = 0; i < allImages.length; i++) {
                const img = allImages[i];
                const createdTime = new Date(img.createdAt).getTime();
                const timeDiff = now - createdTime;
                
                if (timeDiff < ONE_DAY_MS) {
                  validImagesWithTimestamp.push({
                    image: img,
                    timestamp: createdTime
                  });
                }
                
                // 필요한 최대 개수만 처리하고 조기 종료
                if (validImagesWithTimestamp.length >= 2 && i >= 10) break;
              }
              
              // 최신 항목이 먼저 오도록 정렬
              validImagesWithTimestamp.sort((a, b) => b.timestamp - a.timestamp);
              
              // 최대 2개만 표시
              localImages = validImagesWithTimestamp.slice(0, 2).map(item => item.image);
              
              // 상태 업데이트
              setData(localImages);
              
              // 좋아요 맵 초기화
              const initialLikesMap: Record<string, number> = {};
              localImages.forEach(item => {
                initialLikesMap[item.id] = item.likes || 0;
              });
              setLikesMap(initialLikesMap);
              
              setLoading(false);
              setRefreshing(false);
            };
            
            // 다음 애니메이션 프레임에 작업 스케줄링
            requestAnimationFrame(processStoredImages);
            return; // 여기서 함수 종료, 상태 업데이트는 processStoredImages에서 처리
          } catch (e) {
            console.error('Failed to parse stored images:', e)
          }
        }
      }
      
      // 이미지가 없거나 에러가 발생한 경우
      setData(localImages)
      setLikesMap({});
      setLoading(false)
      setRefreshing(false)
    } catch (error) {
      console.error('Failed to load recent images:', error)
      setData([])
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);
  
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
      
      // FormData를 사용한 좋아요 API 호출
      if (isSignedIn && user) {
        try {
          const formData = new FormData();
          formData.append("postId", postId);
          formData.append("userId", user.id);
          formData.append("isLiked", String(isCurrentlyLiked)); // 현재 상태 (토글 전)
          
          const response = await fetch("/api/likes", {
            method: "POST",
            body: formData // Content-Type 자동 설정
          });
          
          const result = await response.json();
          if (!result.success) {
            console.error('Like API error:', result.error);
          }
        } catch (apiError) {
          console.error('Like API call failed:', apiError);
          // API 호출 실패해도 UI는 낙관적 업데이트 유지
        }
      }
      
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
      // 가상의 댓글 추가 (UI 즉시 업데이트)
      const newComment = {
        id: `comment-${Date.now()}`,
        postId,
        userId: currentUser.id, 
        userName: currentUser.name,
        text,
        createdAt: new Date().toISOString()
      };
      
      // 낙관적 UI 업데이트
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [...(prev[postId] || []), newComment]
      }))
      
      // React Query mutation 사용
      if (isSignedIn && user) {
        await addCommentMutation.mutateAsync({
          imageId: postId,
          userId: user.id,
          userName: user.firstName || user.username || 'User',
          text,
        });
      }
      
      setCommentModalState({ isOpen: false, postId: '' });
    } catch (error) {
      console.error('Error adding comment:', error);
      showToast('error', 'Failed to add comment.');
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 500);
    }
  };

  // 댓글 삭제 함수
  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    try {
      // 낙관적 UI 업데이트
      setCommentsMap(prev => ({
        ...prev,
        [postId]: prev[postId].filter(comment => comment.id !== commentId)
      }))
      
      // FormData를 사용한 댓글 삭제 API 호출
      if (isSignedIn && user) {
        try {
          const formData = new FormData();
          formData.append("imageId", postId);
          formData.append("commentId", commentId);
          formData.append("userId", user.id);
          
          const response = await fetch("/api/comments/delete", {
            method: "POST",
            body: formData // Content-Type 자동 설정
          });
          
          const result = await response.json();
          if (!result.success) {
            console.error('Comment delete API error:', result.error);
          }
        } catch (apiError) {
          console.error('Comment delete API call failed:', apiError);
          // API 호출 실패해도 UI는 낙관적 업데이트 유지
        }
      }
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
    try {
      // 이미 공유 중이거나 공유된 아이템인지 확인
      const imageToShare = data.find(item => item.id === postId);
      
      if (!imageToShare) {
        toast.error('Image not found');
        return;
      }
      
      if (imageToShare.isShared) {
        toast.info('This image has already been shared.');
        // 이미 공유된 이미지면 커뮤니티 페이지로 이동
        router.push('/community');
        return;
      }
      
      // 유효한 이미지 URL 확인
      if (!imageToShare.imageUrl) {
        toast.error('Image URL is missing.');
        return;
      }
      
      // 공유 중인 상태로 설정
      setData(prevData => 
        prevData.map(item => 
          item.id === postId ? { ...item, isSharing: true } : item
        )
      );
      
      // 로딩 표시
      const loadingToast = toast.loading('Sharing image...');
      
      // FormData 생성 및 필요한 데이터 추가
      const formData = new FormData();
      formData.append("imageUrl", imageToShare.imageUrl);
      formData.append("prompt", imageToShare.prompt || '');
      formData.append("renderingStyle", imageToShare.renderingStyle || '');
      formData.append("gender", imageToShare.gender || '');
      formData.append("age", imageToShare.age || '');
      formData.append("aspectRatio", imageToShare.aspectRatio || imageToShare.ratio || '1:1');
      formData.append("selectedCategory", imageToShare.selectedCategory || '');
      formData.append("generationId", imageToShare.id || '');
      formData.append("storagePath", imageToShare.storagePath || '');
      
      // API 호출
      const response = await fetch('/api/share', {
        method: 'POST',
        body: formData,
      });
      
      // 응답 처리
      let responseData: { success: boolean; error?: string } = { success: false };
      
      try {
        responseData = await response.json();
      } catch (err) {
        console.error('Error parsing response:', err);
      }
      
      // 로딩 토스트 제거
      toast.dismiss(loadingToast);
      
      if (responseData.success) {
        // 공유 성공 처리
        setData(prevData => 
          prevData.map(item => 
            item.id === postId ? { ...item, isShared: true, isSharing: false } : item
          )
        );
        
        toast.success('Shared to community!');
        
        // 로컬 스토리지 업데이트
        if (typeof window !== 'undefined') {
          try {
            const storedImages = localStorage.getItem('generatedImages');
            if (storedImages) {
              const images = JSON.parse(storedImages);
              const updatedImages = images.map((img: any) => {
                if (img.id === postId) {
                  return { ...img, isShared: true };
                }
                return img;
              });
              localStorage.setItem('generatedImages', JSON.stringify(updatedImages));
              
              // 스토리지 이벤트 발생
              window.dispatchEvent(new Event('storage'));
            }
          } catch (e) {
            console.error('Local storage update error:', e);
          }
        }
        
        // 공유 성공 후 커뮤니티 페이지로 이동
        setTimeout(() => {
          router.push('/community');
        }, 1000); // 1초 후 이동하여 성공 메시지를 볼 수 있게 함
      } else {
        // 공유 실패 처리
        setData(prevData => 
          prevData.map(item => 
            item.id === postId ? { ...item, isSharing: false } : item
          )
        );
        
        const errorMessage = responseData.error || 'Unknown error';
        console.error("Share failed:", errorMessage);
        toast.error(`Image sharing error: ${errorMessage}`);
      }
    } catch (error) {
      // 오류 처리
      console.error('Error during sharing:', error);
      toast.error(`Image sharing error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // 상태 초기화
      setData(prevData => 
        prevData.map(item => 
          item.id === postId ? { ...item, isSharing: false } : item
        )
      );
    }
  };
  
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
          
          // 현재 상태 업데이트 - 공유된 이미지의 상태만 변경하고 목록에서 제거하지 않음
          setData(prevData => 
            prevData.map(item => 
              item.id === postId ? { ...item, isShared: true } : item
            )
          );
          
          // 성공 메시지 추가
          toast.success('This image has been successfully shared.', {
            position: 'top-center',
            duration: 3000
          });
        }
      } catch (e) {
        console.error('Failed to update shared status:', e);
      }
    }
  }

  // 다운로드 함수 추가
  const handleDownload = async (imageUrl: string) => {
    try {
      if (!imageUrl) {
        toast.error('Image URL is missing');
        return;
      }
      
      const loadingToast = toast.loading('Downloading image...');
      
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_model_${Date.now()}.webp`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss(loadingToast);
      toast.success('Image downloaded successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(`Failed to download image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // 이미지 로드 성공 처리
  const handleImageLoaded = (postId: string) => {
    setImageLoadStatus(prev => ({
      ...prev,
      [postId]: true
    }));
  };

  // 이미지 로드 오류 처리
  const handleImageError = (postId: string) => {
    console.log(`[심각한 오류] ID: ${postId} 이미지 로드 실패 - 이미지를 찾을 수 없습니다`);
    
    // 오류 상태 업데이트
    setImageLoadErrors(prev => ({
      ...prev,
      [postId]: true
    }));
    
    // 메모리에서 해당 이미지를 필터링하여 제거
    setData(prevData => prevData.filter(item => item.id !== postId));
    
    // 로컬 스토리지에서도 해당 이미지 정보를 제거
    if (typeof window !== 'undefined') {
      try {
        const storedImages = localStorage.getItem('generatedImages');
        if (storedImages) {
          const images = JSON.parse(storedImages);
          const filteredImages = images.filter((img: Generation) => img.id !== postId);
          localStorage.setItem('generatedImages', JSON.stringify(filteredImages));
          console.log(`ID: ${postId} 이미지가 로컬 스토리지에서 제거되었습니다`);
        }
      } catch (e) {
        console.error('Failed to update local storage after image error:', e);
      }
    }
  };

  // 필터링된 데이터 (오류 있는 이미지 제외)
  const filteredData = data.filter(item => !imageLoadErrors[item.id]);

  if (loading) return (
    <div className="flex justify-center items-center min-h-[200px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>
  )

  if (data.length === 0 || filteredData.length === 0) return (
    <div className="text-center py-8 text-gray-500">
      {data.length === 0 ? "No images generated yet" : null}
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
        {filteredData.map((item) => (
          <ImageCard
            key={item.id}
            item={item}
            handleShare={handleShare}
            handleImageLoaded={handleImageLoaded}
            handleImageError={handleImageError}
            setCommentModalState={setCommentModalState}
            handleLike={handleLike}
            likedPostsMap={likedPostsMap}
            likesMap={likesMap}
            commentsMap={commentsMap}
            isSignedIn={!!isSignedIn}
          />
        ))}
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