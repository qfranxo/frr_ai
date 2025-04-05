'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Share2, MessageCircle, Heart, AlertCircle, X, Send, Trash2, Camera, Palette, Mountain, Building, Wand2, Rocket, Clock, Dribbble, PawPrint, Sparkles, Box, Lock, User, Download, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useUser, SignInButton } from '@clerk/nextjs';
import { useLikes } from '@/hooks/useLikes';
import { useComments } from '@/hooks/useComments';
import Masonry from 'react-masonry-css';
import { AuthLikeButton, AuthCommentButton } from '@/components/shared/AuthButtons';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import { communityApi } from '@/lib/api';
import LoadingScreen from '@/components/shared/LoadingScreen';
import { ImageCard } from '@/components/shared/ImageCard';
import { v4 as uuidv4 } from 'uuid';
import { logManager } from '@/lib/logger';

// 댓글 타입 정의
interface Comment {
  id: string;
  imageId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: string;
}

// 실제 DB에서 가져온 데이터 타입 정의
interface GenerationPost {
  id: string;
  userId: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: string;
  renderingStyle: string;
  gender: string;
  age: string;
  category: string;
  createdAt: string;
  likes?: number;
  comments?: Comment[];
  cameraDistance?: string;
  eyeColor?: string;
  skinType?: string;
  hairStyle?: string;
  modelVersion?: string;
  background?: string;
}

// 카테고리 정의
const categories = [
  { id: 'all', label: 'All', icon: Palette, samplePrompt: '' },
  { id: 'portrait', label: 'Portrait', icon: User, samplePrompt: 'Professional headshot with studio lighting' },
  { id: 'landscape', label: 'Landscape', icon: Mountain, samplePrompt: 'Beautiful landscape with mountains and lake' },
  { id: 'urban', label: 'Urban', icon: Building, samplePrompt: 'Modern cityscape with skyscrapers' },
  { id: 'anime', label: 'Anime', icon: Wand2, samplePrompt: 'Anime style character with vibrant colors' },
  { id: 'fantasy', label: 'Fantasy', icon: Rocket, samplePrompt: 'Fantasy world with magical creatures' },
  { id: 'fashion', label: 'Fashion', icon: Clock, samplePrompt: 'Fashion photography with high-quality lighting' },
  { id: 'vintage', label: 'Vintage', icon: Dribbble, samplePrompt: 'Vintage photograph style, sepia toned portrait' },
  { id: 'sci-fi', label: 'Sci-Fi', icon: PawPrint, samplePrompt: 'Futuristic science fiction scene' },
  { id: 'animals', label: 'Animals', icon: Sparkles, samplePrompt: 'Wildlife photography in natural habitat' },
  { id: 'abstract', label: 'Abstract', icon: Box, samplePrompt: 'Abstract art with vibrant colors' },
  { id: 'other', label: 'Other', icon: Lock, samplePrompt: 'Create your own unique style' }
];

// 삭제할 카테고리 정의
const categoriesToDelete = ['abstract', 'animals'];

// 카테고리별 색상 매핑
const getCategoryColor = (category: string | undefined): string => {
  if (!category) return 'bg-gray-100 text-gray-700';
  
  const colorMap: { [key: string]: string } = {
    'portrait': 'bg-blue-100 text-blue-800 border border-blue-200',
    'anime': 'bg-violet-100 text-violet-800 border border-violet-200',
    'landscape': 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    'urban': 'bg-amber-100 text-amber-800 border border-amber-200',
    'fantasy': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'sci-fi': 'bg-cyan-100 text-cyan-800 border border-cyan-200',
    'vintage': 'bg-rose-100 text-rose-800 border border-rose-200',
    'abstract': 'bg-purple-100 text-purple-800 border border-purple-200',
    'animals': 'bg-lime-100 text-lime-800 border border-lime-200',
    'fashion': 'bg-pink-100 text-pink-800 border border-pink-200',
    'all': 'bg-indigo-100 text-indigo-800 border border-indigo-200',
    'my-cards': 'bg-purple-100 text-purple-800 border border-purple-200',
    'other': 'bg-orange-100 text-orange-800 border border-orange-200'
  };
  
  return colorMap[category] || 'bg-gray-100 text-gray-700 border border-gray-200';
};

// 스타일에 따른 카테고리 매핑 함수
const getCategoryFromStyle = (style?: string): string => {
  if (!style) return 'portrait';
  
  const styleLower = style.toLowerCase();
  
  // 스타일에 따른 카테고리 매핑 테이블
  const styleToCategory: { [key: string]: string } = {
    // 애니메이션 스타일
    'anime': 'anime',
    'digital_illustration': 'anime',
    'digital_illustration/pixel_art': 'anime',
    'digital_illustration/hand_drawn': 'anime',
    'digital_illustration/infantile_sketch': 'anime',
    'cartoon': 'anime',
    
    // 포트레이트 스타일
    'realistic': 'portrait',
    'realistic_image': 'portrait',
    'realistic_image/studio_portrait': 'portrait',
    'realistic_image/natural_light': 'portrait',
    'portrait': 'portrait',
    'photo': 'portrait',
    
    // 풍경 스타일
    'landscape': 'landscape',
    'nature': 'landscape',
    'scenery': 'landscape',
    
    // 도시 스타일
    'city': 'urban',
    'urban': 'urban',
    'architecture': 'urban',
    
    // 판타지 스타일
    'fantasy': 'fantasy',
    'magical': 'fantasy',
    'dragon': 'fantasy',
    
    // 미래적 스타일
    'sci-fi': 'sci-fi',
    'future': 'sci-fi',
    'space': 'sci-fi',
    'futuristic': 'sci-fi',
    'cyber': 'sci-fi',
    
    // 빈티지 스타일
    'vintage': 'vintage',
    'retro': 'vintage',
    'old style': 'vintage',
    'classic': 'vintage'
  };
  
  // 정확한 매칭 먼저 시도
  if (styleToCategory[styleLower]) {
    return styleToCategory[styleLower];
  }
  
  // 부분 매칭으로 카테고리 찾기
  for (const [styleKey, category] of Object.entries(styleToCategory)) {
    if (styleLower.includes(styleKey)) {
      return category;
    }
  }
  
  // 기본값
  return 'portrait';
};

