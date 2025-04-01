import { HeartIcon, MessageCircleIcon, BookmarkIcon } from 'lucide-react';
import { IInteractionButtons } from '@/types';

export const InteractionButtons = ({ 
  likes, 
  comments, 
  isLiked = false,
  onLike, 
  onComment 
}: IInteractionButtons) => (
  <div className="flex items-center gap-6">
    <button 
      onClick={onLike}
      className="group flex items-center gap-2 transition-all"
    >
      <div className={`p-2 rounded-full ${
        isLiked 
          ? 'bg-rose-50' 
          : 'bg-gray-50/50 group-hover:bg-rose-50/50'
      } transition-colors`}>
        <HeartIcon 
          className={`w-4 h-4 ${
            isLiked 
              ? 'text-rose-500 fill-rose-500' 
              : 'text-gray-400 group-hover:text-rose-500'
          }`} 
        />
      </div>
      <span className={`text-sm ${
        isLiked 
          ? 'text-rose-500' 
          : 'text-gray-500 group-hover:text-rose-500'
      }`}>
        {likes}
      </span>
    </button>
    <button 
      onClick={onComment}
      className="group flex items-center gap-2 transition-all"
    >
      <div className="p-2 rounded-full bg-gray-50/50 group-hover:bg-blue-50/50 transition-colors">
        <MessageCircleIcon className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
      </div>
      <span className="text-sm text-gray-500 group-hover:text-blue-500">
        {comments.length}
      </span>
    </button>
    <button className="group flex items-center gap-2 transition-all ml-auto">
      <div className="p-2 rounded-full bg-gray-50/50 group-hover:bg-purple-50/50 transition-colors">
        <BookmarkIcon className="w-4 h-4 text-gray-400 group-hover:text-purple-500" />
      </div>
    </button>
  </div>
); 