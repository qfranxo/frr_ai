import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { IComment } from '@/types';
import { X, Trash2, Send } from 'lucide-react';
import { formatDate } from '@/utils/format';

// 댓글 작성자 이름 표시 함수
function getCommentAuthorName(userName: string | undefined | null = '', currentUserName: string | undefined | null = ''): string {
  // currentUser 정보가 있고 현재 사용자인 경우 (우선순위 1)
  if (currentUserName && userName === currentUserName) {
    return currentUserName;
  }
  
  // userName이 User 또는 guest, 게스트 등 기본값인 경우 현재 사용자 이름 사용
  if (userName === 'User' || userName === 'Guest' || userName === '게스트') {
    if (currentUserName) {
      return currentUserName;
    }
  }
  
  // userName이 있는 경우 (우선순위 2)
  if (userName && userName !== '') {
    // Clerk ID 형식인 경우 진짜 이름 대신 표시
    if (userName.startsWith('user_')) {
      return currentUserName || '사용자';
    }
    
    // 이메일 형식인 경우 @ 앞부분만 사용
    if (userName.includes('@')) {
      return userName.split('@')[0];
    }
    
    return userName;
  }
  
  // 기본값 (우선순위 3)
  return currentUserName || '사용자';
}

interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
  onDelete?: (commentId: number | string) => void;
  comments: IComment[];
  currentUser?: {
    id: string;
    name: string;
  };
}

export const CommentModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onDelete, 
  comments,
  currentUser
}: CommentModalProps) => {
  const [commentText, setCommentText] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      onSubmit(commentText);
      setCommentText('');
    }
  };

  if (!isOpen) return null;

  // 댓글을 최신순으로 정렬 (유효하지 않은 날짜 처리)
  const sortedComments = [...comments].sort((a, b) => {
    // 날짜가 유효하지 않은 경우 대비
    const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
    const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
    
    const timeA = isNaN(dateA.getTime()) ? 0 : dateA.getTime();
    const timeB = isNaN(dateB.getTime()) ? 0 : dateB.getTime();
    
    return timeB - timeA;  // 최신순 정렬
  });

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-8 py-6 flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Comments {sortedComments.length > 0 && `(${sortedComments.length})`}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 댓글 목록 */}
        <div className="px-8 py-6 space-y-4 max-h-[380px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent hover:scrollbar-thumb-gray-300">
          {Array.isArray(sortedComments) && sortedComments.length > 0 ? sortedComments.map((comment) => 
            comment && comment.id ? (
              <div key={comment.id} className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl hover:bg-gray-100/80 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-900">{getCommentAuthorName(comment.author || comment.userName, currentUser?.name)}</span>
                    <span className="text-sm text-gray-500">{formatDate(comment.createdAt)}</span>
                  </div>
                  <p className="text-gray-600">{comment.text || comment.content || 'No content'}</p>
                </div>
                {onDelete && currentUser && (
                  (comment.userId && currentUser.id === comment.userId) || 
                  (comment.author === currentUser.name) || 
                  (comment.userName === currentUser.name) ||
                  (comment.author === currentUser.id) ||
                  (currentUser.id === 'admin')
                ) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(comment.id);
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : null
          ) : (
            <div className="text-center py-6 text-gray-500">
              <p>No comments yet.</p>
              <p className="text-sm mt-1">Be the first to leave a comment!</p>
            </div>
          )}
        </div>

        {/* 댓글 입력 폼 */}
        <form onSubmit={handleSubmit} className="sticky bottom-0 bg-white border-t border-gray-100">
          <div className="px-8 py-6">
            <div className="flex items-start gap-4 p-5 bg-gray-50 rounded-2xl">
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 bg-transparent border-0 p-0 focus:outline-none focus:ring-0 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && commentText.trim()) {
                    e.preventDefault();
                    onSubmit(commentText);
                    setCommentText('');
                  }
                }}
              />
              <button
                type="submit"
                disabled={!commentText.trim()}
                className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-md transition-all duration-200 flex items-center justify-center w-8 h-8"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}; 