// 카테고리별 샘플 프롬프트 가져오기
const getSamplePromptForCategory = (categoryId: string) => {
  const category = categories.find(cat => cat.id === categoryId);
  return category?.samplePrompt || categories[0].samplePrompt;
};

// 버튼 컴포넌트 정의 (getSamplePromptForCategory 함수 이후로 이동)
interface CreateButtonProps {
  category: string;
  variant?: 'primary' | 'small' | 'empty-state';
  prompt?: string;
  label?: string;
}

const CreateButton = ({ category, variant = 'primary', prompt, label }: CreateButtonProps) => {
  // 카테고리에 맞는 프롬프트 가져오기
  const buttonPrompt = prompt || getSamplePromptForCategory(category);
  
  // URL 생성
  const generateUrl = `/generate${category !== 'all' ? 
    `?category=${category}&prompt=${encodeURIComponent(buttonPrompt)}` : 
    ''}`;
  
  // 버튼 스타일 결정
  const buttonStyle = (() => {
    // 변형에 따른 스타일
    if (variant === 'primary') {
      return "inline-flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 text-white font-medium rounded-full shadow-sm hover:from-blue-600 hover:via-blue-500 hover:to-blue-400 transition-colors";
    } else if (variant === 'small') {
      return `mb-1 sm:mb-2 mr-1 sm:mr-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-white shadow-sm transition-colors ${
        category === 'all' ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 hover:from-blue-600 hover:via-blue-500 hover:to-blue-400' :
        category === 'portrait' ? 'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 hover:from-blue-600 hover:via-blue-500 hover:to-blue-400' :
        category === 'anime' ? 'bg-gradient-to-r from-violet-500 via-violet-400 to-violet-300 hover:from-violet-600 hover:via-violet-500 hover:to-violet-400' :
        category === 'landscape' ? 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300 hover:from-emerald-600 hover:via-emerald-500 hover:to-emerald-400' :
        category === 'urban' ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300 hover:from-amber-600 hover:via-amber-500 hover:to-amber-400' :
        category === 'sci-fi' ? 'bg-gradient-to-r from-cyan-500 via-cyan-400 to-cyan-300 hover:from-cyan-600 hover:via-cyan-500 hover:to-cyan-400' :
        category === 'fantasy' ? 'bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-300 hover:from-indigo-600 hover:via-indigo-500 hover:to-indigo-400' :
        category === 'vintage' ? 'bg-gradient-to-r from-rose-500 via-rose-400 to-rose-300 hover:from-rose-600 hover:via-rose-500 hover:to-rose-400' :
        category === 'fashion' ? 'bg-gradient-to-r from-pink-500 via-pink-400 to-pink-300 hover:from-pink-600 hover:via-pink-500 hover:to-pink-400' :
        category === 'abstract' ? 'bg-gradient-to-r from-purple-500 via-purple-400 to-purple-300 hover:from-purple-600 hover:via-purple-500 hover:to-purple-400' :
        category === 'animals' ? 'bg-gradient-to-r from-lime-500 via-lime-400 to-lime-300 hover:from-lime-600 hover:via-lime-500 hover:to-lime-400' :
        category === 'other' ? 'bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 hover:from-orange-600 hover:via-orange-500 hover:to-orange-400' :
        'bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 hover:from-blue-600 hover:via-blue-500 hover:to-blue-400'
      }`;
    } else if (variant === 'empty-state') {
      return "px-4 py-2.5 bg-gradient-to-r from-blue-500 via-blue-400 to-blue-300 text-white font-medium rounded-full shadow-sm hover:from-blue-600 hover:via-blue-500 hover:to-blue-400 transition-colors flex items-center gap-2";
    }
  })();
  
  // 버튼 레이블 결정
  const buttonLabel = label || (variant === 'small' ? 'Create' : 
    variant === 'empty-state' ? `Create Image for ${category !== 'all' ? category : 'Gallery'}` : 
    'Create New Image');
  
  // 아이콘 크기 결정
  const iconSize = variant === 'primary' ? 16 : variant === 'small' ? 14 : 18;
  
  return (
    <a href={generateUrl} className={buttonStyle}>
      {variant === 'small' ? (
        <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
      ) : (
        <Sparkles size={iconSize} />
      )}
      <span className={variant === 'primary' ? "text-xs sm:text-sm" : ""}>{buttonLabel}</span>
    </a>
  );
};

// 버튼 컴포넌트들을 정의
interface CategoryButtonProps {
  id: string;
  label: string;
  isSelected: boolean;
  onClick: () => void;
}

