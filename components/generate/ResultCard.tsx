import { IResultCard } from '@/types';
import { Download, Share2, Camera, Palette, Mountain, Building, Wand2, Rocket, Clock, Dribbble, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDate } from '@/utils/format';
import { useUser } from '@clerk/nextjs';
import { downloadImage } from '@/utils/image-utils';

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

// 카테고리별 색상 매핑
const getCategoryColor = (category: string): string => {
  const colorMap: { [key: string]: string } = {
    'portrait': 'bg-blue-50 text-blue-600',
    'anime': 'bg-purple-50 text-purple-600',
    'landscape': 'bg-green-50 text-green-600',
    'urban': 'bg-amber-50 text-amber-600',
    'fantasy': 'bg-indigo-50 text-indigo-600',
    'sci-fi': 'bg-cyan-50 text-cyan-600',
    'vintage': 'bg-rose-50 text-rose-600',
    'abstract': 'bg-violet-50 text-violet-600',
    'animals': 'bg-emerald-50 text-emerald-600'
  };
  
  return colorMap[category] || 'bg-gray-50 text-gray-600';
};

// 카테고리별 아이콘 매핑
const getCategoryIcon = (category: string) => {
  const iconMap: { [key: string]: JSX.Element } = {
    'portrait': <Camera className="w-3 h-3 mr-1" />,
    'anime': <Palette className="w-3 h-3 mr-1" />,
    'landscape': <Mountain className="w-3 h-3 mr-1" />,
    'urban': <Building className="w-3 h-3 mr-1" />,
    'fantasy': <Wand2 className="w-3 h-3 mr-1" />,
    'sci-fi': <Rocket className="w-3 h-3 mr-1" />,
    'vintage': <Clock className="w-3 h-3 mr-1" />,
    'abstract': <Dribbble className="w-3 h-3 mr-1" />,
    'animals': <PawPrint className="w-3 h-3 mr-1" />
  };
  
  return iconMap[category] || <Camera className="w-3 h-3 mr-1" />;
};

