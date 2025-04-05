'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { Sparkles, Share2, Download, X, AlertCircle, AlertTriangle } from 'lucide-react';
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Image from 'next/image';
import { useUser, SignInButton } from '@clerk/nextjs';
import Link from 'next/link';
import { IMAGE_GENERATION_CONFIG } from '@/config/imageGeneration';
import { modelStyleMapping } from "@/config/styleMapping";
import { sql } from 'drizzle-orm';
import { isReplicateUrl, isValidImageUrl } from "@/utils/image-utils";

// 구독 정보 인터페이스
interface SubscriptionInfo {
  tier: 'free' | 'starter' | 'premium';
  maxGenerations: number;
  remaining: number;
  renewalDate: Date;
}

// 인터페이스 추가
interface GeneratedImage {
  id: string;
  imageUrl: string;
  prompt: string;
  style: string;
  renderingStyle?: string; // 렌더링 스타일 추가
  author: string;
  createdAt: string;
  gender: string;
  age: string;
  ratio: string;
  cameraDistance: string;
  isShared?: boolean; // 공유 완료 상태 추가
  isSharing?: boolean; // 공유 진행 중 상태 추가
  storagePath?: string; // 추가된 스토리지 경로 추가
  aspectRatio?: string; // 추가: 비율의 다른 이름
}

// 공통 스타일 정의
const commonClassName = "w-full max-w-3xl mx-auto";

// 로딩 모달 컴포넌트
const LoadingModal = ({ 
  isVisible, 
  progress, 
  message 
}: { 
  isVisible: boolean; 
  progress: number;
  message: string;
}) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="w-[calc(100%-2rem)] max-w-xs md:max-w-sm mx-auto bg-white rounded-xl p-4 md:p-6 shadow-2xl border-2 border-blue-100"
      >
        <div className="text-center">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 mx-auto mb-4 md:mb-6 flex items-center justify-center border border-blue-100">
            <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-blue-500 animate-pulse" />
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-1.5 md:mb-2">
            Creating AI Model...
          </h3>
          <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-6">
            {message}
          </p>
          
          {/* 로딩 프로그레스 바 */}
          <div className="h-2 md:h-3 w-full bg-gray-100 rounded-full overflow-hidden mb-2 md:mb-3 border border-gray-200">
            <motion.div 
              className="h-full bg-gradient-to-r from-blue-400 to-indigo-500"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <p className="text-xs md:text-sm text-gray-600 font-medium">{Math.round(progress)}%</p>
        </div>
      </motion.div>
    </div>
  );
};