const CategoryButton = ({ id, label, isSelected, onClick }: CategoryButtonProps) => {
  // 이모지 맵핑
  const getCategoryEmoji = (id: string): string => {
    switch(id) {
      case 'all': return '✨';
      case 'portrait': return '👩‍🎨';
      case 'landscape': return '🌄';
      case 'urban': return '🏢';
      case 'anime': return '🦸‍♀️';
      case 'fantasy': return '🐉';
      case 'sci-fi': return '👾';
      case 'vintage': return '🕰️';
      case 'fashion': return '👕';
      case 'animals': return '🐱';
      case 'abstract': return '🔮';
      case 'my-cards': return '🖼️';
      default: return '🎨';
    }
  };
  
  // 카테고리 색상 맵핑
  const getCategoryColorClass = (id: string, isSelected: boolean): string => {
    // 선택된 경우의 그라데이션 색상
    if (isSelected) {
      const gradientMap: Record<string, string> = {
        'all': 'from-blue-600 via-blue-500 to-blue-400',
        'portrait': 'from-blue-600 via-blue-500 to-blue-400',
        'anime': 'from-violet-600 via-violet-500 to-violet-400',
        'landscape': 'from-emerald-600 via-emerald-500 to-emerald-400',
        'urban': 'from-amber-600 via-amber-500 to-amber-400',
        'sci-fi': 'from-cyan-600 via-cyan-500 to-cyan-400',
        'fantasy': 'from-indigo-600 via-indigo-500 to-indigo-400',
        'vintage': 'from-rose-600 via-rose-500 to-rose-400',
        'fashion': 'from-pink-600 via-pink-500 to-pink-400',
        'abstract': 'from-purple-600 via-purple-500 to-purple-400',
        'animals': 'from-lime-600 via-lime-500 to-lime-400',
        'other': 'from-orange-600 via-orange-500 to-orange-400',
        'my-cards': 'from-purple-600 via-purple-500 to-purple-400'
      };
      
      return `bg-gradient-to-r ${gradientMap[id] || 'from-blue-600 via-blue-500 to-blue-400'} text-white shadow-sm border border-transparent`;
    }
    
    // 선택되지 않은 경우의 색상
    const colorMap: Record<string, string> = {
      'all': 'text-blue-700 border-blue-200 hover:border-blue-500 hover:bg-blue-50',
      'portrait': 'text-blue-700 border-blue-200 hover:border-blue-400 hover:bg-blue-50',
      'anime': 'text-violet-700 border-violet-200 hover:border-violet-400 hover:bg-violet-50',
      'landscape': 'text-emerald-700 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50',
      'urban': 'text-amber-700 border-amber-200 hover:border-amber-400 hover:bg-amber-50',
      'sci-fi': 'text-cyan-700 border-cyan-200 hover:border-cyan-400 hover:bg-cyan-50',
      'fantasy': 'text-indigo-700 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50',
      'vintage': 'text-rose-700 border-rose-200 hover:border-rose-400 hover:bg-rose-50',
      'fashion': 'text-pink-700 border-pink-200 hover:border-pink-400 hover:bg-pink-50',
      'abstract': 'text-purple-700 border-purple-200 hover:border-purple-400 hover:bg-purple-50',
      'animals': 'text-lime-700 border-lime-200 hover:border-lime-400 hover:bg-lime-50',
      'other': 'text-orange-700 border-orange-200 hover:border-orange-400 hover:bg-orange-50',
      'my-cards': 'text-purple-700 border-purple-200 hover:border-purple-500 hover:bg-purple-50'
    };
    
    return `bg-white border ${colorMap[id] || 'text-gray-700 border-gray-200 hover:border-blue-400'}`;
  };
  
  // 공통 클래스
  const baseClass = "mb-1 sm:mb-2 mr-1 sm:mr-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium transition-colors";
  
  return (
    <button
      onClick={onClick}
      className={`${baseClass} ${getCategoryColorClass(id, isSelected)} ${id === 'my-cards' ? 'mr-0 sm:mr-4' : ''}`}
    >
      <span className="text-base sm:text-lg">
        {getCategoryEmoji(id)}
      </span>
      <span>{label}</span>
    </button>
  );
};

// 마지막 데이터 로드 시간을 저장하는 전역 변수
let lastCommunityDataFetch = 0;

// 탭과 정렬 순서를 위한 enum
enum Tab {
  All = "all",
  Liked = "liked",
  Mine = "mine"
}

enum SortOrder {
  Latest = "latest",
  Popular = "popular"
}

