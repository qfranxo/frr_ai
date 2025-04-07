"use client";

import { useState } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAddComment } from '@/hooks/useCommentsBatch'

interface CommentInputProps {
  imageId: string
  onCommentPosted?: () => void
}

export default function CommentInput({ imageId, onCommentPosted }: CommentInputProps) {
  const [comment, setComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, isSignedIn } = useUser()
  
  // 댓글 추가 mutation 훅 사용
  const addComment = useAddComment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!comment.trim() || !imageId || isSubmitting) return
    
    if (!isSignedIn) {
      alert('댓글을 작성하려면 로그인이 필요합니다.')
      return
    }
    
    try {
      setIsSubmitting(true)
      
      // React Query mutation 사용
      await addComment.mutateAsync({
        imageId,
        userId: user?.id || 'anonymous',
        userName: user?.firstName || user?.username || '사용자',
        text: comment
      })
      
      // 입력 필드 초기화
      setComment('')
      
      // 콜백 실행
      if (onCommentPosted) {
        onCommentPosted()
      }
    } catch (error) {
      console.error('댓글 추가 오류:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
      <input
        type="text"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="댓글을 입력하세요..."
        disabled={isSubmitting}
        className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={!comment.trim() || isSubmitting}
        className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '게시 중...' : '게시'}
      </button>
    </form>
  )
} 