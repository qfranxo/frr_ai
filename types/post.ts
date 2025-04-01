import { StyleOption } from './generate';

export interface Comment {
  id: number | string;
  text: string;
  author: string;
  createdAt: string;
  imageId?: string;
  userId?: string;
  userName?: string;
}

export interface CommunityPost {
  id: number | string;
  imageUrl: string;
  title: string;
  description: string;
  author: string;
  authorImage?: string;
  aspectRatio?: string;
  style?: StyleOption;
  category?: string;
  tags: string[];
  likes: number;
  comments: Comment[];
  createdAt: string;
  userId?: string;
}

export interface IPostCard {
  post: CommunityPost;
  onLike: (postId: number | string) => void;
  onComment: (text: string) => void;
  onDeleteComment: (postId: number | string, commentId: number | string) => void;
  isLiked: boolean;
  likesCount: number;
  currentComments: Comment[];
  currentUser?: {
    id: string;
    name: string;
    username: string;
    imageUrl?: string;
  };
  handleShare?: () => void;
  imageClassName?: string;
} 