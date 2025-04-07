import Image from 'next/image';
import { useState } from 'react';
import { Heart, MessageCircle, Share } from 'lucide-react';
import { formDataApi } from '@/lib/api';

type SimpleImageCardProps = {
  id: string;
  imageUrl: string;
  prompt: string;
  userId?: string;
  userName?: string;
  createdAt?: string;
  likesCount?: number;
  isLiked?: boolean;
  comments?: any[];
  onLikeSuccess?: () => void;
  onCommentSuccess?: () => void;
  currentUser?: {
    id: string;
    name: string;
  };
  showActions?: boolean;
  aspectRatio?: string;
};

export function SimpleImageCard({
  id,
  imageUrl,
  prompt,
  userName = 'Unknown',
  createdAt,
  likesCount = 0,
  isLiked = false,
  comments = [],
  onLikeSuccess,
  onCommentSuccess,
  currentUser,
  showActions = true,
  aspectRatio = '1:1'
}: SimpleImageCardProps) {
  const [isLikedState, setIsLikedState] = useState(isLiked);
  const [likesCountState, setLikesCountState] = useState(likesCount);
  const [isLoading, setIsLoading] = useState(false);
  
  // 좋아요 처리
  const handleLike = async () => {
    if (!currentUser || isLoading) return;
    
    setIsLoading(true);
    try {
      // 낙관적 UI 업데이트
      setIsLikedState(!isLikedState);
      setLikesCountState(prev => isLikedState ? prev - 1 : prev + 1);
      
      // 실제 API 호출은 제거하고 성공 콜백만 호출
      if (onLikeSuccess) onLikeSuccess();
    } catch (error) {
      console.error('Like error:', error);
      // 실패시 상태 복원
      setIsLikedState(isLikedState);
      setLikesCountState(likesCount);
    } finally {
      setIsLoading(false);
    }
  };
  
  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="rounded-xl shadow-md overflow-hidden bg-white hover:shadow-lg transition-shadow">
      <div className="relative aspect-square">
        <Image
          src={imageUrl}
          alt={prompt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 300px"
        />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/40 rounded text-[10px] text-white font-medium backdrop-blur-sm">
          {aspectRatio}
        </div>
      </div>
      
      <div className="p-3">
        <p className="text-sm text-gray-600 line-clamp-2">{prompt}</p>
        
        <div className="flex justify-between items-center mt-3">
          <div className="text-xs text-gray-500">
            {userName} • {formatDate(createdAt)}
          </div>
          
          {showActions && currentUser && (
            <div className="flex items-center gap-3">
              <button 
                onClick={handleLike}
                className="flex items-center gap-1"
                disabled={isLoading}
              >
                <Heart 
                  size={16} 
                  className={isLikedState ? "fill-red-500 text-red-500" : "text-gray-500"} 
                />
                <span className="text-xs">{likesCountState}</span>
              </button>
              
              <button className="flex items-center gap-1">
                <MessageCircle size={16} className="text-gray-500" />
                <span className="text-xs">{comments.length}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 