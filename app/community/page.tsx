'use client';

import { useState, useEffect, useRef, useCallback, useMemo, Fragment, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { Share2, MessageCircle, Heart, AlertCircle, X, Send, Trash2, Camera, Palette, Mountain, Building, Wand2, Rocket, Clock, Dribbble, PawPrint, Sparkles, Box, Lock, User, Download, Plus, ChevronLeft, ChevronRight, Search, Filter, RefreshCw, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useUser, SignInButton } from '@clerk/nextjs';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { communityApi } from '@/lib/api';
import { ImageCard } from '@/components/shared/ImageCard';
import { v4 as uuidv4 } from 'uuid';
import { formatDate } from '@/utils/format';
import { useComments } from '@/hooks/useComments';
import Masonry from 'react-masonry-css';
import { AuthLikeButton, AuthCommentButton } from '@/components/shared/AuthButtons';
import { ConfirmModal } from '@/components/shared/ConfirmModal';
import LoadingScreen from '@/components/shared/LoadingScreen';

// 댓글 타입 정의
interface Comment {
  id: string;
  imageId: string;
  userId: string;
  userName: string;
  text: string;
  content?: string; // DB에는 content로 저장됨
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

// 스타일과 프롬프트를 함께 고려하여 카테고리 추출
const getCategoryFromStyle = (style: string, prompt?: string): string => {
  // 프롬프트가 없고 스타일도 없는 경우 기본값 반환
  if (!style && !prompt) return 'portrait';
  
  // 프롬프트 분석을 통한 카테고리 판단
  if (prompt) {
    // 카테고리 키워드 맵핑
    const categoryKeywords: Record<string, string[]> = {
      'landscape': ['landscape', 'mountain', 'nature', 'lake', 'forest', 'ocean', 'sea', 'sunset', 'sunrise', 'valley', 'canyon', 'waterfall', 'scenery', 'outdoor', 'natural', 'scenic', 'vista', 'panorama', 'horizon', 'river', 'beach', 'hill', 'sky', 'cloud'],
      'portrait': ['portrait', 'person', 'face', 'woman', 'man', 'girl', 'boy', 'people', 'human', 'facial', 'self', 'headshot', 'selfie', 'close-up', 'closeup', 'head', 'profile', 'bust'],
      'urban': ['urban', 'city', 'street', 'building', 'architecture', 'downtown', 'skyscraper', 'metropolis', 'town', 'skyline', 'cityscape', 'infrastructure', 'bridge', 'road'],
      'anime': ['anime', 'manga', 'cartoon', 'comic', 'animation', 'animated', 'toon', 'chibi', 'japanese animation', 'anime style'],
      'fantasy': ['fantasy', 'magical', 'dragon', 'fairy', 'elf', 'wizard', 'mythical', 'mystic', 'enchanted', 'creature', 'magic', 'sorcery', 'myth', 'legend'],
      'sci-fi': ['sci-fi', 'science fiction', 'futuristic', 'robot', 'space', 'alien', 'cyber', 'galaxy', 'neon', 'future', 'spacecraft', 'spaceship', 'technology', 'cyberpunk', 'cyborg', 
      'dystopian', 'planetary', 'universe', 'stars', 'tech', 'advanced', 'space station', 'space colony', 'futuristic city', 'hologram', 'laser', 'mech', 'artificial intelligence', 'ai', 'digital', 'synthetic'],
      'vintage': ['vintage', 'retro', 'old', 'classic', 'antique', 'history', 'nostalgic', 'ancient', 'old-fashioned', 'historical', 'sepia', 'aged', 'toned portrait', 'vintage photograph', 'vintage style', 'vintage photo', 'retro style'],
      'abstract': ['abstract', 'geometric', 'pattern', 'colorful', 'modern art', 'non-representational', 'contemporary', 'minimalist', 'conceptual', 'surreal', 'expressionist', 'cubist', 'abstract art', 'shapes', 'lines', 'asymmetrical', 'non-objective', 'experimental', 'color field', 'composition'],
      'animals': ['animal', 'cat', 'dog', 'bird', 'pet', 'wildlife', 'lion', 'tiger', 'elephant', 'zebra', 'bear', 'wolf', 'fox', 'deer', 'horse', 'monkey', 'penguin', 'fish', 'shark', 'whale', 'dolphin', 'reptile', 'snake', 'lizard', 'turtle', 'insect', 'butterfly', 'zoo', 'farm animal'],
      'fashion': ['fashion', 'clothing', 'outfit', 'dress', 'apparel', 'clothes', 'garment', 'accessory', 'jewelry', 'hat', 'shoes', 'bag', 'designer', 'runway', 'collection', 'trend', 'couture', 'fashion model', 'chic', 'stylish', 'trendy', 'vogue', 'fashionable', 'attire', 'wear', 'wardrobe', 'ensemble', 'fashion shoot', 'look', 'fashion photo', 'fashionista', 'jacket', 'coat', 'suit', 'pants', 'skirt', 'blouse', 'shirt', 'lingerie', 'jeans', 'denim', 'haute couture', 'casual wear', 'fashion show', 'catwalk', 'fashion design', 'fashion industry', 'fashion week', 'model', 'photoshoot', 'studio', 'editorial', 'fashion editorial', 'fashion magazine', 'fashion brand', 'boutique', 'elegant', 'luxury']
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
    
    // 특수 케이스 처리: fashion 관련 구문이 있으면 추가 가중치
    const fashionPhrases = ['fashion photography', 'fashion shoot', 'fashion model', 'fashion design', 
                           'fashion show', 'fashion editorial', 'high fashion', 'fashion week',
                           'studio photography', 'editorial photography'];
    
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
    'lookbook': 'fashion'
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

// 메인 기능을 담당하는 컴포넌트를 분리
function CommunityContent() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [communityData, setCommunityData] = useState<GenerationPost[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GenerationPost | null>(null);
  const [deletedImages, setDeletedImages] = useState<Record<string, boolean>>({});
  const [categoryImageDeleted, setCategoryImageDeleted] = useState<Record<string, boolean>>({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  
  // 페이지 URL 파라미터 가져오기 - 훅을 컴포넌트 최상위 레벨로 이동
  const searchParams = useSearchParams();
  
  // Clerk에서 사용자 정보 가져오기
  const { user, isSignedIn } = useUser();
  
  // 검색 파라미터 변경 핸들러
  const handleSearchParamsChange = useCallback((searchParams: URLSearchParams) => {
    const category = searchParams.get('category');
    if (category) {
      setSelectedCategory(category);
    }
  }, []);
  
  // 현재 사용자 정보
  const currentUser = {
    id: user?.id || 'guest-user',
    name: user?.firstName || user?.username || '게스트',
    username: user?.username || 'guest',
    imageUrl: user?.imageUrl
  };
  
  // 댓글 모달 상태 관리 추가
  const [commentModalState, setCommentModalState] = useState({ postId: '', text: '' });
  
  // 좋아요 및 댓글 상태 관리를 위한 직접 상태 선언
  const [likesMap, setLikesMap] = useState<Record<string, number>>({});
  const [likedPostsMap, setLikedPostsMap] = useState<Record<string, boolean>>({});
  const [commentsMap, setCommentsMap] = useState<Record<string, any[]>>({});
  
  // 기존 좋아요 및 댓글 기능 훅 사용 (데이터 초기화용)
  const { 
    commentsMap: hookCommentsMap, 
    handleComment: addComment, 
    deleteComment: removeComment,
    isCommentModalOpen: hookIsCommentModalOpen, 
    openCommentModal, 
    closeCommentModal,
    commentText,
    handleCommentTextChange,
    submitComment,
    selectedPostId: hookSelectedPostId
  } = useComments(communityData as any, currentUser);

  // 커스텀 상태 변수 추가
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);

  // 상태 초기화 효과
  useEffect(() => {
    setCommentsMap(hookCommentsMap || {});
  }, [hookCommentsMap]);
  
  useEffect(() => {
    setIsCommentModalOpen(hookIsCommentModalOpen);
  }, [hookIsCommentModalOpen]);
  
  useEffect(() => {
    if (hookSelectedPostId) {
      setSelectedPostId(hookSelectedPostId);
    }
  }, [hookSelectedPostId]);
  
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

  // 페이지 상단으로 스크롤하는 함수
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 데이터 캐싱 상태
  const COMMUNITY_DATA_CACHE_KEY = 'community_data_cache';
  const COMMUNITY_DATA_TIMESTAMP_KEY = 'community_data_timestamp';
  const CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5분 캐시 유효 시간

  // 캐시된 데이터 저장
  const saveCommunityDataToCache = (data: any[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(COMMUNITY_DATA_CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(COMMUNITY_DATA_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('커뮤니티 데이터 캐시 저장 오류:', error);
    }
  };

  // 캐시된 데이터 로드
  const loadCommunityDataFromCache = () => {
    if (typeof window === 'undefined') return null;
    
    try {
      const cachedData = localStorage.getItem(COMMUNITY_DATA_CACHE_KEY);
      const timestamp = localStorage.getItem(COMMUNITY_DATA_TIMESTAMP_KEY);
      
      if (!cachedData || !timestamp) return null;
      
      const now = Date.now();
      const cacheTime = parseInt(timestamp, 10);
      
      // 캐시 만료 시간 체크
      if (now - cacheTime > CACHE_EXPIRY_TIME) {
        // 캐시 만료됨
        return null;
      }
      
      return JSON.parse(cachedData);
    } catch (error) {
      console.error('커뮤니티 데이터 캐시 로드 오류:', error);
      return null;
    }
  };

  // 호출 가능한 데이터 로드 함수 직접 정의
  const fetchData = async () => {
    try {
      // URL 파라미터에서 refresh 확인 - 컴포넌트 레벨에서 선언된 searchParams 사용
      const shouldRefresh = searchParams?.get('refresh') === 'true';
      
      // 캐시된 데이터 확인 (refresh가 true면 캐시 무시)
      const cachedData = loadCommunityDataFromCache();
      if (cachedData && !shouldRefresh) {
        console.log('캐시된 커뮤니티 데이터 사용');
        setCommunityData(cachedData);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // 1. 게시물 데이터 가져오기
      const result = await communityApi.loadCommunityData(true);
      
      if (result.success) {
        const postsData = result.data || [];
        
        // 2. 각 게시물의 댓글 데이터를 로드
        const postsWithComments = [...postsData];
        
        // 댓글 데이터 초기화를 위한 임시 맵
        const commentsData: Record<string, any[]> = {};
        
        // 댓글 데이터 로드를 병렬로 처리 - 배치 방식 사용
        try {
          // 배치 크기 설정 (너무 많은 요청을 동시에 보내지 않도록)
          const batchSize = 10; // 더 큰 배치 사이즈로 변경하여 API 호출 횟수 감소
          const postBatches = [];
          
          // 배치로 나누기
          for (let i = 0; i < postsWithComments.length; i += batchSize) {
            postBatches.push(postsWithComments.slice(i, i + batchSize));
          }
          
          // 각 배치별로 순차적으로 처리
          for (const batch of postBatches) {
            const commentPromises = batch.map(post => 
              communityApi.loadCommentsForImage(post.id)
                .then(response => {
                  if (response.success && response.data) {
                    // 댓글 정렬 - 최신순 (createdAt 기준 내림차순)
                    const sortedComments = [...response.data].sort((a, b) => {
                      const dateA = new Date(a.createdAt || 0);
                      const dateB = new Date(b.createdAt || 0);
                      return dateB.getTime() - dateA.getTime();
                    });
                    
                    // 댓글 데이터를 게시물에 추가
                    post.comments = sortedComments;
                    // 별도의 상태 관리용 맵에도 저장
                    commentsData[post.id] = sortedComments;
                    return post;
                  }
                  return post;
                })
                .catch(() => {
                  // 에러 발생 시 빈 배열로 초기화
                  post.comments = post.comments || [];
                  return post;
                })
            );
            
            // 현재 배치의 모든 요청이 완료될 때까지 기다림
            await Promise.all(commentPromises);
          }
          
          // 댓글 맵 상태 업데이트
          setCommentsMap(commentsData);
          
          // 게시물 데이터 캐싱
          saveCommunityDataToCache(postsWithComments);
          
          // 게시물 데이터 업데이트
          setCommunityData(postsWithComments);
        } catch (commentError) {
          // 에러 시 게시물 데이터만 업데이트
          saveCommunityDataToCache(postsData); // 댓글 없는 데이터라도 캐싱
          setCommunityData(postsData);
        }
      } else {
        throw new Error(result.error || "커뮤니티 데이터를 가져오는데 실패했습니다.");
      }
    } catch (err) {
      // 에러 메시지만 표시, 로그 제거
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  // 초기 데이터 로드
  useEffect(() => {
    fetchData();
  }, [searchParams]);
  
  // 좋아요 핸들러 업데이트
  const handlePostLike = async (postId: string) => {
    // 좋아요 기능이 제거되었으므로 아무 동작도 하지 않음
    return;
  };
  
  // 댓글 모달 열기/닫기 함수 직접 구현
  const openCommentModalCustom = (postId: string) => {
    setSelectedPostId(postId);
    setIsCommentModalOpen(true);
    
    // 원래 훅의 함수도 호출하여 상태 동기화
    if (openCommentModal) {
      openCommentModal(postId);
    }
  };
  
  const closeCommentModalCustom = () => {
    setIsCommentModalOpen(false);
    setSelectedPostId(null);
    
    // 원래 훅의 함수도 호출하여 상태 동기화
    if (closeCommentModal) {
      closeCommentModal();
    }
  };
  
  // 댓글 핸들러 업데이트
  const handlePostComment = async (postId: string, text?: string) => {
    try {
      // 입력값이 없거나 로그인하지 않은 경우 처리 중단
      if (!text?.trim() || !isSignedIn) {
        // 로그인하지 않은 경우 안내 토스트 표시
        if (!isSignedIn) {
          toast.error('Please login to post comments', {
            position: 'top-center',
          });
        }
        return;
      }
      
      // 선택된 포스트 찾기
      const post = communityData.find(p => String(p.id) === postId);
      if (!post) {
        console.error('[댓글 추가] 게시물을 찾을 수 없음:', postId);
        return;
      }
      
      console.log(`[댓글 추가] 시작: postId=${postId}, 댓글 길이=${text.length}`);
      
      // 임시 댓글 ID 생성 (로컬에서만 사용)
      const tempId = `temp-${Date.now()}`;
      const tempComment = {
        id: tempId,
        imageId: postId,
        userId: currentUser.id,
        userName: currentUser.name || currentUser.username || '사용자',
        text: text,
        content: text,
        createdAt: new Date().toISOString()
      };
      
      // 낙관적 UI 업데이트
      setCommentsMap(prev => ({
        ...prev,
        [postId]: [tempComment, ...(prev[postId] || [])]
      }));
      
      // 선택한 게시물의 댓글 배열에도 임시 댓글 추가
      const currentComments = post.comments || [];
      post.comments = [
        tempComment, 
        ...currentComments
      ];
      
      // 댓글 입력 필드 초기화
      handleCommentTextChange('');
      
      // 스크롤을 최상단으로 이동 (최신 댓글 표시)
      if (commentScrollRef.current) {
        commentScrollRef.current.scrollTop = 0;
      }
      
      // API 호출로 댓글 저장
      console.log(`[댓글 API 호출] POST /api/comments 시작`);
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageId: postId,
          userId: currentUser.id,
          userName: currentUser.name || currentUser.username || '사용자',
          text: text
        })
      });
      
      console.log(`[댓글 API 응답] 상태 코드: ${response.status}`);
      const data = await response.json();
      console.log(`[댓글 API 응답] 데이터:`, data);
      
      if (response.ok && data.success) {
        // 서버에서 반환된 실제 댓글 ID로 낙관적 업데이트했던 임시 ID 교체
        console.log(`[댓글 추가 성공] 임시 ID를 실제 ID로 교체: ${tempId} -> ${data.data.id}`);
        
        // commentsMap 업데이트
        setCommentsMap(prev => ({
          ...prev,
          [postId]: prev[postId].map(c => 
            c.id === tempId 
              ? { ...c, id: data.data.id, createdAt: data.data.createdAt } 
              : c
          )
        }));
        
        // 게시물의 comments 배열 업데이트
        const updatedComments = (post.comments || []).map(c => {
          if (c.id === tempId) {
            return {
              ...c,
              id: data.data.id,
              createdAt: data.data.createdAt
            };
          }
          return c;
        });
        
        // 게시물 객체 댓글 업데이트
        post.comments = updatedComments;
        
        // 사용자 피드백: 성공 토스트
        toast.success('Comment posted', {
          position: 'top-center',
        });
      } else {
        // 서버 응답이 실패인 경우
        console.error('[댓글 추가 실패]', data.error || '알 수 없는 오류');
        
        // 낙관적 업데이트 롤백
        setCommentsMap(prev => ({
          ...prev,
          [postId]: prev[postId].filter(c => c.id !== tempId)
        }));
        
        // 게시물 댓글 배열에서도 제거
        post.comments = (post.comments || []).filter(c => c.id !== tempId);
        
        // 사용자 피드백: 실패 메시지
        toast.error('Failed to post comment. Please try again.', {
          position: 'top-center',
        });
      }
      
      // 스크롤을 최상단으로 이동 (최신 댓글 표시)
      if (commentScrollRef.current) {
        commentScrollRef.current.scrollTop = 0;
      }
    } catch (error) {
      console.error('[댓글 추가 오류]', error);
      toast.error('Error posting comment', {
        position: 'top-center',
      });
    }
  };
  
  // 댓글 삭제 핸들러 업데이트
  const handleDeleteComment = async (postId: string, commentId: string) => {
    try {
      // 낙관적 UI 업데이트
      setCommentsMap(prev => ({
        ...prev,
        [postId]: prev[postId].filter(c => c.id !== commentId)
      }));
      
      // 게시글 데이터의 댓글 정보도 함께 업데이트
      setCommunityData(prev => prev.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: (post.comments || []).filter(c => c.id !== commentId)
          };
        }
        return post;
      }));
      
      // 토스트 표시
      toast.success('Deleting comment...');
      
      // 모달 닫기
      setDeleteModalState({
        isOpen: false,
        type: 'comment',
        postId: '',
        commentId: ''
      });
      
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success('Comment deleted successfully');
      } else {
        throw new Error('API 호출 실패');
      }
    } catch (error) {
      console.error('댓글 삭제 오류:', error);
      toast.error('Failed to delete comment');
      
      // 삭제 실패 시 원래대로 복구
      await fetchData();
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
    
    // post에 category가 명시적으로 있는 경우 해당 값 사용
    if (post.category) {
      return post.category === selectedCategory;
    }
    
    // renderingStyle 정보 추출
    let styleValue = '';
    if (typeof post.renderingStyle === 'string') {
      styleValue = post.renderingStyle;
    } else if (post.renderingStyle && typeof post.renderingStyle === 'object' && 'id' in post.renderingStyle) {
      styleValue = (post.renderingStyle as { id?: string })?.id || '';
    }
    
    // 카테고리 추론
    const inferredCategory = getCategoryFromStyle(styleValue, post.prompt);
    
    // 추론된 카테고리와 선택된 카테고리 비교
    return inferredCategory === selectedCategory;
  }).map(post => {
    // post에 category 속성이 없는 경우 추가
    if (!post.category) {
      // renderingStyle 정보 추출
      let styleValue = '';
      if (typeof post.renderingStyle === 'string') {
        styleValue = post.renderingStyle;
      } else if (post.renderingStyle && typeof post.renderingStyle === 'object' && 'id' in post.renderingStyle) {
        styleValue = (post.renderingStyle as { id?: string })?.id || '';
      }
      
      // 카테고리 추론
      const inferredCategory = getCategoryFromStyle(styleValue, post.prompt);
      
      // 추론된 카테고리 설정
      post.category = inferredCategory;
    }
    
    // 이미지 URL 확인
    let imageUrl = post.imageUrl;
    
    // 원본 URL 그대로 사용 (저장은 ImageCard 컴포넌트에서 처리)
    return {
      ...post,
      category: post.category,
      imageUrl: imageUrl || '/fallback-image.png'
    };
  });
  
  // 지도 데이터 변환 함수
  const mapToArray = <T,>(map: Record<string, T>): [string, T][] => {
    return Object.entries(map);
  };
  
  // 컴포넌트 상태에서 해당 postId의 좋아요 여부 획득
  const isPostLiked = (postId: string) => {
    return likedPostsMap[postId] || false;
  };
  
  // 컴포넌트 상태에서 해당 postId의 좋아요 수 획득 - 좋아요 카운트가 정확히 반영되도록 수정
  const getPostLikes = (postId: string, defaultLikes: number = 0) => {
    // 좋아요 맵에서 가져오되, 해당 값이 정확히 0인 경우를 포함하여 체크
    if (likesMap[postId] !== undefined) {
      return likesMap[postId];
    }
    
    // 원본 데이터에서 좋아요 수 가져오기
    const post = communityData.find(p => p.id === postId);
    return post?.likes !== undefined ? post.likes : defaultLikes;
  };
  
  // 컴포넌트 상태에서 해당 postId의 댓글 목록 획득
  const getPostComments = (postId: string | undefined, defaultComments: Comment[] = []) => {
    try {
      if (!postId) return defaultComments;
      
      console.log(`[getPostComments] 요청된 postId: ${postId}`);
      
      // 1. 게시물 객체에서 직접 comments 속성을 먼저 확인
      const post = communityData.find(p => p.id === postId);
      console.log(`[getPostComments] 게시물 존재 여부:`, !!post);
      console.log(`[getPostComments] post.comments 타입:`, post?.comments ? typeof post.comments : '없음');
      console.log(`[getPostComments] post.comments 배열 여부:`, post?.comments ? Array.isArray(post.comments) : '없음');
      
      if (post?.comments && Array.isArray(post.comments)) {
        console.log(`[getPostComments] post.comments 길이:`, post.comments.length);
        // 댓글 데이터 유효성 확인 및 content/text 필드 호환성 처리
        return post.comments.map(comment => {
          // content와 text 필드 간 호환성 처리
          if (comment.content && !comment.text) {
            comment.text = comment.content;
          } else if (comment.text && !comment.content) {
            comment.content = comment.text;
          }
          return comment;
        });
      }
      
      // 2. 그 다음 commentsMap에서 확인
      console.log(`[getPostComments] commentsMap 확인:`, !!commentsMap);
      console.log(`[getPostComments] commentsMap[postId] 존재 여부:`, !!commentsMap[postId]);
      console.log(`[getPostComments] commentsMap[postId] 배열 여부:`, commentsMap[postId] ? Array.isArray(commentsMap[postId]) : '없음');
      
      if (commentsMap && commentsMap[postId] && Array.isArray(commentsMap[postId])) {
        console.log(`[getPostComments] commentsMap[postId] 길이:`, commentsMap[postId].length);
        return commentsMap[postId].map(comment => {
          // content와 text 필드 간 호환성 처리
          if (comment.content && !comment.text) {
            comment.text = comment.content;
          } else if (comment.text && !comment.content) {
            comment.content = comment.text;
          }
          return comment;
        });
      }
      
      // 3. 해당되는 댓글이 없으면 빈 배열 반환
      console.log(`[getPostComments] 댓글을 찾을 수 없어 기본값 반환`);
      return defaultComments;
    } catch (error) {
      console.error('[getPostComments] 댓글 정보 가져오기 오류:', error);
      return defaultComments;
    }
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

  // 공유하기 기능 - 빈 함수로 변경
  const handleShare = async (imageId: string) => {
    // 공유 기능 비활성화
    console.log('Share functionality disabled');
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
      console.error('사용자 이름 표시 오류:', error);
      return 'Anonymous User';
    }
  };
  
  // 댓글 작성자 이름 표시 함수
  const getCommentAuthorName = (userName: string | undefined | null): string => {
    // 현재 로그인한 사용자의 댓글인 경우 우선 처리
    if (userName && currentUser) {
      // 완전 일치하는 경우
      if (userName === currentUser.name || userName === currentUser.username) {
        return currentUser.name || currentUser.username || 'User';
      }
      
      // 기본값인 경우 현재 사용자 정보 사용
      if (userName === 'User' || userName === 'Anonymous User' || userName === 'Guest' || userName === 'Guest') {
        return currentUser.name || currentUser.username || 'User';
      }
    }
    
    // userName이 없거나 빈 문자열인 경우
    if (!userName || userName === '') {
      return currentUser ? (currentUser.name || currentUser.username || 'User') : 'User';
    }
    
    // Clerk ID 형식인 경우
    if (userName.startsWith('user_')) {
      return currentUser ? (currentUser.name || currentUser.username || 'User') : 'User';
    }
    
    // 이메일 형식인 경우 @ 앞부분만 사용
    if (userName.includes('@')) {
      return userName.split('@')[0];
    }
    
    // 그 외 경우 userName 그대로 사용
    return userName;
  };
  
  // 게시물 삭제 처리 함수
  const handleDeletePost = async (postId: string) => {
    try {
      // 낙관적 UI 업데이트
      setCommunityData(prevData => prevData.filter(post => String(post.id) !== postId));
      
      // 토스트 표시
      toast.success('Deleting post...');
      
      // 모달 닫기
      setDeleteModalState({
        isOpen: false,
        type: 'post',
        postId: '',
        commentId: ''
      });
      
      const response = await fetch(`/api/community/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // 성공 시 UI 업데이트
        setCommunityData(prev => prev.filter(post => String(post.id) !== postId));
        toast.success('Post deleted successfully');
      } else {
        console.error('API 응답 오류:', data);
        throw new Error(data.error || 'API 호출 실패');
      }
    } catch (error) {
      console.error('게시물 삭제 오류:', error);
      toast.error('Failed to delete post');
      
      // 삭제 실패 시 데이터 다시 가져오기
      await fetchData();
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

  // 디버그 모드 비활성화
  const debugRef = useRef<boolean>(false);

  // 커뮤니티 데이터에서 렌더링할 항목 필터링
  const filteredData = useMemo(() => {
    // 1. 데이터 유효성 확인 및 날짜 변환
    const dataWithValidDates = communityData.map(post => {
      // createdAt이 유효한 날짜가 아닌 경우 현재 시간으로 대체
      let createdAtTime = new Date().getTime();
      
      try {
        if (post.createdAt) {
          const date = new Date(post.createdAt);
          if (!isNaN(date.getTime())) {
            createdAtTime = date.getTime();
          }
        }
      } catch (e) {
        // 날짜 파싱 실패 시 현재 시간 사용
        console.warn('날짜 파싱 오류:', e);
      }
      
      // 연산용 타임스탬프 추가
      return {
        ...post,
        _createdAtTime: createdAtTime
      };
    });
    
    // 2. 필터링 적용
    const filtered = dataWithValidDates.filter(post => {
      if (selectedCategory === 'all') return true;
      if (selectedCategory === 'my-cards') {
        // 현재 사용자가 작성한 이미지만 표시
        return post.userId === currentUser.id;
      }
      
      // post에 category가 명시적으로 있는 경우 해당 값 사용
      if (post.category) {
        return post.category === selectedCategory;
      }
      
      // renderingStyle 정보 추출
      let styleValue = '';
      if (typeof post.renderingStyle === 'string') {
        styleValue = post.renderingStyle;
      } else if (post.renderingStyle && typeof post.renderingStyle === 'object' && 'id' in post.renderingStyle) {
        styleValue = (post.renderingStyle as { id?: string })?.id || '';
      }
      
      // 카테고리 추론
      const inferredCategory = getCategoryFromStyle(styleValue, post.prompt);
      
      // 추론된 카테고리와 선택된 카테고리 비교
      return inferredCategory === selectedCategory;
    });
    
    // 3. 정렬 적용 - 가장 최신 항목이 먼저 나오도록 정렬
    return filtered.sort((a, b) => {
      // 명시적으로 추가한 타임스탬프 사용
      return b._createdAtTime - a._createdAtTime;
    }).map(post => {
      // 임시 필드 제거 후 반환
      const { _createdAtTime, ...cleanPost } = post;
      return cleanPost;
    });
  }, [communityData, selectedCategory, currentUser.id]);
  
  const CACHED_IMAGES_KEY = 'community_cached_images';

  // 이미지 캐시 상태 관리
  const loadImageCache = () => {
    if (typeof window === 'undefined') return {};
    
    try {
      const cachedData = localStorage.getItem(CACHED_IMAGES_KEY);
      return cachedData ? JSON.parse(cachedData) : {};
    } catch (error) {
      console.error('캐시 로드 오류:', error);
      return {};
    }
  };

  // 이미지 캐시 저장
  const saveImageToCache = (imageUrl: string) => {
    if (typeof window === 'undefined') return;
    
    try {
      const cachedImages = loadImageCache();
      cachedImages[imageUrl] = true;
      localStorage.setItem(CACHED_IMAGES_KEY, JSON.stringify(cachedImages));
    } catch (error) {
      console.error('캐시 저장 오류:', error);
    }
  };

  // 최신 이미지 우선 로드를 위한 이미지 미리 로드 함수
  useEffect(() => {
    if (typeof window === 'undefined' || !filteredData.length) return;

    // 프리로드할 이미지 수 (모든 이미지를 빠르게 로드)
    const PRELOAD_COUNT = filteredData.length;
    
    // 캐시 확인
    const cachedImages = loadImageCache();
    
    // 이미지 로드 및 캐싱
    const preloadImages = async () => {
      // 모든 이미지 동시에 로드 시작하지만 캐시 활용
      filteredData.forEach((post, index) => {
        if (!post.imageUrl) return;
        
        // 이미 캐시된 이미지인지 확인 - 객체를 사용하므로 속성으로 확인
        if (cachedImages[post.imageUrl]) {
          return; // 이미 캐시된 이미지는 스킵
        }
        
        // 이미지 로드 시작 (지연 없이 동시에)
        const img = new window.Image();
        img.src = post.imageUrl;
        
        img.onload = () => {
          // 이미지 로드 완료 시 캐시에 저장
          saveImageToCache(post.imageUrl);
        };
      });
    };
    
    preloadImages();
    
    // 클린업 함수는 필요 없음
    return () => {};
  }, [filteredData]);

  // useEffect 내부에서 URL 파라미터 처리
  useEffect(() => {
    if (searchParams) {
      const categoryFromUrl = searchParams.get('category');
      if (categoryFromUrl) {
        setSelectedCategory(categoryFromUrl);
      }
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto py-5 px-0 min-h-screen">
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
          <div className="container mx-auto px-1 sm:px-5 lg:px-7">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center sm:text-center text-left mb-6 sm:mb-8 md:mb-12 pl-0 sm:pl-0"
            >
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#6366f1] mb-4 sm:mb-6 font-kode-mono">
                Community Gallery
              </h1>
              
              <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto mb-4 sm:mb-6 font-kode-mono">
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
                className="flex w-full ml-0"
                columnClassName="pl-0 pr-1 sm:pl-1 sm:pr-2 md:pl-2 md:pr-3 bg-clip-padding"
              >
                {filteredPosts.map((post) => (
                  <div className="break-inside-avoid mb-6 sm:mb-8 md:mb-10" key={post.id}>
                    <ImageCard
                      post={{
                        ...post,
                        // post 객체 내부에 카테고리 정보 설정
                        category: post.category || getCategoryFromStyle(typeof post.renderingStyle === 'string' 
                          ? post.renderingStyle 
                          : (post.renderingStyle as { id?: string })?.id || '', post.prompt)
                      }}
                      variant="community"
                      layout="masonry"
                      isSignedIn={!!isSignedIn}
                      currentUser={currentUser}
                      onLike={handlePostLike}
                      onComment={handlePostComment}
                      onDeleteComment={handleDeleteComment}
                      onShare={handleShare}
                      onDownload={handleDownload}
                      onDeletePost={post.userId === currentUser.id ? handleDeletePost : undefined}
                      isLiked={isPostLiked(String(post.id))}
                      likesCount={getPostLikes(String(post.id), post.likes || 0)}
                      comments={getPostComments(String(post.id), post.comments || []) as any}
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
          onClick={closeCommentModalCustom}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg max-h-[75vh] sm:max-h-[80vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
              <div>
                <h3 className="text-base sm:text-lg font-medium text-gray-900">
                  Comments {getPostComments(selectedPostId).length > 0 && (
                    <span className="inline-flex items-center justify-center ml-1.5 w-5 h-5 sm:w-6 sm:h-6 text-xs sm:text-sm font-medium bg-blue-100 text-blue-800 rounded-full">
                      {getPostComments(selectedPostId).length}
                    </span>
                  )}
                </h3>
                {(() => {
                  const post = communityData.find(p => p.id === selectedPostId);
                  if (!post) return null;
                  
                  const styleValue = typeof post.renderingStyle === 'string' 
                    ? post.renderingStyle 
                    : (post.renderingStyle as { id?: string })?.id || '';
                  const category = post.category || getCategoryFromStyle(styleValue, post.prompt);
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
              <button onClick={closeCommentModalCustom} className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full transition-colors">
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
                      console.error('댓글 정렬 오류:', error);
                      return 0;
                    }
                  })
                  .map((comment) => (
                <div key={comment.id} className="flex items-start gap-3 sm:gap-4 p-4 sm:p-5 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                      <span className="text-xs sm:text-sm font-medium text-gray-900">{getCommentAuthorName(comment.userName)}</span>
                      <span className="text-[10px] sm:text-sm text-gray-500">
                        {comment.createdAt ? formatDate(comment.createdAt) : 'No date'}
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
                // 직접 댓글 추가 핸들러 호출
                handlePostComment(selectedPostId as string, commentText);
                // 입력값 초기화
                handleCommentTextChange('');
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
                        // submitComment 대신 직접 handlePostComment 사용
                        handlePostComment(selectedPostId as string, commentText);
                        handleCommentTextChange('');
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
          onClick={scrollToTop}
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
            handleDeleteComment(deleteModalState.postId, String(deleteModalState.commentId));
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

// Suspense로 감싸는 래퍼 컴포넌트
export default function CommunityPage() {
  return (
    <Suspense fallback={<div className="w-full py-12 text-center">Loading community...</div>}>
      <CommunityContent />
    </Suspense>
  );
} 