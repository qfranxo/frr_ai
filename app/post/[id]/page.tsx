'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CommunityPost, Comment } from '@/types/post';
import { useLikes } from '@/hooks/useLikes';
import { useComments } from '@/hooks/useComments';
import { MODEL_STYLES } from '@/constants/modelOptions';
import { Heart, MessageCircle, ArrowLeft } from 'lucide-react';
import { CommentModal } from '@/components/shared/CommentModal';
import { formatDate } from '@/utils/format';

export default function PostDetail() {
    const params = useParams();
    const postId = parseInt(params?.id as string) || 1; 
    const [comment, setComment] = useState('');
    const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);

    // 모든 필수 속성을 포함한 초기 데이터
    const initialPost: CommunityPost = {
        id: postId,
        title: "Neon City Nightscape",
        description: "Cyberpunk style futuristic cityscape with neon lights illuminating the night streets",
        imageUrl: "https://source.unsplash.com/random/800x600/?cyberpunk",
        author: "Designer",
        style: MODEL_STYLES[0],  // 스타일 정보 추가
        tags: ["cyberpunk", "cityscape", "night"],  // 태그 추가
        likes: 0,
        comments: [],
        createdAt: new Date().toISOString()
    };

    // useLikes 훅에 완전한 초기 데이터 전달
    const { likes: likesMap, likedPosts: likedPostsMap, handleLike } = useLikes([initialPost]);
    const { commentsMap, handleComment, deleteComment } = useComments([initialPost]);

    const isLiked = likedPostsMap[postId] || false;
    const likes = likesMap[postId] || 0;
    const comments = commentsMap[postId] || [];

    // 댓글을 최신순으로 정렬
    const sortedComments = [...comments].sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // 실제 데이터에 현재 상태 반영
    const post: CommunityPost = {
        ...initialPost,
        likes: likes,
        comments: comments
    };

    const handleCommentSubmit = (text: string) => {
        if (text.trim()) {
            handleComment(postId, text);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
            <div className="max-w-7xl mx-auto px-4 py-12">
                {/* 헤더 섹션 */}
                <div className="max-w-4xl mx-auto mb-12">
                    <button 
                        onClick={() => window.history.back()}
                        className="mb-8 flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        Back
                    </button>
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">{post.title}</h1>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
                                {post.author[0]}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">{post.author}</p>
                                <p className="text-sm text-gray-500">{formatDate(post.createdAt)}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6">
                            <button 
                                onClick={() => handleLike(postId)}
                                className="flex items-center gap-1.5 transition-all"
                            >
                                <Heart 
                                    size={22} 
                                    className={`transition-all ${isLiked ? 'fill-red-500 text-red-500' : 'fill-transparent text-gray-500 hover:text-red-500'}`}
                                />
                                <span className={`font-medium ${isLiked ? 'text-red-500' : 'text-gray-500'}`}>{likes}</span>
                            </button>
                            <button 
                                className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-all"
                                onClick={() => setIsCommentModalOpen(true)}
                            >
                                <MessageCircle size={22} className="text-gray-500" />
                                <span className="font-medium">Comments {comments.length}</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* 이미지 섹션 */}
                <div className="max-w-4xl mx-auto mb-12">
                    <div className="aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl">
                        <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>

                {/* 설명 섹션 */}
                <div className="max-w-4xl mx-auto">
                    <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Description</h2>
                        <p className="text-gray-600 leading-relaxed">{post.description}</p>
                    </div>

                    {/* 댓글 섹션 */}
                    <div className="bg-white rounded-2xl p-8 shadow-lg">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Comments</h2>
                        <div className="space-y-6 mb-8">
                            {/* 댓글 입력 */}
                            <div className="relative"> 
                                <textarea
                                    placeholder="Write a comment..."
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    className="block box-border w-full h-24 border p-4 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-sm bg-white"
                                />
                                <button 
                                    className="absolute right-2 bottom-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl transition-all duration-300 transform hover:scale-[1.02] text-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => {
                                        if (comment.trim()) {
                                            handleComment(postId, comment);
                                            setComment('');
                                        }
                                    }}
                                    disabled={!comment.trim()}
                                >
                                    Submit
                                </button>
                            </div>

                            {/* 댓글 목록 */}
                            <div className="space-y-4">
                                {sortedComments.length > 0 ? (
                                    sortedComments.map((c, idx) => (
                                        <div key={c.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm shrink-0">
                                                U{idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-2">
                                                    <p className="font-medium text-gray-900">User{idx + 1}</p>
                                                    <p className="text-sm text-gray-500">{formatDate(c.createdAt)}</p>
                                                </div>
                                                <p className="text-gray-600">{c.text}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-6 text-gray-500">
                                        <p>No comments yet.</p>
                                        <p className="text-sm mt-1">Be the first to leave a comment!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* 댓글 모달 */}
            <CommentModal 
                isOpen={isCommentModalOpen}
                onClose={() => setIsCommentModalOpen(false)}
                onSubmit={handleCommentSubmit}
                onDelete={(commentId) => deleteComment(postId, commentId)}
                comments={comments.map(c => ({
                    id: c.id,
                    author: `User${c.id}`,
                    text: c.text,
                    createdAt: c.createdAt
                }))}
            />
        </main>
    );
} 