export default function CommunityPage() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [communityData, setCommunityData] = useState<GenerationPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GenerationPost | null>(null);
  const [deletedImages, setDeletedImages] = useState<Record<string, boolean>>({});
  const [categoryImageDeleted, setCategoryImageDeleted] = useState<Record<string, boolean>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.All);
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.Latest);
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedImageLikes, setSelectedImageLikes] = useState<number>(0);
  const [gridRows, setGridRows] = useState<number>(3);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);
  
  // Clerk에서 사용자 정보 가져오기
  const { user, isSignedIn } = useUser();
  
  // 현재 사용자 정보
  const currentUser = {
    id: user?.id || 'guest-user',
    name: user?.firstName || user?.username || '게스트',
    username: user?.username || 'guest',
    imageUrl: user?.imageUrl
  };
  
  // 좋아요 및 댓글 기능 훅 사용
  const { likes: likesMap, likedPosts: likedPostsMap, handleLike } = useLikes(communityData as any, currentUser.id);
  const { 
    commentsMap, 
    handleComment, 
    deleteComment,
    isCommentModalOpen, 
    openCommentModal, 
    closeCommentModal,
    commentText,
    handleCommentTextChange,
    submitComment,
    selectedPostId
  } = useComments(communityData as any, currentUser);
  
  // 댓글 입력 필드 ref
  const commentInputRef = useRef<HTMLInputElement>(null);
  const commentScrollRef = useRef<HTMLDivElement>(null);

  // 삭제 확인 모달 상태 추가
  const [deleteModalState, setDeleteModalState] = useState({
    isOpen: false,
    type: 'post' as 'post' | 'comment',
    postId: '' as string,
    commentId: '' as string | number
  });

  // 커스텀 스크롤바 스타일 적용
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scrollbar-thin::-webkit-scrollbar {
        width: 6px;
      }
      .scrollbar-thin::-webkit-scrollbar-track {
        background: transparent;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb {
        background-color: rgba(229, 231, 235, 0.7);
        border-radius: 3px;
      }
      .scrollbar-thin::-webkit-scrollbar-thumb:hover {
        background-color: rgba(209, 213, 219, 0.8);
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 댓글 입력 필드 포커스 시 스크롤 조정
  useEffect(() => {
    if (isCommentModalOpen && commentInputRef.current) {
      // 모바일에서 키보드가 올라올 때 스크롤 최적화
      const focusInput = () => {
        // 약간의 지연 후 포커스
        setTimeout(() => {
          if (commentInputRef.current) {
            commentInputRef.current.focus();
            
            // 스크롤 영역을 댓글 목록 하단으로 이동
            if (commentScrollRef.current) {
              commentScrollRef.current.scrollTop = commentScrollRef.current.scrollHeight;
            }
          }
        }, 300);
      };
      
      focusInput();
    }
  }, [isCommentModalOpen]);

  // 상단으로 스크롤 버튼 표시 여부 제어
  useEffect(() => {
    const handleScroll = () => {
      // 300px 이상 스크롤 됐을 때 버튼 표시
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 제거
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 커뮤니티 데이터 가져오기
  const fetchCommunityData = useCallback(async (forceRefresh = false) => {
    try {
      setIsLoading(true);
      
      logManager.info('[커뮤니티] 데이터 로드 시작', { module: 'core' });
      const result = await communityApi.getPosts();
      
      // API 응답 형식 확인 (success, data 구조)
      if (result && typeof result === 'object' && 'success' in result && 
          result.success === true && 'data' in result && Array.isArray(result.data)) {
        // success: true, data: Array 형식일 경우
        const data = result.data as any[];
        logManager.info(`[커뮤니티] 데이터 로드 성공: ${data.length}개 게시물`, { 
          module: 'core',
          data: { count: data.length }
        });
        setCommunityData(data);
      } else if (result && Array.isArray(result)) {
        // 직접 배열이 반환될 경우 (이전 형식)
        logManager.info(`[커뮤니티] 데이터 로드 성공: ${result.length}개 게시물`, { 
          module: 'core',
          data: { count: result.length }
        });
        setCommunityData(result);
      } else {
        logManager.error('[커뮤니티] 데이터 로드 실패: 잘못된 응답 형식', { 
          module: 'core',
          data: result
        });
        setError('서버에서 올바른 형식의 데이터를 받지 못했습니다.');
        toast.error('커뮤니티 데이터를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      logManager.error('[커뮤니티] 데이터 로드 오류', { 
        module: 'core',
        data: error 
      });
      setError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
      toast.error('커뮤니티 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 초기 데이터 로드
  useEffect(() => {
    fetchCommunityData(true); // 최초 로드는 강제 갱신
  }, [fetchCommunityData]);
  
  // 로그인 상태 변경 시 데이터 다시 로드 (스로틀링 적용)
  const lastLoginRefreshRef = useRef(0);
  
  useEffect(() => {
    // 페이지 로딩 시 로그인 상태 변경 감지
    if (user && user.id) {
      const now = Date.now();
      if (now - lastLoginRefreshRef.current > 60000) {
        lastLoginRefreshRef.current = now;
        logManager.info('[커뮤니티] 로그인 상태 변경됨, 데이터 다시 로드', {
          module: 'core'
        });
        fetchCommunityData(false); // 캐시 사용 허용
      } else {
        logManager.info('[커뮤니티] 최근에 로그인 기반 새로고침을 했으므로 스킵 (60초 제한)', {
          module: 'core'
        });
      }
    }
  }, [user, fetchCommunityData]);

  // 카테고리별 이미지 삭제 함수
  const deleteOneImagePerCategory = async (data: GenerationPost[]) => {
    // 현재 로그인한 사용자만 삭제할 수 있음
    if (!user || !user.id) {
      toast.error('로그인 후 사용할 수 있습니다.');
      return;
    }
    
    const userId = user.id;
    
    // 카테고리별 이미지 그룹화
    const categorizedPosts: Record<string, GenerationPost[]> = {};
    
    data.forEach(post => {
      const category = post.category || getCategoryFromStyle(post.renderingStyle);
      
      if (!categorizedPosts[category]) {
        categorizedPosts[category] = [];
      }
      
      categorizedPosts[category].push(post);
    });
    
    // 카테고리별로 하나씩 이미지 삭제
    for (const category in categorizedPosts) {
      const categoryPosts = categorizedPosts[category];
      
      if (categoryPosts.length <= 1) {
        continue; // 카테고리에 이미지가 하나 이하면 삭제하지 않음
      }
      
      try {
        const imageToDelete = categoryPosts[0]; // 첫 번째 이미지 선택
        
        if (imageToDelete && imageToDelete.id) {
          try {
            await communityApi.deletePost(imageToDelete.id, userId);
            // 로컬 상태에서도 이미지 제거
            setCommunityData(prev => prev.filter(item => item.id !== imageToDelete.id));
            
            logManager.info(`Deleted one image from ${category} category`, {
              module: 'core'
            });
          } catch (error) {
            logManager.error(`Error deleting image from ${category}:`, {
              module: 'core',
              data: error
            });
          }
        }
      } catch (e) {
        // 예외 처리
      }
    }
  };

  // 카테고리별 필터링
  const filteredPosts = communityData.filter(post => {
    // Replicate URL은 필터링하지 않고 imageUrl이 없는 경우만 제외
    if (!post.imageUrl) {
      return false;
    }
    
    if (selectedCategory === 'all') return true;
    if (selectedCategory === 'my-cards') {
      // 현재 사용자가 작성한 이미지만 표시
      return post.userId === currentUser.id;
    }
    return post.category === selectedCategory;
  }).map(post => {
    // 이미지 URL 확인
    let imageUrl = post.imageUrl;
    
    // 원본 URL 그대로 사용 (저장은 ImageCard 컴포넌트에서 처리)
    return {
      ...post,
      imageUrl: imageUrl || '/fallback-image.png'
    };
  });
  
  // 카테고리별 샘플 프롬프트 가져오기
  const getSamplePromptForCategory = (categoryId: string) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.samplePrompt || categories[0].samplePrompt;
  };
  
  // 지도 데이터 변환 함수
  const mapToArray = <T,>(map: Record<string, T>): [string, T][] => {
    return Object.entries(map);
  };
  
  // 컴포넌트 상태에서 해당 postId의 좋아요 여부 획득
  const isPostLiked = (postId: string) => {
    return likedPostsMap[postId] || false;
  };
  
  // 컴포넌트 상태에서 해당 postId의 좋아요 수 획득
  const getPostLikes = (postId: string, defaultLikes: number = 0) => {
    return likesMap[postId] !== undefined ? likesMap[postId] : defaultLikes;
  };
  
  // 컴포넌트 상태에서 해당 postId의 댓글 목록 획득
  const getPostComments = (postId: string | undefined, defaultComments: Comment[] = []) => {
    try {
      if (!postId) return [];
      
      // commentsMap이 정의되어 있는지 확인
      if (!commentsMap) return defaultComments;
      
      // postId에 해당하는 댓글이 존재하는지 확인
      const comments = commentsMap[postId];
      
      // 댓글이 배열인지 확인
      if (!Array.isArray(comments)) return defaultComments;
      
      // 댓글 배열의 각 항목이 유효한지 확인
      return comments.filter(comment => comment && typeof comment === 'object');
    } catch (error) {
      logManager.error('댓글 정보 가져오기 오류:', {
        module: 'comments',
        data: error
      });
      return defaultComments;
    }
  };
  
  // 공유하기 기능
  const handleShare = async (imageId: string) => {
    try {
      // 이미지 검색
      const imageToShare = communityData.find(img => img.id === imageId);
      if (!imageToShare) {
        throw new Error("공유할 이미지를 찾을 수 없습니다");
      }
      
      logManager.info("Sharing image:", {
        module: 'core',
        data: { imageId }
      });
      
      // 원본 데이터 상세 로깅
      console.log("📊 커뮤니티 - 공유할 이미지 원본 데이터:", {
        id: imageToShare.id,
        aspectRatio: imageToShare.aspectRatio,
        renderingStyle: imageToShare.renderingStyle,
        category: imageToShare.category,
        background: imageToShare.background,
        gender: imageToShare.gender,
        age: imageToShare.age
      });
      
      // 공유 데이터 준비
      const formData = new FormData();
      
      // 필수 필드
      formData.append('prompt', imageToShare.prompt);
      formData.append('image_url', imageToShare.imageUrl);
      
      // 값이 있는 선택적 필드만 추가 (엄격하게 체크)
      const addIfExists = (key: string, value: any) => {
        if (value !== undefined && value !== null && value !== '') {
          console.log(`✅ 커뮤니티 필드 추가: ${key} = ${value}`);
          formData.append(key, value);
        }
      };
      
      // 중요 필드들
      addIfExists('rendering_style', imageToShare.renderingStyle);
      
      // 특별히 주의해야 할 필드들 (화면에 EMPTY로 표시되는 필드들)
      if (imageToShare.aspectRatio && imageToShare.aspectRatio !== '1:1') {
        console.log("🔍 커뮤니티 특별 확인: aspect_ratio =", imageToShare.aspectRatio);
        formData.append('aspect_ratio', imageToShare.aspectRatio);
      }
      
      if (imageToShare.category && imageToShare.category !== 'other') {
        console.log("🔍 커뮤니티 특별 확인: category =", imageToShare.category);
        formData.append('category', imageToShare.category);
      }
      
      // 기타 선택적 필드들
      addIfExists('gender', imageToShare.gender);
      addIfExists('age', imageToShare.age);
      addIfExists('background', imageToShare.background);
      addIfExists('camera_distance', imageToShare.cameraDistance);
      addIfExists('eye_color', imageToShare.eyeColor);
      addIfExists('skin_type', imageToShare.skinType);
      addIfExists('hair_style', imageToShare.hairStyle);
      addIfExists('model_version', imageToShare.modelVersion);
      
      // 필수 추가 필드
      formData.append('shared', 'true');
      formData.append('created_at', new Date().toISOString());
      formData.append('source', 'community');
      
      // Clerk 사용자 이름 추가 (로그인한 경우)
      if (user && user.id) {
        const userName = user.fullName || user.firstName || user.username || '';
        console.log("👤 커뮤니티에서 전송할 user_name 값:", userName);
        formData.append('user_name', userName);
      }
      
      // 디버깅: formData 내용 확인
      console.log('🧾 커뮤니티 페이지 formData entries:');
      for (let [key, value] of formData.entries()) {
        console.log(`${key} = ${value}`);
      }
      
      // ✅ Clerk user_id는 API 서버에서 auth()로 받아 사용
      // - 클라이언트에서는 전송하지 않음 (API에서 처리)
      
      // ✅ id 필드는 절대 전송하지 않음 (Supabase가 자동 생성)
      
      // API 호출
      const response = await fetch('/api/share', {
        method: 'POST',
        body: formData
      });
      
      // 디버깅: 응답 상태 확인
      console.log('📡 커뮤니티 응답 상태:', response.status, response.statusText);
      
      // 응답 확인
      if (!response.ok) {
        const errorData = await response.json();
        logManager.error("Share API error:", {
          module: 'core',
          data: errorData
        });
        throw new Error(errorData.error || `공유 실패: ${response.status}`);
      }
      
      const result = await response.json();
      logManager.info("Share success:", {
        module: 'core',
        data: result
      });
      
      // 성공 시 처리
      toast.success('이미지가 성공적으로 공유되었습니다');
      
      // ✅ 페이지 데이터 갱신 - 캐시 무효화 방식
      // 옵션 1: 페이지 reload (간단한 방법)
      // window.location.href = '/community';
      
      // 옵션 2: 데이터 다시 가져오기
      const refreshData = async () => {
        try {
          const result = await communityApi.getPosts();
          if (result && Array.isArray(result)) {
            setCommunityData(result);
          }
        } catch (error) {
          logManager.error("Error refreshing data:", {
            module: 'core',
            data: error
          });
        }
      };
      
      // 데이터 새로고침
      refreshData();
      
    } catch (error) {
      logManager.error("Share failed:", {
        module: 'core',
        data: error instanceof Error ? error.message : "Unknown error"
      });
      toast.error('이미지 공유 중 오류가 발생했습니다');
    }
  };
  
  // 사용자 이름 표시 함수
  const getUserDisplayName = (userId: string | undefined | null) => {
    try {
      // userId가 없는 경우
      if (!userId) {
        return 'Anonymous User';
      }
      
      // 현재 사용자인 경우
      if (userId === currentUser.id) {
        return currentUser.name || user?.username || '게스트';
      }
      
      // 문자열 형식인지 확인
      if (typeof userId !== 'string') {
        return 'Anonymous User';
      }
      
      // 기존 데이터인 경우 (사용자 아이디가 @ 포함되지 않은 경우 사용자 친화적으로 표시)
      if (!userId.includes('@') && !userId.includes('user_')) {
        return userId;
      }
      
      // Clerk ID 형식인 경우 간략화
      return userId.startsWith('user_') ? 'Anonymous User' : userId;
    } catch (error) {
      logManager.error('사용자 이름 표시 오류:', {
        module: 'core',
        data: error
      });
      return 'Anonymous User';
    }
  };
  
  // 댓글 작성자 이름 표시 함수
  const getCommentAuthorName = (userName: string | undefined | null): string => {
    // 현재 로그인한 사용자의 댓글인 경우 우선 처리
    if (userName && currentUser) {
      // 완전 일치하는 경우
      if (userName === currentUser.name || userName === currentUser.username) {
        return currentUser.name || currentUser.username || '사용자';
      }
      
      // 기본값인 경우 현재 사용자 정보 사용
      if (userName === 'User' || userName === 'Anonymous User' || userName === 'Guest' || userName === '게스트') {
        return currentUser.name || currentUser.username || '사용자';
      }
    }
    
    // userName이 없거나 빈 문자열인 경우
    if (!userName || userName === '') {
      return currentUser ? (currentUser.name || currentUser.username || '사용자') : '사용자';
    }
    
    // Clerk ID 형식인 경우
    if (userName.startsWith('user_')) {
      return currentUser ? (currentUser.name || currentUser.username || '사용자') : '사용자';
    }
    
    // 이메일 형식인 경우 @ 앞부분만 사용
    if (userName.includes('@')) {
      return userName.split('@')[0];
    }
    
    // 그 외 경우 userName 그대로 사용
    return userName;
  };
  
  // 게시물 삭제 처리
  const handleDeletePost = async (postId: string) => {
    // 로그인되지 않았으면 에러 메시지 표시
    if (!user || !user.id) {
      toast.error('로그인 후 사용할 수 있습니다.', {
        position: 'top-center'
      });
      return;
    }
    
    // 이미 처리 중이면 중복 요청 방지
    if (isDeletingPost) {
      return;
    }
    
    // 삭제 함수
    try {
      if (window.confirm('정말 이 게시물을 삭제하시겠습니까?')) {
        // API 호출
        setIsDeletingPost(true);
        const result = await communityApi.deletePost(postId, user?.id || '');
        
        if (result && result.success) {
          toast.success('게시물이 삭제되었습니다.');
          // 게시물 목록에서 제거
          setCommunityData(prev => prev.filter(item => item.id !== postId));
        } else {
          toast.error(result.error || '게시물 삭제에 실패했습니다.');
        }
      }
    } catch (error) {
      logManager.error('Error deleting post:', { 
        module: 'core',
        data: error 
      });
      toast.error('Failed to delete post.', {
        position: 'top-center'
      });
    } finally {
      setIsDeletingPost(false);
    }
  };
  
  // 마소니 그리드 설정
  const breakpointColumnsObj = {
    default: 4, // 웹에서는 4개 컬럼으로 표시
    1400: 4,
    1100: 3,
    800: 2,
    500: 1
  };
  
  // 빈 상태 렌더링 (로딩, 에러, 데이터 없음)
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <LoadingScreen
          message=""
          subMessage=""
          type="spinner"
          size="md"
          className="py-6 sm:py-12"
        />
      );
    }
    
    if (error) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-red-50 flex items-center justify-center rounded-full mb-4">
            <AlertCircle className="w-6 h-6 sm:w-8 sm:h-8 text-red-500" />
          </div>
          <p className="text-base sm:text-lg text-gray-800 mb-2">Problem loading data</p>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
          >
            Refresh
          </button>
        </div>
      );
    }
    
    if (filteredPosts.length === 0) {
      // 현재 선택된 카테고리에 대한 샘플 프롬프트 가져오기
      const samplePrompt = getSamplePromptForCategory(selectedCategory);
      
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16 text-center">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-50 flex items-center justify-center rounded-full mb-4">
            <Share2 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
          </div>
          <p className="text-base sm:text-lg text-gray-800 mb-2">No images shared yet in this category</p>
          <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-6">Be the first to share an image!</p>
          
          <CreateButton 
            category={selectedCategory} 
            variant="empty-state" 
            prompt={samplePrompt}
          />
          
          <p className="text-xs text-gray-500 mt-3">
            Sample prompt: "{samplePrompt}"
          </p>
        </div>
      );
    }
    
    return null;
  };

  // 다운로드 핸들러 추가
  const handleDownload = async (post: GenerationPost) => {
    // 소유자가 아닌 경우 다운로드 제한
    if (post.userId !== currentUser.id) {
      toast.error("Only the owner can download this image", {
        position: 'top-center'
      });
      return;
    }
    
    try {
      const response = await fetch(post.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frr-ai-image-${post.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully.', {
        position: 'top-center'
      });
    } catch (error) {
      toast.error('Error occurred while downloading.', {
        position: 'top-center'
      });
    }
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-blue-50 to-white overflow-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-white" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-purple-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-[600px] h-[600px] bg-gradient-to-r from-indigo-50/30 to-transparent rounded-full blur-[80px] opacity-60" />
      </div>

      <div className="relative">
        {/* 헤더 섹션 */}
        <section className="pt-24 sm:pt-28 pb-8 sm:pb-12">
          <div className="container mx-auto px-2 sm:px-4 md:px-6 lg:px-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center sm:text-center text-left mb-6 sm:mb-8 md:mb-12 pl-0 sm:pl-0"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#6366f1] mb-4 sm:mb-6">
                Community Gallery
              </h1>
              
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6">
                Explore shared images and share your creations
              </p>
              
              {/* 생성하기 버튼 수정 */}
              <CreateButton category="all" variant="primary" />
              
              {/* 사용자 등급 표시 - 원래 위치로 복원 */}
              {isSignedIn && (
                <div className="flex flex-col items-center justify-center gap-1.5 mt-6">
                  <div className="text-xs font-medium text-gray-700 bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm flex items-center gap-1.5">
                    <span className="text-base">🏆</span>
                    <span>Verified Creator</span>
                  </div>
                </div>
              )}
            </motion.div>

            {/* 카테고리 필터 */}
            <div className="mb-3 sm:mb-5">
              {/* 일반 카테고리 버튼 그룹 */}
              <div className="w-full flex flex-wrap justify-start items-center gap-1 sm:gap-2 mb-2 sm:mb-4">
                {categories
                  // 일반 카테고리만 표시 (my-cards 제외)
                  .filter(category => category.id !== 'my-cards')
                  .map(category => (
                    <CategoryButton
                      key={category.id}
                      id={category.id}
                      label={category.label}
                      isSelected={selectedCategory === category.id}
                      onClick={() => setSelectedCategory(category.id)}
                    />
                  ))}
                
                {/* 선택 카테고리 기반 생성 버튼 */}
                <CreateButton category={selectedCategory} variant="small" />
              </div>
              
              <div className="w-full flex items-center justify-start sm:justify-end">
                {/* My Cards 카테고리 버튼 */}
                {isSignedIn && (
                  <CategoryButton
                    id="my-cards"
                    label="My Gallery"
                    isSelected={selectedCategory === 'my-cards'}
                    onClick={() => setSelectedCategory('my-cards')}
                  />
                )}
              </div>
            </div>

            {/* 게시물 그리드 - 마소니 레이아웃으로 변경 */}
            {renderEmptyState() || (
              <Masonry
                breakpointCols={breakpointColumnsObj}
                className="flex w-auto -ml-2 sm:-ml-4 md:-ml-6 lg:-ml-8"
                columnClassName="pl-2 sm:pl-4 md:pl-6 lg:pl-8 bg-clip-padding"
              >
                {filteredPosts.map((post) => (
                  <div key={post.id} className="mb-4 sm:mb-6 md:mb-8 ml-0 mr-0 w-[95%] sm:w-[98%] md:w-full">
                    <ImageCard 
                      post={post}
                      variant="community"
                      layout="masonry"
                      currentUser={currentUser}
                      isSignedIn={!!isSignedIn}
                      onLike={() => handleLike(post.id)}
                      onComment={(postId, text) => {
                        if (text) {
                          handleComment(postId, text);
                        } else {
                          openCommentModal(postId);
                        }
                      }}
                      onDeleteComment={(postId, commentId) => deleteComment(postId, commentId)}
                      onShare={handleShare}
                      onDownload={handleDownload}
                      onDeletePost={(postId) => setDeleteModalState({
                        isOpen: true,
                        type: 'post',
                        postId,
                        commentId: ''
                      })}
                      isLiked={isPostLiked(post.id)}
                      likesCount={getPostLikes(post.id, post.likes || 0)}
                      commentsCount={getPostComments(post.id, post.comments || []).length}
                      comments={getPostComments(post.id, post.comments || []) as any}
                    />
                  </div>
                ))}
              </Masonry>
            )}
          </div>
        </section>
      </div>
      
      {/* 댓글 모달 */}
      {isCommentModalOpen && selectedPostId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={closeCommentModal}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] sm:max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Comments {getPostComments(selectedPostId).length > 0 && `(${getPostComments(selectedPostId).length})`}
                </h3>
                {(() => {
                  const post = communityData.find(p => p.id === selectedPostId);
                  if (!post) return null;
                  
                  const styleValue = typeof post.renderingStyle === 'string' 
                    ? post.renderingStyle 
                    : (post.renderingStyle as { id?: string })?.id || '';
                  const category = post.category || getCategoryFromStyle(styleValue);
                  const categoryIcon = category === 'all' ? '✨' :
                    category === 'portrait' ? '👩‍🎨' :
                    category === 'landscape' ? '🌄' :
                    category === 'urban' ? '🏢' :
                    category === 'anime' ? '🦸‍♀️' :
                    category === 'fantasy' ? '🐉' :
                    category === 'sci-fi' ? '👾' :
                    category === 'vintage' ? '🕰️' :
                    category === 'fashion' ? '👕' :
                    category === 'animals' ? '🐱' :
                    category === 'abstract' ? '🔮' :
                    '🎨';
                  const categoryColorClass = getCategoryColor(category);
                  
                  return (
                    <div className="flex items-center mt-1">
                      <span className="text-[10px] sm:text-xs text-gray-500 mr-1">Category:</span>
                      <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium flex items-center ${categoryColorClass}`}>
                        {categoryIcon} {category}
                      </span>
                    </div>
                  );
                })()}
              </div>
              <button onClick={closeCommentModal} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 댓글 목록 */}
            <div 
              ref={commentScrollRef}
              className={`px-4 sm:px-8 py-4 sm:py-6 space-y-3 sm:space-y-4 ${
                getPostComments(selectedPostId).length > 4 
                  ? 'max-h-[350px] sm:max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300' 
                  : ''
              }`}
            >
              {getPostComments(selectedPostId).length > 0 ? 
                // 댓글을 최신순으로 정렬
                [...getPostComments(selectedPostId)]
                  .sort((a, b) => {
                    try {
                      const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
                      const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
                      
                      // 유효한 날짜인지 확인
                      const timeA = !isNaN(dateA.getTime()) ? dateA.getTime() : 0;
                      const timeB = !isNaN(dateB.getTime()) ? dateB.getTime() : 0;
                      
                      return timeB - timeA;
                    } catch (error) {
                      logManager.error('댓글 정렬 오류:', {
                        module: 'comments',
                        data: error
                      });
                      return 0;
                    }
                  })
                  .map((comment) => (
                <div key={comment.id} className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{getCommentAuthorName(comment.userName)}</span>
                      <span className="text-[10px] sm:text-sm text-gray-500">
                        {comment.createdAt ? (() => {
                          try {
                            const date = new Date(comment.createdAt);
                            return !isNaN(date.getTime()) ? date.toLocaleDateString() : '날짜 없음';
                          } catch (error) {
                            return '날짜 없음';
                          }
                        })() : '날짜 없음'}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600">{comment.text}</p>
                  </div>
                  
                  {/* 삭제 버튼 (자신의 댓글이거나 게시물 주인인 경우) */}
                  {(comment.userId === currentUser.id || 
                    communityData.find(p => p.id === selectedPostId)?.userId === currentUser.id) && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteModalState({
                          isOpen: true,
                          type: 'comment',
                          postId: selectedPostId,
                          commentId: comment.id
                        });
                      }}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      title={comment.userId === currentUser.id ? "Delete my comment" : "Delete comment as post owner"}
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>
                  )}
                </div>
              )) : (
                <div className="text-center py-4 sm:py-6 text-gray-500">
                  <p className="text-xs sm:text-sm">No comments yet.</p>
                  <p className="text-[10px] sm:text-xs mt-1">Be the first to leave a comment!</p>
                </div>
              )}
            </div>
            
            {/* 댓글 입력 폼 */}
            <form onSubmit={(e) => {
              e.preventDefault();
              if (commentText.trim() && isSignedIn) {
                submitComment();
              }
            }} className="sticky bottom-0 bg-white border-t border-gray-100">
              <div className="px-4 sm:px-8 py-4 sm:py-6">
                <div className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentText}
                    onChange={(e) => handleCommentTextChange(e.target.value)}
                    placeholder={isSignedIn ? "Write a comment..." : "Login to leave a comment."}
                    className="flex-1 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-xs sm:text-sm"
                    disabled={!isSignedIn}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && isSignedIn && commentText.trim()) {
                        e.preventDefault();
                        submitComment();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!commentText.trim() || !isSignedIn}
                    className="p-1.5 sm:p-2 bg-blue-600 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-colors flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* 상단으로 스크롤 버튼 */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({
            top: 0,
            behavior: 'smooth'
          })}
          className="fixed bottom-6 sm:bottom-8 right-6 sm:right-8 z-40 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700 hover:scale-105 transition-all duration-200"
          aria-label="맨 위로 스크롤"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </button>
      )}
      
      {/* 삭제 확인 모달 */}
      <ConfirmModal
        isOpen={deleteModalState.isOpen}
        onClose={() => setDeleteModalState({...deleteModalState, isOpen: false})}
        onConfirm={() => {
          if (deleteModalState.type === 'post') {
            handleDeletePost(deleteModalState.postId);
          } else {
            deleteComment(deleteModalState.postId, deleteModalState.commentId);
          }
          setDeleteModalState({...deleteModalState, isOpen: false});
        }}
        title={deleteModalState.type === 'post' ? "Delete Post" : "Delete Comment"}
        message={deleteModalState.type === 'post' 
          ? "Are you sure you want to delete this post? This action cannot be undone."
          : "Are you sure you want to delete this comment? This action cannot be undone."
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
} 