export const ResultCard = ({ image }: IResultCard) => {
  const router = useRouter();
  const { user } = useUser();
  
  // 현재 사용자가 이미지 소유자인지 확인
  const isOwner = user?.id === image.userId;

  const handleDownload = async () => {
    // 유틸리티 함수 사용으로 중복 코드 제거
    return downloadImage({
      imageUrl: image.imageUrl,
      fileName: `frr-ai-model-${image.id}`,
      fileType: 'jpg',
      isOwnerCheck: {
        isOwner,
        ownerErrorMessage: "Only the owner can download this image"
      }
    });
  };

  const handleShare = async () => {
    try {
      console.log("공유 버튼 클릭됨, 이미지 데이터:", {
        id: image.id,
        imageUrl: image.imageUrl ? "있음" : "없음",
        prompt: image.prompt,
        style: image.style,
        renderingStyle: image.renderingStyle,
        aspectRatio: image.aspectRatio
      });
      
      // 공유 API 직접 호출
      const shareToast = toast.loading('Sharing to community...');
      
      // 이미 공유된 이미지인지 확인
      const checkResponse = await fetch('/api/check-shared', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ imageUrl: image.imageUrl })
      });
      
      const checkResult = await checkResponse.json();
      
      if (checkResult.success && checkResult.exists) {
        // 이미 공유된 이미지는 다시 공유하지 않음
        toast.dismiss(shareToast);
        toast.info('이미 공유된 이미지입니다.');
        
        // 약간의 지연 후 커뮤니티 페이지로 이동
        setTimeout(() => {
          router.push('/community');
        }, 1000);
        
        return;
      }
      
      // 카테고리 계산
      const categoryToUse = image.category || getCategoryFromStyle(image.style || image.renderingStyle);
      
      // 비율 결정 로직 개선
      // 이미지에 이미 비율 정보가 있으면 그것을 사용
      let aspectRatioToUse = image.aspectRatio || '9:16';
      
      // 이미지에 비율 정보가 없는 경우 URL에서 비율 정보 추출 시도
      if (!image.aspectRatio && image.imageUrl) {
        const sizeMatch = image.imageUrl.match(/(\d+)x(\d+)/);
        if (sizeMatch && sizeMatch.length >= 3) {
          const width = parseInt(sizeMatch[1]);
          const height = parseInt(sizeMatch[2]);
          
          if (width && height) {
            if (width === height) {
              aspectRatioToUse = '1:1';
            } else if (Math.abs(width / height - 16 / 9) < 0.1) {
              aspectRatioToUse = '16:9';
            } else if (Math.abs(width / height - 9 / 16) < 0.1) {
              aspectRatioToUse = '9:16';
            } else if (Math.abs(width / height - 4 / 3) < 0.1) {
              aspectRatioToUse = '4:3';
            } else if (Math.abs(width / height - 3 / 4) < 0.1) {
              aspectRatioToUse = '3:4';
            }
          }
        }
      }
      
      // 이미지 요소의 실제 크기를 확인하여 비율 결정
      if (typeof window !== 'undefined') {
        try {
          const img = document.createElement('img');
          img.src = image.imageUrl;
          
          if (img.complete) {
            // 이미지가 이미 로드된 경우
            if (img.width && img.height) {
              const ratio = img.width / img.height;
              if (ratio > 0.98 && ratio < 1.02) {
                aspectRatioToUse = '1:1';
              } else if (ratio > 1.7 && ratio < 1.8) {
                aspectRatioToUse = '16:9';
              } else if (ratio > 0.55 && ratio < 0.57) {
                aspectRatioToUse = '9:16';
              } else if (ratio > 1.3 && ratio < 1.4) {
                aspectRatioToUse = '4:3';
              } else if (ratio > 0.7 && ratio < 0.8) {
                aspectRatioToUse = '3:4';
              }
            }
          } else {
            // 이미지가 아직 로드되지 않은 경우 이벤트 리스너 추가
            img.onload = () => {
              console.log(`이미지 로드됨: 가로=${img.width}, 세로=${img.height}, 비율=${img.width/img.height}`);
            };
          }
        } catch (e) {
          console.error("이미지 비율 계산 오류:", e);
        }
      }
      
      console.log("결정된 비율:", aspectRatioToUse);
      
      // Replicate URL을 그대로 서버에 전달하여 서버에서 저장하도록 함
      // 이렇게 하면 이미지 생성 시에는 저장하지 않고, 공유할 때만 저장됨
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image.imageUrl, // Replicate URL을 그대로 전달
          prompt: image.prompt,
          style: image.style,
          renderingStyle: image.renderingStyle || image.style,
          gender: image.gender || '',
          age: image.age || '',
          aspectRatio: aspectRatioToUse,
          ratio: aspectRatioToUse, // ratio도 함께 전송
          category: categoryToUse, // 카테고리를 명시적으로 전달
          generationId: image.id || null, // 원본 이미지 ID 추가
          store_image: true // 서버에서 이미지를 저장하도록 플래그 추가
        }),
      });
      
      const data = await response.json();
      console.log("공유 API 응답:", data);
      
      toast.dismiss(shareToast);
      
      if (data.success) {
        toast.success(`Shared to community successfully! (Source: ${data.source || 'Unknown'})`);
        // 약간의 지연 후 커뮤니티 페이지로 이동
        setTimeout(() => {
          router.push('/community');
        }, 1000);
      } else {
        console.error("Share failed:", data.error, data.details);
        toast.error(data.error || 'Failed to share.');
      }
    } catch (error) {
      console.error("공유 오류 세부 정보:", error);
      toast.error('Failed to share.');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden group max-w-md mx-auto w-full">
      <div className="p-4">
        <div className="relative aspect-[4/5] overflow-hidden rounded-xl">
          <Image
            src={image.imageUrl}
            alt={image.prompt}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            priority
          />
          <button 
            onClick={handleDownload}
            className={`absolute top-3 right-3 p-2 backdrop-blur-sm rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-white ${
              isOwner 
                ? "bg-white/80 text-blue-600" 
                : "bg-gray-100/80 text-gray-500"
            }`}
          >
            <Download className="h-5 w-5" />
          </button>
          
          {/* 카테고리 뱃지 추가 */}
          {(image.category || getCategoryFromStyle(image.style || image.renderingStyle)) && (
            <div className={`absolute bottom-3 left-3 px-3 py-1.5 backdrop-blur-sm rounded-full text-xs font-medium shadow-sm border flex items-center transition-all duration-200 hover:shadow-md ${getCategoryColor(image.category || getCategoryFromStyle(image.style || image.renderingStyle))}`}>
              {getCategoryIcon(image.category || getCategoryFromStyle(image.style || image.renderingStyle))}
              {image.category || getCategoryFromStyle(image.style || image.renderingStyle)}
            </div>
          )}
        </div>
      </div>

      <div className="px-6 pb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
            <span className="text-sm font-semibold text-white">AI</span>
          </div>
          <div>
            <div className="text-sm font-medium">{image.author}</div>
            <div className="text-xs text-gray-500">Generated</div>
          </div>
        </div>

        <p className="text-sm text-gray-600 line-clamp-2 mb-4">{image.prompt}</p>

        <div className="flex justify-between items-center">
          {/* 모든 사용자에게 다운로드 버튼 표시, 소유자가 아닌 경우 다른 스타일 적용 */}
          <button 
            onClick={handleDownload}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors text-xs font-medium ${
              isOwner 
                ? "bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100" 
                : "bg-gray-50 text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download</span>
          </button>
          
          <button 
            onClick={handleShare}
            className="text-gray-500 hover:text-blue-500 transition-colors"
          >
            <Share2 className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            {formatDate(image.createdAt)}
          </div>
        </div>
      </div>
    </div>
  );
}; 