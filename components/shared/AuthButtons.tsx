'use client';

import { ReactNode, useState, useEffect } from 'react';
import { SignInButton } from '@clerk/nextjs';
import { Heart, MessageCircle } from 'lucide-react';

interface AuthLikeButtonProps {
  isSignedIn: boolean;
  onLike: () => void;
  isLiked: boolean;
  likesCount: number;
  iconSize?: number;
}

export function AuthLikeButton({ isSignedIn, onLike, isLiked, likesCount = 0, iconSize = 5 }: AuthLikeButtonProps) {
  const iconClassName = `h-${iconSize/5} w-${iconSize/5} sm:h-5 sm:w-5 transition-colors`;
  
  if (isSignedIn) {
    return (
      <button
        onClick={onLike}
        className="flex items-center gap-1.5 transition-colors p-1.5 rounded-full group"
        title={isLiked ? "Unlike" : "Like"}
      >
        <Heart
          className={`${iconClassName} ${
            isLiked 
              ? "fill-red-500 text-red-500 group-hover:fill-red-600 group-hover:text-red-600" 
              : "text-red-500 group-hover:text-red-600"
          }`}
        />
        <span className={`text-xs sm:text-sm font-medium transition-colors ${
          isLiked ? "text-red-500 group-hover:text-red-600" : "text-red-500 group-hover:text-red-600"
        }`}>
          {likesCount > 0 ? likesCount : ""}
        </span>
      </button>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className="flex items-center gap-1.5 text-red-500 hover:text-red-600 transition-colors p-1.5 rounded-full"
        title="Sign in to like"
      >
        <Heart className={iconClassName} />
        <span className="text-xs sm:text-sm font-medium">
          {likesCount > 0 ? likesCount : ""}
        </span>
      </button>
    </SignInButton>
  );
}

interface AuthCommentButtonProps {
  isSignedIn: boolean;
  onComment: () => void;
  commentsCount: number;
  label?: string;
  iconSize?: number;
}

export function AuthCommentButton({ isSignedIn, onComment, commentsCount = 0, label, iconSize = 6 }: AuthCommentButtonProps) {
  const iconClassName = `h-${iconSize/5} w-${iconSize/5} sm:h-5 sm:w-5 transition-colors`;
  
  if (isSignedIn) {
    return (
      <button
        onClick={onComment}
        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors p-1.5 rounded-full group"
        title="Comment"
      >
        <div className="relative">
          <MessageCircle className={iconClassName} />
          {commentsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-blue-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">
              {commentsCount > 99 ? '99+' : commentsCount}
            </span>
          )}
        </div>
        {label && <span className="text-xs sm:text-sm font-medium">{label}</span>}
      </button>
    );
  }

  return (
    <SignInButton mode="modal">
      <button
        className="flex items-center gap-1.5 text-blue-500 hover:text-blue-600 transition-colors p-1.5 rounded-full"
        title="Sign in to comment"
      >
        <div className="relative">
          <MessageCircle className={iconClassName} />
          {commentsCount > 0 && (
            <span className="absolute -top-1 -right-1.5 bg-blue-500 text-white text-xs min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 font-medium">
              {commentsCount > 99 ? '99+' : commentsCount}
            </span>
          )}
        </div>
        {label && <span className="text-xs sm:text-sm font-medium">{label}</span>}
      </button>
    </SignInButton>
  );
} 