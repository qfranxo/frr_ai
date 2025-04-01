import { IResultCard } from '@/types';
import { Download, Share2, Camera, Palette, Mountain, Building, Wand2, Rocket, Clock, Dribbble, PawPrint } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { formatDate } from '@/utils/format';
import { useUser } from '@clerk/nextjs';

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
    // 소유자가 아닌 경우 다운로드 제한
    if (!isOwner) {
      toast.error("Only the owner can download this image");
      return;
    }
    
    try {
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `frr-ai-model-${image.id}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Image downloaded successfully.');
    } catch (error) {
      toast.error('Error occurred while downloading.');
    }
  };

  const handleShare = async () => {
    try {
      console.log("공유 버튼 클릭됨, 이미지 데이터:", {
        id: image.id,
        imageUrl: image.imageUrl ? "있음" : "없음",
        prompt: image.prompt,
        style: image.style,
        renderingStyle: image.renderingStyle
      });
      
      // 공유 API 직접 호출
      const shareToast = toast.loading('Sharing to community...');
      
      const response = await fetch('/api/share', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: image.imageUrl,
          prompt: image.prompt,
          style: image.style,
          renderingStyle: image.renderingStyle || image.style,
          gender: image.gender || '',
          age: image.age || '',
          aspectRatio: image.aspectRatio || '1:1',
          selectedCategory: image.category || ''
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
        console.error("공유 실패:", data.error, data.details);
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