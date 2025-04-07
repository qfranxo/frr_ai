"use client";

import { motion } from "framer-motion";
import { CommunityPost } from "@/types/post";
import { ImageCard } from "@/components/shared/ImageCard";
import type { Comment } from "@/types/post";
import Link from 'next/link';
import Masonry from 'react-masonry-css';

interface CommunitySectionProps {
  posts: CommunityPost[];
  onLike?: (postId: number | string) => void;
  onComment: (postId: number | string, text: string) => void;
  onDeleteComment: (postId: number | string, commentId: number | string) => void;
  onDeletePost?: (postId: string) => void;
  likes?: number[];
  likedPosts?: boolean[];
  comments: Comment[][];
  currentUser?: {
    id: string;
    name: string;
    username: string;
    imageUrl?: string;
  };
  isSignedIn?: boolean;
  handleShare?: (post: any) => void;
  handleDownload?: (post: any) => void;
}

export const CommunitySection = ({ 
  posts = [], 
  onLike, 
  onComment,
  onDeleteComment,
  onDeletePost,
  likes = [], 
  likedPosts = [], 
  comments = [],
  currentUser,
  isSignedIn = false,
  handleShare,
  handleDownload
}: CommunitySectionProps) => {
  
  const breakpointColumnsObj = {
    default: 3, // 기본 3개 컬럼
    1100: 3,
    700: 2,
    500: 1
  };

  return (
    <section className="py-24">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
          AI Model Gallery
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mb-6">
            Meet the amazing AI models created by AI
          </p>
          <Link 
            href="/community"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            View More Models →
          </Link>
        </div>

        {posts.length > 0 ? (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="flex w-auto -ml-8 -mt-6" 
            columnClassName="pl-8 pt-6 bg-clip-padding"
          >
            {posts?.map((post, index) => (
              <div key={`${post.id}-${index}`} className="mb-8 sm:mb-10">
                <ImageCard
                  post={post}
                  variant="main"
                  layout="masonry"
                  onLike={() => onLike ? onLike(post.id) : null}
                  onComment={(postId, text) => text ? onComment(postId, text) : null}
                  onDeleteComment={(postId, commentId) => onDeleteComment(postId, commentId)}
                  onDeletePost={onDeletePost ? (postId) => onDeletePost(postId) : undefined}
                  onShare={() => handleShare ? handleShare(post) : null}
                  onDownload={() => handleDownload ? handleDownload(post) : null}
                  isLiked={likedPosts[index] || false}
                  likesCount={likes[index] || post.likes || 0}
                  commentsCount={comments[index]?.length || post.comments?.length || 0}
                  comments={comments[index] || post.comments || []}
                  currentUser={currentUser}
                  isSignedIn={Boolean(isSignedIn)}
                />
              </div>
            ))}
          </Masonry>
        ) : (
          <div className="flex justify-center items-center py-16">
            <p className="text-sm sm:text-base text-gray-500">No shared models found. Generate and share your first model!</p>
          </div>
        )}
      </div>
    </section>
  );
};