// API 서비스 한도 알림 컴포넌트
const ServiceLimitAlert = ({ isVisible, onClose }: { isVisible: boolean, onClose: () => void }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 max-w-md p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-lg z-50">
      <div className="flex gap-3">
        <div className="text-amber-500 flex-shrink-0">
          <AlertTriangle size={24} />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-amber-800 mb-1">Service Usage Limit Notice</h3>
          <p className="text-xs text-amber-700 mb-2">
            The image generation service has reached its API limit. Try these options:
          </p>
          <ul className="text-xs text-amber-700 list-disc pl-4 space-y-1 mb-3">
            <li>Try again in a few minutes</li>
            <li>Try a different style option</li>
            <li>Try a different ratio or rendering style</li>
          </ul>
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-800 px-3 py-1 rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 구독 상태 표시 컴포넌트
interface SubscriptionStatusProps {
  subscription: {
    tier?: string;
    maxGenerations: number;
    remaining: number;
    renewalDate?: Date;
  } | null;
}

const SubscriptionStatus = ({ subscription }: SubscriptionStatusProps) => {
  const [isLoading, setIsLoading] = useState(true);
  
  // 로딩 상태일 때 스켈레톤 UI 표시
  useEffect(() => {
    if (subscription) {
      // 데이터가 로드되면 약간의 지연 후 표시 (깜빡임 방지)
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [subscription]);
  
  if (isLoading) {
    return (
      <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm">
        <div className="w-16 h-2.5 bg-gray-100 rounded-full overflow-hidden mr-2 animate-pulse"></div>
        <div className="h-4 w-5 bg-gray-100 rounded animate-pulse mr-0.5"></div>
        <span className="text-gray-300 text-xs mr-0.5">/</span>
        <div className="h-4 w-5 bg-gray-100 rounded animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className="inline-flex items-center bg-white px-3 py-1.5 rounded-full border border-gray-200 shadow-sm hover:shadow transition-all">
      <div className="w-16 h-2.5 bg-gray-100 rounded-full overflow-hidden mr-2">
        <div 
          className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 transition-all duration-300"
          style={{ 
            width: `${Math.max(Math.min((subscription?.remaining || 0) / (subscription?.maxGenerations || 1) * 100, 100), 0)}%` 
          }}
        />
      </div>
      <span className="font-bold text-sm text-indigo-600 mr-0.5">
        {subscription?.remaining || 0}
      </span>
      <span className="text-gray-400 text-xs mr-0.5">/</span>
      <span className="text-gray-500 text-xs">
        {subscription?.maxGenerations || 0}
      </span>
    </div>
  );
};

// 로딩 인터벌 또는 애니메이션 프레임 참조를 위한 타입 정의
interface AnimationRef {
  clear: () => void;
}

// 애니메이션 상태를 위한 타입
type AnimationState = number | NodeJS.Timeout | AnimationRef | null;

// 실제 Generate 컴포넌트 (useSearchParams 사용)
function GenerateContent() {
  const searchParams = useSearchParams();
  const [prompt, setPrompt] = useState(searchParams?.get('prompt') || '');
  const [background, setBackground] = useState('');
  const [ethicityKeywords, setEthnicityKeywords] = useState<string>('');
  const [selectedRenderStyle, setSelectedRenderStyle] = useState<string>("realistic");
  const [selectedGender, setSelectedGender] = useState<string>("");
  const [selectedAge, setSelectedAge] = useState<string>("youth");
  const [selectedRatio, setSelectedRatio] = useState<string>("1:1");
  const [selectedSize, setSelectedSize] = useState<string>("1024x1024");
  const [selectedStyle, setSelectedStyle] = useState<string>("realistic_image");
  const [selectedClothing, setSelectedClothing] = useState<string>("");
  const [selectedEyes, setSelectedEyes] = useState<string>("");
  const [selectedSkinType, setSelectedSkinType] = useState<string>("");
  const [selectedHairStyle, setSelectedHairStyle] = useState<string>("");
  const [selectedBackground, setSelectedBackground] = useState<string>("");
  const [temporaryRatio, setTemporaryRatio] = useState<string>("1:1");
  const [selectedCameraDistance, setSelectedCameraDistance] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const resultRef = useRef<HTMLDivElement>(null);
  const loadingIntervalRef = useRef<AnimationState>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [isScrolling, setIsScrolling] = useState(false);
  const { isSignedIn, user } = useUser();
  const [history, setHistory] = useState<GeneratedImage[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showLoadingModal, setShowLoadingModal] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState("Analyzing your prompt...");
  const [aspectRatioLocked, setAspectRatioLocked] = useState(false);
  const [genderAgeLocked, setGenderAgeLocked] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showServiceLimitAlert, setShowServiceLimitAlert] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const router = useRouter();

  const renderStyleOptions = [
    { id: "realistic", label: "Realistic", emoji: "📷", description: "Photo-realistic style" },
    { id: "anime", label: "Animation", emoji: "🎨", description: "Cartoon/anime style" }
  ];

  const cameraDistanceOptions = [
    { id: "close_up", label: "Close-up", emoji: "🔍", description: "upper focus" },
    { id: "medium", label: "Medium", emoji: "👤", description: "Standard portrait view" },
    { id: "far", label: "Far", emoji: "🏞️", description: "Full body with environment" }
  ];

  // URL 파라미터에서 검색어와 카테고리 가져오기
  useEffect(() => {
    if (!searchParams) return;
    
    // 프롬프트 파라미터 처리
    const searchText = searchParams.get('prompt');
    if (searchText) {
      setPrompt(searchText);
    }
    
    // 카테고리 파라미터 처리
    const categoryParam = searchParams.get('category');
    if (categoryParam) {
      // 카테고리에 따라 기본 옵션 설정
      switch(categoryParam) {
        case 'portrait':
          setSelectedRenderStyle('realistic');
          setSelectedStyle('realistic_image');
          break;
        case 'anime':
          setSelectedRenderStyle('anime');
          setSelectedStyle('digital_illustration');
          break;
        case 'landscape':
        case 'urban':
          // 풍경/도시 카테고리는 16:9 비율 설정
          setTemporaryRatio('16:9');
          setSelectedRatio('16:9');
          // 비율에 따른 크기 설정
          const ratioConfig = IMAGE_GENERATION_CONFIG.aspectRatios.find(r => r.id === '16:9');
          if (ratioConfig) {
            setSelectedSize(ratioConfig.size);
          }
          break;
      }
    }
    
    // localStorage에서 저장된 프롬프트 및 설정 불러오기
    try {
      const savedFormData = localStorage.getItem('savedGenerateFormData');
      if (savedFormData) {
        const data = JSON.parse(savedFormData);
        if (data.prompt) setPrompt(data.prompt);
        if (data.background) setBackground(data.background);
        if (data.renderStyle) setSelectedRenderStyle(data.renderStyle);
        if (data.gender) setSelectedGender(data.gender);
        if (data.age) setSelectedAge(data.age);
        if (data.ratio) {
          setSelectedRatio(data.ratio);
          setTemporaryRatio(data.ratio);
        }
        if (data.style) setSelectedStyle(data.style);
        if (data.clothing) setSelectedClothing(data.clothing);
        if (data.eyes) setSelectedEyes(data.eyes);
        if (data.skinType) setSelectedSkinType(data.skinType);
        if (data.hairStyle) setSelectedHairStyle(data.hairStyle);
        if (data.cameraDistance) setSelectedCameraDistance(data.cameraDistance);
        
        // 저장된 데이터를 불러온 후 삭제
        localStorage.removeItem('savedGenerateFormData');
      }
    } catch (error) {
      console.error('저장된 프롬프트 불러오기 오류:', error);
    }
  }, [searchParams]);

  // 구독 정보 가져오기
  useEffect(() => {
    if (isSignedIn) {
      fetchSubscriptionInfo();
    }
  }, [isSignedIn]);

  // 생성 히스토리 로드
  useEffect(() => {
    if (isSignedIn) {
      loadGenerationHistory();
    }
  }, [isSignedIn]);

  const genderOptions = [
    { id: "male", label: "Male", emoji: "👨" },
    { id: "female", label: "Female", emoji: "👩" }
  ];

  const ageOptions = [
    { id: "children", label: "Children", emoji: "👶" }, // 5~10세 어린이
    { id: "youth", label: "Youth", emoji: "👨‍💼" },
    { id: "elderly", label: "Elderly", emoji: "👴" }
  ];

  // 로딩 진행률 업데이트 함수
  const startLoadingProgress = () => {
    setLoadingProgress(0);
    setLoadingMessage("Analyzing your prompt...");
    setShowLoadingModal(true);
    
    // 이전 애니메이션 정리
    if (loadingIntervalRef.current) {
      if (typeof loadingIntervalRef.current === 'object' && 'clear' in loadingIntervalRef.current) {
        (loadingIntervalRef.current as AnimationRef).clear();
      } else if (typeof loadingIntervalRef.current === 'number') {
        cancelAnimationFrame(loadingIntervalRef.current);
      } else {
        clearInterval(loadingIntervalRef.current as NodeJS.Timeout);
      }
    }
    
    // 애니메이션 프레임 요청 ID를 저장할 변수
    let requestId: number;
    let lastTimestamp = performance.now();
    let currentProgress = 0;
    
    // 빠른 단계(0-70%)와 느린 단계(70-99%)에 대한 증가율 설정
    const fastIncrement = 2; // 빠른 단계 증가량
    const slowIncrement = 0.5; // 느린 단계 증가량
    
    // requestAnimationFrame을 사용한 더 효율적인 진행 업데이트
    const updateProgress = (timestamp: number) => {
      // 타임스탬프 간 경과 시간(ms) 계산
      const elapsed = timestamp - lastTimestamp;
      
      // 진행 단계에 따른 업데이트 간격과 증가량 조정
      let shouldUpdate = false;
      let increment = 0;
      
      if (currentProgress < 70) {
        // 빠른 단계 (0-70%)
        if (elapsed >= 30) { // 30ms마다 업데이트
          shouldUpdate = true;
          increment = fastIncrement;
          lastTimestamp = timestamp;
        }
      } else if (currentProgress < 90) {
        // 중간 단계 (70-90%)
        if (elapsed >= 150) { // 150ms마다 업데이트
          shouldUpdate = true;
          increment = slowIncrement;
          lastTimestamp = timestamp;
          
          // 70% 지점에서 메시지 업데이트
          if (currentProgress === 70) {
            setLoadingMessage("Generating model features...");
          }
        }
      } else if (currentProgress < 99) {
        // 느린 단계 (90-99%)
        if (elapsed >= 200) { // 200ms마다 업데이트
          shouldUpdate = true;
          increment = slowIncrement;
          lastTimestamp = timestamp;
          
          // 90% 지점에서 메시지 업데이트
          if (currentProgress === 90) {
            setLoadingMessage("Refining details...");
          }
        }
      }
      
      // 진행률 업데이트가 필요한 경우 업데이트
      if (shouldUpdate) {
        currentProgress += increment;
        
        // 99%를 넘지 않도록 제한
        if (currentProgress >= 99) {
          currentProgress = 99;
          // 애니메이션 중지 (더 이상 프레임 요청하지 않음)
          return;
        }
        
        // 상태 업데이트 (리액트 상태)
        setLoadingProgress(currentProgress);
      }
      
      // 다음 프레임 요청
      requestId = requestAnimationFrame(updateProgress);
    };
    
    // 첫 프레임 요청 시작
    requestId = requestAnimationFrame(updateProgress);
    
    // 정리 함수를 저장
    const animationRef: AnimationRef = {
      clear: () => {
        if (requestId) {
          cancelAnimationFrame(requestId);
        }
      }
    };
    
    // 참조에 저장
    loadingIntervalRef.current = animationRef;
  };

  // 로딩 완료 처리
  const completeLoading = () => {
    if (loadingIntervalRef.current) {
      // 애니메이션 프레임 정리 (객체인 경우)
      if (typeof loadingIntervalRef.current === 'object' && 'clear' in loadingIntervalRef.current) {
        (loadingIntervalRef.current as AnimationRef).clear();
      } else if (typeof loadingIntervalRef.current === 'number') {
        // requestAnimationFrame ID 정리 (숫자 ID인 경우)
        cancelAnimationFrame(loadingIntervalRef.current);
      } else {
        // setInterval 정리 (NodeJS.Timeout인 경우)
        clearInterval(loadingIntervalRef.current as NodeJS.Timeout);
      }
      loadingIntervalRef.current = null;
    }
    
    setLoadingProgress(100);
    setLoadingMessage("Complete!");
    
    // 잠시 후 로딩 모달 닫기
    setTimeout(() => {
      setShowLoadingModal(false);
    }, 500);
  };

  // 구독 정보 조회 함수
  const fetchSubscriptionInfo = async () => {
    try {
      const response = await fetch("/api/subscription");
      if (response.ok) {
        const data = await response.json();
        setSubscription(data.subscription);
      }
    } catch (error) {
      console.error("Error fetching subscription info:", error);
    }
  };

  // 히스토리 로드 함수
  const loadGenerationHistory = () => {
    try {
      const savedHistory = localStorage.getItem('generationHistory');
      if (savedHistory) {
        setHistory(JSON.parse(savedHistory).slice(0, 2)); // 최근 2개까지만 로드
      }
    } catch (error) {
      console.error('히스토리 로드 오류:', error);
    }
  };

  // 히스토리에 저장
  const saveToHistory = (newImage: GeneratedImage) => {
    try {
      // 기존 이미지 히스토리 가져오기
      const savedHistory = localStorage.getItem('generationHistory');
      let updatedHistory: GeneratedImage[] = savedHistory ? JSON.parse(savedHistory) : [];
      
      // 중복 제거 후 최신 항목 추가
      updatedHistory = [
        newImage,
        ...updatedHistory.filter(item => item.id !== newImage.id)
      ].slice(0, 10); // 최대 10개 항목 유지
      
      localStorage.setItem('generationHistory', JSON.stringify(updatedHistory));
      
      // RecentImageCards에서 사용할 수 있도록 generatedImages에도 저장
      const savedGenerated = localStorage.getItem('generatedImages');
      let generatedImages: GeneratedImage[] = savedGenerated ? JSON.parse(savedGenerated) : [];
      
      // 중복 제거 후 최신 항목 추가
      generatedImages = [
        newImage,
        ...generatedImages.filter(item => item.id !== newImage.id)
      ].slice(0, 10); // 최대 10개 항목 유지
      
      localStorage.setItem('generatedImages', JSON.stringify(generatedImages));
      
      // 커스텀 이벤트를 발생시켜 RecentImageCards가 자동으로 갱신되도록 함
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('newImageGenerated'));
      }
      
      setHistory(updatedHistory);
    } catch (error) {
      console.error('히스토리 저장 오류:', error);
    }
  };

  // 비율 변경 핸들러 수정 - 임시 상태만 변경
  const handleRatioChange = (ratio: string) => {
    // 잠금 상태면 변경 불가
    if (aspectRatioLocked) return;
    
    // temporaryRatio와 selectedRatio 모두 업데이트
    setTemporaryRatio(ratio);
    setSelectedRatio(ratio);
    
    // 비율에 따른 크기 설정
    const selectedRatioConfig = IMAGE_GENERATION_CONFIG.aspectRatios.find(r => r.id === ratio);
    if (selectedRatioConfig) {
      setSelectedSize(selectedRatioConfig.size);
    }
  };

  // 성별 선택 처리
  const handleGenderSelect = (genderId: string) => {
    // 잠금 상태면 변경 불가
    if (genderAgeLocked) return;
    
    // 이미 선택된 항목을 다시 클릭하면 선택 해제 (빈 문자열로 설정)
    if (selectedGender === genderId) {
      setSelectedGender("");
    } else {
      setSelectedGender(genderId);
    }
  };

  // 연령대 선택 처리
  const handleAgeSelect = (ageId: string) => {
    // 잠금 상태면 변경 불가
    if (genderAgeLocked) return;
    
    setSelectedAge(ageId);
  };

  // 렌더링 스타일 선택 처리
  const handleRenderStyleSelect = (styleId: string) => {
    // 잠금 상태면 변경 불가
    if (genderAgeLocked) return;
    
    setSelectedRenderStyle(styleId);
    
    // 렌더링 스타일에 따라 selectedStyle 값 설정
    if (styleId === "realistic") {
      setSelectedStyle("realistic_image");
    } else if (styleId === "anime") {
      setSelectedStyle("digital_illustration");
    }
  };

  // 스크롤 이벤트 감지
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 상단으로 스크롤
  const scrollToTop = () => {
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // 카메라 거리 선택 처리
  const handleCameraDistanceSelect = (distanceId: string) => {
    // 잠금 상태면 변경 불가
    if (genderAgeLocked) return;
    
    // 이미 선택된 항목을 다시 클릭하면 선택 해제 (빈 문자열로 설정)
    if (selectedCameraDistance === distanceId) {
      setSelectedCameraDistance("");
    } else {
      setSelectedCameraDistance(distanceId);
    }
  };

  // 인종 관련 키워드를 더 명확한 프롬프트로 매핑하는 함수
  const mapEthnicityKeywords = (prompt: string): string => {
    // 인종 관련 키워드 매핑
    const ethnicityMappings: Record<string, string> = {
      '백인': 'caucasian person, european features, fair skin',
      '흑인': 'black person, african descent, dark skin',
      '동양인': 'asian person, east asian features',
      '아시아인': 'asian person, east asian features',
      '아랍': 'middle eastern person, arab features',
      '라틴': 'latino person, hispanic features',
      '히스패닉': 'latino person, hispanic features',
      '인도인': 'indian person, south asian features',
      '남아시아인': 'south asian features, brown skin',
      'caucasian': 'caucasian person, european features, fair skin',
      'asian': 'asian person, east asian features',
      'black': 'black person, african descent, dark skin',
      'african': 'black person, african descent, dark skin',
      'latino': 'latino person, hispanic features',
      'hispanic': 'latino person, hispanic features',
      'middle eastern': 'middle eastern person, arab features',
      'indian': 'indian person, south asian features',
    };

    // 정규식 패턴을 생성하여 모든 인종 키워드를 한 번에 검색
    const ethnicityPattern = new RegExp('\\b(' + Object.keys(ethnicityMappings).join('|') + ')\\b', 'gi');
    
    // 매칭된 인종 키워드를 해당 매핑으로 대체
    const processedPrompt = prompt.replace(ethnicityPattern, (match) => {
      // 대소문자 구분 없이 매핑을 찾기 위해 소문자로 변환
      const key = match.toLowerCase();
      for (const [ethnicity, mapping] of Object.entries(ethnicityMappings)) {
        if (ethnicity.toLowerCase() === key) {
          return mapping;
        }
      }
      return match; // 일치하는 매핑이 없으면 원래 단어 유지
    });

    return processedPrompt;
  };

  const handleClothingSelect = (clothing: string) => {
    if (selectedClothing === clothing) {
      setSelectedClothing("");
    } else {
      setSelectedClothing(clothing);
    }
  };

  const handleEyesSelect = (eyes: string) => {
    if (selectedEyes === eyes) {
      setSelectedEyes("");
    } else {
      setSelectedEyes(eyes);
    }
  };

  const handleSkinTypeSelect = (skinType: string) => {
    if (selectedSkinType === skinType) {
      setSelectedSkinType("");
    } else {
      setSelectedSkinType(skinType);
    }
  };

  const handleHairStyleSelect = (hairStyle: string) => {
    if (selectedHairStyle === hairStyle) {
      setSelectedHairStyle("");
    } else {
      setSelectedHairStyle(hairStyle);
    }
  };

  const handleSubmit = async (e: React.FormEvent, buttonType: 'generate' | 'another' | 'new' = 'generate') => {
    e.preventDefault();
    
    // 모든 필수 입력 검증
    if (!prompt.trim()) {
      setModalMessage("Please enter a prompt for image generation.");
      setShowModal(true);
      return;
    }
    
    // 연령대 선택 검증
    if (!selectedAge) {
      setModalMessage("Please select an age group.");
      setShowModal(true);
      return;
    }

    // 렌더링 스타일 선택 검증
    if (!selectedRenderStyle) {
      setModalMessage("Please select a rendering style.");
      setShowModal(true);
      return;
    }

    // 로그인하지 않은 경우 현재 입력 상태를 localStorage에 저장
    if (!isSignedIn) {
      try {
        const formData = {
          prompt,
          background,
          renderStyle: selectedRenderStyle,
          gender: selectedGender,
          age: selectedAge,
          ratio: selectedRatio,
          style: selectedStyle,
          clothing: selectedClothing,
          eyes: selectedEyes,
          skinType: selectedSkinType,
          hairStyle: selectedHairStyle,
          cameraDistance: selectedCameraDistance
        };
        
        localStorage.setItem('savedGenerateFormData', JSON.stringify(formData));
        return; // 로그인 모달이 표시될 것이므로 여기서 중단
      } catch (error) {
        console.error('프롬프트 저장 오류:', error);
      }
    }

    // 사용량 제한 확인
    if (subscription && subscription.remaining <= 0) {
      setShowLimitModal(true);
      return;
    }

    setIsLoading(true);
    startLoadingProgress();
    
    // 배경 정보가 있으면 프롬프트에 추가
    let fullPrompt = prompt;
    if (background.trim()) {
      fullPrompt += ` in ${background.trim()}`;
    }

    try {
      // Age 값 매핑 - 백엔드에서 더 정확하게 처리할 수 있도록 설명 추가
      let ageDescription = selectedAge;
      if (selectedAge === "children") {
        ageDescription = "children_5_to_10_years"; // 더 명확한 연령 범위 지정
      } else if (selectedAge === "youth") {
        ageDescription = "young_adult";
      } else if (selectedAge === "elderly") {
        ageDescription = "elderly_person_over_60, senior citizen, aged person, wrinkled skin, gray hair, older person, mature face";
      }

      console.log("Selected Age:", selectedAge);
      console.log("Age Description:", ageDescription);
      console.log("Selected Ratio:", selectedRatio);
      console.log("Selected Render Style:", selectedRenderStyle);
      console.log("Submit: 선택된 성별:", selectedGender);
      
      // 프롬프트 준비 및 인종 관련 키워드 처리
      let enhancedPrompt = fullPrompt;
      enhancedPrompt = mapEthnicityKeywords(enhancedPrompt);
      
      // 신체 부위나 특정 부분이 언급된 경우 처리
      const bodyParts = ['leg', 'legs', 'foot', 'feet', 'hand', 'hands', 'arm', 'arms', 'head', 'face', 'body', 'torso', 'waist', 'chest', 'back'];
      const hasBodyPart = bodyParts.some(part => enhancedPrompt.toLowerCase().includes(part));
      
      if (hasBodyPart) {
        // 신체 부위가 언급된 경우, 해당 부분에 집중하도록 프롬프트 수정
        enhancedPrompt = `${enhancedPrompt}, focus on the mentioned body part, detailed shot of the specific part, professional photography`;
      } else {
        // 전체 인물 이미지 생성
        if (selectedAge === "children") {
          enhancedPrompt = `${enhancedPrompt} (5-10 years old child)`;
        } else if (selectedAge === "elderly") {
          enhancedPrompt = `${enhancedPrompt} (person over 60 years old, elderly person with age-appropriate features)`;
        }
      }
      
      // 성별 정보를 프롬프트에 명시적으로 추가 (선택된 경우에만)
      if (selectedGender) {
        enhancedPrompt = selectedGender === "female" 
          ? `${enhancedPrompt}, female` 
          : `${enhancedPrompt}, male`;
      }

      // 피부 타입 추가
      if (selectedSkinType) {
        const skinTonePrompts = {
          'light': 'fair skin tone, light complexion, pale skin',
          'tan': 'tan skin tone, medium complexion, golden skin',
          'dark': 'dark skin tone, deep complexion, rich melanin skin'
        };
        enhancedPrompt = `${enhancedPrompt}, ${skinTonePrompts[selectedSkinType as keyof typeof skinTonePrompts]}`;
      }
      
      // 헤어스타일 프롬프트 추가
      if (selectedHairStyle) {
        const hairStylePrompts = {
          'long': 'long straight hair, sleek hair, natural straight hair',
          'short': 'short hair, bob cut, modern short hairstyle',
          'wave': 'wavy hair, natural waves, soft curls',
          'slick': 'slicked back hair, model hairstyle, professional hair',
          'bangs': 'hair with bangs, front fringe, face-framing bangs',
          'no-bangs': 'no bangs, clean forehead, swept back hair'
        };
        enhancedPrompt = `${enhancedPrompt}, ${hairStylePrompts[selectedHairStyle as keyof typeof hairStylePrompts]}`;
      }
      
      // 애니메이션 스타일이 선택된 경우 프롬프트에 추가
      if (selectedRenderStyle === "anime") {
        enhancedPrompt = `${enhancedPrompt}, anime style, cartoon style, animation style, high quality anime art, 2D illustration`;
      } else {
        // 사실적 스타일 프롬프트 강화
        enhancedPrompt = `${enhancedPrompt}, photorealistic, realistic photo, high quality, natural lighting, professional photography`;
      }
      
      // 프롬프트에 카메라 거리 옵션에 따라 프롬프트 추가
      if (selectedCameraDistance) {
        switch (selectedCameraDistance) {
          case "close_up":
            enhancedPrompt = `${enhancedPrompt}, extreme close-up shot, highly detailed close shot, extreme close portrait, focus on subject, no background, studio lighting`;
            break;
          case "medium":
            enhancedPrompt = `${enhancedPrompt}, medium shot, clear detailed medium portrait, standard framing, balanced composition`;
            break;
          case "far":
            enhancedPrompt = `${enhancedPrompt}, wide shot, full environment visible, distant perspective, environmental portrait`;
            break;
        }
      }
      
      // 의상 스타일 추가
      if (selectedClothing) {
        enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.clothing[selectedClothing as keyof typeof modelStyleMapping.clothing]}`;
      }
      
      // 눈 색상 추가
      if (selectedEyes) {
        enhancedPrompt = `${enhancedPrompt}, ${modelStyleMapping.eyes[selectedEyes as keyof typeof modelStyleMapping.eyes]}`;
      }
      
      // 부정적인 프롬프트 추가 (기형적인 특징 방지)
      let negativePrompt = "deformed, distorted, disfigured, poorly drawn, bad anatomy, wrong anatomy, extra limb, missing limb, floating limbs, disconnected limbs, mutation, mutated, ugly, disgusting, amputation, blurry, blurred, watermark, text, poorly drawn face, poorly drawn hands, missing fingers, extra fingers, fused fingers, too many fingers";
      
      // 렌더링 스타일에 따라 부정적 프롬프트 조정
      if (selectedRenderStyle === "anime") {
        negativePrompt += ", realistic face, realistic skin, 3D rendering, photorealistic, realistic lighting, realism, photorealism, realistic texture, too realistic";
      } else {
        negativePrompt += ", asymmetric eyes, unaligned eyes, crossed eyes, unrealistic eyes, cartoon eyes, anime eyes, weird eyes, disproportionate eyes, fake looking eyes, unnatural pupils, inconsistent eye color";
      }
      
      console.log("API 요청 파라미터:", {
        prompt: enhancedPrompt,
        negative_prompt: negativePrompt,
        style: selectedStyle,
        size: selectedSize,
        gender: selectedGender,
        age: selectedAge,
        ratio: selectedRatio,
        renderStyle: selectedRenderStyle,
        cameraDistance: selectedCameraDistance
      });
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt,
          style: selectedStyle,
          size: selectedSize,
          gender: selectedGender,
          age: selectedAge,
          ratio: selectedRatio,
          renderStyle: selectedRenderStyle,
          cameraDistance: selectedCameraDistance
        }),
      });

      const result = await response.json();
      
      // 자세한 로깅 추가
      console.log("API 응답:", result);
      console.log("요청했던 성별:", selectedGender);
      console.log("결과 성별 확인:", result.gender || "응답에 성별 정보 없음");
      
      if (!response.ok) {
        // 사용량 제한 응답 확인
        if (response.status === 403 && result.subscription) {
          setSubscription(result.subscription);
          setShowLimitModal(true);
          setShowLoadingModal(false);
          setIsLoading(false);
          setLoadingProgress(0); // 로딩 진행 상태 초기화
          return;
        }
        
        // 에러 메시지 처리 개선
        let errorMessage = result.error || "이미지 생성 실패";
        
        // Replicate API 월별 지출 한도 오류 처리
        if (errorMessage.includes("Monthly spend limit reached") || errorMessage.includes("Payment Required") || errorMessage.includes("서비스 사용량 한도")) {
          errorMessage = "서비스 사용량 한도에 도달했습니다. 관리자에게 문의하시거나 잠시 후 다시 시도해주세요.";
          console.error("API 서비스 한도 오류:", result.error);
          
          // 서비스 한도 알림 표시
          setShowServiceLimitAlert(true);
          
          // 한도 오류 발생 시 추가 안내
          setTimeout(() => {
            toast.info("Please try again later or try with different style options.");
          }, 2000);
        } else {
          console.error("API 오류:", errorMessage);
        }
        
        toast.error(errorMessage);
        
        // 모든 로딩 상태 확실히 해제
        setShowLoadingModal(false);
        setIsLoading(false);
        setLoadingProgress(0); // 로딩 진행 상태 초기화
        return;
      }
      
      // 출력 확인
      if (result.output) {
        console.log("생성된 이미지 URL:", result.output);
        
        // 구독 정보 업데이트
        if (result.subscription) {
          setSubscription(result.subscription);
        }
        
        // 잠금 해제 - 결과가 나와도 잠금을 해제하여 다른 옵션으로 시도 가능하도록 함
        setAspectRatioLocked(false);
        setGenderAgeLocked(false);
        
        // 이미지 URL을 상태에 저장
        const newImage: GeneratedImage = {
          id: `image_${Date.now()}`,
          imageUrl: result.output,
          prompt: prompt,
          style: selectedStyle,
          renderingStyle: selectedRenderStyle,
          author: user?.username || user?.firstName || 'frr ai user',
          createdAt: new Date().toISOString(),
          gender: selectedGender,
          age: selectedAge,
          ratio: selectedRatio,
          cameraDistance: selectedCameraDistance || "medium",
          storagePath: result.storagePath || '',
          aspectRatio: result.aspectRatio || '1:1'
        };
        
        // 히스토리에 저장
        saveToHistory(newImage);
        
        // 결과 배열 업데이트
        switch (buttonType) {
          case 'another':
            // Another Generate 버튼 클릭 시 (새 결과 추가)
            setResults(prevResults => [...prevResults, newImage]);
            break;
          case 'new':
            // Generate New 버튼 클릭 시 (모든 결과 초기화하고 새 결과 추가)
            setResults([newImage]);
            break;
          case 'generate':
          default:
            // Generate AI Model 버튼 클릭 시 (첫 번째 결과로 설정)
            setResults([newImage]);
            break;
        }
        
        // 자동 공유 코드 제거 - 사용자가 명시적으로 공유 버튼을 클릭할 때만 공유되도록 함
        
        completeLoading();
      } else {
        // 출력이 없는 경우
        console.error("API 응답에 output이 없습니다:", result);
        toast.error("Failed to generate image. Please try again.");
        setShowLoadingModal(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "An error occurred while generating the image.");
      setShowLoadingModal(false); // 오류 시 로딩 모달 닫기
    } finally {
      setIsLoading(false);
    }
  };

  // 공유 핸들러 개선
  const handleShare = async (result: GeneratedImage, index: number) => {
    try {
      // 이미 공유 중이거나 공유된 이미지는 처리하지 않음
      if (result.isShared || result.isSharing) {
        return;
      }
      
      // 유효한 이미지 URL 확인
      if (!isValidImageUrl(result.imageUrl)) {
        toast.error('유효하지 않은 이미지 URL입니다.');
        return;
      }
      
      // 공유 진행 중 상태로 설정
      const updatedResults = [...results];
      updatedResults[index] = { ...updatedResults[index], isSharing: true };
      setResults(updatedResults);
      
      // 로딩 토스트 표시
      const loadingToast = toast.loading('이미지를 공유하는 중...');
      
      // Replicate URL 경고 표시 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development' && isReplicateUrl(result.imageUrl)) {
        console.warn('Replicate URL은 일시적이며 곧 만료됩니다. API에서 자동으로 Supabase Storage에 저장합니다.');
      }
      
      // 공유 API 요청 데이터 준비
      const shareData = {
        image_url: result.imageUrl,
        prompt: result.prompt,
        rendering_style: result.renderingStyle || selectedRenderStyle,
        aspect_ratio: result.aspectRatio || result.ratio || '1:1', // aspectRatio 또는 ratio 사용
        gender: result.gender || '',
        age: result.age || '',
        storage_path: result.storagePath || ''
      };
      
      console.log('공유 데이터:', shareData);
      
      // 공유 API 호출
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });
      
      // 응답 처리 강화
      let data: { success: boolean; data?: any; error?: string } = { success: false };
      let isJsonResponse = false;
      
      try {
        // 응답이 JSON인지 확인
        const contentType = response.headers.get('content-type');
        isJsonResponse = contentType !== null && contentType.includes('application/json');
        
        if (isJsonResponse) {
          data = await response.json();
        } else {
          // JSON이 아닌 경우 텍스트로 읽기
          const textResponse = await response.text();
          console.error('API가 JSON이 아닌 응답을 반환했습니다:', textResponse);
          
          // 텍스트 응답을 JSON으로 변환 시도
          try {
            data = JSON.parse(textResponse);
            isJsonResponse = true;
          } catch (parseError) {
            // JSON 파싱 실패 - 오류 응답 생성
            data = { 
              success: false, 
              error: `서버 응답이 유효한 JSON이 아닙니다: ${textResponse.substring(0, 100)}${textResponse.length > 100 ? '...' : ''}`
            };
          }
        }
      } catch (responseError) {
        console.error('응답 처리 오류:', responseError);
        data = { 
          success: false, 
          error: responseError instanceof Error ? responseError.message : '응답 처리 중 오류가 발생했습니다.'
        };
      }
      
      toast.dismiss(loadingToast);
      
      // 상태 업데이트
      const newResults = [...results];
      
      if (data.success) {
        // 공유 성공
        newResults[index] = { 
          ...newResults[index], 
          isShared: true, 
          isSharing: false,
          // API 응답에서 반환된 영구 URL로 업데이트 (있는 경우)
          imageUrl: data.data?.image_url || newResults[index].imageUrl
        };
        setResults(newResults);
        
        toast.success('커뮤니티에 공유되었습니다!');
        
        // 커뮤니티 페이지로 이동
        setTimeout(() => {
          router.push('/community');
        }, 1000);
      } else {
        // 공유 실패
        newResults[index] = { ...newResults[index], isSharing: false };
        setResults(newResults);
        
        // 오류 메시지 추출 및 표시
        const errorMessage = data.error || 
          (response.ok ? '알 수 없는 오류' : `서버 오류 (${response.status})`);
        
        console.error("공유 실패:", errorMessage);
        toast.error(`이미지 공유 실패: ${errorMessage}`);
      }
    } catch (error) {
      // 에러 처리
      console.error('공유 중 오류 발생:', error);
      toast.error(`이미지 공유 오류: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
      
      // 상태 초기화
      const newResults = [...results];
      const indexToUpdate = Math.min(index, newResults.length - 1);
      
      if (indexToUpdate >= 0) {
        newResults[indexToUpdate] = { ...newResults[indexToUpdate], isSharing: false };
        setResults(newResults);
      }
    }
  };

  // 다운로드 함수 개선
  const handleDownload = async (imageUrl: string) => {
    try {
      // 유효한 이미지 URL 확인
      if (!isValidImageUrl(imageUrl)) {
        toast.error('유효하지 않은 이미지 URL입니다.');
        return;
      }
      
      const loadingToast = toast.loading('이미지를 다운로드하는 중...');
      
      // Replicate URL 경고 표시 (개발 환경에서만)
      if (process.env.NODE_ENV === 'development' && isReplicateUrl(imageUrl)) {
        console.warn('Replicate URL은 일시적이며 곧 만료됩니다. 이미지가 다운로드되지 않을 수 있습니다.');
      }
      
      const response = await fetch(imageUrl);
      
      if (!response.ok) {
        throw new Error(`이미지 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `AI_model_${Date.now()}.webp`; // webp 형식으로 변경
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss(loadingToast);
      toast.success('이미지가 성공적으로 저장되었습니다!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      console.error('다운로드 오류:', errorMessage);
      toast.error(`이미지 저장 실패: ${errorMessage}`);
    }
  };

  // 결과가 나왔을 때 해당 요소로 스크롤
  useEffect(() => {
    if (results.length > 0 && resultRef.current) {
      // 로딩이 완료된 후 스크롤
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 600); // 로딩 모달이 닫히고 애니메이션이 시작된 후에 스크롤
    }
  }, [results]);

  // 옵션 섹션 추가
  const renderOptions = () => {
    return (
      <div className="space-y-6">
        {/* 비율 선택 UI */}
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-600 mb-3">Aspect Ratio<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border border-red-100 ml-2">Required</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex justify-center items-center gap-6 md:gap-8">
              {IMAGE_GENERATION_CONFIG.aspectRatios.map((ratio) => (
                <button
                  key={ratio.id}
                  type="button"
                  onClick={() => handleRatioChange(ratio.id)}
                  className={`group flex flex-col items-center ${aspectRatioLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  disabled={aspectRatioLocked}
                >
                  <div 
                    className={`relative mb-2 box-border ${
                      selectedRatio === ratio.id 
                        ? "bg-gradient-to-r from-blue-400 to-indigo-500" 
                        : aspectRatioLocked ? "bg-gray-100" : "bg-white hover:bg-blue-50"
                    }`}
                    style={{
                      width: ratio.id === "16:9" ? "70px" : ratio.id === "9:16" ? "40px" : "50px",
                      height: ratio.id === "16:9" ? "40px" : ratio.id === "9:16" ? "70px" : "50px",
                      borderRadius: "10px",
                      border: selectedRatio === ratio.id ? "none" : "1px solid #e5e7eb",
                      boxShadow: selectedRatio === ratio.id ? "0 0 0 1px rgba(99, 102, 241, 0.4), 0 4px 6px -1px rgba(0, 0, 0, 0.1)" : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                      transition: "background-color 0.2s, box-shadow 0.2s"
                    }}
                  >
                    {selectedRatio === ratio.id && (
                      <div className="absolute inset-0 rounded-lg bg-white/20"></div>
                    )}
                  </div>
                  <span className={`text-sm ${
                    selectedRatio === ratio.id 
                      ? "text-blue-600 font-medium" 
                      : aspectRatioLocked ? "text-gray-400" : "text-gray-500 group-hover:text-gray-700"
                  }`}
                  style={{ transition: "color 0.2s" }}>
                    {ratio.id}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 렌더링 스타일 선택 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Rendering Style<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border border-red-100 ml-2">Required</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              {renderStyleOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleRenderStyleSelect(option.id)}
                  className={`box-border py-3 px-4 rounded-xl ${
                    selectedRenderStyle === option.id
                      ? option.id === "realistic" 
                        ? "bg-gradient-to-r from-green-400 to-teal-500 text-white" 
                        : "bg-gradient-to-r from-purple-400 to-indigo-500 text-white"
                      : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
                  } ${genderAgeLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                  style={{ transition: "background-color 0.2s, color 0.2s" }}
                >
                  <div className="flex flex-col items-center">
                    <span className="text-lg mb-1">{option.emoji}</span>
                    <span className="font-medium">{option.label}</span>
                    <span className="text-xs mt-1 opacity-80">{option.description}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 연령대 선택 - 필수 항목 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Age<span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-red-50 to-rose-50 text-red-600 border border-red-100 ml-2">Required</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex items-stretch">
              {ageOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleAgeSelect(option.id)}
                  className={`flex-1 py-4 px-6 transition-all duration-300 flex flex-col items-center justify-center ${
                    selectedAge === option.id 
                      ? "bg-gradient-to-r from-blue-400 to-indigo-500 text-white" 
                      : "bg-transparent text-gray-700 hover:bg-gray-100"
                  } ${genderAgeLocked ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className={`w-6 h-6 rounded-full mb-2 flex items-center justify-center ${
                    selectedAge === option.id 
                      ? "bg-white" 
                      : "border border-gray-300"
                  }`}>
                    {selectedAge === option.id && (
                      <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* 성별 선택 - 선택 항목 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Gender <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              {genderOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleGenderSelect(option.id)}
                  className={`relative group overflow-hidden option-button option-gender ${
                    selectedGender === option.id 
                      ? option.id === "male"
                        ? "bg-gradient-to-r from-blue-400 to-indigo-500 shadow-lg option-button-selected" 
                        : "bg-gradient-to-r from-purple-400 to-pink-500 shadow-lg option-button-selected"
                      : "bg-white hover:bg-gray-50"
                  } rounded-xl border border-gray-200 p-4 flex items-center justify-center`}
                  disabled={genderAgeLocked}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200 bg-gradient-to-r ${option.id === "male" ? "from-blue-400 to-indigo-500" : "from-purple-400 to-pink-500"}`}></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedGender === option.id ? "bg-white/20" : "bg-gradient-to-r from-gray-100 to-blue-100"
                    } shadow-inner border-2 border-white`}>
                      <span className="text-2xl">{option.emoji}</span>
                    </div>
                    <div className="text-center">
                      <span className={`block font-medium ${selectedGender === option.id ? "text-white" : "text-gray-700"}`}>
                        {option.label}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* 배경 입력 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Background <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <input 
              type="text"
              value={background}
              onChange={(e) => {
                setBackground(e.target.value);
                if (genderAgeLocked) {
                  setAspectRatioLocked(false);
                  setGenderAgeLocked(false);
                  setTemporaryRatio(selectedRatio);
                }
              }}
              placeholder="e.g. Musei Vatican, Sagrada Familia, beach, office"
              className="w-full p-4 border-none focus:ring-0 text-gray-800 placeholder:text-gray-400 text-sm"
              disabled={genderAgeLocked}
            />
          </div>
        </div>
        
        {/* 카메라 거리 선택 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Camera Distance <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-3 gap-3">
              {cameraDistanceOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => handleCameraDistanceSelect(option.id)}
                  className={`relative group overflow-hidden option-button option-camera ${
                    selectedCameraDistance === option.id 
                      ? "bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 shadow-lg option-button-selected" 
                      : "bg-white hover:bg-gray-50"
                  } rounded-xl border border-gray-200 p-4 flex items-center justify-center`}
                  disabled={genderAgeLocked}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200 bg-gradient-to-r from-blue-400 to-indigo-500`}></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedCameraDistance === option.id ? "bg-white/20" : "bg-gradient-to-r from-blue-100 to-indigo-100"
                    } shadow-inner border-2 border-white`}>
                      <span className="text-2xl">{option.emoji}</span>
                    </div>
                    <div className="text-center">
                      <span className={`block font-medium ${selectedCameraDistance === option.id ? "text-white" : "text-gray-700"}`}>
                        {option.label}
                      </span>
                      <span className={`block text-xs ${selectedCameraDistance === option.id ? "text-white/80" : "text-gray-500"}`}>
                        {option.description.split(',')[0]}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 피부 타입 선택 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Skin Type <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'light', label: 'Light', description: 'Fair & Bright', gradient: 'from-[#FFE8D6] to-[#F8D5C2]', emoji: '🌟' },
                { id: 'tan', label: 'Tan', description: 'Warm & Golden', gradient: 'from-[#E5C0A0] to-[#D4A373]', emoji: '✨' },
                { id: 'dark', label: 'Dark', description: 'Deep & Rich', gradient: 'from-[#8B5E3C] to-[#6B4423]', emoji: '💫' }
              ].map((skin) => (
                <button
                  key={skin.id}
                  type="button"
                  onClick={() => handleSkinTypeSelect(skin.id)}
                  className={`relative group overflow-hidden option-button option-skin ${
                    selectedSkinType === skin.id 
                      ? "bg-gradient-to-r " + skin.gradient + " shadow-lg option-button-selected" 
                      : "bg-white hover:bg-gray-50"
                  } rounded-xl border border-gray-200 p-4 flex items-center justify-center`}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200 bg-gradient-to-r ${skin.gradient}`}></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedSkinType === skin.id ? "bg-white/20" : "bg-gradient-to-r " + skin.gradient
                    } shadow-inner border-2 border-white`}>
                      <span className="text-lg">{skin.emoji}</span>
                    </div>
                    <div className="text-center">
                      <span className={`block font-medium ${selectedSkinType === skin.id ? "text-white" : "text-gray-700"}`}>
                        {skin.label}
                      </span>
                      <span className={`block text-xs ${selectedSkinType === skin.id ? "text-white/80" : "text-gray-500"}`}>
                        {skin.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 눈 색상 선택 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Eye Color <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'brown', label: 'Brown', emoji: '👁️', gradient: 'from-amber-400 to-amber-600', description: 'Warm & Natural' },
                { id: 'blue', label: 'Blue', emoji: '👁️', gradient: 'from-blue-400 to-blue-600', description: 'Deep & Clear' },
                { id: 'green', label: 'Green', emoji: '👁️', gradient: 'from-emerald-400 to-emerald-600', description: 'Rare & Unique' },
                { id: 'gray', label: 'Gray', emoji: '👁️', gradient: 'from-gray-400 to-gray-600', description: 'Soft & Mysterious' }
              ].map((color) => (
                <button
                  key={color.id}
                  type="button"
                  onClick={() => handleEyesSelect(color.id)}
                  className={`relative group overflow-hidden option-button option-eyes ${
                    selectedEyes === color.id 
                      ? "bg-gradient-to-r " + color.gradient + " shadow-lg option-button-selected" 
                      : "bg-white hover:bg-gray-50"
                  } rounded-xl border border-gray-200 p-4 flex items-center justify-center`}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-200 bg-gradient-to-r ${color.gradient}`}></div>
                  <div className="relative flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      selectedEyes === color.id ? "bg-white/20" : "bg-gradient-to-r " + color.gradient
                    } shadow-inner border-2 border-white`}>
                      <span className="text-lg">{color.emoji}</span>
                    </div>
                    <div className="flex flex-col items-start">
                      <span className={`font-medium ${selectedEyes === color.id ? "text-white" : "text-gray-700"}`}>
                        {color.label}
                      </span>
                      <span className={`text-xs ${selectedEyes === color.id ? "text-white/80" : "text-gray-500"}`}>
                        {color.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 헤어 스타일 선택 */}
        <div>
          <h3 className="text-base font-medium mb-3 text-gray-600">Hair Style <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-purple-50 to-blue-50 text-blue-600 border border-blue-100">optional</span></h3>
          <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: 'long', label: 'Long Hair', description: 'Straight & Sleek', gradient: 'from-amber-400 to-amber-600', emoji: '👱‍♀️' },
                { id: 'short', label: 'Short Hair', description: 'Clean & Modern', gradient: 'from-blue-400 to-blue-600', emoji: '💇‍♀️' },
                { id: 'wave', label: 'Wavy Hair', description: 'Natural Waves', gradient: 'from-emerald-400 to-emerald-600', emoji: '👩‍🦱' },
                { id: 'slick', label: 'Slicked Back', description: 'Model Style', gradient: 'from-violet-400 to-violet-600', emoji: '🧑‍🦱' },
                { id: 'bangs', label: 'With Bangs', description: 'Front Fringe', gradient: 'from-rose-400 to-rose-600', emoji: '👩' },
                { id: 'no-bangs', label: 'No Bangs', description: 'Clean Front', gradient: 'from-indigo-400 to-indigo-600', emoji: '👩‍🦰' }
              ].map((hair) => (
                <button
                  key={hair.id}
                  type="button"
                  onClick={() => handleHairStyleSelect(hair.id)}
                  className={`relative group overflow-hidden option-button option-hairstyle ${
                    selectedHairStyle === hair.id 
                      ? "bg-gradient-to-r " + hair.gradient + " shadow-lg option-button-selected" 
                      : "bg-white hover:bg-gray-50"
                  } rounded-xl border border-gray-200 p-4 flex items-center justify-center`}
                >
                  <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-r ${hair.gradient}`}></div>
                  <div className="relative flex flex-col items-center gap-2">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      selectedHairStyle === hair.id ? "bg-white/20" : "bg-gradient-to-r " + hair.gradient
                    } shadow-inner border-2 border-white`}>
                      <span className="text-2xl">{hair.emoji}</span>
                    </div>
                    <div className="text-center">
                      <span className={`block font-medium ${selectedHairStyle === hair.id ? "text-white" : "text-gray-700"}`}>
                        {hair.label}
                      </span>
                      <span className={`block text-xs ${selectedHairStyle === hair.id ? "text-white/80" : "text-gray-500"}`}>
                        {hair.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 생성 버튼 스타일 업데이트 - 홈페이지 버튼과 동일하게 변경
  const renderGenerationButton = () => {
    return (
      <div className="mt-4 w-full">
        {isSignedIn ? (
          <button 
            onClick={(e) => handleSubmit(e)}
            disabled={isLoading}
            className={`
              w-full h-12 md:h-14 rounded-xl flex items-center justify-center gap-2 transition-all 
              ${isLoading ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-xl hover:shadow-2xl'}
              font-medium text-sm md:text-base
            `}
          >
            {isLoading ? (
              <>
                <Sparkles className="w-5 h-5 animate-pulse" />
                <span>Creating AI Model...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate AI Model</span>
              </>
            )}
          </button>
        ) : (
          <SignInButton mode="modal" fallbackRedirectUrl="/generate">
            <button 
              className="w-full h-12 md:h-14 rounded-xl flex items-center justify-center gap-2 transition-all bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-xl hover:shadow-2xl font-medium text-sm md:text-base"
            >
              <Sparkles className="w-5 h-5" />
              <span>Generate AI Model</span>
            </button>
          </SignInButton>
        )}
      </div>
    );
  };

  // 이미지 URL이 없을 때 fallback 이미지 URL 사용
  const getFallbackImageUrl = (imageUrl: string | null | undefined): string => {
    if (!imageUrl || imageUrl.trim() === '') {
      return '/fallback-image.png';
    }
    return imageUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white overflow-x-hidden">
      {/* 배경 효과 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/90 via-purple-50/90 to-white" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-b from-blue-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-purple-100/20 to-transparent rounded-full blur-3xl" />
      </div>
      
      {/* 로딩 모달 컴포넌트 */}
      <LoadingModal 
        isVisible={showLoadingModal} 
        progress={loadingProgress}
        message={loadingMessage}
      />
      
      {/* 로딩 중일 때 전체 화면 오버레이 수정 - 로딩 모달이 보이지 않을 때만 적용 */}
      {isLoading && !showLoadingModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-[4px] z-[100] pointer-events-auto" />
      )}
      <div ref={topRef}></div>
      <div className="container mx-auto md:px-4 py-8 pt-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-3xl md:mx-auto ml-0 mr-auto"
        >
          <div className="text-center mb-8 md:mb-12 mt-6">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent [line-height:1.3] md:[line-height:1.2] px-1 mb-6">
              Create Your AI Model
            </h1>
            
            {/* 사용자 등급 및 생성 가능 횟수 표시 - 가로 배치로 변경 */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-4 md:mb-6 w-full">
              <div className="flex items-center gap-2 justify-center">
                <div className={`text-sm font-medium px-3 py-1.5 rounded-full border ${
                  subscription?.tier === 'premium' 
                    ? 'bg-indigo-600 text-white border-indigo-300' 
                    : 'text-gray-700 bg-white border-gray-200'
                }`}>
                  {subscription?.tier === 'premium' ? 'Premium User' : 
                   subscription?.tier === 'starter' ? 'Starter Plan' : 'Free User'}
                </div>
                
                <SubscriptionStatus subscription={subscription} />
                
                {/* 히스토리 토글 버튼을 가로 배치에 추가 */}
                {history.length > 0 && (
                  <button 
                    onClick={() => setShowHistory(!showHistory)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-300 ${
                      showHistory 
                        ? "bg-gray-100 text-gray-600 hover:bg-gray-200" 
                        : "bg-blue-50 text-indigo-600 hover:bg-blue-100 border border-indigo-100"
                    }`}
                  >
                    {showHistory ? (
                      <>
                        <span className="text-sm font-medium">Hide</span>
                        <X className="w-3.5 h-3.5" />
                      </>
                    ) : (
                      <>
                        <span className="text-sm font-medium">View recent images</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
            
            {/* 히스토리 토글 버튼 - 가로 배치로 이동했으므로 제거 */}
          </div>
          
          {/* 히스토리 섹션 */}
          {showHistory && history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-8"
            >
              <div className="p-4 bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-600 border border-indigo-100">
                      Recent Images
                      </span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {history.slice(0, 2).map((item) => (
                    <div key={item.id} className="relative overflow-hidden rounded-lg border border-gray-100 bg-white shadow-sm">
                      <div className={`relative ${
                        item.ratio === "16:9" 
                          ? "aspect-video" 
                          : item.ratio === "9:16" 
                            ? "aspect-[9/16]" 
                            : "aspect-square"
                      }`}>
                        <Image
                          src={item.imageUrl}
                          alt={item.prompt}
                          fill
                          className={`${
                            item.ratio === "9:16" ? "object-contain" : "object-cover"
                          }`}
                          sizes="(max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                      <div className="p-2">
                        <p className="text-xs text-gray-500 truncate">{item.prompt}</p>
                        <div className="flex justify-between items-center mt-1">
                          <div className="flex flex-wrap gap-1">
                            <span className="text-xs text-gray-500 px-1 py-0.5 bg-gray-50 rounded-full">{item.renderingStyle}</span>
                          </div>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => handleDownload(item.imageUrl)}
                              className="p-1 rounded-full hover:bg-gray-100 text-gray-600"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => {
                                const historyIndex = history.findIndex(h => h.id === item.id);
                                if (historyIndex !== -1) {
                                  handleShare(item, historyIndex);
                                }
                              }}
                              className={`p-1 rounded-full ${
                                item.isShared 
                                  ? "bg-green-50 text-green-600" 
                                  : item.isSharing
                                  ? "bg-gray-100 text-gray-400 cursor-wait"
                                  : "hover:bg-gray-100 text-gray-600"
                              }`}
                              disabled={item.isShared || item.isSharing}
                            >
                              {item.isShared 
                                ? <span className="text-xs text-green-600 flex items-center"><Share2 className="w-3 h-3 mr-1" />Shared</span>
                                : item.isSharing
                                ? <span className="animate-spin text-xs">⏳</span>
                                : <Share2 className="w-3.5 h-3.5" />
                              }
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* 입력 및 생성 버튼 섹션 */}
          <div className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
                <div className="relative">
                  <textarea
                    value={prompt}
                    onChange={(e) => {
                      setPrompt(e.target.value);
                      // 새 텍스트 입력 시 잠금 해제
                      setAspectRatioLocked(false);
                      setGenderAgeLocked(false);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation(); // 폼 제출 방지
                      }
                    }}
                    placeholder="Describe the advertising model you want in detail..."
                    className="block w-full min-h-[80px] md:min-h-[120px] p-3 md:p-6 rounded-t-2xl border-none focus:ring-0 transition-all resize-none bg-transparent text-gray-800 placeholder:text-gray-400 text-sm md:text-lg whitespace-pre-wrap break-words leading-relaxed"
                    style={{ lineHeight: '1.6', letterSpacing: '0.01em' }}
                    maxLength={200}
                  />
                  
                </div>
                <div className="p-3 md:p-6 border-t border-gray-100 space-y-3 md:space-y-6">
                  {renderOptions()}
                  {renderGenerationButton()}
                </div>
              </div>
            </form>
          </div>

          {/* 모달 위치 변경 */}
          <div className="relative">  {/* 상대 위치 컨테이너 추가 */}
            {showModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000]">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.2 }}
                  className="w-[calc(100%-2rem)] max-w-xs md:max-w-sm mx-auto bg-white rounded-xl p-4 md:p-5 shadow-xl border border-gray-100"
                >
                  <div className="text-center">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-blue-50 mx-auto mb-3 md:mb-4 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 md:w-7 md:h-7 text-blue-500" />
                    </div>
                    <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-1.5 md:mb-2">
                      Selection Required
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 mb-4 md:mb-5">
                      {modalMessage}
                    </p>
                    <button
                      onClick={() => setShowModal(false)}
                      className="w-full max-w-[14rem] mx-auto block py-2 md:py-2.5 px-4 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 text-white rounded-lg text-sm font-medium transition-all duration-200"
                    >
                      Confirm
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </div>

          {/* 사용량 제한 모달 */}
          {showLimitModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-3 md:p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-sm md:max-w-md mx-auto bg-white rounded-xl p-4 md:p-6 shadow-xl border border-gray-100"
              >
                <div className="text-center">
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-50 mx-auto mb-4 md:mb-5 flex items-center justify-center border border-red-100">
                    <AlertCircle className="w-6 h-6 md:w-8 md:h-8 text-red-500" />
                  </div>
                  <h3 className="text-lg md:text-xl font-semibold text-gray-800 mb-2 md:mb-3">
                    Generation Limit Reached
                  </h3>
                  <p className="w-full p-0 text-xs md:text-sm bg-transparent border-none resize-none focus:ring-0 text-gray-600 placeholder:text-gray-400 mb-3 md:mb-4">
                    {subscription?.tier === 'premium'
                      ? `You've used all your premium monthly generations (${subscription?.maxGenerations} images).`
                      : subscription?.tier === 'starter'
                        ? `You've used all your starter plan monthly generations (${subscription?.maxGenerations} images).`
                        : `You've used all your free monthly generations (${subscription?.maxGenerations} images).`}
                    <br/><br/>
                    {subscription?.tier === 'premium' 
                      ? 'Your premium account provides up to 100 generations per month.'
                      : subscription?.tier === 'starter'
                        ? 'Upgrade to Premium plan for 100 generations per month!'
                        : 'Upgrade to Premium plan for 100 generations per month!'}
                    <br/><br/>
                    Next renewal: {subscription?.renewalDate ? new Date(subscription.renewalDate).toLocaleDateString() : ''}
                  </p>
                  
                  <div className="flex justify-center mt-2 space-x-2 md:space-x-3">
                    {subscription?.tier !== 'premium' && (
                      <Link href="/pricing" className="w-1/2 py-2.5 md:py-3.5 px-3 md:px-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-indigo-600 transition-all duration-200 text-center text-xs md:text-sm touch-manipulation">
                        Upgrade to Premium
                      </Link>
                    )}
                    
                    <button
                      onClick={() => setShowLimitModal(false)}
                      className="w-1/2 py-2.5 md:py-3.5 px-3 md:px-4 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-all duration-200 text-xs md:text-sm touch-manipulation"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* 결과 섹션 - 영어로 변경 */}
          {results.length > 0 && isSignedIn && (
            <motion.div 
              ref={resultRef}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="w-full mt-8 md:mt-12 overflow-x-auto pb-6"
            >
              <div className="flex flex-row justify-start md:justify-center gap-6 md:gap-8 min-w-max px-4">
                {/* 첫 번째 결과 카드 */}
                <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden w-full max-w-sm mx-auto flex flex-col border border-gray-100">
                  {/* 이미지 섹션 */}
                  <div className="px-4 md:px-6 pt-4 md:pt-6">
                    <div className="flex justify-center">
                      <div className={`relative w-full max-w-sm overflow-hidden rounded-xl md:rounded-2xl ${
                        results[0]?.ratio === "16:9" 
                          ? "aspect-video" 
                          : results[0]?.ratio === "9:16" 
                            ? "aspect-[9/16]" 
                            : "aspect-square"
                      }`}>
                        {results[0]?.imageUrl ? (
                          <>
                            <Image
                              src={getFallbackImageUrl(results[0].imageUrl)}
                              alt={results[0].prompt || "Generated image"}
                              fill
                              className={`${
                                results[0]?.ratio === "9:16" ? "object-contain bg-gray-50" : "object-cover"
                              }`}
                              sizes="(max-width: 768px) 100vw, 50vw"
                              priority
                            />
                            <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-gray-800 text-xs px-2 py-1 rounded-full shadow-sm border border-gray-200">
                              {results[0].ratio}
                            </div>
                          </>
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                            <div className="text-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mx-auto mb-2">
                                <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                <circle cx="9" cy="9" r="2"/>
                                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                              </svg>
                              <p className="text-xs text-gray-400">이미지를 불러올 수 없습니다</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* 작성자 정보 */}
                  <div className="px-4 md:px-6 py-3 flex items-center gap-3 border-b border-gray-100 h-[54px] md:h-[60px]">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                      <span className="text-sm font-semibold text-white">AI</span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">@{user?.username || user?.firstName || 'frr ai user'}</div>
                    </div>
                  </div>
                  
                  {/* 컨텐츠 섹션 */}
                  <div className="px-4 md:px-6 py-3 flex-1">
                    <div className="flex items-center gap-2 mb-3 md:mb-4">
                      <span className="text-sm font-medium">
                        {selectedGender === "female" ? "👩" : "👨‍💼"}
                    </span>
                      <span className="text-sm font-medium text-gray-700">{`${selectedAge}, ${selectedGender}`}</span>
                  </div>
                    <p className="text-sm text-gray-600 leading-relaxed break-words">
                      {results && results.length > 0 ? results[0]?.prompt : ''}
                    </p>
                </div>
                  
                  {/* 하단 바 */}
                  <div className="bg-gray-50 border-t border-gray-100 px-4 md:px-6 py-3 h-[54px] md:h-[60px] flex items-center justify-between">
                    <button
                      onClick={() => results && results.length > 0 ? handleShare(results[0], 0) : null}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors touch-manipulation border ${
                        results && results.length > 0 && results[0]?.isShared 
                          ? "bg-green-50 text-green-600 border-green-100 cursor-default" 
                          : results && results.length > 0 && results[0]?.isSharing
                          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-wait"
                          : "hover:bg-white text-gray-700 border-transparent hover:border-gray-200"
                      }`}
                      disabled={!results || results.length === 0 || results[0]?.isShared || results[0]?.isSharing}
                    >
                      {results && results.length > 0 && results[0]?.isShared 
                        ? <><Share2 className="w-4 h-4" /><span className="text-sm font-medium">Shared</span></>
                        : results && results.length > 0 && results[0]?.isSharing
                        ? <><span className="animate-spin mr-1">⏳</span><span className="text-sm font-medium">Sharing...</span></>
                        : <><Share2 className="w-4 h-4" /><span className="text-sm font-medium">Share</span></>
                      }
                    </button>
                    
                    <button
                      onClick={() => results && results.length > 0 && results[0]?.imageUrl ? handleDownload(getFallbackImageUrl(results[0].imageUrl)) : null}
                      className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors touch-manipulation border border-blue-100"
                      disabled={!results || results.length === 0 || !results[0]?.imageUrl}
                    >
                      <Download className="w-4 h-4" />
                      <span className="text-sm font-medium">Save Image</span>
                    </button>
                  </div>

                  {/* Another Generate 버튼 */}
                  <div className="px-4 md:px-6 py-3 border-t border-gray-100">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleSubmit(e, 'another');
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
                      disabled={isLoading}
                    >
                      <Sparkles className="w-4 h-4" />
                      <span className="font-medium">Another Generate</span>
                    </button>
                  </div>
                </div>

                {/* 두 번째 결과 카드 (있을 경우) */}
                {results.length > 1 && (
                  <div className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden w-full max-w-sm mx-auto flex flex-col border border-gray-100">
                    {/* 이미지 섹션 */}
                    <div className="px-4 md:px-6 pt-4 md:pt-6">
                      <div className="flex justify-center">
                        <div className={`relative w-full max-w-sm overflow-hidden rounded-xl md:rounded-2xl ${
                          results[1]?.ratio === "16:9" 
                            ? "aspect-video" 
                            : results[1]?.ratio === "9:16" 
                              ? "aspect-[9/16]" 
                              : "aspect-square"
                        }`}>
                          {results[1]?.imageUrl ? (
                            <>
                              <Image
                                src={getFallbackImageUrl(results[1].imageUrl)}
                                alt={results[1].prompt || "Generated image"}
                                fill
                                className={`${
                                  results[1]?.ratio === "9:16" ? "object-contain bg-gray-50" : "object-cover"
                                }`}
                                sizes="(max-width: 768px) 100vw, 50vw"
                                priority
                              />
                              <div className="absolute bottom-2 right-2 bg-white/80 backdrop-blur-sm text-gray-800 text-xs px-2 py-1 rounded-full shadow-sm border border-gray-200">
                                {results[1].ratio}
                              </div>
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                              <div className="text-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 mx-auto mb-2">
                                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                                  <circle cx="9" cy="9" r="2"/>
                                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                                </svg>
                                <p className="text-xs text-gray-400">이미지를 불러올 수 없습니다</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* 작성자 정보 */}
                    <div className="px-4 md:px-6 py-3 flex items-center gap-3 border-b border-gray-100 h-[54px] md:h-[60px]">
                      <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                        <span className="text-sm font-semibold text-white">AI</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-800">@{user?.username || user?.firstName || 'frr ai user'}</div>
                      </div>
                    </div>
                    
                    {/* 컨텐츠 섹션 */}
                    <div className="px-4 md:px-6 py-3 flex-1">
                      <div className="flex items-center gap-2 mb-3 md:mb-4">
                        <span className="text-sm font-medium">
                          {selectedGender === "female" ? "👩" : "👨‍💼"}
                        </span>
                        <span className="text-sm font-medium text-gray-700">{`${selectedAge}, ${selectedGender}`}</span>
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed break-words">
                        {results[1]?.prompt}
                      </p>
                    </div>
                    
                    {/* 하단 바 */}
                    <div className="bg-gray-50 border-t border-gray-100 px-4 md:px-6 py-3 h-[54px] md:h-[60px] flex items-center justify-between">
                      <button
                        onClick={() => handleShare(results[1], 1)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors touch-manipulation border ${
                          results[1]?.isShared 
                            ? "bg-green-50 text-green-600 border-green-100 cursor-default" 
                            : results[1]?.isSharing
                            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-wait"
                            : "hover:bg-white text-gray-700 border-transparent hover:border-gray-200"
                        }`}
                        disabled={results[1]?.isShared || results[1]?.isSharing}
                      >
                        {results[1]?.isShared 
                          ? <><Share2 className="w-4 h-4" /><span className="text-sm font-medium">Shared</span></>
                          : results[1]?.isSharing
                          ? <><span className="animate-spin mr-1">⏳</span><span className="text-sm font-medium">Sharing...</span></>
                          : <><Share2 className="w-4 h-4" /><span className="text-sm font-medium">Share</span></>
                        }
                      </button>
                      
                      <button
                        onClick={() => results[1]?.imageUrl ? handleDownload(getFallbackImageUrl(results[1].imageUrl)) : null}
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors touch-manipulation border border-blue-100"
                        disabled={!results[1]?.imageUrl}
                      >
                        <Download className="w-4 h-4" />
                        <span className="text-sm font-medium">Save Image</span>
                      </button>
                    </div>

                    {/* Generate New 버튼 */}
                    <div className="px-4 md:px-6 py-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          handleSubmit(e, 'new');
                        }}
                        className="w-full py-2.5 bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
                        disabled={isLoading}
                      >
                        <Sparkles className="w-4 h-4" />
                        <span className="font-medium">Generate New</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* 상단으로 스크롤 버튼 */}
          {showScrollTop && (
            <button
              onClick={scrollToTop}
              className="fixed bottom-8 right-8 p-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg text-white hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 z-50"
              aria-label="Scroll to top"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          )}

          {/* API 서비스 한도 알림 컴포넌트 */}
          {showServiceLimitAlert && (
            <ServiceLimitAlert
              isVisible={showServiceLimitAlert}
              onClose={() => setShowServiceLimitAlert(false)}
            />
          )}
        </motion.div>
      </div>
    </div>
  );
}

// Suspense로 감싸는 래퍼 컴포넌트
export default function Generate() {
  return (
    <Suspense fallback={<div className="w-full py-12 text-center">Loading generator...</div>}>
      <GenerateContent />
    </Suspense>
  );
} 