import { useEffect, useState } from 'react'
import CommentInput from '../CommentInput'

interface Comment {
  id: string
  content: string
  createdAt: Date
  userId: string
  postId: string
}

interface CommentListProps {
  imageId: string
}

export function CommentList({ imageId }: CommentListProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchComments = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch(`/api/comments?imageId=${imageId}`)
      const json = await res.json()
      
      if (!json.success) {
        throw new Error(json.error || 'Failed to load comments.')
      }
      
      setComments(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load comments.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchComments()
  }, [imageId])

  if (isLoading) {
    return (
      <div className="text-sm text-gray-500 mt-2">
        Loading comments...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-red-500 mt-2">
        {error}
      </div>
    )
  }

  return (
    <div className="mt-4">
      <ul className="space-y-2">
        {comments.map((comment) => (
          <li 
            key={comment.id}
            className="flex items-start gap-2 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-400">💬</span>
            <span className="text-sm text-gray-700">{comment.content}</span>
          </li>
        ))}
      </ul>
      <CommentInput imageId={imageId} onCommentPosted={fetchComments} />
    </div>
  )
} 